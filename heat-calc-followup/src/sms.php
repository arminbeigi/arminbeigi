<?php
/**
 * Wrapper ارسال پیامک روی API پنل پیامکی با cURL.
 * - URL و کلید API از متغیر محیطی خوانده می‌شود (SMS_API_URL ،SMS_API_KEY ،SMS_SENDER).
 * - پاسخ API و کد HTTP در جدول sms_log و فایل لاگ ثبت می‌شود.
 * - قبل از ارسال، سقف تعداد پیامک و حداقل فاصله ارسال به هر شماره چک می‌شود.
 *
 * بدنه‌ی درخواست مطابق پنل‌های رایج ایرانی (کاوه‌نگار/ملی‌پیامک/SMS.ir) است؛
 * در صورت تفاوت، فقط آرایه $payload و هدر Authorization را با مستندات پنل خود تطبیق دهید.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * بررسی مجاز بودن ارسال به شماره (سقف تعداد + حداقل فاصله + لغو دریافت).
 */
function sms_allowed(string $phone): bool
{
    $pdo = db();

    // اگر شماره در هر سرنخی لغو دریافت زده باشد، هرگز ارسال نشود
    $stmt = $pdo->prepare('SELECT 1 FROM heat_calc_leads WHERE phone = ? AND opted_out = 1 LIMIT 1');
    $stmt->execute([$phone]);
    if ($stmt->fetchColumn()) {
        return false;
    }

    $capWindowDays = cfg_int('SMS_CAP_WINDOW_DAYS', 30);
    $maxPerNumber  = cfg_int('MAX_SMS_PER_NUMBER', 3);
    $minIntervalH  = cfg_int('MIN_SMS_INTERVAL_HOURS', 20);

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS cnt, MAX(created_at) AS last_sent
           FROM sms_log
          WHERE phone = ? AND success = 1
            AND created_at >= NOW() - INTERVAL ? DAY'
    );
    $stmt->execute([$phone, $capWindowDays]);
    $row = $stmt->fetch();

    if ((int) $row['cnt'] >= $maxPerNumber) {
        return false;
    }
    if ($row['last_sent'] !== null
        && strtotime($row['last_sent']) > time() - $minIntervalH * 3600) {
        return false;
    }
    return true;
}

/**
 * ارسال پیامک و لاگ کامل پاسخ.
 *
 * @param string   $phone   شماره گیرنده (09xxxxxxxxx)
 * @param string   $message متن پیامک
 * @param string   $smsType برچسب نوع پیامک برای لاگ (sms1 / sms2 / other)
 * @param int|null $leadId  شناسه سرنخ مرتبط (برای لاگ)
 * @return bool موفقیت ارسال
 */
function send_sms(string $phone, string $message, string $smsType = 'other', ?int $leadId = null): bool
{
    if (!preg_match('/^09\d{9}$/', $phone)) {
        app_log("send_sms: شماره نامعتبر رد شد: $phone");
        return false;
    }

    if (!sms_allowed($phone)) {
        app_log("send_sms: ارسال به $phone به دلیل سقف/فاصله/لغو دریافت متوقف شد (نوع: $smsType)");
        return false;
    }

    $payload = [
        'receptor' => $phone,
        'sender'   => cfg('SMS_SENDER'),
        'message'  => $message,
    ];

    $ch = curl_init(cfg('SMS_API_URL'));
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Bearer ' . cfg('SMS_API_KEY'),
        ],
    ]);

    $response  = curl_exec($ch);
    $httpCode  = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $success = $response !== false && $httpCode >= 200 && $httpCode < 300;
    $apiResponse = $response !== false ? (string) $response : "cURL error: $curlError";

    db()->prepare(
        'INSERT INTO sms_log (lead_id, phone, sms_type, message, http_code, api_response, success)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $leadId,
        $phone,
        $smsType,
        $message,
        $httpCode ?: null,
        mb_substr($apiResponse, 0, 5000),
        $success ? 1 : 0,
    ]);

    app_log(sprintf(
        'send_sms [%s] to=%s lead=%s http=%d success=%s response=%s',
        $smsType,
        $phone,
        $leadId ?? '-',
        $httpCode,
        $success ? 'yes' : 'no',
        mb_substr($apiResponse, 0, 300)
    ));

    return $success;
}

/** افزودن پارامتر UTM به لینک محصول برای سنجش نرخ تبدیل هر پیامک. */
function add_utm(string $url, string $campaign): string
{
    $utm = http_build_query([
        'utm_source'   => 'sms',
        'utm_medium'   => 'sms',
        'utm_campaign' => $campaign,
    ]);
    return $url . (str_contains($url, '?') ? '&' : '?') . $utm;
}

/** ساخت لینک لغو دریافت پیامک برای یک سرنخ. */
function optout_link(string $token): string
{
    return rtrim(cfg('SITE_BASE_URL', 'https://shofazh.com'), '/')
        . '/api/optout.php?t=' . $token;
}
