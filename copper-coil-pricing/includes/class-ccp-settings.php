<?php
/**
 * صفحه تنظیمات افزونه — ورود فی روز و به‌روزرسانی همه قیمت‌ها
 *
 * @package CopperCoilPricing
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CCP_Settings {

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_post_ccp_save_settings', array( $this, 'save_settings' ) );
		add_action( 'admin_notices', array( $this, 'admin_notices' ) );
	}

	public function add_menu() {
		add_submenu_page(
			'woocommerce',
			'قیمت کویل مسی',
			'قیمت کویل مسی',
			'manage_woocommerce',
			'ccp-settings',
			array( $this, 'render_page' )
		);
	}

	public function admin_notices() {
		if ( empty( $_GET['page'] ) || 'ccp-settings' !== $_GET['page'] ) { // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}

		if ( isset( $_GET['ccp_updated'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			$products = isset( $_GET['ccp_products'] ) ? absint( $_GET['ccp_products'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification
			$prices   = isset( $_GET['ccp_prices'] ) ? absint( $_GET['ccp_prices'] ) : 0;     // phpcs:ignore WordPress.Security.NonceVerification
			printf(
				'<div class="notice notice-success is-dismissible"><p>تنظیمات ذخیره شد. قیمت <strong>%d</strong> گونه در <strong>%d</strong> محصول به‌روزرسانی شد.</p></div>',
				esc_html( $prices ),
				esc_html( $products )
			);
		} elseif ( isset( $_GET['ccp_saved'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			echo '<div class="notice notice-success is-dismissible"><p>تنظیمات ذخیره شد.</p></div>';
		}
	}

	public function save_settings() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( 'دسترسی غیرمجاز' );
		}
		check_admin_referer( 'ccp_save_settings' );

		$price_per_kg = isset( $_POST['ccp_price_per_kg'] ) ? wc_format_decimal( wp_unslash( $_POST['ccp_price_per_kg'] ) ) : '';
		$price_per_ft = isset( $_POST['ccp_price_per_ft'] ) ? wc_format_decimal( wp_unslash( $_POST['ccp_price_per_ft'] ) ) : '';
		$rounding     = isset( $_POST['ccp_rounding'] ) ? wc_format_decimal( wp_unslash( $_POST['ccp_rounding'] ) ) : '0';

		update_option( 'ccp_price_per_kg', $price_per_kg );
		update_option( 'ccp_price_per_ft', $price_per_ft );
		update_option( 'ccp_rounding', $rounding );

		$args = array( 'page' => 'ccp-settings' );

		if ( ! empty( $_POST['ccp_recalculate'] ) ) {
			$stats                = CCP_Calculator::update_all_prices();
			$args['ccp_updated']  = 1;
			$args['ccp_products'] = $stats['products'];
			$args['ccp_prices']   = $stats['prices'];
		} else {
			$args['ccp_saved'] = 1;
		}

		wp_safe_redirect( add_query_arg( $args, admin_url( 'admin.php' ) ) );
		exit;
	}

	public function render_page() {
		$price_per_kg = get_option( 'ccp_price_per_kg', '' );
		$price_per_ft = get_option( 'ccp_price_per_ft', '' );
		$rounding     = get_option( 'ccp_rounding', '10000' );
		$currency     = get_woocommerce_currency_symbol();
		?>
		<div class="wrap" style="max-width:640px">
			<h1>قیمت‌گذار منبع کویل مسی</h1>
			<p>فی روز را وارد کنید و دکمه «ذخیره و به‌روزرسانی همه قیمت‌ها» را بزنید تا قیمت همه گونه‌های محصولات فعال‌شده، به‌صورت خودکار محاسبه و ثبت شود.</p>
			<p style="background:#f0f6fc;border-right:4px solid #2271b1;padding:10px 14px">
				<strong>فرمول:</strong> قیمت گونه = (وزن مخزن × فی هر کیلو ورق) + (متراژ کویل × فی هر فوت مس)
			</p>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<?php wp_nonce_field( 'ccp_save_settings' ); ?>
				<input type="hidden" name="action" value="ccp_save_settings" />

				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="ccp_price_per_kg">فی هر کیلو ورق (<?php echo esc_html( $currency ); ?>)</label></th>
						<td>
							<input type="text" inputmode="decimal" id="ccp_price_per_kg" name="ccp_price_per_kg"
								value="<?php echo esc_attr( $price_per_kg ); ?>" class="regular-text" dir="ltr" />
							<p class="description">قیمت روز هر کیلوگرم ورق (وزن مخزن بر اساس ضخامت ورق در هر گونه تعریف می‌شود).</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="ccp_price_per_ft">فی هر فوت کویل مسی (<?php echo esc_html( $currency ); ?>)</label></th>
						<td>
							<input type="text" inputmode="decimal" id="ccp_price_per_ft" name="ccp_price_per_ft"
								value="<?php echo esc_attr( $price_per_ft ); ?>" class="regular-text" dir="ltr" />
							<p class="description">قیمت روز هر فوت کویل مسی (متراژ کویل در تب «کویل مسی» هر محصول تعریف می‌شود).</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="ccp_rounding">گرد کردن قیمت به</label></th>
						<td>
							<input type="text" inputmode="decimal" id="ccp_rounding" name="ccp_rounding"
								value="<?php echo esc_attr( $rounding ); ?>" class="regular-text" dir="ltr" />
							<p class="description">قیمت نهایی به بالا و به مضربی از این عدد گرد می‌شود (مثلاً ۱۰۰۰۰). برای غیرفعال کردن، ۰ بگذارید.</p>
						</td>
					</tr>
				</table>

				<p class="submit">
					<button type="submit" name="ccp_recalculate" value="1" class="button button-primary">
						ذخیره و به‌روزرسانی همه قیمت‌ها
					</button>
					<button type="submit" class="button">فقط ذخیره تنظیمات</button>
				</p>
			</form>

			<hr />
			<h2>راهنمای استفاده</h2>
			<ol>
				<li>در ویرایش محصول، در تب <strong>«کویل مسی»</strong> گزینه «محاسبه خودکار قیمت» را فعال کرده و <strong>متراژ کویل مسی (فوت)</strong> را وارد کنید.</li>
				<li>برای محصول متغیر، در هر گونه (ضخامت ورق) فیلد <strong>«وزن مخزن (کیلوگرم)»</strong> را وارد کنید.</li>
				<li>با ذخیره محصول یا با دکمه بالا، قیمت‌ها به‌صورت خودکار محاسبه و ثبت می‌شوند.</li>
			</ol>
		</div>
		<?php
	}
}
