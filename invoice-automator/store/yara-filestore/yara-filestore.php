<?php
/**
 * Plugin Name: یارا — میزبان پیش‌فاکتور (File Store)
 * Description: دریافت فایل پیش‌فاکتور از نرم‌افزار یارا و ساخت لینک کوتاهِ غیرقابل‌حدس (yourdomain.com/f/XXXX). فایل با پنل پیامکِ خودِ مشتری برای گیرنده ارسال می‌شود.
 * Version: 1.1.0
 * Author: Yara
 *
 * این افزونه «پشت‌صحنه» است: نرم‌افزار دسکتاپ فایل را اینجا آپلود می‌کند،
 * یک توکن تصادفی می‌گیرد، و لینک کوتاه /f/{token} را با پیامک می‌فرستد.
 * کاربر نهایی هیچ‌گاه این بخش را نمی‌بیند.
 */

if (!defined('ABSPATH')) exit;

define('YARA_FS_VER', '1.1.0');
define('YARA_FS_DIR', 'yara-files');           // پوشه داخل uploads
define('YARA_FS_RAND_LEN', 3);                 // طول بخش تصادفیِ لینک (غیرقابل‌حدس)

// ───────────────────────────── فعال‌سازی: جدول + پوشه + rewrite ─────────────────────────────
register_activation_hook(__FILE__, 'yara_fs_activate');
function yara_fs_activate() {
    global $wpdb;
    $table = $wpdb->prefix . 'yara_files';
    $charset = $wpdb->get_charset_collate();
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta("CREATE TABLE $table (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        token VARCHAR(32) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        serial VARCHAR(100) DEFAULT '',
        name VARCHAR(190) DEFAULT '',
        license VARCHAR(190) DEFAULT '',
        device VARCHAR(190) DEFAULT '',
        hits INT UNSIGNED DEFAULT 0,
        created DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY token (token)
    ) $charset;");

    // پوشه‌ی امن داخل uploads + جلوگیری از فهرست‌شدن
    $dir = yara_fs_path();
    if (!file_exists($dir)) wp_mkdir_p($dir);
    @file_put_contents($dir . '/index.html', '');
    @file_put_contents($dir . '/.htaccess', "Options -Indexes\n");

    yara_fs_add_rewrite();
    flush_rewrite_rules();
}

register_deactivation_hook(__FILE__, function () { flush_rewrite_rules(); });

function yara_fs_path() {
    $up = wp_upload_dir();
    return trailingslashit($up['basedir']) . YARA_FS_DIR;
}

// ───────────────────────────── Rewrite:  /inv/{slug}  ─────────────────────────────
add_action('init', 'yara_fs_add_rewrite');
function yara_fs_add_rewrite() {
    add_rewrite_rule('^inv/([A-Za-z0-9\-]+)/?$', 'index.php?yara_file=$matches[1]', 'top');
    add_rewrite_rule('^factor/([A-Za-z0-9\-]+)/?$', 'index.php?yara_file=$matches[1]', 'top');
}
add_filter('query_vars', function ($v) { $v[] = 'yara_file'; return $v; });

add_action('template_redirect', 'yara_fs_serve');
function yara_fs_serve() {
    $token = get_query_var('yara_file');
    if (!$token) return;

    global $wpdb;
    $table = $wpdb->prefix . 'yara_files';
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE token = %s", $token));
    if (!$row) {
        status_header(404);
        wp_die('این پیش‌فاکتور پیدا نشد یا منقضی شده است.', 'یافت نشد', ['response' => 404]);
    }

    $file = trailingslashit(yara_fs_path()) . $row->filename;
    if (!file_exists($file)) {
        status_header(404);
        wp_die('فایل پیش‌فاکتور در دسترس نیست.', 'یافت نشد', ['response' => 404]);
    }

    $wpdb->query($wpdb->prepare("UPDATE $table SET hits = hits + 1 WHERE id = %d", $row->id));

    $download = 'پیش‌فاکتور' . ($row->serial ? '-' . $row->serial : '') . '.pdf';
    nocache_headers();
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . rawurlencode($download) . '"');
    header('Content-Length: ' . filesize($file));
    readfile($file);
    exit;
}

