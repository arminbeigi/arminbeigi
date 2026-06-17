<?php
/**
 * Plugin Name: Shofazh Category HTML
 * Plugin URI:  https://shofazh.com
 * Description: اجازه‌ی درج HTML کامل (style, script, svg, video, details) در توضیحات دسته‌بندی محصولات و دسته‌بندی‌ها. با ارسال رمزگذاری‌شده (hex) محدودیت‌های فایروال (mod_security/WAF) را دور می‌زند و فیلتر kses را برای ادمین غیرفعال می‌کند.
 * Version:     1.1.0
 * Author:      Shofazh
 * Text Domain: shz-category-html
 * License:     GPLv2 or later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // دسترسی مستقیم ممنوع
}

class SHZ_Category_HTML {

	/** متاکلید ذخیره‌ی محتوای HTML */
	const META_KEY = '_shz_html_content';

	/** تکسونومی‌هایی که افزونه روی آن‌ها فعال است */
	private $taxonomies = array( 'product_cat', 'category' );

	public function __construct() {
		add_action( 'init', array( $this, 'register_hooks' ), 5 );
	}

	public function register_hooks() {
		/**
		 * ۱) غیرفعال‌کردن فیلتر kses روی توضیحات term برای ادمین
		 */
		if ( current_user_can( 'manage_options' ) ) {
			remove_filter( 'pre_term_description', 'wp_filter_kses' );
			remove_filter( 'term_description', 'wp_kses_data' );
			remove_filter( 'pre_term_description', 'wp_filter_post_kses' );
		}

		// فیلد روی صفحه‌ی افزودن/ویرایش دسته‌بندی
		foreach ( $this->taxonomies as $tax ) {
			add_action( "{$tax}_edit_form_fields", array( $this, 'render_edit_field' ), 10, 2 );
			add_action( "edited_{$tax}", array( $this, 'save_field' ), 10, 1 );
			add_action( "create_{$tax}", array( $this, 'save_field' ), 10, 1 );
		}

		// خروجی محتوا در صفحه‌ی آرشیو دسته‌بندی ووکامرس
		add_action( 'woocommerce_archive_description', array( $this, 'output_html' ), 8 );

		// خروجی برای دسته‌بندی‌های معمولی
		add_filter( 'get_the_archive_description', array( $this, 'filter_archive_description' ) );
	}

	/**
	 * فیلد ویرایش در صفحه‌ی ویرایش دسته‌بندی
	 */
	public function render_edit_field( $term, $taxonomy ) {
		$content = get_term_meta( $term->term_id, self::META_KEY, true );
		wp_nonce_field( 'shz_save_html', 'shz_html_nonce' );
		?>
		<tr class="form-field shz-html-row">
			<th scope="row"><label for="shz_html_textarea">محتوای HTML سفارشی (شوفاژ)</label></th>
			<td>
				<textarea id="shz_html_textarea" rows="14" style="width:100%;direction:ltr;font-family:monospace;font-size:13px;line-height:1.6"><?php echo esc_textarea( $content ); ?></textarea>
				<!-- فیلد مخفی: نسخه‌ی hex که فایروال آن را رمزگشایی/بلاک نمی‌کند -->
				<input type="hidden" name="shz_html_hex" id="shz_html_hex" value="" />
				<!-- پرچم اینکه فیلد ارسال شده (برای تشخیص حذف عمدی) -->
				<input type="hidden" name="shz_html_submitted" value="1" />
				<p class="description">کد HTML کامل (شامل style/script/svg/video) را اینجا بگذارید. هنگام ذخیره به‌صورت رمزگذاری‌شده (hex) ارسال می‌شود تا فایروال سرور آن را مسدود نکند. این محتوا بالای صفحه‌ی دسته‌بندی نمایش داده می‌شود.</p>
				<p id="shz_html_status" style="font-size:12px;color:#666;margin:4px 0 0"></p>
				<script>
				(function(){
					var ta     = document.getElementById('shz_html_textarea');
					var hex    = document.getElementById('shz_html_hex');
					var status = document.getElementById('shz_html_status');
					if(!ta || !hex) return;
					var form = ta.closest('form');

					function toHex(str){
						var bytes;
						try {
							bytes = new TextEncoder().encode(str); // UTF-8 بایت‌ها
						} catch(e) {
							var u = unescape(encodeURIComponent(str)); bytes = [];
							for(var i=0;i<u.length;i++) bytes.push(u.charCodeAt(i));
						}
						var out = '';
						for(var j=0;j<bytes.length;j++){
							var h = bytes[j].toString(16);
							if(h.length<2) h = '0'+h;
							out += h;
						}
						return out;
					}

					function sync(){
						hex.value = toHex(ta.value);
						if(status){
							var kb = (hex.value.length/2/1024).toFixed(1);
							status.textContent = 'آماده‌ی ذخیره: ' + ta.value.length + ' کاراکتر (' + kb + ' کیلوبایت)';
						}
					}

					// همگام‌سازی مداوم تا فیلد مخفی همیشه به‌روز باشد
					ta.addEventListener('input', sync);
					ta.addEventListener('change', sync);
					sync(); // مقدار اولیه

					if(form){
						form.addEventListener('submit', function(){
							sync();
							// متن خام هرگز ارسال نمی‌شود (textarea بدون name است)
							ta.removeAttribute('name');
						});
					}
				})();
				</script>
			</td>
		</tr>
		<?php
	}

	/**
	 * ذخیره‌ی فیلد
	 */
	public function save_field( $term_id ) {
		if ( ! isset( $_POST['shz_html_nonce'] ) || ! wp_verify_nonce( $_POST['shz_html_nonce'], 'shz_save_html' ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		// فقط وقتی فیلد افزونه واقعاً در فرم بوده پردازش کن
		if ( ! isset( $_POST['shz_html_submitted'] ) ) {
			return;
		}

		$hex = isset( $_POST['shz_html_hex'] ) ? wp_unslash( $_POST['shz_html_hex'] ) : '';
		// پاک‌سازی: فقط کاراکترهای hex مجاز
		$hex = preg_replace( '/[^0-9a-fA-F]/', '', $hex );

		if ( '' === $hex ) {
			delete_term_meta( $term_id, self::META_KEY );
			return;
		}

		if ( strlen( $hex ) % 2 !== 0 ) {
			return; // داده‌ی ناقص؛ مقدار قبلی دست‌نخورده می‌ماند
		}

		$decoded = @hex2bin( $hex );
		if ( false === $decoded || '' === $decoded ) {
			return;
		}

		update_term_meta( $term_id, self::META_KEY, $decoded );
	}

	/**
	 * خروجی در آرشیو ووکامرس
	 */
	public function output_html() {
		if ( ! ( function_exists( 'is_product_category' ) && is_product_category() ) && ! is_tax( $this->taxonomies ) ) {
			return;
		}
		$term = get_queried_object();
		if ( ! $term || empty( $term->term_id ) ) {
			return;
		}
		$content = get_term_meta( $term->term_id, self::META_KEY, true );
		if ( $content ) {
			echo $content; // خروجی خام عمدی
		}
	}

	/**
	 * خروجی برای دسته‌بندی‌های معمولی
	 */
	public function filter_archive_description( $description ) {
		if ( function_exists( 'is_product_category' ) && is_product_category() ) {
			return $description; // ووکامرس از طریق هوک دیگری مدیریت می‌شود
		}
		if ( is_category() || is_tax( 'category' ) ) {
			$term = get_queried_object();
			if ( $term && ! empty( $term->term_id ) ) {
				$content = get_term_meta( $term->term_id, self::META_KEY, true );
				if ( $content ) {
					return $content . $description;
				}
			}
		}
		return $description;
	}
}

new SHZ_Category_HTML();
