<?php
/**
 * Shofazh — هشدار قیمت برای محصولات متغیر (Variable Product Price Notice)
 * ---------------------------------------------------------------------------
 * هدف: روی صفحه‌ی محصولاتی که چند مدل با قیمت‌های متفاوت دارند (مثلاً دیگ سوپر ۴۰۰
 * با ۵ تا ۱۳ پره)، یک پیام هشدار درست بالای کادر انتخاب مدل و دکمه «افزودن به سبد»
 * نمایش می‌دهد تا مشتری در مورد قیمت اشتباه نکند.
 *
 * این کد فقط روی محصولات «متغیر» (variable) ووکامرس اجرا می‌شود و روی محصولات
 * ساده اثری ندارد. یک‌بار نصب می‌شود و روی همه‌ی محصولات متغیر فعلی و آینده فعال است.
 *
 * نحوه نصب (یکی از دو روش):
 *   ۱) افزونه «Code Snippets»: یک اسنیپت جدید بسازید، کل این کد را (بدون تگ <?php
 *      اول) داخلش بگذارید و فعال کنید. — روش پیشنهادی و ایمن.
 *   ۲) فایل functions.php قالب فرزند (child theme): کل کد را در انتهای فایل اضافه کنید.
 *
 * در صورت نیاز فقط متن داخل تابع shofazh_variable_price_notice() را ویرایش کنید.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // جلوگیری از دسترسی مستقیم
}

if ( ! function_exists( 'shofazh_variable_price_notice' ) ) {
	/**
	 * چاپ باکس هشدار قیمت، فقط برای محصولات متغیر.
	 * این تابع به هوک woocommerce_before_add_to_cart_form وصل می‌شود تا پیام
	 * دقیقاً بالای کادر انتخاب مدل/پره و دکمه خرید قرار بگیرد.
	 */
	function shofazh_variable_price_notice() {
		global $product;

		if ( ! $product || ! is_a( $product, 'WC_Product' ) || ! $product->is_type( 'variable' ) ) {
			return;
		}
		?>
		<div class="shofazh-price-notice" role="alert">
			<span class="shofazh-price-notice__icon" aria-hidden="true">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
			</span>
			<div class="shofazh-price-notice__text">
				<strong>توجه به قیمت مدل‌ها</strong>
				<span>این محصول در چند مدل با قیمت متفاوت عرضه می‌شود. قیمتی که می‌بینید مربوط به همان مدلی است که در کادر زیر انتخاب کرده‌اید. لطفاً پیش از ثبت سفارش، مدل موردنظر (مثلاً تعداد پره) را انتخاب کنید تا قیمت دقیقِ همان مدل نمایش داده شود. در صورت تردید، پیش از خرید با کارشناسان شوفاژ تماس بگیرید.</span>
			</div>
		</div>
		<?php
	}
	add_action( 'woocommerce_before_add_to_cart_form', 'shofazh_variable_price_notice', 10 );
}

if ( ! function_exists( 'shofazh_variable_price_notice_styles' ) ) {
	/**
	 * استایل باکس هشدار. فقط در صفحه‌ی تکیِ محصول بارگذاری می‌شود.
	 */
	function shofazh_variable_price_notice_styles() {
		if ( ! function_exists( 'is_product' ) || ! is_product() ) {
			return;
		}
		?>
		<style id="shofazh-price-notice-css">
		.shofazh-price-notice{
			display:flex;gap:12px;align-items:flex-start;
			direction:rtl;text-align:right;
			margin:14px 0 18px;padding:14px 16px;
			border:2px solid #F57F17;border-radius:14px;
			background:linear-gradient(135deg,#FFF8E1 0%,#FFFDF6 100%);
			box-shadow:0 8px 22px rgba(245,127,23,.18);
			font-family:Tahoma,"IRANSans","Vazirmatn",sans-serif;
			animation:shofazhNoticeGlow 2.6s ease-in-out infinite;
		}
		.shofazh-price-notice__icon{
			flex:0 0 auto;width:38px;height:38px;border-radius:50%;
			display:flex;align-items:center;justify-content:center;
			background:linear-gradient(135deg,#F57F17,#FF8F00);color:#fff;
			box-shadow:0 6px 16px rgba(245,127,23,.45);
		}
		.shofazh-price-notice__text strong{
			display:block;color:#B25E00;font-size:15px;margin-bottom:4px;
		}
		.shofazh-price-notice__text span{
			display:block;color:#7a5b00;font-size:14px;line-height:1.95;
		}
		@keyframes shofazhNoticeGlow{
			0%,100%{box-shadow:0 8px 22px rgba(245,127,23,.18)}
			50%{box-shadow:0 10px 28px rgba(245,127,23,.32)}
		}
		@media (max-width:480px){
			.shofazh-price-notice{padding:12px}
			.shofazh-price-notice__text span{font-size:13px}
		}
		</style>
		<?php
	}
	add_action( 'wp_footer', 'shofazh_variable_price_notice_styles' );
}
