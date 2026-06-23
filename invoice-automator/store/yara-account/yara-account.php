<?php
/**
 * Plugin Name: Yara Account (ورود با پیامک + ساده‌سازی خرید)
 * Description: ورود/ثبت‌نام با کد یکبارمصرف پیامکی (کاوه‌نگار) و ساده‌سازی فرم پرداخت (فقط نام و نام‌خانوادگی).
 * Version: 1.0.0
 * Author: Yara
 *
 * پیش‌نیاز: افزونه‌ی «Yara SMS» نصب و کلید API/خط فرستنده تنظیم شده باشد
 *           (این افزونه از همان تنظیمات استفاده می‌کند).
 */

if (!defined('ABSPATH')) exit;

// ───────────────────────── ابزارها ─────────────────────────
function yara_acc_norm($p) {
    $p = preg_replace('/\D+/', '', (string)$p);
    if (strpos($p, '0098') === 0) $p = substr($p, 4);
    if (strpos($p, '98') === 0 && strlen($p) === 12) $p = substr($p, 2);
    if (strlen($p) === 10 && $p[0] === '9') $p = '0' . $p;
    return $p;
}

/** ارسال پیامک با همان تنظیمات افزونه‌ی Yara SMS */
function yara_acc_sms($to, $msg) {
    $api = trim(get_option('yara_sms_apikey'));
    $sender = trim(get_option('yara_sms_sender', '9982002344'));
    if (!$api) return new WP_Error('no_api', 'کلید API کاوه‌نگار تنظیم نشده (تنظیمات → پیامک یارا).');
    $url = 'https://api.kavenegar.com/v1/' . rawurlencode($api) . '/sms/send.json';
    $resp = wp_remote_post($url, [
        'timeout' => 20, 'sslverify' => false,
        'body' => ['receptor' => $to, 'sender' => $sender, 'message' => $msg],
    ]);
    if (is_wp_error($resp)) return $resp;
    $b = json_decode(wp_remote_retrieve_body($resp), true);
    if (($b['return']['status'] ?? 0) == 200) return true;
    return new WP_Error('kv', $b['return']['message'] ?? 'خطای کاوه‌نگار');
}

/** پیداکردن کاربر بر اساس شماره (login / email / متای billing_phone) */
function yara_acc_find_user($phone) {
    $u = get_user_by('login', $phone);
    if ($u) return $u;
    $u = get_user_by('email', $phone . '@yarapro.ir');
    if ($u) return $u;
    $q = get_users(['meta_key' => 'billing_phone', 'meta_value' => $phone, 'number' => 1, 'fields' => 'all']);
    return $q ? $q[0] : null;
}

// ───────────────────────── AJAX: ارسال کد ─────────────────────────
add_action('wp_ajax_nopriv_yara_otp_send', 'yara_otp_send');
add_action('wp_ajax_yara_otp_send', 'yara_otp_send');
function yara_otp_send() {
    check_ajax_referer('yara_otp', 'nonce');
    $phone = yara_acc_norm($_POST['phone'] ?? '');
    if (!preg_match('/^09\d{9}$/', $phone)) wp_send_json_error(['msg' => 'شماره موبایل معتبر نیست.']);

    if (get_transient('yara_otp_cd_' . $phone)) wp_send_json_error(['msg' => 'چند ثانیه صبر کنید و دوباره تلاش کنید.']);
    $cntkey = 'yara_otp_cnt_' . $phone;
    $cnt = (int)get_transient($cntkey);
    if ($cnt >= 5) wp_send_json_error(['msg' => 'تعداد درخواست زیاد شد. یک ساعت دیگر امتحان کنید.']);

    $code = (string)random_int(10000, 99999);
    set_transient('yara_otp_' . $phone, ['hash' => password_hash($code, PASSWORD_DEFAULT), 'tries' => 0], 180);
    set_transient('yara_otp_cd_' . $phone, 1, 60);
    set_transient($cntkey, $cnt + 1, 3600);

    $r = yara_acc_sms($phone, "یارا\nکد ورود شما: {$code}\nتا ۳ دقیقه معتبر است.");
    if (is_wp_error($r)) wp_send_json_error(['msg' => 'ارسال پیامک ناموفق: ' . $r->get_error_message()]);
    wp_send_json_success(['msg' => 'کد به شماره‌ی شما ارسال شد.']);
}

