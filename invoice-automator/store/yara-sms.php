<?php
/**
 * Plugin Name: Yara SMS (Kavenegar)
 * Description: یکپارچه‌سازی پیامک کاوه‌نگار با یارا — تحویل کلید لایسنس و اطلاع وضعیت سفارش با پیامک.
 * Version: 1.0.0
 * Author: Yara
 *
 * تنظیمات: پیشخوان → تنظیمات → پیامک یارا (کلید API و خط فرستنده را وارد کنید).
 */

if (!defined('ABSPATH')) exit;

// ───────────────────────── تنظیمات (Settings) ─────────────────────────
add_action('admin_menu', function () {
    add_options_page('پیامک یارا', 'پیامک یارا', 'manage_options', 'yara-sms', 'yara_sms_settings_page');
});

add_action('admin_init', function () {
    register_setting('yara_sms', 'yara_sms_apikey');
    register_setting('yara_sms', 'yara_sms_sender');
    register_setting('yara_sms', 'yara_sms_order');
    register_setting('yara_sms', 'yara_sms_license');
});

function yara_sms_settings_page() {
    if (!current_user_can('manage_options')) return;
    ?>
    <div class="wrap" style="max-width:680px">
      <h1>پیامک یارا (کاوه‌نگار)</h1>
      <form method="post" action="options.php">
        <?php settings_fields('yara_sms'); ?>
        <table class="form-table">
          <tr>
            <th>کلید API کاوه‌نگار</th>
            <td><input type="text" name="yara_sms_apikey" value="<?php echo esc_attr(get_option('yara_sms_apikey')); ?>" style="width:100%" dir="ltr" placeholder="از پنل کاوه‌نگار → حساب کاربری → API"></td>
          </tr>
          <tr>
            <th>خط فرستنده</th>
            <td><input type="text" name="yara_sms_sender" value="<?php echo esc_attr(get_option('yara_sms_sender', '9982002344')); ?>" style="width:240px" dir="ltr"></td>
          </tr>
          <tr>
            <th>اطلاع وضعیت سفارش</th>
            <td><label><input type="checkbox" name="yara_sms_order" value="1" <?php checked(get_option('yara_sms_order'), '1'); ?>> پیامک هنگام ثبت/پرداخت/تکمیل سفارش</label></td>
          </tr>
          <tr>
            <th>تحویل لایسنس با پیامک</th>
            <td><label><input type="checkbox" name="yara_sms_license" value="1" <?php checked(get_option('yara_sms_license'), '1'); ?>> ارسال خودکار کلید لایسنس پس از خرید</label></td>
          </tr>
        </table>
        <?php submit_button('ذخیره تنظیمات'); ?>
      </form>

      <hr>
      <h2>ارسال پیامک آزمایشی</h2>
      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="yara_sms_test">
        <?php wp_nonce_field('yara_sms_test'); ?>
        <p>
          <input type="text" name="phone" placeholder="09xxxxxxxxx" dir="ltr" style="width:200px">
          <button class="button button-primary">ارسال تست</button>
        </p>
        <?php
        if (isset($_GET['test'])) {
            $ok = $_GET['test'] === 'ok';
            echo '<div class="notice ' . ($ok ? 'notice-success' : 'notice-error') . '"><p>'
                . ($ok ? '✅ پیامک تست ارسال شد.' : '❌ خطا: ' . esc_html(get_transient('yara_sms_test_err')))
                . '</p></div>';
        }
        ?>
      </form>
    </div>
    <?php
}

add_action('admin_post_yara_sms_test', function () {
    if (!current_user_can('manage_options') || !check_admin_referer('yara_sms_test')) wp_die('no');
    $phone = yara_sms_norm($_POST['phone'] ?? '');
    $r = yara_sms_send($phone, "یارا\nاین یک پیامک آزمایشی است. اتصال کاوه‌نگار درست کار می‌کند. ✅");
    if (is_wp_error($r)) set_transient('yara_sms_test_err', $r->get_error_message(), 60);
    wp_redirect(admin_url('options-general.php?page=yara-sms&test=' . (is_wp_error($r) ? 'err' : 'ok')));
    exit;
});

