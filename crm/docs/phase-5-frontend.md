# فاز ۵ — فرانت‌اند (Next.js فارسی/RTL)

> ساخت تدریجی در واحدهای قابل‌تحویل. **واحد ۱ کامل و اعتبارسنجی‌شده.**

## واحد ۱ — پایه + لاگین + داشبورد + پوسته‌ی RTL
> وضعیت: **اجراشده و اعتبارسنجی‌شده.** `next build` سبز (۱۷ مسیر)، و **۱۵ سنجش مرورگر**
> با Playwright روی اپ واقعی + API واقعی + PostgreSQL واقعی سبز.

### چه ساخته شد
- **زیرساخت Next.js ۱۴ (App Router) + TypeScript + Tailwind**، کاملاً **RTL** با فونت **Vazirmatn**
  (از `@fontsource` — بدون وابستگی به Google Fonts در زمان build).
- **تم صنعتی HVAC**: پالت فولادی (steel) + لهجه‌ی نارنجی شعله (flame).
- **احراز هویت سمت کلاینت**: ذخیره‌ی توکن، **تازه‌سازی خودکار در ۴۰۱**، AuthProvider/useAuth،
  و محافظت از مسیرها (`useRequireAuth`).
- **صفحه‌ی ورود** فارسی (industrial) با مدیریت خطا.
- **پوسته‌ی داشبورد**: سایدبار با **منوی کامل فارسی** (داشبورد، مشتریان، پروژه‌ها، فروش، تماس‌ها،
  مرکز تماس، محصولات، تیکت‌ها، خدمات، گزارش‌ها، تنظیمات، دستیار هوشمند) با فیلتر بر اساس مجوز کاربر،
  تاپ‌بار با پروفایل و خروج.
- **داشبورد با داده‌ی واقعی API**: کارت‌های آماری (مشتریان/معاملات باز/پروژه‌ها/تماس‌ها) و
  فهرست تماس‌های اخیر با **تاریخ شمسی** و **اعداد فارسی**.
- صفحات بقیه‌ی منو به‌صورت Placeholder (در واحدهای بعدی پر می‌شوند) تا ناوبری کامل کار کند.

### ساختار فایل
```
apps/web/
  package.json · next.config.mjs · tsconfig.json · tailwind.config.ts · postcss.config.mjs
  app/
    layout.tsx (html lang=fa dir=rtl + Vazirmatn) · globals.css · providers.tsx · page.tsx (→ /dashboard)
    (auth)/login/page.tsx
    dashboard/layout.tsx (محافظت‌شده، سایدبار+تاپ‌بار) · dashboard/page.tsx (آمار واقعی)
    dashboard/{customers,projects,deals,calls,call-center,products,tickets,services,reports,settings,assistant}/page.tsx
  components/ sidebar · topbar · stat-card · placeholder
  lib/ api.ts (fetch + refresh) · auth.tsx · menu.ts · format.ts (فارسی/شمسی/تومان) · types.ts
```

### تصمیم‌های کلیدی
- **بدون shadcn CLI**: کامپوننت‌های سبک با Tailwind برای کنترل کامل و کاهش ریسک نصب.
- **React Query** برای واکشی/کش داده.
- **توکن در localStorage** با تازه‌سازی خودکار؛ سخت‌سازی (httpOnly cookie) برای بعد ثبت شد.
- **یک باگ مسیر واقعی رفع شد**: گروه `(dashboard)` سگمنت URL اضافه نمی‌کرد و صفحات منو روی
  `/customers` می‌افتادند نه `/dashboard/customers`؛ به سگمنت واقعی `dashboard/` بازساختار شد
  (با `next build` تأیید شد).

### شواهد اعتبارسنجی
- `next build` ⇒ بدون خطا، **۱۷ مسیر** (type-check کامل).
- **Playwright روی Chromium واقعی** + اپ واقعی + API + PostgreSQL: **۱۵/۱۵**
  (عنوان فارسی، `dir=rtl`، ورود مدیر، هدایت به داشبورد، پیام خوش‌آمد، ۴ کارت آماری با داده‌ی واقعی،
  منوی فارسی، ناوبری به `/dashboard/customers`، خروج، و **محافظت از مسیر** هنگام دسترسی بدون توکن).
- اسکرین‌شات‌های لاگین و داشبورد گرفته و بازبینی شد (RTL، فارسی، طراحی صنعتی، تاریخ شمسی).

### Impact Analysis
- ایزوله در `crm/apps/web`؛ روی همان API فاز ۳/۴ کار می‌کند (CORS از قبل فعال).
- بدون وابستگی به Google Fonts (مناسب محیط محدود/ایران).
- واحدهای بعدی فاز ۵: مشتریان (فهرست/جست‌وجو/جزئیات) → مرکز تماس (تماس زنده/کلیک‌تو‌کال) →
  پایپ‌لاین (کانبان) → پروژه‌ها → محصولات. همگی روی همین پوسته و کلاینت API سوار می‌شوند.
