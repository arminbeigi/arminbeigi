<?php
/**
 * Plugin Name:       هشدار قیمت محصولات متغیر شوفاژ
 * Plugin URI:        https://shofazh.com
 * Description:        روی صفحه‌ی محصولات متغیر ووکامرس (مثل دیگ سوپر ۴۰۰ با ۵ تا ۱۳ پره)، درست بالای کادر انتخاب مدل و دکمه «افزودن به سبد»، یک پیام هشدار نمایش می‌دهد تا مشتری در مورد قیمت اشتباه نکند. متن و رنگ پیام از تنظیمات قابل ویرایش است.
 * Version:           1.0.0
 * Requires at least: 5.6
 * Requires PHP:      7.2
 * Author:            Shofazh
 * Author URI:        https://shofazh.com
 * Text Domain:       shofazh-variable-price-notice
 * License:           GPL-2.0-or-later
 *
 * WC requires at least: 5.0
 * WC tested up to:       9.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // جلوگیری از دسترسی مستقیم
}

define( 'SHOFAZH_VPN_VERSION', '1.0.0' );
define( 'SHOFAZH_VPN_OPTION', 'shofazh_vpn_settings' );
define( 'SHOFAZH_VPN_FILE', __FILE__ );
define( 'SHOFAZH_VPN_URL', plugin_dir_url( __FILE__ ) );

/**
 * مقادیر پیش‌فرض تنظیمات. افزونه بدون هیچ تنظیمی هم کار می‌کند.
 *
 * @return array
 */
function shofazh_vpn_defaults() {
	return array(
		'enabled' => 1,
		'title'   => 'توجه به قیمت مدل‌ها',
		'message' => 'این محصول در چند مدل با قیمت متفاوت عرضه می‌شود. قیمتی که می‌بینید مربوط به همان مدلی است که در کادر زیر انتخاب کرده‌اید. لطفاً پیش از ثبت سفارش، مدل موردنظر (مثلاً تعداد پره) را انتخاب کنید تا قیمت دقیقِ همان مدل نمایش داده شود. در صورت تردید، پیش از خرید با کارشناسان شوفاژ تماس بگیرید.',
		'color'   => '#F57F17',
	);
}

/**
 * خواندن تنظیمات همراه با مقادیر پیش‌فرض.
 *
 * @return array
 */
function shofazh_vpn_get_settings() {
	$saved = get_option( SHOFAZH_VPN_OPTION, array() );
	if ( ! is_array( $saved ) ) {
		$saved = array();
	}
	return wp_parse_args( $saved, shofazh_vpn_defaults() );
}

/* -------------------------------------------------------------------------
 *  فعال‌سازی: تنظیم مقادیر پیش‌فرض
 * ---------------------------------------------------------------------- */
register_activation_hook( __FILE__, 'shofazh_vpn_activate' );
function shofazh_vpn_activate() {
	if ( false === get_option( SHOFAZH_VPN_OPTION, false ) ) {
		add_option( SHOFAZH_VPN_OPTION, shofazh_vpn_defaults() );
	}
}

/* -------------------------------------------------------------------------
 *  بررسی فعال بودن ووکامرس
 * ---------------------------------------------------------------------- */
add_action( 'admin_init', 'shofazh_vpn_check_woocommerce' );
function shofazh_vpn_check_woocommerce() {
	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', 'shofazh_vpn_wc_missing_notice' );
	}
}
function shofazh_vpn_wc_missing_notice() {
	echo '<div class="notice notice-warning"><p>';
	echo esc_html__( 'افزونه «هشدار قیمت محصولات متغیر شوفاژ» برای کار کردن به ووکامرس فعال نیاز دارد.', 'shofazh-variable-price-notice' );
	echo '</p></div>';
}

/* -------------------------------------------------------------------------
 *  نمایش هشدار در صفحه‌ی محصول متغیر
 * ---------------------------------------------------------------------- */
add_action( 'woocommerce_before_add_to_cart_form', 'shofazh_vpn_render_notice', 10 );
function shofazh_vpn_render_notice() {
	global $product;

	$settings = shofazh_vpn_get_settings();

	if ( empty( $settings['enabled'] ) ) {
		return;
	}
	if ( ! $product || ! is_a( $product, 'WC_Product' ) || ! $product->is_type( 'variable' ) ) {
		return;
	}

	$title   = trim( (string) $settings['title'] );
	$message = trim( (string) $settings['message'] );
	if ( '' === $message && '' === $title ) {
		return;
	}
	?>
	<div class="shofazh-price-notice" role="alert">
		<span class="shofazh-price-notice__icon" aria-hidden="true">
			<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
		</span>
		<div class="shofazh-price-notice__text">
			<?php if ( '' !== $title ) : ?>
				<strong><?php echo esc_html( $title ); ?></strong>
			<?php endif; ?>
			<?php if ( '' !== $message ) : ?>
				<span><?php echo esc_html( $message ); ?></span>
			<?php endif; ?>
		</div>
	</div>
	<?php
}

/* -------------------------------------------------------------------------
 *  بارگذاری استایل فقط در صفحه‌ی محصول + رنگ پویا
 * ---------------------------------------------------------------------- */
