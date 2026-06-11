# سیستم پیگیری خودکار سرنخ‌های ابزار محاسبه بار حرارتی — shofazh.com

کاربری که بار حرارتی را محاسبه می‌کند ولی سفارش نمی‌دهد، با دو پیامک خودکار پیگیری می‌شود:

| پیامک | زمان | محتوا | UTM |
|---|---|---|---|
| ۱ | فوری، هنگام محاسبه | نتیجه بار حرارتی + مدل و تعداد پره پیشنهادی + لینک خرید | `utm_campaign=heatcalc_sms1` |
| ۲ | ۲۴ ساعت بعد (اگر سفارش/تماس نداشت) | دعوت به مشاوره رایگان + لینک سفارش | `utm_campaign=heatcalc_sms2` |

هر دو پیامک لینک لغو دریافت دارند.

## ساختار فایل‌ها

```
heat-calc-followup/
├── schema.sql                 ← جدول‌های heat_calc_leads و sms_log
├── .env.example               ← نمونه تنظیمات (کپی کنید به .env)
├── src/
│   ├── config.php             ← بارگذاری .env / متغیرهای محیطی + لاگ
│   ├── db.php                 ← اتصال PDO
│   ├── sms.php                ← send_sms با cURL + لاگ پاسخ API + سقف ارسال
│   └── lead.php               ← ذخیره سرنخ، پیامک اول، تبدیل، لغو دریافت
├── public/api/
│   ├── save-lead.php          ← POST: ثبت سرنخ + پیامک اول (با rate limit)
│   ├── optout.php             ← GET لینک لغو / POST webhook کلیدواژه «لغو»
│   └── convert.php            ← POST: ثبت سفارش/تماس (converted=1)
├── cron/
│   └── followup.php           ← کرون ساعتی پیامک دوم
└── frontend-snippet.html      ← فرم شماره موبایل برای صفحه محاسبه‌گر
```

## راه‌اندازی

### ۱. دیتابیس
```bash
mysql -u root -p shofazh < schema.sql
```

### ۲. تنظیمات
```bash
cp .env.example .env
chmod 600 .env        # فقط وب‌سرور بخواند
```
مقادیر دیتابیس، `SMS_API_URL`، `SMS_API_KEY`، `SMS_SENDER` و `CONVERT_API_SECRET` را پر کنید.
فایل `.env` **نباید** داخل webroot یا گیت باشد (در `.gitignore` است).

> بدنه‌ی درخواست در `src/sms.php` با فرمت رایج پنل‌های ایرانی
> (receptor / sender / message + هدر Bearer) نوشته شده؛ اگر پنل شما فرمت
> دیگری دارد فقط آرایه `$payload` و هدر Authorization را تطبیق دهید.

### ۳. کرون‌جاب (هر ساعت)
```cron
0 * * * * php /path/to/heat-calc-followup/cron/followup.php >> /var/log/shofazh/cron.log 2>&1
```
کرون با `GET_LOCK` در برابر اجرای هم‌زمان محافظت شده و ارسال تکراری اتفاق نمی‌افتد.

### ۴. اتصال به محاسبه‌گر
محتویات `frontend-snippet.html` را بعد از باکس نتیجه‌ی محاسبه قرار دهید و
آبجکت `window.hcResult` را از خروجی واقعی محاسبه‌گر پر کنید:
```js
window.hcResult = { heatLoad: 18500, model: 'ایران رادیاتور RAN25', fins: 14,
                    productUrl: 'https://shofazh.com/product/ran25' };
```

### ۵. ثبت تبدیل (سفارش یا تماس)
هر جا سفارش ثبت می‌شود (مثلاً هوک `woocommerce_thankyou`) یا اپراتور تماس را ثبت می‌کند:
```php
// سمت سرور (همان هاست): مستقیم تابع را صدا بزنید
require '/path/to/heat-calc-followup/src/lead.php';
mark_converted('09123456789');
```
یا از راه دور:
```bash
curl -X POST https://shofazh.com/api/convert.php \
  -H 'X-Api-Secret: مقدار-CONVERT_API_SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"phone":"09123456789"}'
```

### ۶. webhook لغو با کلیدواژه (اختیاری)
اگر پنل پیامکی پیام‌های دریافتی (MO) را به URL شما POST می‌کند، آدرس
`https://shofazh.com/api/optout.php` را در پنل ثبت کنید؛ پیام‌های حاوی
«لغو/انصراف/off/stop» شماره فرستنده را opted_out می‌کنند.

## کنترل‌های ضد سوءاستفاده (قابل تنظیم در .env)

- **Rate limit فرم:** حداکثر `RATE_LIMIT_PER_IP_HOUR` ثبت از هر IP در ساعت و `RATE_LIMIT_PER_PHONE_DAY` ثبت برای هر شماره در روز.
- **سقف پیامک:** حداکثر `MAX_SMS_PER_NUMBER` پیامک به هر شماره در `SMS_CAP_WINDOW_DAYS` روز.
- **فاصله ارسال:** حداقل `MIN_SMS_INTERVAL_HOURS` ساعت بین دو پیامک به یک شماره.
- **لغو دریافت:** لینک توکن‌دار در هر پیامک + کلیدواژه؛ شماره‌ی opted_out هرگز پیامک نمی‌گیرد (در `send_sms` هم چک می‌شود).

## سنجش نرخ تبدیل

لینک هر پیامک پارامتر UTM دارد (`heatcalc_sms1` / `heatcalc_sms2`)؛ در گوگل آنالیتیکس قابل تفکیک است. کوئری نمونه برای گزارش داخلی:

```sql
SELECT
  COUNT(*)                                            AS total_leads,
  SUM(sms1_sent_at IS NOT NULL)                       AS sms1_sent,
  SUM(sms2_sent_at IS NOT NULL)                       AS sms2_sent,
  SUM(converted = 1)                                  AS converted,
  ROUND(100 * SUM(converted = 1) / COUNT(*), 1)       AS conversion_pct,
  SUM(opted_out = 1)                                  AS opted_out
FROM heat_calc_leads
WHERE created_at >= NOW() - INTERVAL 30 DAY;
```
