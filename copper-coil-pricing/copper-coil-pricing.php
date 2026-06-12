<?php
/**
 * Plugin Name: قیمت‌گذار منبع کویل مسی
 * Plugin URI: https://shofazh.com
 * Description: محاسبه خودکار قیمت منابع کویل‌دار و دوجداره در ووکامرس. فی روز هر کیلو ورق و هر فوت کویل مسی را وارد کنید؛ افزونه وزن هر ضخامت را از جدول کارخانه برمی‌دارد و قیمت هر گونه را محاسبه و ثبت می‌کند.
 * Version: 1.1.0
 * Author: Armin Beigi
 * Text Domain: copper-coil-pricing
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 6.0
 * License: GPL-2.0+
 *
 * @package CopperCoilPricing
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CCP_VERSION', '1.1.2' );
define( 'CCP_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'CCP_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

// سازگاری با HPOS ووکامرس.
add_action( 'before_woocommerce_init', function () {
	if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
	}
} );

/**
 * بارگذاری افزونه پس از ووکامرس
 */
function ccp_init() {
	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', function () {
			echo '<div class="notice notice-error"><p>افزونه «قیمت‌گذار منبع کویل مسی» نیاز به نصب و فعال بودن ووکامرس دارد.</p></div>';
		} );
		return;
	}

	require_once CCP_PLUGIN_DIR . 'includes/class-ccp-tables.php';
	require_once CCP_PLUGIN_DIR . 'includes/class-ccp-calculator.php';
	require_once CCP_PLUGIN_DIR . 'includes/class-ccp-settings.php';
	require_once CCP_PLUGIN_DIR . 'includes/class-ccp-product-fields.php';

	CCP_Settings::instance();
	CCP_Product_Fields::instance();
}
add_action( 'plugins_loaded', 'ccp_init' );

/**
 * مقادیر اولیه هنگام فعال‌سازی
 */
function ccp_activate() {
	add_option( 'ccp_price_per_kg', '' );
	add_option( 'ccp_price_per_ft', '' );
	add_option( 'ccp_rounding', '10000' );
}
register_activation_hook( __FILE__, 'ccp_activate' );
