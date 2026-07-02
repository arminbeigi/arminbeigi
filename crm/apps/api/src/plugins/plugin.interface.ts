import { DynamicModule, Type } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * قرارداد افزونه‌ی شفازح CRM (H7.5-7).
 * یکپارچگی‌های آینده (ERP/حسابداری/ووکامرس/SMS/واتس‌اپ/Issabel/درگاه پرداخت/حمل)
 * بدون تغییر هسته نصب می‌شوند. هر افزونه می‌تواند این‌ها را عرضه کند:
 *  - Routes:      کنترلرهای NestJS داخل module خود (زیر پیشوند سراسری /api).
 *  - Events:      شنونده‌های @OnEvent روی رویدادهای دامنه؛ و انتشار رویداد خود.
 *  - Services:    ثبت در نقاط توسعه‌ی هسته از طریق PluginRegistry
 *                 (کانال اعلان / provider جست‌وجو / اکشن گردش‌کار).
 *  - Permissions: مجوزهای جدید که هنگام بوت به‌صورت idempotent seed می‌شوند.
 *  - Settings:    اسکیمای تنظیمات (کلیدهای env/تنظیمات) برای مستندسازی و UI آینده.
 *  - Migrations:  هوک migrate برای آماده‌سازی داده/جدول‌های اختصاصی افزونه.
 */
export interface PluginPermission {
  key: string; // مثل sms:send
  group: string; // برچسب گروه (فارسی)
  name: string; // توضیح فارسی
}

export interface PluginSettingSpec {
  key: string; // مثل SMS_PROVIDER_API_KEY
  label: string; // برچسب فارسی
  required: boolean;
  secret?: boolean; // در UI پنهان شود
}

export interface ShofazhPlugin {
  /** کلید یکتا (لاتین، kebab-case) */
  key: string;
  /** نام نمایشی فارسی */
  name: string;
  version: string;
  description?: string;
  /** ماژول NestJS افزونه (کنترلرها/سرویس‌ها/شنونده‌ها) */
  module: Type<unknown> | DynamicModule;
  /** مجوزهای موردنیاز — هنگام بوت upsert و به نقش admin متصل می‌شوند */
  permissions?: PluginPermission[];
  /** اسکیمای تنظیمات افزونه */
  settings?: PluginSettingSpec[];
  /** هوک مهاجرت/آماده‌سازی داده (idempotent) — پس از بوت اجرا می‌شود */
  migrate?: (prisma: PrismaService) => Promise<void>;
}
