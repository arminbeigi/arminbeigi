# حافظه‌ی پروژه — یارا / شوفاژ

## دو نسخه‌ی محصول (Edition) — مهم
این یک کد، دو محصول است. نسخه با `gui/edition.py` کنترل می‌شود
(متغیر محیطی `YARA_EDITION` یا فایل `assets/edition.txt`):

| نسخه | برای چه کسی | هاست مرجع فایل | لایسنس |
|------|-------------|----------------|--------|
| **yarapro** (پیش‌فرض) | فروش تجاری از طریق yarapro.ir | https://yarapro.ir | لازم است |
| **shofazh** | استفاده‌ی شخصی خودِ توسعه‌دهنده | https://shofazh.com | لازم نیست |

- نسخه‌ای که برای فروش توسعه داده می‌شود **yarapro** است.
- یک نسخه‌ی شخصی هم برای خودِ کاربر روی **shofazh.com** هست.
- برای ساخت نسخه‌ی شوفاژ: `YARA_EDITION=shofazh bash windows-installer/build_on_linux.sh`
  (یا فایل `assets/edition.txt` با محتوای `shofazh`).

## معماری «ارسال پیامک با لینک پیش‌فاکتور»
هدف: کسب‌وکارهایی که سایت ندارند هم بتوانند پیش‌فاکتور را با پیامک بفرستند.

- **پنل پیامک از خودِ کاربر**: کاربر در تنظیمات، سرویس‌دهنده‌ی خودش را
  انتخاب و اطلاعات همان پنل را وارد می‌کند. پیامک با اعتبار خودِ او می‌رود.
  پشتیبانی: کاوه‌نگار، sms.ir، ملی‌پیامک/فراپیامک، قاصدک، فراز/ippanel، سفارشی.
  کد: `modules/sms_panel.py`
- **آپلود فایل + لینک از ما (پشت‌صحنه)**: فایل PDF روی هاست مرجع
  (yarapro.ir) آپلود می‌شود و لینک کوتاهِ **غیرقابل‌حدس** برمی‌گردد:
  `https://yarapro.ir/f/Xk7mP2qR` (توکن تصادفی ۱۰ حرفی base62 — نه inv-123).
  کاربر این بخش را **نمی‌بیند**. کد: `modules/file_relay.py`
- **افزونه‌ی سرور**: `store/yara-filestore/yara-filestore.php`
  - REST: `POST /wp-json/yara/v1/file` (آپلود، احراز هویت با کلید لایسنس)
  - مسیر: `GET /f/{token}` فایل PDF را سرو می‌کند (rewrite rule)
  - جدول `wp_yara_files` + صفحه‌ی مدیریت «پیش‌فاکتورهای یارا»
  - بعد از نصب حتماً Settings > Permalinks را یک‌بار Save کنید تا `/f/` کار کند.

## نکات فنی موجود
- هاست yarapro.ir فعلاً SSL ندارد → `verify=False` در file_relay و کلاینت‌ها.
- لایسنس فعال در `license.enc`؛ `gui/license.current_key()` کلید را می‌دهد.
- تنظیمات رمزنگاری‌شده در `%APPDATA%/YaraPro/settings.enc`.
- نسخه‌ی قدیمی کاوه‌نگار به‌صورت خودکار به `sms_panel` مهاجرت می‌شود (`_migrate`).
- شاخه‌ی توسعه: `claude/affectionate-keller-hlynaw`. ایمیل کامیت: noreply@anthropic.com.
