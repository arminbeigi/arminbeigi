-- ─────────────────────────────────────────────────────────────────────────────
-- 0002_search_indexes
-- جست‌وجوی فازی فارسی + لاتین با trigram (GIN) روی متنِ «نرمال‌شده».
-- چرا نرمال‌سازی؟ در فارسی یک کلمه چند املا دارد: أ/إ/آ→ا، ي→ی، ك→ک، ة→ه،
-- و نیم‌فاصله (ZWNJ). بدون نرمال‌سازی، similarity زیر آستانه می‌افتد و تطبیق رخ نمی‌دهد
-- (آزمایش‌شده: 0.23 بدون نرمال‌سازی ← 0.39 با نرمال‌سازی، آستانه‌ی پیش‌فرض 0.3).
-- Prisma این نوع ایندکس تابعی/GIN را تولید نمی‌کند، پس SQL خام است.
-- پیش‌نیاز: اکستنشن pg_trgm (مهاجرت 0001).
-- ─────────────────────────────────────────────────────────────────────────────

-- تابع نرمال‌سازی فارسی (IMMUTABLE تا در ایندکس تابعی قابل‌استفاده باشد)
CREATE OR REPLACE FUNCTION fa_normalize(t text) RETURNS text AS $$
  SELECT lower(
    translate(
      regexp_replace(coalesce(t, ''), '[‌‍‏‎]', '', 'g'), -- حذف ZWNJ/ZWJ/علائم جهت
      'أإآةيكؤئىﻙﻚ', -- حروف عربی/املای متفاوت (۱۱ نویسه)
      'اااهیکوییکک'  -- معادل فارسی استاندارد (۱۱ نویسه، هم‌تراز یک‌به‌یک)
    )
  );
$$ LANGUAGE sql IMMUTABLE;

-- جست‌وجوی نام مشتری (شخص/شرکت)
CREATE INDEX IF NOT EXISTS "Customer_displayName_fa_trgm_idx"
  ON "Customer" USING GIN (fa_normalize("displayName") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Customer_companyName_fa_trgm_idx"
  ON "Customer" USING GIN (fa_normalize("companyName") gin_trgm_ops);

-- جست‌وجوی شماره تلفن به‌صورت بخشی (۴ رقم آخر و …) برای تطبیق سریع تماس
CREATE INDEX IF NOT EXISTS "CustomerPhone_number_trgm_idx"
  ON "CustomerPhone" USING GIN ("number" gin_trgm_ops);

-- جست‌وجوی نام/کد محصول — برندهای لاتین (Buderus, Bosch) و نام فارسی
CREATE INDEX IF NOT EXISTS "Product_name_fa_trgm_idx"
  ON "Product" USING GIN (fa_normalize("name") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Product_sku_trgm_idx"
  ON "Product" USING GIN ("sku" gin_trgm_ops);

-- جست‌وجوی عنوان پروژه و موضوع تیکت
CREATE INDEX IF NOT EXISTS "Project_title_fa_trgm_idx"
  ON "Project" USING GIN (fa_normalize("title") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Ticket_subject_fa_trgm_idx"
  ON "Ticket" USING GIN (fa_normalize("subject") gin_trgm_ops);

-- جست‌وجوی متن رونوشت تماس (Whisper) برای دستیار هوشمند
CREATE INDEX IF NOT EXISTS "Call_transcript_fa_trgm_idx"
  ON "Call" USING GIN (fa_normalize("transcript") gin_trgm_ops);
