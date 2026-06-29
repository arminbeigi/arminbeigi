import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types/auth-user';

/**
 * تزریق کاربرِ احرازشده به آرگومان کنترلر.
 * مثال: getProfile(@CurrentUser() user: AuthUser)
 * یا یک فیلد خاص: @CurrentUser('sub') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | unknown => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
