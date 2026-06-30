import { UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../../modules/users/users.service';
import { UserWithAccess } from '../../modules/users/users.repository';

/**
 * تست‌های واحد هسته‌ی Auth: ورود، چرخش توکن، و تشخیص استفاده‌ی مجدد.
 * وابستگی‌ها mock می‌شوند تا بدون دیتابیس/شبکه اجرا شوند.
 */
describe('AuthService', () => {
  let service: AuthService;
  let users: Record<
    'findByEmailWithAccess' | 'findByIdWithAccess' | 'updateLastLogin' | 'createUser' | 'flattenAccess',
    jest.Mock
  >;
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let prisma: { refreshToken: Record<string, jest.Mock>; user: Record<string, jest.Mock> };
  let audit: { record: jest.Mock };

  const baseUser = (passwordHash: string, overrides: Partial<UserWithAccess> = {}): UserWithAccess =>
    ({
      id: 'u1',
      email: 'admin@shofazh.com',
      fullName: 'مدیر سیستم',
      status: 'ACTIVE',
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      roles: [],
      ...overrides,
    }) as unknown as UserWithAccess;

  beforeEach(() => {
    users = {
      findByEmailWithAccess: jest.fn(),
      findByIdWithAccess: jest.fn(),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
      createUser: jest.fn().mockResolvedValue({ id: 'u1' }),
      flattenAccess: jest.fn().mockReturnValue({ roles: ['admin'], permissions: ['customers:read'] }),
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValueOnce('access.jwt').mockResolvedValueOnce('refresh.jwt'),
      verifyAsync: jest.fn(),
    };
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt1' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: (k: string) =>
        ({
          JWT_ACCESS_SECRET: 'access-secret-value-1234',
          JWT_REFRESH_SECRET: 'refresh-secret-value-1234',
          JWT_ACCESS_TTL: 900,
          JWT_REFRESH_TTL: 2592000,
        })[k],
    };

    service = new AuthService(
      users as unknown as UsersService,
      jwt as never,
      prisma as never,
      audit as never,
      config as never,
    );
  });

  describe('login', () => {
    it('با اعتبار درست، توکن صادر و refresh ذخیره می‌کند', async () => {
      const pwHash = await hash('Admin@12345', 10);
      users.findByEmailWithAccess.mockResolvedValue(baseUser(pwHash));

      const res = await service.login({ email: 'admin@shofazh.com', password: 'Admin@12345' });

      expect(res.accessToken).toBe('access.jwt');
      expect(res.refreshToken).toBe('refresh.jwt');
      expect(res.user.email).toBe('admin@shofazh.com');
      expect(res.user.roles).toContain('admin');
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      // توکن خام ذخیره نمی‌شود؛ فقط هش
      const stored = prisma.refreshToken.create.mock.calls[0][0].data.tokenHash;
      expect(stored).toMatch(/^[a-f0-9]{64}$/);
      // رویداد ممیزی ورود موفق ثبت می‌شود
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'login_success', entityType: 'AUTH' }),
      );
    });

    it('با رمز نادرست، خطای احراز هویت می‌دهد', async () => {
      const pwHash = await hash('correct-password', 10);
      users.findByEmailWithAccess.mockResolvedValue(baseUser(pwHash));
      await expect(
        service.login({ email: 'admin@shofazh.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('برای کاربر ناموجود، خطای احراز هویت می‌دهد', async () => {
      users.findByEmailWithAccess.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@y.com', password: 'whatever12' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('با رمز نادرست، شمارنده‌ی تلاش ناموفق افزایش می‌یابد', async () => {
      const pwHash = await hash('correct-password', 10);
      users.findByEmailWithAccess.mockResolvedValue(baseUser(pwHash, { failedLoginAttempts: 2 }));
      await expect(
        service.login({ email: 'admin@shofazh.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { failedLoginAttempts: 3, lockedUntil: undefined },
      });
    });

    it('با رسیدن به سقف تلاش ناموفق، حساب قفل می‌شود', async () => {
      const pwHash = await hash('correct-password', 10);
      users.findByEmailWithAccess.mockResolvedValue(baseUser(pwHash, { failedLoginAttempts: 4 }));
      await expect(
        service.login({ email: 'admin@shofazh.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      const arg = prisma.user.update.mock.calls[0][0];
      expect(arg.data.failedLoginAttempts).toBe(0);
      expect(arg.data.lockedUntil).toBeInstanceOf(Date);
      expect(arg.data.lockedUntil.getTime()).toBeGreaterThan(Date.now());
      // رویداد قفل حساب ممیزی می‌شود
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'account_locked', entityType: 'AUTH' }),
      );
    });

    it('حساب قفل‌شده حتی با رمز درست رد می‌شود', async () => {
      const pwHash = await hash('Admin@12345', 10);
      users.findByEmailWithAccess.mockResolvedValue(
        baseUser(pwHash, { lockedUntil: new Date(Date.now() + 5 * 60_000) }),
      );
      await expect(
        service.login({ email: 'admin@shofazh.com', password: 'Admin@12345' }),
      ).rejects.toThrow(/قفل/);
      // نباید توکن صادر شود
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('ورود موفق پس از تلاش‌های ناموفق، شمارنده را صفر می‌کند', async () => {
      const pwHash = await hash('Admin@12345', 10);
      users.findByEmailWithAccess.mockResolvedValue(baseUser(pwHash, { failedLoginAttempts: 3 }));
      await service.login({ email: 'admin@shofazh.com', password: 'Admin@12345' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    });
  });

  describe('refresh', () => {
    it('توکن معتبر را می‌چرخاند (باطل‌کردن قبلی + صدور جدید)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', family: 'fam1', jti: 'j1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      users.findByIdWithAccess.mockResolvedValue(baseUser('x'));

      const res = await service.refresh('refresh.jwt');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(res.accessToken).toBe('access.jwt');
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('استفاده‌ی مجدد از توکن باطل‌شده ⇒ ابطال کل خانواده + خطا', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', family: 'fam1', jti: 'j1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revokedAt: new Date(), // قبلاً باطل شده
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(service.refresh('refresh.jwt')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { family: 'fam1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('توکن ناشناخته ⇒ خطای احراز هویت', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', family: 'fam1', jti: 'j1' });
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('refresh.jwt')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
