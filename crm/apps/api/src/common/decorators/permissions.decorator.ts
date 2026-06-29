import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * مجوزهای موردنیاز یک مسیر را اعلام می‌کند.
 * مثال: @Permissions('customers:write')
 * کاربر باید همه‌ی مجوزهای ذکرشده را داشته باشد (AND).
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
