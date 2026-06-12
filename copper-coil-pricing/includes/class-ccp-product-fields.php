<?php
/**
 * فیلدهای محصول و گونه — متراژ کویل (محصول) و وزن مخزن (گونه)
 *
 * @package CopperCoilPricing
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CCP_Product_Fields {

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		// تب «کویل مسی» در ویرایش محصول.
		add_filter( 'woocommerce_product_data_tabs', array( $this, 'add_product_tab' ) );
		add_action( 'woocommerce_product_data_panels', array( $this, 'render_product_panel' ) );
		add_action( 'woocommerce_process_product_meta', array( $this, 'save_product_fields' ) );

		// فیلد وزن در هر گونه (variation).
		add_action( 'woocommerce_variation_options_pricing', array( $this, 'render_variation_field' ), 10, 3 );
		add_action( 'woocommerce_save_product_variation', array( $this, 'save_variation_field' ), 10, 2 );

		// محاسبه خودکار پس از ذخیره کامل محصول.
		add_action( 'woocommerce_after_product_object_save', array( $this, 'maybe_recalculate' ), 20 );
	}

	public function add_product_tab( $tabs ) {
		$tabs['ccp_coil'] = array(
			'label'    => 'کویل مسی',
			'target'   => 'ccp_coil_data',
			'class'    => array( 'show_if_simple', 'show_if_variable' ),
			'priority' => 65,
		);
		return $tabs;
	}

	public function render_product_panel() {
		global $post;
		echo '<div id="ccp_coil_data" class="panel woocommerce_options_panel hidden">';

		woocommerce_wp_checkbox( array(
			'id'          => CCP_Calculator::META_ENABLED,
			'label'       => 'محاسبه خودکار قیمت',
			'description' => 'قیمت این محصول بر اساس وزن مخزن و متراژ کویل مسی محاسبه شود.',
			'value'       => get_post_meta( $post->ID, CCP_Calculator::META_ENABLED, true ),
		) );

		woocommerce_wp_text_input( array(
			'id'                => CCP_Calculator::META_COIL_FEET,
			'label'             => 'متراژ کویل مسی (فوت)',
			'description'       => 'سطح کویل مسی این محصول به فوت — مثلاً برای منبع ۸۰۰ لیتری: ۲۳.',
			'desc_tip'          => true,
			'type'              => 'number',
			'custom_attributes' => array(
				'step' => 'any',
				'min'  => '0',
			),
			'value'             => get_post_meta( $post->ID, CCP_Calculator::META_COIL_FEET, true ),
		) );

		woocommerce_wp_text_input( array(
			'id'                => CCP_Calculator::META_WEIGHT,
			'label'             => 'وزن مخزن (کیلوگرم) — فقط محصول ساده',
			'description'       => 'برای محصول متغیر این فیلد را خالی بگذارید و وزن را در هر گونه (ضخامت ورق) وارد کنید.',
			'desc_tip'          => true,
			'type'              => 'number',
			'custom_attributes' => array(
				'step' => 'any',
				'min'  => '0',
			),
			'value'             => get_post_meta( $post->ID, CCP_Calculator::META_WEIGHT, true ),
		) );

		echo '</div>';
	}

	public function save_product_fields( $post_id ) {
		// phpcs:disable WordPress.Security.NonceVerification -- ووکامرس خودش nonce را بررسی می‌کند.
		$enabled = isset( $_POST[ CCP_Calculator::META_ENABLED ] ) ? 'yes' : 'no';
		update_post_meta( $post_id, CCP_Calculator::META_ENABLED, $enabled );

		if ( isset( $_POST[ CCP_Calculator::META_COIL_FEET ] ) ) {
			update_post_meta( $post_id, CCP_Calculator::META_COIL_FEET, wc_format_decimal( wp_unslash( $_POST[ CCP_Calculator::META_COIL_FEET ] ) ) );
		}
		if ( isset( $_POST[ CCP_Calculator::META_WEIGHT ] ) ) {
			update_post_meta( $post_id, CCP_Calculator::META_WEIGHT, wc_format_decimal( wp_unslash( $_POST[ CCP_Calculator::META_WEIGHT ] ) ) );
		}
		// phpcs:enable
	}

	public function render_variation_field( $loop, $variation_data, $variation ) {
		woocommerce_wp_text_input( array(
			'id'                => CCP_Calculator::META_WEIGHT . '_' . $loop,
			'name'              => CCP_Calculator::META_WEIGHT . '[' . $loop . ']',
			'label'             => 'وزن مخزن (کیلوگرم)',
			'description'       => 'وزن مخزن برای این ضخامت ورق — مثلاً K-4 منبع ۸۰۰ لیتری: ۱۸۰. قیمت گونه از روی این وزن محاسبه می‌شود.',
			'desc_tip'          => true,
			'type'              => 'number',
			'custom_attributes' => array(
				'step' => 'any',
				'min'  => '0',
			),
			'wrapper_class'     => 'form-row form-row-full',
			'value'             => get_post_meta( $variation->ID, CCP_Calculator::META_WEIGHT, true ),
		) );
	}

	public function save_variation_field( $variation_id, $loop ) {
		// phpcs:disable WordPress.Security.NonceVerification -- ووکامرس خودش nonce را بررسی می‌کند.
		if ( isset( $_POST[ CCP_Calculator::META_WEIGHT ][ $loop ] ) ) {
			update_post_meta(
				$variation_id,
				CCP_Calculator::META_WEIGHT,
				wc_format_decimal( wp_unslash( $_POST[ CCP_Calculator::META_WEIGHT ][ $loop ] ) )
			);
		}
		// phpcs:enable
	}

	/**
	 * پس از ذخیره محصول، اگر محاسبه خودکار فعال باشد قیمت‌ها را به‌روز می‌کند.
	 *
	 * @param WC_Product $product محصول ذخیره‌شده.
	 */
	public function maybe_recalculate( $product ) {
		// جلوگیری از حلقه بی‌نهایت هنگام ذخیره قیمت گونه‌ها توسط خود افزونه.
		static $running = false;
		if ( $running ) {
			return;
		}

		// فقط محصول مادر (نه گونه‌ها) و فقط در ذخیره از پیشخوان.
		if ( ! $product instanceof WC_Product || $product->is_type( 'variation' ) ) {
			return;
		}
		if ( ! is_admin() || ! current_user_can( 'edit_products' ) ) {
			return;
		}

		$running = true;
		CCP_Calculator::update_product_prices( $product->get_id() );
		$running = false;
	}
}
