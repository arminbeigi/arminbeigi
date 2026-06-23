<?php
/**
 * Plugin Name: Kara License Endpoint
 * Description: نقطه‌ی پایانی فعال‌سازی لایسنس نرم‌افزار «کارا» (اتصال به License Manager for WooCommerce).
 * Version: 1.0.0
 * Author: Shofazh
 *
 * نصب: این فایل را در پوشه‌ی wp-content/mu-plugins/ قرار دهید
 *      (اگر پوشه نبود، بسازید). نیازی به فعال‌سازی دستی ندارد.
 *
 * پیش‌نیاز: افزونه‌ی «License Manager for WooCommerce» نصب و فعال باشد و
 *          محصولات شما کلید لایسنس تولید کنند.
 *
 * نرم‌افزار کارا این آدرس را صدا می‌زند:
 *   POST https://YOUR-STORE/wp-json/kara/v1/activate
 *   body: { "license_key": "...", "device": "..." }
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('kara/v1', '/activate', [
        'methods'  => 'POST',
        'callback' => 'kara_activate_license',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('kara/v1', '/validate', [
        'methods'  => 'POST',
        'callback' => 'kara_validate_license',
        'permission_callback' => '__return_true',
    ]);
});

/** نگاشت شناسه‌ی محصول به نام پلن (در صورت نیاز ویرایش کنید) */
function kara_plan_name($product_id) {
    $map = [
        // 123 => 'پایه',
        // 124 => 'حرفه‌ای',
        // 125 => 'کسب‌وکار',
    ];
    return $map[$product_id] ?? 'حرفه‌ای';
}

function kara_get_license_or_error($key) {
    if (!function_exists('lmfwc_get_license')) {
        return new WP_Error('no_lmfwc', 'افزونه License Manager نصب نیست.');
    }
    $license = lmfwc_get_license($key);
    if (!$license) {
        return new WP_Error('not_found', 'کلید لایسنس یافت نشد.');
    }
    return $license;
}

function kara_license_payload($license) {
    $expires = method_exists($license, 'getExpiresAt') ? $license->getExpiresAt() : null;
    $expires_epoch = $expires ? strtotime($expires) : null;
    $product_id = method_exists($license, 'getProductId') ? $license->getProductId() : 0;
    return [
        'expires_at' => $expires_epoch,
        'plan'       => kara_plan_name($product_id),
    ];
}

function kara_activate_license(WP_REST_Request $req) {
    $key    = sanitize_text_field($req->get_param('license_key'));
    $device = sanitize_text_field($req->get_param('device'));
    if (!$key || !$device) {
        return ['success' => false, 'message' => 'کلید یا شناسه‌ی دستگاه ارسال نشده.'];
    }

    $license = kara_get_license_or_error($key);
    if (is_wp_error($license)) {
        return ['success' => false, 'message' => $license->get_error_message()];
    }

    // بررسی انقضا
    $payload = kara_license_payload($license);
    if ($payload['expires_at'] && $payload['expires_at'] < time()) {
        return ['success' => false, 'message' => 'لایسنس منقضی شده است.'];
    }

    // مدیریت دستگاه‌ها (محدودیت تعداد فعال‌سازی)
    $max = method_exists($license, 'getTimesActivatedMax') ? (int)$license->getTimesActivatedMax() : 1;
    if ($max <= 0) $max = 1;

    $devices = get_option("kara_devices_{$key}", []);
    if (!is_array($devices)) $devices = [];

    if (!in_array($device, $devices, true)) {
        if (count($devices) >= $max) {
            return ['success' => false,
                    'message' => "این کلید روی حداکثر دستگاه مجاز ({$max}) فعال شده است."];
        }
        $devices[] = $device;
        update_option("kara_devices_{$key}", $devices, false);
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

function kara_validate_license(WP_REST_Request $req) {
    $key    = sanitize_text_field($req->get_param('license_key'));
    $device = sanitize_text_field($req->get_param('device'));
    $license = kara_get_license_or_error($key);
    if (is_wp_error($license)) {
        return ['success' => false, 'message' => $license->get_error_message()];
    }
    $payload = kara_license_payload($license);
    if ($payload['expires_at'] && $payload['expires_at'] < time()) {
        return ['success' => false, 'message' => 'لایسنس منقضی شده است.'];
    }
    $devices = get_option("kara_devices_{$key}", []);
    $ok = in_array($device, (array)$devices, true);
    return [
        'success'    => $ok,
        'message'    => $ok ? 'معتبر' : 'این دستگاه فعال نشده است.',
        'plan'       => $payload['plan'],
        'expires_at' => $payload['expires_at'],
    ];
}
