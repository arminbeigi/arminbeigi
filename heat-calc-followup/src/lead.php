<?php
/**
 * منطق سرنخ‌ها: ذخیره + پیامک اول، به‌روزرسانی تبدیل، لغو دریافت.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/sms.php';

/** اعتبارسنجی شماره موبایل ایرانی. */
function valid_iranian_mobile(string $phone): bool
{
    return (bool) preg_match('/^09\d{9}$/', $phone);
}

/**
 * rate limit فرم ثبت شماره: سقف ثبت از هر IP در ساعت و هر شماره در روز.
 */
function lead_rate_limited(string $phone, string $ip): bool
{
    $pdo = db();

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM heat_calc_leads
          WHERE ip_address = INET6_ATON(?) AND created_at >= NOW() - INTERVAL 1 HOUR'
    );
    $stmt->execute([$ip]);
    if ((int) $stmt->fetchColumn() >= cfg_int('RATE_LIMIT_PER_IP_HOUR', 5)) {
        return true;
    }

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM heat_calc_leads
          WHERE phone = ? AND created_at >= NOW() - INTERVAL 1 DAY'
    );
    $stmt->execute([$phone]);
    return (int) $stmt->fetchColumn() >= cfg_int('RATE_LIMIT_PER_PHONE_DAY', 2);
}

/**
 * ذخیره سرنخ و ارسال فوری پیامک اول (نتیجه محاسبه + لینک محصول).
 *
 * @param string $phone          شماره موبایل (09xxxxxxxxx)
 * @param int    $heatLoad       نتیجه بار حرارتی
 * @param string $suggestedModel مدل پیشنهادی
 * @param int    $suggestedFins  تعداد پره پیشنهادی
 * @param string $productUrl     لینک محصول (بدون UTM)
 * @param string $ip             IP کاربر برای rate limit
 * @return array{ok: bool, error?: string, lead_id?: int}
 */
function save_lead_and_send_sms1(
    string $phone,
    int $heatLoad,
    string $suggestedModel,
    int $suggestedFins,
    string $productUrl,
    string $ip
): array {
    if (!valid_iranian_mobile($phone)) {
        return ['ok' => false, 'error' => 'شماره موبایل معتبر نیست. فرمت صحیح: 09xxxxxxxxx'];
    }
    if ($heatLoad <= 0 || $suggestedModel === ''
        || !filter_var($productUrl, FILTER_VALIDATE_URL)) {
        return ['ok' => false, 'error' => 'اطلاعات محاسبه ناقص است.'];
    }
    if (lead_rate_limited($phone, $ip)) {
        return ['ok' => false, 'error' => 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید.'];
    }

    $pdo   = db();
    $token = bin2hex(random_bytes(16));

    $pdo->prepare(
        'INSERT INTO heat_calc_leads
            (phone, heat_load, suggested_model, suggested_fins, product_url, ip_address, optout_token)
         VALUES (?, ?, ?, ?, ?, INET6_ATON(?), ?)'
    )->execute([$phone, $heatLoad, $suggestedModel, $suggestedFins, $productUrl, $ip, $token]);

    $leadId = (int) $pdo->lastInsertId();

    // لینک کوتاه روی دامنه خود سایت (پوشه s1 در public_html) که با UTM به فروشگاه هدایت می‌کند
    // لغو دریافت از طریق «لغو11» خود کاوه‌نگار انجام می‌شود؛ لینک لغو در متن نیست
    $message = sprintf(
        "سلام 🌹\nنتیجه محاسبه شما در شوفاژ دات کام آماده‌ست:\n🔥 بار حرارتی: %s BTU/h\n✅ پیشنهاد ما: %s%s\nمشاهده و خرید 👇\n%s",
        number_format($heatLoad),
        $suggestedModel,
        $suggestedFins > 0 ? " ({$suggestedFins} پره)" : '',
        cfg('SMS1_LINK', 'https://shofazh.com/s1')
    );

    if (send_sms($phone, $message, 'sms1', $leadId)) {
        $pdo->prepare('UPDATE heat_calc_leads SET sms1_sent_at = NOW() WHERE id = ?')
            ->execute([$leadId]);
    }

    return ['ok' => true, 'lead_id' => $leadId];
}

/**
 * علامت‌گذاری تبدیل: کاربر سفارش داد یا تماس گرفت.
 * همه‌ی سرنخ‌های آن شماره converted=1 می‌شوند تا پیامک پیگیری نگیرد.
 *
 * @return int تعداد رکوردهای به‌روزشده
 */
function mark_converted(string $phone): int
{
    if (!valid_iranian_mobile($phone)) {
        return 0;
    }
    $stmt = db()->prepare(
        'UPDATE heat_calc_leads SET converted = 1 WHERE phone = ? AND converted = 0'
    );
    $stmt->execute([$phone]);
    app_log("mark_converted: phone=$phone rows={$stmt->rowCount()}");
    return $stmt->rowCount();
}

/** لغو دریافت با توکن لینک داخل پیامک. همه‌ی سرنخ‌های همان شماره opted_out می‌شوند. */
function opt_out_by_token(string $token): bool
{
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
        return false;
    }
    $pdo  = db();
    $stmt = $pdo->prepare('SELECT phone FROM heat_calc_leads WHERE optout_token = ? LIMIT 1');
    $stmt->execute([$token]);
    $phone = $stmt->fetchColumn();
    if ($phone === false) {
        return false;
    }
    return opt_out_by_phone((string) $phone);
}

/** لغو دریافت با شماره (مثلاً از webhook کلیدواژه «لغو» پنل پیامکی). */
function opt_out_by_phone(string $phone): bool
{
    if (!valid_iranian_mobile($phone)) {
        return false;
    }
    db()->prepare('UPDATE heat_calc_leads SET opted_out = 1 WHERE phone = ?')
        ->execute([$phone]);
    app_log("opt_out: phone=$phone");
    return true;
}
