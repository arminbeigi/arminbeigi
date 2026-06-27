# راهنمای pipeline تولید محتوا و انتشار خودکار — shofazh.com

## نمای کلی

این pipeline برای سایت WooCommerce شوفاژ دات کام طراحی شده. وقتی Claude اسکیل
`/shofazh-product-page` را اجرا کند، یک صفحه محصول کامل فارسی با SEO، انیمیشن و
structured data تولید می‌شود و به‌صورت خودکار از طریق GitHub Actions روی WordPress
منتشر می‌شود.

```
Claude skill  →  HTML + SEO files  →  git push  →  GitHub Actions  →  WordPress REST API
```

---

## پیش‌نیازها

### ۱. GitHub Secrets

در تنظیمات repo (Settings → Secrets and variables → Actions) دو secret اضافه کنید:

| نام | مقدار |
|-----|-------|
| `WP_USER` | نام کاربری ادمین WordPress (معمولاً `admin`) |
| `WP_APP_PASS` | Application Password — از پنل وردپرس > کاربران > پروفایل > Application Passwords |

برای ساختن Application Password:
1. پنل وردپرس → کاربران → پروفایل
2. پایین صفحه بخش **Application Passwords**
3. یک نام بدهید (مثلاً `GitHub Actions`) و کلیک **Add New Application Password**
4. رمز تولیدشده را در GitHub Secret کپی کنید (فقط یک‌بار نشان داده می‌شود)

### ۲. دسترسی WooCommerce REST API

کاربر باید `Administrator` باشد تا:
- `unfiltered_html` — تگ `<style>` در `content.raw` حفظ شود
- دسترسی WooCommerce REST API (`/wc/v3/`)

---

## ساختار فایل‌ها

```
repo/
├── wp-product-map.json              # نقشه slug → WordPress post-id
├── wp_publish_product.py            # اسکریپت انتشار
├── .github/workflows/
│   └── publish-to-wordpress.yml     # GitHub Actions workflow
├── .claude/skills/shofazh-product-page/
│   └── SKILL.md                     # تعریف اسکیل Claude
│
├── f55-product-content.html         # HTML محصول (خروجی اسکیل)
├── f55-seo.md                       # متادیتای SEO (خروجی اسکیل)
└── ...
```

---

## گام‌به‌گام استفاده

### گام ۱ — اجرای اسکیل

در چت Claude Code تایپ کنید:

```
/shofazh-product-page
```

اسکیل سوالات زیر را می‌پرسد:

1. نام محصول (فارسی و انگلیسی)
2. URL صفحه محصول در سایت
3. برند رقیب برای مقایسه
4. مدل دقیق محصول
5. لینک تصویر محصول
6. دسته‌بندی (مشعل / دیگ / پکیج / ...)
7. **post-id وردپرس** — از پنل WP > محصولات > ویرایش محصول > URL شامل `post=XXXX`

### گام ۲ — تصویر محصول

اسکیل یک prompt برای تولید تصویر می‌دهد. تصویر را بسازید و لینک آن را بدهید.

### گام ۳ — دریافت فایل‌ها

اسکیل دو فایل تولید می‌کند:
- `{slug}-product-content.html` — صفحه کامل محصول
- `{slug}-seo.md` — متادیتای SEO

و به‌صورت خودکار `wp-product-map.json` را با post-id جدید آپدیت می‌کند.

### گام ۴ — push (خودکار)

اسکیل فایل‌ها را commit و push می‌کند. GitHub Actions شروع می‌شود.

### گام ۵ — انتشار خودکار

GitHub Actions:
1. فایل‌های `*-product-content.html` تغییریافته را شناسایی می‌کند
2. slug را از نام فایل استخراج می‌کند (`f55-product-content.html` → slug=`f55`)
3. post-id را از `wp-product-map.json` می‌خواند
4. `wp_publish_product.py` را اجرا می‌کند

---

## wp_publish_product.py — چه کاری انجام می‌دهد

```
1. قیمت محصول را از WooCommerce API می‌گیرد
2. قیمت را به JSON-LD (offers.price) تزریق می‌کند
3. SEO metadata از فایل .md می‌خواند
4. HTML را با WP REST API (content.raw) منتشر می‌کند — تگ <style> حفظ می‌شود
5. Elementor را برای این صفحه غیرفعال می‌کند (_elementor_edit_mode="")
6. Rank Math SEO meta fields را ست می‌کند
```

**چرا WP REST API و نه WooCommerce REST API؟**

WooCommerce API فیلد `description` را از فیلتر `wp_filter_post_kses()` رد می‌کند که
تگ `<style>` را strip می‌کند. WP REST API با `content.raw` برای ادمین‌ها `unfiltered_html`
را حفظ می‌کند.

---

## wp-product-map.json

نقشه‌ای از slug محصول به post-id وردپرس:

```json
{
  "_note": "slug → WordPress post-id. null = post-id not yet provided, action will skip.",
  "f55": 4525,
  "f88": null,
  "ran25": null
}
```

- `null` = post-id هنوز تنظیم نشده → GitHub Actions آن را skip می‌کند
- عدد = post-id معتبر → انتشار می‌شود

برای پیدا کردن post-id:
```
پنل وردپرس → محصولات → روی محصول کلیک کنید → URL شامل ?post=XXXX
```

یا از اسکریپت:
```bash
WP_APP_PASS="xxxx xxxx xxxx xxxx xxxx xxxx" \
python3 wp_publish_product.py --find-product "F88"
```

---

## اجرای دستی (بدون GitHub Actions)

```bash
export WP_USER="admin"
export WP_APP_PASS="xxxx xxxx xxxx xxxx xxxx xxxx"

python3 wp_publish_product.py \
  --html f55-product-content.html \
  --seo f55-seo.md \
  --post-id 4525
```

تست بدون ارسال:
```bash
python3 wp_publish_product.py --html f55-product-content.html --post-id 4525 --dry-run
```

---

## نکات مهم

| موضوع | توضیح |
|-------|-------|
| **کش سایت** | بعد از انتشار اگر محتوا عوض نشد، کش WP Rocket / LiteSpeed را پاک کنید |
| **Elementor** | برای صفحاتی که با این pipeline منتشر می‌شوند، Elementor غیرفعال می‌شود |
| **قیمت** | قیمت باید در پنل WooCommerce محصول تنظیم شده باشد تا در JSON-LD نمایش یابد |
| **تگ style** | فقط با WP REST API و کاربر Administrator حفظ می‌شود |
| **SEO** | متادیتا برای Rank Math و Yoast هر دو ست می‌شود (هر کدام فعال باشد کار می‌کند) |

---

## اضافه کردن محصول جدید

۱. اسکیل `/shofazh-product-page` را اجرا کنید  
۲. post-id محصول جدید را از پنل WP بگیرید  
۳. اسکیل به‌صورت خودکار `wp-product-map.json` را آپدیت می‌کند  
۴. push → GitHub Actions → منتشر شد  

---

## محصولات فعلی

| slug | post-id | وضعیت |
|------|---------|--------|
| `f55` | 4525 | ✅ منتشرشده |
| `f88` | — | post-id نیاز دارد |
| `ran25` | — | post-id نیاز دارد |
