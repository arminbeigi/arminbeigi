<?php
/**
 * Plugin Name: Yara License Endpoint
 * Description: نقطه‌ی پایانی فعال‌سازی لایسنس نرم‌افزار «یارا» (اتصال به License Manager for WooCommerce).
 * Version: 1.0.0
 * Author: Shofazh
 *
 * نصب: این فایل را در پوشه‌ی wp-content/mu-plugins/ قرار دهید
 *      (اگر پوشه نبود، بسازید). نیازی به فعال‌سازی دستی ندارد.
 *
 * پیش‌نیاز: افزونه‌ی «License Manager for WooCommerce» نصب و فعال باشد و
 *          محصولات شما کلید لایسنس تولید کنند.
 *
 * نرم‌افزار یارا این آدرس را صدا می‌زند:
 *   POST https://yarapro.ir/wp-json/yara/v1/activate
 *   body: { "license_key": "...", "device": "..." }
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('yara/v1', '/activate', [
        'methods'  => 'POST',
        'callback' => 'yara_activate_license',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('yara/v1', '/validate', [
        'methods'  => 'POST',
        'callback' => 'yara_validate_license',
        'permission_callback' => '__return_true',
    ]);
});

/** نگاشت شناسه‌ی محصول به نام پلن (در صورت نیاز ویرایش کنید) */
function yara_plan_name($product_id) {
    $map = [
        // 123 => 'پایه',
        // 124 => 'حرفه‌ای',
        // 125 => 'کسب‌وکار',
    ];
    return $map[$product_id] ?? 'حرفه‌ای';
}

/**
 * گرفتن لایسنس از دیتابیس (سازگار با Digital License Manager + License Manager for WooCommerce).
 * چون نام تابع‌های دو افزونه متفاوت است، مستقیماً از دیتابیس کوئری می‌زنیم.
 * این کار افزونه را از تغییرات نسخه‌های آینده‌ی هر دو افزونه مستقل می‌کند.
 */
function yara_get_license_or_error($key) {
    global $wpdb;
    // اول جدول Digital License Manager را امتحان کن، بعد lmfwc قدیمی
    $tables = [$wpdb->prefix . 'dlm_licenses', $wpdb->prefix . 'lmfwc_licenses'];
    foreach ($tables as $table) {
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = %s AND table_name = %s",
            DB_NAME, $table));
        if (!$exists) continue;
        // کلید در دیتابیس به‌صورت hash یا plain ذخیره می‌شود
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM `{$table}` WHERE license_key = %s OR hash = %s LIMIT 1",
            $key, hash('sha256', $key)));
        if ($row) {
            $row->_table = $table;
            return $row;
        }
    }
    return new WP_Error('not_found', 'کلید لایسنس یافت نشد یا افزونه‌ی مدیریت لایسنس نصب نیست.');
}

function yara_license_payload($license) {
    // فیلد expires_at در هر دو افزونه یکسان است
    $expires_epoch = !empty($license->expires_at) ? strtotime($license->expires_at) : null;
    $product_id = !empty($license->product_id) ? (int)$license->product_id : 0;
    return [
        'expires_at' => $expires_epoch,
        'plan'       => yara_plan_name($product_id),
    ];
}

function yara_activate_license(WP_REST_Request $req) {
    $key    = sanitize_text_field($req->get_param('license_key'));
    $device = sanitize_text_field($req->get_param('device'));
    if (!$key || !$device) {
        return ['success' => false, 'message' => 'کلید یا شناسه‌ی دستگاه ارسال نشده.'];
    }

    $license = yara_get_license_or_error($key);
    if (is_wp_error($license)) {
        return ['success' => false, 'message' => $license->get_error_message()];
    }

    // بررسی انقضا
    $payload = yara_license_payload($license);
    if ($payload['expires_at'] && $payload['expires_at'] < time()) {
        return ['success' => false, 'message' => 'لایسنس منقضی شده است.'];
    }

    // مدیریت دستگاه‌ها (محدودیت تعداد فعال‌سازی)
    $max = !empty($license->activations_limit) ? (int)$license->activations_limit
        : (!empty($license->times_activated_max) ? (int)$license->times_activated_max : 1);
    if ($max <= 0) $max = 1;

    $devices = get_option("yara_devices_{$key}", []);
    if (!is_array($devices)) $devices = [];

    if (!in_array($device, $devices, true)) {
        if (count($devices) >= $max) {
            return ['success' => false,
                    'message' => "این کلید روی حداکثر دستگاه مجاز ({$max}) فعال شده است."];
        }
        $devices[] = $device;
        update_option("yara_devices_{$key}", $devices, false);
    }

    return [
        'success'    => true,
        'message'    => 'فعال‌سازی موفق بود.',
        'plan'       => $payload['plan'],
        'expires_at' => $payload['expires_at'],
        'devices'    => count($devices),
        'max'        => $max,
    ];
}

function yara_validate_license(WP_REST_Request $req) {
    $key    = sanitize_text_field($req->get_param('license_key'));
    $device = sanitize_text_field($req->get_param('device'));
    $license = yara_get_license_or_error($key);
    if (is_wp_error($license)) {
        return ['success' => false, 'message' => $license->get_error_message()];
    }
    $payload = yara_license_payload($license);
    if ($payload['expires_at'] && $payload['expires_at'] < time()) {
        return ['success' => false, 'message' => 'لایسنس منقضی شده است.'];
    }
    $devices = get_option("yara_devices_{$key}", []);
    $ok = in_array($device, (array)$devices, true);
    return [
        'success'    => $ok,
        'message'    => $ok ? 'معتبر' : 'این دستگاه فعال نشده است.',
        'plan'       => $payload['plan'],
        'expires_at' => $payload['expires_at'],
    ];
}
