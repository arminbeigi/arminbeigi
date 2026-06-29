import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../types/auth-user';

/**
 * نگهبان RBAC: مجوزهای موردنیاز مسیر را با مجوزهای کاربر می‌سنجد.
 * - اگر مسیر مجوزی اعلام نکرده باشد، عبور آزاد است (فقط احراز هویت کافی است).
 * - نقش admin به‌صورت ضمنی همه‌ی مجوزها را دارد.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) throw new ForbiddenException('دسترسی نامعتبر');

    if (user.roles?.includes('admin')) return true;

    const has = required.every((p) => user.permissions?.includes(p));
    if (!has) {
      throw new ForbiddenException('شما مجوز لازم برای این عملیات را ندارید');
    }
    return true;
  }
}