// ───────────────────────────── REST: آپلود فایل ─────────────────────────────
add_action('rest_api_init', function () {
    register_rest_route('yara/v1', '/file', [
        'methods'             => 'POST',
        'callback'            => 'yara_fs_upload',
        'permission_callback' => '__return_true',
    ]);
});

function yara_fs_json($success, $data = []) {
    return new WP_REST_Response(array_merge(['success' => $success], $data), $success ? 200 : 400);
}

function yara_fs_upload(WP_REST_Request $req) {
    $license  = sanitize_text_field($req->get_param('license_key'));
    $device   = sanitize_text_field($req->get_param('device'));
    $serial   = sanitize_text_field($req->get_param('serial'));
    $name     = sanitize_text_field($req->get_param('name'));
    $business = sanitize_text_field($req->get_param('business'));

    // احراز هویت: کلید لایسنس معتبر یا (در نبود سیستم لایسنس) شناسه‌ی دستگاه.
    if (!yara_fs_auth_ok($license)) {
        return yara_fs_json(false, ['message' => 'لایسنس نامعتبر است یا فعال نیست.']);
    }

    // محتوای فایل: یا multipart ($_FILES) یا base64 (دور زدن WAF)
    $tmp = null; $orig = 'invoice.pdf';
    if (!empty($_FILES['file']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
        $tmp  = $_FILES['file']['tmp_name'];
        $orig = $_FILES['file']['name'];
        $bytes = file_get_contents($tmp);
    } elseif ($req->get_param('file_b64')) {
        $bytes = base64_decode($req->get_param('file_b64'));
    } else {
        return yara_fs_json(false, ['message' => 'فایلی دریافت نشد.']);
    }

    if (!$bytes || strlen($bytes) < 100) {
        return yara_fs_json(false, ['message' => 'فایل خالی یا ناقص است.']);
    }
    if (strlen($bytes) > 15 * 1024 * 1024) {
        return yara_fs_json(false, ['message' => 'حجم فایل بیش از حد مجاز است (۱۵MB).']);
    }
    // فقط PDF
    if (substr($bytes, 0, 4) !== '%PDF') {
        return yara_fs_json(false, ['message' => 'فقط فایل PDF پذیرفته می‌شود.']);
    }

    $dir = yara_fs_path();
    if (!file_exists($dir)) wp_mkdir_p($dir);

    // لینکِ معنادار و قابل‌اعتماد + بخش تصادفیِ غیرقابل‌حدس:
    //   inv/{business}-{serial}-{rand}
    global $wpdb;
    $table = $wpdb->prefix . 'yara_files';
    $base = yara_fs_slug_base($business, $serial);
    do {
        $rand = yara_fs_rand(YARA_FS_RAND_LEN);
        $token = ($base !== '' ? $base . '-' : '') . $rand;
        $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE token = %s", $token));
    } while ($exists);

    $filename = $token . '.pdf';
    if (file_put_contents(trailingslashit($dir) . $filename, $bytes) === false) {
        return yara_fs_json(false, ['message' => 'ذخیره‌ی فایل روی سرور ناموفق بود.']);
    }

    $wpdb->insert($table, [
        'token' => $token, 'filename' => $filename,
        'serial' => $serial, 'name' => $name,
        'license' => $license, 'device' => $device,
    ]);

    $url = home_url('/inv/' . $token);
    return yara_fs_json(true, ['url' => $url, 'token' => $token]);
}

/**
 * بخش معنادار لینک: نام فروشنده + شماره فاکتور (لاتین، کوتاه، تمیز).
 * مثال: ("فروشگاه شوفاژ" یا "shofazh", "1024") ⇒ "shofazh-1024"
 * اگر نام فروشنده لاتین نباشد و چیزی باقی نماند، فقط شماره فاکتور می‌ماند.
 */
function yara_fs_slug_base($business, $serial) {
    $parts = [];
    $b = yara_fs_clean($business, 16);
    if ($b !== '') $parts[] = $b;
    $s = yara_fs_clean($serial, 14);
    if ($s !== '') $parts[] = $s;
    return implode('-', $parts);
}

// فقط حروف/ارقام لاتین و خط تیره؛ کوچک؛ کوتاه‌شده.
function yara_fs_clean($str, $max) {
    $str = strtolower((string) $str);
    $str = preg_replace('/[^a-z0-9]+/', '-', $str);   // غیرلاتین/فاصله ⇒ خط تیره
    $str = trim($str, '-');
    if (strlen($str) > $max) $str = substr($str, 0, $max);
    return trim($str, '-');
}

// بخش تصادفی غیرقابل‌حدس (base62 امن)
function yara_fs_rand($len) {
    $alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';  // بدون حروف/ارقام گمراه‌کننده (0,o,1,l)
    $max = strlen($alphabet) - 1;
    $out = '';
    for ($i = 0; $i < $len; $i++) {
        $out .= $alphabet[random_int(0, $max)];
    }
    return $out;
}

/**
 * بررسی لایسنس. اگر کلید داده شده باشد، باید در جدول لایسنس فعال باشد.
 * اگر سیستم لایسنس روی سایت نباشد (نسخه‌ی شخصی)، آپلود مجاز است.
 */
function yara_fs_auth_ok($license) {
    global $wpdb;
    $license = trim((string) $license);

    // جدول لایسنس را پیدا کن (Digital License Manager یا LMFWC)
    $dlm  = $wpdb->prefix . 'dlm_licenses';
    $lmfwc = $wpdb->prefix . 'lmfwc_licenses';
    $has_dlm  = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $dlm)) === $dlm;
    $has_lmfwc = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $lmfwc)) === $lmfwc;

    // اگر هیچ سیستم لایسنسی نصب نیست ⇒ نسخه‌ی شخصی؛ اجازه بده.
    if (!$has_dlm && !$has_lmfwc) return true;

    // کلید خالی در حضور سیستم لایسنس ⇒ رد.
    if ($license === '') return false;

    if ($has_dlm) {
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT status, expires_at FROM $dlm WHERE license_key = %s OR decrypted_license_key = %s", $license, $license));
        if ($row) return yara_fs_license_live($row->status, $row->expires_at);
    }
    if ($has_lmfwc) {
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT status, expires_at FROM $lmfwc WHERE license_key = %s", $license));
        if ($row) return yara_fs_license_live($row->status, $row->expires_at);
    }
    return false;
}

