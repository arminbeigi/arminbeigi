import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { AuthUser } from '../../common/types/auth-user';
import { Env } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../modules/audit/audit.service';
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

/** زمینه‌ی درخواست برای ممیزی (IP و عامل کاربر) — اختیاری */
export interface AuthContext {
  ip?: string;
  userAgent?: string;
}

/** سقف تلاش ناموفق پیش از قفل، و مدت قفل (دقیقه) — دفاع لایه‌ی حساب (مکمل throttler IP) */
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

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
    private readonly audit: AuditService,
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

  async login(dto: LoginDto, ctx?: AuthContext): Promise<AuthTokensDto> {
    const user = await this.validateCredentials(dto.email, dto.password, ctx);
    await this.users.updateLastLogin(user.id);
    await this.audit.record({
      actorId: user.id,
      action: 'login_success',
      entityType: 'AUTH',
      entityId: user.id,
      metadata: { email: user.email, ip: ctx?.ip, userAgent: ctx?.userAgent },
    });
    return this.issueTokens(user, randomUUID());
  }

  async validateCredentials(
    email: string,
    password: string,
    ctx?: AuthContext,
  ): Promise<UserWithAccess> {
    const user = await this.users.findByEmailWithAccess(email);
    if (!user) {
      await this.audit.record({
        action: 'login_failed',
        entityType: 'AUTH',
        entityId: 'unknown',
        metadata: { email, reason: 'user_not_found', ip: ctx?.ip },
      });
      throw new UnauthorizedException('ایمیل یا رمز عبور نادرست است');
    }
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('حساب کاربری غیرفعال است');

    // قفل موقت حساب پس از تلاش‌های ناموفق متوالی (دفاع brute-force در سطح حساب)
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `به‌دلیل تلاش‌های ناموفق، حساب موقتاً قفل شده است. ${minutes} دقیقه دیگر دوباره تلاش کنید.`,
      );
    }

    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      const locked = await this.registerFailedAttempt(user.id, user.failedLoginAttempts);
      await this.audit.record({
        actorId: user.id,
        action: locked ? 'account_locked' : 'login_failed',
        entityType: 'AUTH',
        entityId: user.id,
        metadata: { email, reason: 'bad_password', ip: ctx?.ip },
      });
      throw new UnauthorizedException('ایمیل یا رمز عبور نادرست است');
    }

    // ورود موفق ⇒ صفر کردن شمارنده و رفع قفل (در صورت وجود)
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }
    return user;
  }

  /** ثبت یک تلاش ناموفق؛ با رسیدن به سقف، حساب موقتاً قفل می‌شود. خروجی: آیا قفل شد؟ */
  private async registerFailedAttempt(userId: string, current: number): Promise<boolean> {
    const attempts = current + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000) : undefined,
      },
    });
    return locked;
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
