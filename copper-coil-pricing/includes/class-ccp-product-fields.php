<?php
/**
 * تب «کویل مسی» در ویرایش محصول — انتخاب نوع منبع و ظرفیت
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
		add_filter( 'woocommerce_product_data_tabs', array( $this, 'add_product_tab' ) );
		add_action( 'woocommerce_product_data_panels', array( $this, 'render_product_panel' ) );
		add_action( 'woocommerce_process_product_meta', array( $this, 'save_product_fields' ) );

		// محاسبه خودکار پس از ذخیره کامل محصول.
		add_action( 'woocommerce_after_product_object_save', array( $this, 'maybe_recalculate' ), 20 );
	}

	public function add_product_tab( $tabs ) {
		$tabs['ccp_coil'] = array(
			'label'    => 'قیمت کویل مسی',
			'target'   => 'ccp_coil_data',
			'class'    => array( 'show_if_simple', 'show_if_variable' ),
			'priority' => 65,
		);
		return $tabs;
	}

	public function render_product_panel() {
		global $post;

		$enabled  = get_post_meta( $post->ID, CCP_Calculator::META_ENABLED, true );
		$type     = get_post_meta( $post->ID, CCP_Calculator::META_TYPE, true );
		$capacity = (int) get_post_meta( $post->ID, CCP_Calculator::META_CAPACITY, true );

		echo '<div id="ccp_coil_data" class="panel woocommerce_options_panel hidden">';

		woocommerce_wp_checkbox( array(
			'id'          => CCP_Calculator::META_ENABLED,
			'label'       => 'محاسبه خودکار قیمت',
			'description' => 'قیمت این محصول از روی جدول وزن کارخانه و فی روز محاسبه شود.',
			'value'       => $enabled,
		) );

		woocommerce_wp_select( array(
			'id'      => CCP_Calculator::META_TYPE,
			'label'   => 'نوع منبع',
			'options' => array(
				''       => '— انتخاب کنید —',
				'coil'   => 'منبع کویل‌دار (ورق + کویل مسی)',
				'double' => 'منبع دوجداره (فقط ورق)',
			),
			'value'   => $type,
		) );

		// گزینه‌های ظرفیت هر دو نوع؛ با جاوااسکریپت بر اساس نوع فیلتر می‌شوند.
		echo '<p class="form-field"><label for="' . esc_attr( CCP_Calculator::META_CAPACITY ) . '">ظرفیت (لیتر)</label>';
		echo '<select id="' . esc_attr( CCP_Calculator::META_CAPACITY ) . '" name="' . esc_attr( CCP_Calculator::META_CAPACITY ) . '" class="select short">';
		echo '<option value="">— انتخاب کنید —</option>';
		foreach ( array( 'coil' => 'کویل‌دار', 'double' => 'دوجداره' ) as $t => $label ) {
			foreach ( CCP_Tables::get_capacities( $t ) as $cap ) {
				printf(
					'<option value="%1$d" data-ccp-type="%2$s"%3$s>%1$d لیتری</option>',
					(int) $cap,
					esc_attr( $t ),
					selected( $capacity === (int) $cap && $type === $t, true, false )
				);
			}
		}
		echo '</select></p>';

		// پیش‌نمایش جدول وزن ظرفیت انتخاب‌شده.
		if ( $type && $capacity ) {
			$weights = CCP_Tables::get_weights( $type, $capacity );
			if ( $weights ) {
				echo '<p class="form-field"><label>وزن‌های جدول</label><span style="direction:rtl">';
				$parts = array();
				foreach ( $weights as $thickness => $weight ) {
					$parts[] = esc_html( $thickness . ' = ' . $weight . ' kg' );
				}
				echo wp_kses_post( implode( ' | ', $parts ) );
				if ( 'coil' === $type ) {
					echo esc_html( ' | کویل: ' . CCP_Tables::get_coil_feet( $capacity ) . ' فوت' );
				}
				echo '</span></p>';
			}
		}

		echo '<p class="form-field"><span class="description">ضخامت ورق هر گونه از ویژگی‌های همان گونه خوانده می‌شود (مثل K-4 یا 4-2/5) و وزن آن از جدول کارخانه برداشته می‌شود — ویژگی «وزن» محصول در سایت ملاک نیست.</span></p>';

		// فیلتر ظرفیت‌ها بر اساس نوع انتخاب‌شده.
		?>
		<script>
		jQuery( function ( $ ) {
			var $type = $( '#<?php echo esc_js( CCP_Calculator::META_TYPE ); ?>' ),
				$cap  = $( '#<?php echo esc_js( CCP_Calculator::META_CAPACITY ); ?>' );

			function filterCaps() {
				var t = $type.val();
				$cap.find( 'option[data-ccp-type]' ).each( function () {
					var show = ! t || $( this ).data( 'ccp-type' ) === t;
					$( this ).toggle( show ).prop( 'disabled', ! show );
				} );
				var $sel = $cap.find( 'option:selected' );
				if ( $sel.length && $sel.prop( 'disabled' ) ) {
					$cap.val( '' );
				}
			}

			$type.on( 'change', filterCaps );
			filterCaps();
		} );
		</script>
		<?php

		echo '</div>';
	}

	public function save_product_fields( $post_id ) {
		// phpcs:disable WordPress.Security.NonceVerification -- ووکامرس خودش nonce را بررسی می‌کند.
		$enabled = isset( $_POST[ CCP_Calculator::META_ENABLED ] ) ? 'yes' : 'no';
		update_post_meta( $post_id, CCP_Calculator::META_ENABLED, $enabled );

		if ( isset( $_POST[ CCP_Calculator::META_TYPE ] ) ) {
			$type = sanitize_text_field( wp_unslash( $_POST[ CCP_Calculator::META_TYPE ] ) );
			update_post_meta( $post_id, CCP_Calculator::META_TYPE, in_array( $type, array( 'coil', 'double' ), true ) ? $type : '' );
		}
		if ( isset( $_POST[ CCP_Calculator::META_CAPACITY ] ) ) {
			update_post_meta( $post_id, CCP_Calculator::META_CAPACITY, absint( wp_unslash( $_POST[ CCP_Calculator::META_CAPACITY ] ) ) );
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
