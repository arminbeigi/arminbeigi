-- H1: افزودن مقادیر enum برای ممیزی رویدادهای احراز هویت/کاربر/نقش
-- (افزودنی و سازگار با عقب؛ مقادیر موجود دست‌نخورده‌اند)
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'AUTH';
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'USER';
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'ROLE';