// ───────────────────────── توابع پایه ─────────────────────────
/** نرمال‌سازی شماره به فرمت 09xxxxxxxxx */
function yara_sms_norm($p) {
    $p = preg_replace('/\D+/', '', (string)$p);
    if (strpos($p, '0098') === 0) $p = substr($p, 4);
    if (strpos($p, '98') === 0 && strlen($p) === 12) $p = substr($p, 2);
    if (strlen($p) === 10 && $p[0] === '9') $p = '0' . $p;
    return $p;
}

/** ارسال پیامک با کاوه‌نگار (sms/send.json) */
function yara_sms_send($receptor, $message) {
    $api = trim(get_option('yara_sms_apikey'));
    $sender = trim(get_option('yara_sms_sender', '9982002344'));
    if (!$api) return new WP_Error('no_api', 'کلید API تنظیم نشده است.');
    if (!$receptor) return new WP_Error('no_phone', 'شماره گیرنده خالی است.');

    $url = 'https://api.kavenegar.com/v1/' . rawurlencode($api) . '/sms/send.json';
    $resp = wp_remote_post($url, [
        'timeout'   => 20,
        'sslverify' => false, // شبکه‌ی ایران گاهی گواهی را عوض می‌کند
        'body'      => ['receptor' => $receptor, 'sender' => $sender, 'message' => $message],
    ]);
    if (is_wp_error($resp)) return $resp;
    $code = wp_remote_retrieve_response_code($resp);
    $body = json_decode(wp_remote_retrieve_body($resp), true);
    $status = $body['return']['status'] ?? 0;
    if ($status == 200) return true;
    return new WP_Error('kavenegar', 'کاوه‌نگار: ' . ($body['return']['message'] ?? ('HTTP ' . $code)));
}

// ───────────────────────── تحویل لایسنس با پیامک ─────────────────────────
add_action('dlm_woocommerce_order_licenses_created', function ($order, $licenses) {
    if (get_option('yara_sms_license') !== '1') return;
    if (!is_object($order) || empty($licenses)) return;

    $phone = yara_sms_norm($order->get_billing_phone());
    if (!$phone) return;

    $keys = [];
    foreach ($licenses as $lic) {
        if (is_object($lic) && method_exists($lic, 'getDecryptedLicenseKey')) {
            $k = $lic->getDecryptedLicenseKey();
            if (!is_wp_error($k) && $k) $keys[] = $k;
        }
    }
    if (!$keys) return;

    $msg = "یارا 🎉\nخریدت تکمیل شد!\nکلید لایسنس:\n" . implode("\n", $keys)
         . "\nفعال‌سازی: داخل نرم‌افزار یارا، بخش «فعال‌سازی».\nدانلود: yarapro.ir/my-account";
    yara_sms_send($phone, $msg);
}, 20, 2);

// ───────────────────────── اطلاع وضعیت سفارش ─────────────────────────
add_action('woocommerce_order_status_changed', function ($order_id, $from, $to, $order) {
    if (get_option('yara_sms_order') !== '1') return;
    if (!is_object($order)) $order = wc_get_order($order_id);
    if (!$order) return;
    $phone = yara_sms_norm($order->get_billing_phone());
    if (!$phone) return;

    $map = [
        'on-hold'    => 'سفارش شما ثبت شد و در انتظار تأیید پرداخت است.',
        'processing' => 'پرداخت شما تأیید شد؛ سفارش در حال پردازش است.',
        'completed'  => 'سفارش شما تکمیل شد. 🎉 (کلید لایسنس جداگانه ارسال می‌شود)',
        'cancelled'  => 'سفارش شما لغو شد.',
        'refunded'   => 'سفارش شما بازپرداخت شد.',
    ];
    if (!isset($map[$to])) return;
    yara_sms_send($phone, "یارا\n" . $map[$to] . "\nسفارش #{$order_id}");
}, 20, 4);
