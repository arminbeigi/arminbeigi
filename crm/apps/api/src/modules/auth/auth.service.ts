import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { AuthUser } from '../../common/types/auth-user';
import { Env } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { UserResponseDto } from '../../modules/users/dto/user-response.dto';
import { UsersService } from '../../modules/users/users.service';
import { UserWithAccess } from '../../modules/users/users.repository';
import { AuthTokensDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface RefreshPayload {
  sub: string;
  family: string;
  jti: string;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.refreshSecret = config.get('JWT_REFRESH_SECRET', { infer: true });
    this.accessTtl = config.get('JWT_ACCESS_TTL', { infer: true });
    this.refreshTtl = config.get('JWT_REFRESH_TTL', { infer: true });
  }

  // ── ثبت‌نام و ورود ─────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const passwordHash = await hash(dto.password, 10);
    await this.users.createUser({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      roleKeys: ['viewer'], // کمترین دسترسی به‌صورت پیش‌فرض
    });
    return this.login({ email: dto.email, password: dto.password });
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.validateCredentials(dto.email, dto.password);
    await this.users.updateLastLogin(user.id);
    return this.issueTokens(user, randomUUID());
  }

  async validateCredentials(email: string, password: string): Promise<UserWithAccess> {
    const user = await this.users.findByEmailWithAccess(email);
    if (!user) throw new UnauthorizedException('ایمیل یا رمز عبور نادرست است');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('حساب کاربری غیرفعال است');
    const ok = await compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('ایمیل یا رمز عبور نادرست است');
    return user;
  }

  // ── چرخش refresh با تشخیص استفاده‌ی مجدد ────────────────────────────────────
  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('توکن تازه‌سازی نامعتبر است');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) throw new UnauthorizedException('توکن تازه‌سازی ناشناخته است');

    // استفاده‌ی مجدد از توکن باطل‌شده ⇒ احتمال نشت؛ کل خانواده باطل می‌شود
    if (stored.revokedAt) {
      await this.revokeFamily(payload.family);
      throw new UnauthorizedException('استفاده‌ی مجدد از توکن شناسایی شد؛ همه‌ی نشست‌ها باطل شدند');
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('توکن تازه‌سازی منقضی شده است');
    }

    // باطل‌کردن توکن فعلی و صدور توکن جدید در همان خانواده (rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.users.findByIdWithAccess(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('کاربر معتبر نیست');
    }
    return this.issueTokens(user, payload.family);
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  // ── کمکی‌ها ─────────────────────────────────────────────────────────────────
  private async issueTokens(user: UserWithAccess, family: string): Promise<AuthTokensDto> {
    const { roles, permissions } = this.users.flattenAccess(user);
    const accessPayload: AuthUser = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      permissions,
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.accessSecret,
      expiresIn: this.accessTtl,
    });

    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, family, jti } satisfies RefreshPayload,
      { secret: this.refreshSecret, expiresIn: this.refreshTtl },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        family,
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtl,
      user: UserResponseDto.from(user, roles, permissions),
    };
  }

  private async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** هش قطعی برای جست‌وجو (خود توکن هرگز ذخیره نمی‌شود) */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
