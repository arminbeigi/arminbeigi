<?php
/**
 * Plugin Name: Shofazh Category HTML
 * Plugin URI:  https://shofazh.com
 * Description: اجازه‌ی درج HTML کامل (style, script, svg, video, details) در توضیحات دسته‌بندی محصولات و دسته‌بندی‌ها. با ارسال رمزگذاری‌شده (base64) محدودیت‌های فایروال (mod_security/WAF) را دور می‌زند و فیلتر kses را برای ادمین غیرفعال می‌کند.
 * Version:     1.0.0
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
		 *    تا اگر کاربر مستقیماً در فیلد توضیحات هم HTML گذاشت، حذف نشود.
		 */
		if ( current_user_can( 'manage_options' ) ) {
			remove_filter( 'pre_term_description', 'wp_filter_kses' );
			remove_filter( 'term_description', 'wp_kses_data' );
			remove_filter( 'pre_term_description', 'wp_filter_post_kses' );
		}

		// متاباکس روی صفحه‌ی افزودن/ویرایش دسته‌بندی
		foreach ( $this->taxonomies as $tax ) {
			add_action( "{$tax}_edit_form_fields", array( $this, 'render_edit_field' ), 10, 2 );
			add_action( "edited_{$tax}", array( $this, 'save_field' ), 10, 1 );
			add_action( "create_{$tax}", array( $this, 'save_field' ), 10, 1 );
		}

		// خروجی محتوا در صفحه‌ی آرشیو دسته‌بندی
		add_action( 'woocommerce_archive_description', array( $this, 'output_html' ), 8 );

		// برای دسته‌بندی‌های معمولی (غیر ووکامرس) از طریق فیلتر توضیحات آرشیو
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
				<!-- فیلد مخفی که نسخه‌ی رمزگذاری‌شده (base64) ارسال می‌شود تا فایروال آن را بلاک نکند -->
				<input type="hidden" name="shz_html_b64" id="shz_html_b64" value="" />
				<p class="description">کد HTML کامل (شامل style/script/svg/video) را اینجا بگذارید. هنگام ذخیره به‌صورت رمزگذاری‌شده ارسال می‌شود تا فایروال سرور آن را مسدود نکند. این محتوا بالای صفحه‌ی دسته‌بندی نمایش داده می‌شود.</p>
				<script>
				(function(){
					var ta   = document.getElementById('shz_html_textarea');
					var b64  = document.getElementById('shz_html_b64');
					if(!ta || !b64) return;
					var form = ta.closest('form');
					if(!form) return;
					form.addEventListener('submit', function(){
						try {
							// رمزگذاری UTF-8 امن به base64
							var bytes = new TextEncoder().encode(ta.value);
							var bin = '';
							bytes.forEach(function(b){ bin += String.fromCharCode(b); });
							b64.value = btoa(bin);
						} catch(e) {
							b64.value = btoa(unescape(encodeURIComponent(ta.value)));
						}
						// جلوگیری از ارسال متن خام (که فایروال را تحریک می‌کند)
						ta.removeAttribute('name');
						ta.value = '';
					});
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
		if ( ! isset( $_POST['shz_html_b64'] ) ) {
			return;
		}

		$b64 = wp_unslash( $_POST['shz_html_b64'] );

		if ( '' === $b64 ) {
			// خالی یعنی پاک‌کردن محتوا
			delete_term_meta( $term_id, self::META_KEY );
			return;
		}

		$decoded = base64_decode( $b64, true );
		if ( false === $decoded ) {
			return; // داده‌ی نامعتبر
		}

		// ذخیره‌ی خام، بدون فیلتر kses
		update_term_meta( $term_id, self::META_KEY, $decoded );
	}

	/**
	 * خروجی در آرشیو ووکامرس
	 */
	public function output_html() {
		if ( ! is_tax( $this->taxonomies ) && ! ( function_exists( 'is_product_category' ) && is_product_category() ) ) {
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
	 * خروجی برای دسته‌بندی‌های معمولی (تم‌هایی که از get_the_archive_description استفاده می‌کنند)
	 */
	public function filter_archive_description( $description ) {
		if ( function_exists( 'is_product_category' ) && is_product_category() ) {
			return $description; // ووکامرس را از طریق هوک دیگری مدیریت می‌کنیم
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
