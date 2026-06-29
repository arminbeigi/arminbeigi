import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../types/auth-user';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  const ctxWith = (user?: Partial<AuthUser>): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  it('بدون اعلام مجوز، عبور آزاد است', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(ctxWith({ permissions: [] }))).toBe(true);
  });

  it('نقش admin همه‌ی مجوزها را دارد', () => {
    reflector.getAllAndOverride.mockReturnValue(['users:manage']);
    expect(guard.canActivate(ctxWith({ roles: ['admin'], permissions: [] }))).toBe(true);
  });

  it('کاربر دارای مجوز لازم عبور می‌کند', () => {
    reflector.getAllAndOverride.mockReturnValue(['customers:read']);
    expect(
      guard.canActivate(ctxWith({ roles: ['viewer'], permissions: ['customers:read'] })),
    ).toBe(true);
  });

  it('نبود مجوز ⇒ ForbiddenException', () => {
    reflector.getAllAndOverride.mockReturnValue(['customers:write']);
    expect(() =>
      guard.canActivate(ctxWith({ roles: ['viewer'], permissions: ['customers:read'] })),
    ).toThrow(ForbiddenException);
  });
});