// ───────────────────────── AJAX: تأیید کد و ورود ─────────────────────────
add_action('wp_ajax_nopriv_yara_otp_verify', 'yara_otp_verify');
add_action('wp_ajax_yara_otp_verify', 'yara_otp_verify');
function yara_otp_verify() {
    check_ajax_referer('yara_otp', 'nonce');
    $phone = yara_acc_norm($_POST['phone'] ?? '');
    $code  = preg_replace('/\D/', '', $_POST['code'] ?? '');
    $rec = get_transient('yara_otp_' . $phone);
    if (!$rec) wp_send_json_error(['msg' => 'کد منقضی شده. دوباره درخواست کنید.']);
    if (($rec['tries'] ?? 0) >= 5) {
        delete_transient('yara_otp_' . $phone);
        wp_send_json_error(['msg' => 'تلاش زیاد. دوباره کد بگیرید.']);
    }
    if (!password_verify($code, $rec['hash'])) {
        $rec['tries']++;
        set_transient('yara_otp_' . $phone, $rec, 180);
        wp_send_json_error(['msg' => 'کد اشتباه است.']);
    }
    delete_transient('yara_otp_' . $phone);

    $user = yara_acc_find_user($phone);
    if (!$user) {
        $uid = wp_insert_user([
            'user_login' => $phone,
            'user_pass'  => wp_generate_password(24),
            'user_email' => $phone . '@yarapro.ir',
            'role'       => 'customer',
            'display_name' => $phone,
        ]);
        if (is_wp_error($uid)) wp_send_json_error(['msg' => 'ساخت حساب ناموفق بود.']);
        update_user_meta($uid, 'billing_phone', $phone);
        update_user_meta($uid, 'yara_phone', $phone);
        $user = get_user_by('id', $uid);
    }

    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);
    do_action('wp_login', $user->user_login, $user);

    $redirect = !empty($_POST['redirect']) ? esc_url_raw($_POST['redirect'])
              : (function_exists('wc_get_page_permalink') ? wc_get_page_permalink('myaccount') : home_url('/'));
    wp_send_json_success(['redirect' => $redirect]);
}

// ───────────────────────── جایگزینی فرم ورود ووکامرس ─────────────────────────
add_filter('wc_get_template', function ($located, $template_name) {
    if ($template_name === 'myaccount/form-login.php') {
        $f = plugin_dir_path(__FILE__) . 'templates/form-login.php';
        if (file_exists($f)) return $f;
    }
    return $located;
}, 10, 2);

// شورت‌کد برای استفاده در هر صفحه: [yara_login]
add_shortcode('yara_login', function () {
    ob_start();
    include plugin_dir_path(__FILE__) . 'templates/form-login.php';
    return ob_get_clean();
});

// داده‌های موردنیاز جاوااسکریپت
function yara_acc_js_vars() {
    return [
        'ajax'  => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('yara_otp'),
    ];
}

// ───────────────────────── ساده‌سازی فرم پرداخت ─────────────────────────
add_filter('woocommerce_checkout_fields', function ($fields) {
    foreach (['billing_company','billing_country','billing_address_1','billing_address_2',
              'billing_city','billing_state','billing_postcode','billing_email'] as $k) {
        unset($fields['billing'][$k]);
    }
    if (isset($fields['billing']['billing_first_name'])) {
        $fields['billing']['billing_first_name']['required'] = true;
        $fields['billing']['billing_first_name']['class'] = ['form-row-first'];
    }
    if (isset($fields['billing']['billing_last_name'])) {
        $fields['billing']['billing_last_name']['required'] = true;
        $fields['billing']['billing_last_name']['class'] = ['form-row-last'];
    }
    if (isset($fields['billing']['billing_phone'])) {
        $fields['billing']['billing_phone']['required'] = true;
        $fields['billing']['billing_phone']['class'] = ['form-row-wide'];
    }
    return $fields;
}, 20);

// ایمیل خودکار از روی شماره (چون فیلد ایمیل حذف شده)
add_filter('woocommerce_checkout_posted_data', function ($data) {
    if (empty($data['billing_email'])) {
        $phone = yara_acc_norm($data['billing_phone'] ?? '');
        if ($phone) $data['billing_email'] = $phone . '@yarapro.ir';
    }
    return $data;
});

// حذف الزام ایمیل در اعتبارسنجی
add_filter('woocommerce_billing_fields', function ($fields) {
    if (isset($fields['billing_email'])) $fields['billing_email']['required'] = false;
    return $fields;
}, 20);

// نام‌کاربری حساب‌های ساخته‌شده هنگام خرید = شماره موبایل
add_filter('woocommerce_new_customer_data', function ($data) {
    if (!empty($_POST['billing_phone'])) {
        $phone = yara_acc_norm($_POST['billing_phone']);
        if (preg_match('/^09\d{9}$/', $phone)) {
            $data['user_login'] = $phone;
            if (empty($data['user_email'])) $data['user_email'] = $phone . '@yarapro.ir';
        }
    }
    return $data;
});
