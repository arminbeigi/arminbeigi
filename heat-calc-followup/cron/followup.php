<?php
/**
 * کرون‌جاب پیگیری — هر ساعت اجرا شود:
 *   0 * * * * php /path/to/heat-calc-followup/cron/followup.php >> /var/log/shofazh/cron.log 2>&1
 *
 * سرنخ‌هایی که بیش از FOLLOWUP_DELAY_MINUTES (پیش‌فرض ۱۴۴۰ = ۲۴ ساعت) دقیقه از محاسبه‌شان گذشته،
 * converted=0 و opted_out=0 و sms2_sent_at IS NULL دارند را پیدا کرده،
 * پیامک دوم (دعوت به مشاوره رایگان) می‌فرستد و sms2_sent_at را ست می‌کند.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('فقط از CLI قابل اجراست.');
}

require_once dirname(__DIR__) . '/src/lead.php';

$pdo = db();

// قفل MySQL برای جلوگیری از اجرای هم‌زمان دو نمونه کرون و ارسال تکراری
$lock = $pdo->query("SELECT GET_LOCK('heat_calc_followup_cron', 0)")->fetchColumn();
if ((int) $lock !== 1) {
    app_log('cron followup: نمونه قبلی هنوز در حال اجراست؛ خروج.');
    exit(0);
}

try {
    $delayMinutes = cfg_int('FOLLOWUP_DELAY_MINUTES', 1440);
    $batchSize    = cfg_int('CRON_BATCH_SIZE', 100);

    $stmt = $pdo->prepare(
        'SELECT id, phone, suggested_model, product_url, optout_token
           FROM heat_calc_leads
          WHERE converted = 0
            AND opted_out = 0
            AND sms2_sent_at IS NULL
            AND sms1_sent_at IS NOT NULL
            AND created_at <= NOW() - INTERVAL ? MINUTE
          ORDER BY created_at
          LIMIT ?'
    );
    $stmt->bindValue(1, $delayMinutes, PDO::PARAM_INT);
    $stmt->bindValue(2, $batchSize, PDO::PARAM_INT);
    $stmt->execute();
    $leads = $stmt->fetchAll();

    $sent = 0;
    $markSent = $pdo->prepare('UPDATE heat_calc_leads SET sms2_sent_at = NOW() WHERE id = ?');

    $salesPhone = cfg('SALES_PHONE', '');

    foreach ($leads as $lead) {
        // لینک کوتاه روی دامنه خود سایت (پوشه s2 در public_html) که با UTM به فروشگاه هدایت می‌کند
        $message = sprintf(
            "سلام دوباره 😊\nهنوز برای انتخاب سیستم گرمایشی مناسب (%s) سوال دارید؟\nکارشناس شوفاژ دات کام رایگان راهنمایی‌تان می‌کند 🤝\n%sسفارش آنلاین 👇\n%s",
            $lead['suggested_model'],
            $salesPhone !== '' ? "📞 $salesPhone\n" : '',
            cfg('SMS2_LINK', 'https://shofazh.com/s2')
        );

        if (send_sms($lead['phone'], $message, 'sms2', (int) $lead['id'])) {
            $markSent->execute([$lead['id']]);
            $sent++;
        } else {
            // ارسال ناموفق به دلیل سقف/فاصله/لغو یا خطای API؛ در اجرای بعدی دوباره تلاش می‌شود.
            // برای جلوگیری از تلاش بی‌نهایت روی شماره‌های به سقف‌رسیده، اگر دلیل سقف بود علامت بزن:
            if (!sms_allowed($lead['phone'])) {
                $markSent->execute([$lead['id']]); // دیگر تلاش نشود
                app_log("cron followup: lead {$lead['id']} به دلیل سقف/لغو از صف خارج شد.");
            }
        }
    }

    app_log(sprintf('cron followup: %d سرنخ بررسی، %d پیامک دوم ارسال شد.', count($leads), $sent));
    echo sprintf("[%s] بررسی‌شده: %d | ارسال‌شده: %d\n", date('Y-m-d H:i:s'), count($leads), $sent);
} finally {
    $pdo->query("SELECT RELEASE_LOCK('heat_calc_followup_cron')");
}
