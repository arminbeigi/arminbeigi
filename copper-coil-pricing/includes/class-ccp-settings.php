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
			$stats = get_transient( 'ccp_last_run' );
			delete_transient( 'ccp_last_run' );

			$products = isset( $stats['products'] ) ? (int) $stats['products'] : 0;
			$prices   = isset( $stats['prices'] ) ? (int) $stats['prices'] : 0;
			$enabled  = isset( $stats['enabled'] ) ? (int) $stats['enabled'] : 0;
			$log      = isset( $stats['log'] ) ? $stats['log'] : array();

			$class = $prices > 0 ? 'notice-success' : 'notice-warning';
			printf(
				'<div class="notice %s"><p>تنظیمات ذخیره شد. قیمت <strong>%d</strong> گونه در <strong>%d</strong> محصول به‌روزرسانی شد. (محصولات فعال‌شده: <strong>%d</strong>)</p>',
				esc_attr( $class ),
				esc_html( $prices ),
				esc_html( $products ),
				esc_html( $enabled )
			);

			if ( 0 === $enabled ) {
				echo '<p>هیچ محصولی برای محاسبه خودکار فعال نشده است. وارد ویرایش محصول شوید، تب «قیمت کویل مسی» را باز کنید، تیک «محاسبه خودکار قیمت» را بزنید و نوع و ظرفیت را انتخاب کرده و محصول را ذخیره کنید.</p>';
			}

			if ( ! empty( $log ) ) {
				echo '<p><strong>گزارش محصولاتی که به‌روز نشدند:</strong></p><ul style="list-style:disc;margin-right:20px">';
				foreach ( $log as $item ) {
					$name = isset( $item['name'] ) && '' !== $item['name'] ? $item['name'] : 'محصول';
					printf(
						'<li><strong>%s</strong> (به‌روز شد: %d) — %s</li>',
						esc_html( $name ),
						esc_html( isset( $item['updated'] ) ? (int) $item['updated'] : 0 ),
						esc_html( ! empty( $item['messages'] ) ? implode( ' ', $item['messages'] ) : '—' )
					);
				}
				echo '</ul>';
			}

			echo '</div>';
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
			$stats = CCP_Calculator::update_all_prices();
			set_transient( 'ccp_last_run', $stats, 60 );
			$args['ccp_updated'] = 1;
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
			<h1>قیمت‌گذار منابع کویل‌دار و دوجداره</h1>
			<p>فی روز را وارد کنید و دکمه «ذخیره و به‌روزرسانی همه قیمت‌ها» را بزنید تا قیمت همه گونه‌های محصولات فعال‌شده، به‌صورت خودکار محاسبه و ثبت شود. وزن هر ضخامت از جدول کارخانه (تعبیه‌شده در افزونه) برداشته می‌شود.</p>
			<p style="background:#f0f6fc;border-right:4px solid #2271b1;padding:10px 14px">
				<strong>منبع کویل‌دار:</strong> قیمت = (وزن مخزن × فی هر کیلو ورق) + (متراژ کویل × فی هر فوت مس)<br />
				<strong>منبع دوجداره:</strong> قیمت = وزن مخزن × فی هر کیلو ورق
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
							<p class="description">قیمت روز هر کیلوگرم ورق — در هر دو نوع منبع استفاده می‌شود.</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="ccp_price_per_ft">فی هر فوت کویل مسی (<?php echo esc_html( $currency ); ?>)</label></th>
						<td>
							<input type="text" inputmode="decimal" id="ccp_price_per_ft" name="ccp_price_per_ft"
								value="<?php echo esc_attr( $price_per_ft ); ?>" class="regular-text" dir="ltr" />
							<p class="description">قیمت روز هر فوت کویل مسی — فقط برای منابع کویل‌دار؛ متراژ هر ظرفیت از جدول کارخانه خوانده می‌شود.</p>
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
				<li>در ویرایش هر محصول، در تب <strong>«قیمت کویل مسی»</strong> گزینه «محاسبه خودکار قیمت» را فعال کنید.</li>
				<li><strong>نوع منبع</strong> (کویل‌دار یا دوجداره) و <strong>ظرفیت</strong> آن را انتخاب کنید — همین کافی است.</li>
				<li>ضخامت ورق هر گونه از ویژگی همان گونه (مثل K-4 یا 4-2/5) تشخیص داده می‌شود و وزنش از جدول زیر برداشته می‌شود.</li>
				<li>با ذخیره محصول یا با دکمه بالا، قیمت‌ها به‌صورت خودکار محاسبه و ثبت می‌شوند.</li>
			</ol>

			<h2>جدول منابع کویل‌دار</h2>
			<table class="widefat striped" style="max-width:640px">
				<thead><tr><th>ظرفیت (لیتر)</th><th>کویل (فوت)</th><th>K-4</th><th>K-5</th><th>K-6</th><th>K-8</th></tr></thead>
				<tbody>
				<?php foreach ( CCP_Tables::coil_table() as $cap => $row ) : ?>
					<tr>
						<td><?php echo esc_html( $cap ); ?></td>
						<td><?php echo esc_html( $row['feet'] ); ?></td>
						<?php foreach ( array( 'k-4', 'k-5', 'k-6', 'k-8' ) as $k ) : ?>
							<td><?php echo isset( $row['weights'][ $k ] ) ? esc_html( $row['weights'][ $k ] ) : '—'; ?></td>
						<?php endforeach; ?>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>

			<h2>جدول منابع دوجداره</h2>
			<table class="widefat striped" style="max-width:640px">
				<thead><tr><th>ظرفیت (لیتر)</th><th>4-2</th><th>4-2/5</th><th>4-3</th><th>5-2/5</th><th>5-3</th></tr></thead>
				<tbody>
				<?php foreach ( CCP_Tables::double_table() as $cap => $row ) : ?>
					<tr>
						<td><?php echo esc_html( $cap ); ?></td>
						<?php foreach ( array( '4-2', '4-2/5', '4-3', '5-2/5', '5-3' ) as $k ) : ?>
							<td><?php echo isset( $row[ $k ] ) ? esc_html( $row[ $k ] ) : '—'; ?></td>
						<?php endforeach; ?>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
			<p class="description">وزن‌ها به کیلوگرم. این جداول داخل افزونه تعبیه شده‌اند؛ برای تغییر، فایل <code>includes/class-ccp-tables.php</code> را ویرایش کنید.</p>
		</div>
		<?php
	}
}