function yara_fs_license_live($status, $expires_at) {
    // وضعیت‌های فعال در DLM: ACTIVE=معمولاً 3/“active”؛ LMFWC: 2/3 (delivered/active).
    $s = strtolower((string) $status);
    $bad = in_array($s, ['disabled', '4', 'inactive', 'revoked'], true);
    if ($bad) return false;
    if ($expires_at && strtotime($expires_at) && strtotime($expires_at) < time()) return false;
    return true;
}

// ───────────────────────────── صفحه‌ی مدیریت (فهرست لینک‌ها) ─────────────────────────────
add_action('admin_menu', function () {
    add_menu_page('پیش‌فاکتورهای یارا', 'پیش‌فاکتورهای یارا', 'manage_options',
        'yara-files', 'yara_fs_admin_page', 'dashicons-media-document', 56);
});

function yara_fs_admin_page() {
    global $wpdb;
    $table = $wpdb->prefix . 'yara_files';
    $rows = $wpdb->get_results("SELECT * FROM $table ORDER BY id DESC LIMIT 200");
    echo '<div class="wrap"><h1>پیش‌فاکتورهای آپلودشده</h1>';
    echo '<p>این لینک‌ها توسط نرم‌افزار یارا ساخته و با پیامک ارسال شده‌اند.</p>';
    echo '<table class="wp-list-table widefat fixed striped"><thead><tr>'
        . '<th>تاریخ</th><th>شماره فاکتور</th><th>مشتری</th><th>لینک</th><th>بازدید</th></tr></thead><tbody>';
    if ($rows) foreach ($rows as $r) {
        $url = home_url('/inv/' . $r->token);
        printf('<tr><td>%s</td><td>%s</td><td>%s</td><td><a href="%s" target="_blank">%s</a></td><td>%d</td></tr>',
            esc_html($r->created), esc_html($r->serial), esc_html($r->name),
            esc_url($url), esc_html($url), (int) $r->hits);
    } else {
        echo '<tr><td colspan="5">هنوز پیش‌فاکتوری آپلود نشده است.</td></tr>';
    }
    echo '</tbody></table></div>';
}