add_action( 'wp_enqueue_scripts', 'shofazh_vpn_enqueue_styles' );
function shofazh_vpn_enqueue_styles() {
	if ( ! function_exists( 'is_product' ) || ! is_product() ) {
		return;
	}

	wp_enqueue_style(
		'shofazh-vpn',
		SHOFAZH_VPN_URL . 'assets/notice.css',
		array(),
		SHOFAZH_VPN_VERSION
	);

	$settings = shofazh_vpn_get_settings();
	$color    = sanitize_hex_color( $settings['color'] );
	if ( ! $color ) {
		$color = '#F57F17';
	}

	$inline = sprintf( ':root{--shofazh-vpn-color:%s}', $color );
	wp_add_inline_style( 'shofazh-vpn', $inline );
}

/* -------------------------------------------------------------------------
 *  صفحه‌ی تنظیمات (Settings → هشدار قیمت متغیر)
 * ---------------------------------------------------------------------- */
add_action( 'admin_menu', 'shofazh_vpn_admin_menu' );
function shofazh_vpn_admin_menu() {
	add_options_page(
		__( 'هشدار قیمت محصولات متغیر', 'shofazh-variable-price-notice' ),
		__( 'هشدار قیمت متغیر', 'shofazh-variable-price-notice' ),
		'manage_options',
		'shofazh-vpn',
		'shofazh_vpn_settings_page'
	);
}

// لینک سریع «تنظیمات» در فهرست افزونه‌ها
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'shofazh_vpn_action_links' );
function shofazh_vpn_action_links( $links ) {
	$url      = admin_url( 'options-general.php?page=shofazh-vpn' );
	$settings = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'تنظیمات', 'shofazh-variable-price-notice' ) . '</a>';
	array_unshift( $links, $settings );
	return $links;
}

add_action( 'admin_init', 'shofazh_vpn_register_settings' );
function shofazh_vpn_register_settings() {
	register_setting(
		'shofazh_vpn_group',
		SHOFAZH_VPN_OPTION,
		array( 'sanitize_callback' => 'shofazh_vpn_sanitize' )
	);
}

/**
 * پاک‌سازی و اعتبارسنجی ورودی‌های تنظیمات.
 *
 * @param array $input
 * @return array
 */
function shofazh_vpn_sanitize( $input ) {
	$defaults = shofazh_vpn_defaults();
	$out      = array();

	$out['enabled'] = ( ! empty( $input['enabled'] ) ) ? 1 : 0;
	$out['title']   = isset( $input['title'] ) ? sanitize_text_field( $input['title'] ) : $defaults['title'];
	$out['message'] = isset( $input['message'] ) ? sanitize_textarea_field( $input['message'] ) : $defaults['message'];

	$color = isset( $input['color'] ) ? sanitize_hex_color( $input['color'] ) : '';
	$out['color'] = $color ? $color : $defaults['color'];

	return $out;
}

function shofazh_vpn_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$s = shofazh_vpn_get_settings();
	?>
	<div class="wrap" dir="rtl" style="text-align:right">
		<h1><?php esc_html_e( 'هشدار قیمت محصولات متغیر', 'shofazh-variable-price-notice' ); ?></h1>
		<p><?php esc_html_e( 'این پیام به‌صورت خودکار فقط روی صفحه‌ی محصولات متغیر، بالای کادر انتخاب مدل و دکمه افزودن به سبد نمایش داده می‌شود.', 'shofazh-variable-price-notice' ); ?></p>
		<form method="post" action="options.php">
			<?php settings_fields( 'shofazh_vpn_group' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php esc_html_e( 'فعال باشد؟', 'shofazh-variable-price-notice' ); ?></th>
					<td>
						<label>
							<input type="checkbox" name="<?php echo esc_attr( SHOFAZH_VPN_OPTION ); ?>[enabled]" value="1" <?php checked( 1, (int) $s['enabled'] ); ?> />
							<?php esc_html_e( 'نمایش هشدار روی محصولات متغیر', 'shofazh-variable-price-notice' ); ?>
						</label>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="shofazh-vpn-title"><?php esc_html_e( 'عنوان هشدار', 'shofazh-variable-price-notice' ); ?></label></th>
					<td><input type="text" id="shofazh-vpn-title" class="regular-text" name="<?php echo esc_attr( SHOFAZH_VPN_OPTION ); ?>[title]" value="<?php echo esc_attr( $s['title'] ); ?>" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="shofazh-vpn-message"><?php esc_html_e( 'متن هشدار', 'shofazh-variable-price-notice' ); ?></label></th>
					<td><textarea id="shofazh-vpn-message" class="large-text" rows="5" name="<?php echo esc_attr( SHOFAZH_VPN_OPTION ); ?>[message]"><?php echo esc_textarea( $s['message'] ); ?></textarea></td>
				</tr>
				<tr>
					<th scope="row"><label for="shofazh-vpn-color"><?php esc_html_e( 'رنگ هشدار', 'shofazh-variable-price-notice' ); ?></label></th>
					<td><input type="color" id="shofazh-vpn-color" name="<?php echo esc_attr( SHOFAZH_VPN_OPTION ); ?>[color]" value="<?php echo esc_attr( $s['color'] ); ?>" /></td>
				</tr>
			</table>
			<?php submit_button( __( 'ذخیره تغییرات', 'shofazh-variable-price-notice' ) ); ?>
		</form>
	</div>
	<?php
}
