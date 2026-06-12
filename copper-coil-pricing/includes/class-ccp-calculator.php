<?php
/**
 * منطق محاسبه قیمت
 *
 * منبع کویل‌دار: قیمت = (وزن مخزن × فی هر کیلو ورق) + (متراژ کویل × فی هر فوت مس)
 * منبع دوجداره: قیمت = وزن مخزن × فی هر کیلو ورق
 *
 * وزن هر گونه از جداول کارخانه (CCP_Tables) بر اساس ظرفیت و ضخامت ورق خوانده می‌شود.
 *
 * @package CopperCoilPricing
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CCP_Calculator {

	const META_ENABLED  = '_ccp_enabled';   // فعال بودن محاسبه خودکار.
	const META_TYPE     = '_ccp_type';      // نوع منبع: coil | double.
	const META_CAPACITY = '_ccp_capacity';  // ظرفیت به لیتر.

	/**
	 * محاسبه قیمت بر اساس وزن و فوت
	 *
	 * @param float $weight_kg وزن به کیلوگرم.
	 * @param float $coil_feet متراژ کویل به فوت (برای دوجداره صفر).
	 * @return float|null قیمت محاسبه‌شده یا null اگر فی‌ها تنظیم نشده باشند.
	 */
	public static function calculate( $weight_kg, $coil_feet = 0 ) {
		$price_per_kg = (float) get_option( 'ccp_price_per_kg', 0 );
		$price_per_ft = (float) get_option( 'ccp_price_per_ft', 0 );

		if ( $price_per_kg <= 0 ) {
			return null;
		}

		$price = ( (float) $weight_kg * $price_per_kg ) + ( (float) $coil_feet * $price_per_ft );

		$rounding = (float) get_option( 'ccp_rounding', 0 );
		if ( $rounding > 0 ) {
			$price = ceil( $price / $rounding ) * $rounding;
		}

		return (float) apply_filters( 'ccp_calculated_price', $price, $weight_kg, $coil_feet );
	}

	/**
	 * یافتن وزن یک گونه از جدول کارخانه بر اساس ویژگی ضخامت ورق آن
	 *
	 * همه ویژگی‌های گونه بررسی می‌شوند و اولین مقداری که با کلیدهای جدول
	 * (مثل K-4 یا 4-2/5) تطبیق کند، وزن را تعیین می‌کند. ویژگی «وزن» سایت ملاک نیست.
	 *
	 * @param WC_Product $variation گونه محصول.
	 * @param string     $type      coil | double.
	 * @param int        $capacity  ظرفیت به لیتر.
	 * @return float|null
	 */
	public static function resolve_variation_weight( $variation, $type, $capacity ) {
		foreach ( $variation->get_attributes() as $taxonomy => $value ) {
			if ( '' === $value ) {
				continue;
			}

			// نام نمایشی ترم (برای ویژگی‌های سراسری) و خود مقدار، هر دو امتحان می‌شوند.
			$candidates = array( $value );
			if ( taxonomy_exists( $taxonomy ) ) {
				$term = get_term_by( 'slug', $value, $taxonomy );
				if ( $term ) {
					$candidates[] = $term->name;
				}
			}

			foreach ( $candidates as $candidate ) {
				$weight = CCP_Tables::lookup_weight( $type, $capacity, $candidate );
				if ( null !== $weight ) {
					return $weight;
				}
			}
		}

		return null;
	}

	/**
	 * به‌روزرسانی قیمت یک محصول (متغیر به همراه همه گونه‌ها، یا ساده)
	 *
	 * @param int $product_id شناسه محصول مادر.
	 * @return int تعداد قیمت‌های به‌روز شده.
	 */
	public static function update_product_prices( $product_id ) {
		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return 0;
		}

		if ( 'yes' !== $product->get_meta( self::META_ENABLED ) ) {
			return 0;
		}

		$type     = $product->get_meta( self::META_TYPE );
		$capacity = (int) $product->get_meta( self::META_CAPACITY );
		if ( ! in_array( $type, array( 'coil', 'double' ), true ) || $capacity <= 0 ) {
			return 0;
		}

		$coil_feet = ( 'coil' === $type ) ? CCP_Tables::get_coil_feet( $capacity ) : 0;
		$updated   = 0;

		if ( $product->is_type( 'variable' ) ) {
			foreach ( $product->get_children() as $variation_id ) {
				$variation = wc_get_product( $variation_id );
				if ( ! $variation ) {
					continue;
				}

				$weight = self::resolve_variation_weight( $variation, $type, $capacity );
				if ( null === $weight ) {
					continue;
				}

				$price = self::calculate( $weight, $coil_feet );
				if ( null === $price ) {
					continue;
				}

				$variation->set_regular_price( $price );
				$variation->set_price( $price );
				$variation->save();
				$updated++;
			}

			if ( $updated > 0 ) {
				WC_Product_Variable::sync( $product_id );
			}
		} else {
			// محصول ساده: کمترین ضخامت موجود در جدول ملاک است.
			$weights = CCP_Tables::get_weights( $type, $capacity );
			$weight  = $weights ? (float) reset( $weights ) : 0;
			if ( $weight > 0 ) {
				$price = self::calculate( $weight, $coil_feet );
				if ( null !== $price ) {
					$product->set_regular_price( $price );
					$product->set_price( $price );
					$product->save();
					$updated++;
				}
			}
		}

		if ( $updated > 0 ) {
			wc_delete_product_transients( $product_id );
		}

		return $updated;
	}

	/**
	 * به‌روزرسانی قیمت همه محصولاتی که محاسبه خودکار برایشان فعال است
	 *
	 * @return array{products:int,prices:int} آمار به‌روزرسانی.
	 */
	public static function update_all_prices() {
		$product_ids = get_posts( array(
			'post_type'      => 'product',
			'post_status'    => 'any',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'meta_key'       => self::META_ENABLED, // phpcs:ignore WordPress.DB.SlowDBQuery
			'meta_value'     => 'yes',              // phpcs:ignore WordPress.DB.SlowDBQuery
		) );

		$stats = array(
			'products' => 0,
			'prices'   => 0,
		);

		foreach ( $product_ids as $product_id ) {
			$updated = self::update_product_prices( $product_id );
			if ( $updated > 0 ) {
				$stats['products']++;
				$stats['prices'] += $updated;
			}
		}

		return $stats;
	}
}
