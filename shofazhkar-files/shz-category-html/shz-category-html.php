<?php
/**
 * Plugin Name: Shofazh Category HTML
 * Plugin URI:  https://shofazh.com
 * Description: اجازه‌ی درج HTML کامل (style, script, svg, video, details) در توضیحات دسته‌بندی. محتوا را به‌صورت تکه‌تکه و با AJAX ذخیره می‌کند تا محدودیت‌های فایروال (mod_security/WAF) و حجم درخواست را کاملاً دور بزند.
 * Version:     1.2.0
 * Author:      Shofazh
 * Text Domain: shz-category-html
 * License:     GPLv2 or later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SHZ_Category_HTML {

	const META_KEY = '_shz_html_content';

	private $taxonomies = array( 'product_cat', 'category' );

	public function __construct() {
		add_action( 'init', array( $this, 'register_hooks' ), 5 );
	}

	public function register_hooks() {
		// غیرفعال‌کردن فیلتر kses برای ادمین
		if ( current_user_can( 'manage_options' ) ) {
			remove_filter( 'pre_term_description', 'wp_filter_kses' );
			remove_filter( 'term_description', 'wp_kses_data' );
			remove_filter( 'pre_term_description', 'wp_filter_post_kses' );
		}

		// فیلد روی صفحه‌ی ویرایش دسته‌بندی
		foreach ( $this->taxonomies as $tax ) {
			add_action( "{$tax}_edit_form_fields", array( $this, 'render_edit_field' ), 10, 2 );
		}

		// هندلرهای AJAX برای ذخیره‌ی تکه‌ای
		add_action( 'wp_ajax_shz_save_chunk', array( $this, 'ajax_save_chunk' ) );

		// خروجی محتوا در آرشیو
		add_action( 'woocommerce_archive_description', array( $this, 'output_html' ), 8 );
		add_filter( 'get_the_archive_description', array( $this, 'filter_archive_description' ) );
	}

	/**
	 * فیلد ویرایش
	 */
	public function render_edit_field( $term, $taxonomy ) {
		$content = get_term_meta( $term->term_id, self::META_KEY, true );
		$nonce   = wp_create_nonce( 'shz_ajax_' . $term->term_id );
		?>
		<tr class="form-field shz-html-row">
			<th scope="row"><label for="shz_html_textarea">محتوای HTML سفارشی (شوفاژ)</label></th>
			<td>
				<textarea id="shz_html_textarea" rows="14" style="width:100%;direction:ltr;font-family:monospace;font-size:13px;line-height:1.6"><?php echo esc_textarea( $content ); ?></textarea>
				<p style="margin:10px 0">
					<button type="button" class="button button-primary" id="shz_save_btn">💾 ذخیره‌ی محتوای HTML</button>
					<span id="shz_html_status" style="margin-right:12px;font-size:13px;color:#666"></span>
				</p>
				<p class="description">کد HTML کامل (شامل style/script/svg/video) را اینجا بگذارید و روی دکمه‌ی «ذخیره‌ی محتوای HTML» بزنید (نه دکمه‌ی بروزرسانی پایین صفحه). محتوا به‌صورت تکه‌تکه و رمزگذاری‌شده ارسال می‌شود تا فایروال آن را مسدود نکند.</p>
				<script>
				(function(){
					var ta     = document.getElementById('shz_html_textarea');
					var btn    = document.getElementById('shz_save_btn');
					var status = document.getElementById('shz_html_status');
					if(!ta || !btn) return;

					var TERM_ID   = <?php echo (int) $term->term_id; ?>;
					var NONCE     = '<?php echo esc_js( $nonce ); ?>';
					var AJAX_URL  = '<?php echo esc_js( admin_url( 'admin-ajax.php' ) ); ?>';
					var CHUNK_LEN = 4000; // طول هر تکه (کاراکتر hex) ~۲ کیلوبایت

					function toHex(str){
						var bytes;
						try { bytes = new TextEncoder().encode(str); }
						catch(e){ var u=unescape(encodeURIComponent(str)); bytes=[]; for(var i=0;i<u.length;i++) bytes.push(u.charCodeAt(i)); }
						var out='';
						for(var j=0;j<bytes.length;j++){ var h=bytes[j].toString(16); if(h.length<2) h='0'+h; out+=h; }
						return out;
					}

					function setStatus(msg, color){
						status.textContent = msg;
						status.style.color = color || '#666';
					}

					async function sendChunk(index, total, data, reset){
						var body = new URLSearchParams();
						body.append('action', 'shz_save_chunk');
						body.append('nonce', NONCE);
						body.append('term_id', TERM_ID);
						body.append('index', index);
						body.append('total', total);
						body.append('reset', reset ? '1' : '0');
						body.append('data', data);
						var res = await fetch(AJAX_URL, {
							method:'POST',
							credentials:'same-origin',
							headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
							body: body.toString()
						});
						return res.json();
					}

					btn.addEventListener('click', async function(){
						btn.disabled = true;
						var hex = toHex(ta.value);
						var chunks = [];
						for(var i=0;i<hex.length;i+=CHUNK_LEN){ chunks.push(hex.slice(i, i+CHUNK_LEN)); }
						if(chunks.length===0) chunks=[''];
						var total = chunks.length;
						try {
							for(var k=0;k<total;k++){
								setStatus('در حال ارسال تکه ' + (k+1) + ' از ' + total + ' ...', '#0073aa');
								var r = await sendChunk(k, total, chunks[k], k===0);
								if(!r || !r.success){
									throw new Error(r && r.data ? r.data : 'خطای ناشناخته');
								}
							}
							setStatus('✅ با موفقیت ذخیره شد (' + ta.value.length + ' کاراکتر).', '#1b8a3a');
						} catch(err){
							setStatus('❌ خطا: ' + err.message, '#c62828');
						} finally {
							btn.disabled = false;
						}
					});
				})();
				</script>
			</td>
		</tr>
		<?php
	}

	/**
	 * دریافت تکه‌ها از طریق AJAX و سرهم‌کردن
	 */
	public function ajax_save_chunk() {
		$term_id = isset( $_POST['term_id'] ) ? (int) $_POST['term_id'] : 0;
		$nonce   = isset( $_POST['nonce'] ) ? $_POST['nonce'] : '';

		if ( ! $term_id || ! wp_verify_nonce( $nonce, 'shz_ajax_' . $term_id ) ) {
			wp_send_json_error( 'نشست نامعتبر است. صفحه را تازه کنید.' );
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'دسترسی کافی نیست.' );
		}

		$index = isset( $_POST['index'] ) ? (int) $_POST['index'] : 0;
		$total = isset( $_POST['total'] ) ? (int) $_POST['total'] : 1;
		$reset = isset( $_POST['reset'] ) && '1' === $_POST['reset'];
		$data  = isset( $_POST['data'] ) ? wp_unslash( $_POST['data'] ) : '';
		$data  = preg_replace( '/[^0-9a-fA-F]/', '', $data ); // فقط hex

		$transient = 'shz_html_buf_' . $term_id;

		// تکه‌ی اول: شروع تازه
		$buffer = $reset ? '' : (string) get_transient( $transient );
		$buffer .= $data;

		// تکه‌ی آخر: نهایی‌سازی
		if ( $index >= $total - 1 ) {
			delete_transient( $transient );

			if ( '' === $buffer ) {
				delete_term_meta( $term_id, self::META_KEY );
				wp_send_json_success( array( 'done' => true, 'cleared' => true ) );
			}

			if ( strlen( $buffer ) % 2 !== 0 ) {
				wp_send_json_error( 'داده‌ی ناقص دریافت شد. دوباره تلاش کنید.' );
			}

			$decoded = @hex2bin( $buffer );
			if ( false === $decoded ) {
				wp_send_json_error( 'رمزگشایی ناموفق بود.' );
			}

			update_term_meta( $term_id, self::META_KEY, $decoded );
			wp_send_json_success( array( 'done' => true, 'bytes' => strlen( $decoded ) ) );
		}

		// تکه‌های میانی: ذخیره‌ی موقت
		set_transient( $transient, $buffer, HOUR_IN_SECONDS );
		wp_send_json_success( array( 'done' => false, 'index' => $index ) );
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
			echo $content;
		}
	}

	/**
	 * خروجی برای دسته‌بندی‌های معمولی
	 */
	public function filter_archive_description( $description ) {
		if ( function_exists( 'is_product_category' ) && is_product_category() ) {
			return $description;
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
