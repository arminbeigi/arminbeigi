<?php
/**
 * منطق محاسبه قیمت
 *
 * قیمت نهایی = (وزن مخزن به کیلوگرم × فی هر کیلو ورق) + (متراژ کویل به فوت × فی هر فوت مس)
 *
 * @package CopperCoilPricing
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CCP_Calculator {

	const META_WEIGHT    = '_ccp_weight_kg';   // وزن مخزن (کیلوگرم) — روی گونه یا محصول ساده.
	const META_COIL_FEET = '_ccp_coil_feet';   // متراژ کویل مسی (فوت) — روی محصول مادر.
	const META_ENABLED   = '_ccp_enabled';     // فعال بودن محاسبه خودکار برای محصول.

	/**
	 * محاسبه قیمت بر اساس وزن و فوت
	 *
	 * @param float $weight_kg وزن به کیلوگرم.
	 * @param float $coil_feet متراژ کویل به فوت.
	 * @return float|null قیمت محاسبه‌شده یا null اگر فی‌ها تنظیم نشده باشند.
	 */
	public static function calculate( $weight_kg, $coil_feet ) {
		$price_per_kg = (float) get_option( 'ccp_price_per_kg', 0 );
		$price_per_ft = (float) get_option( 'ccp_price_per_ft', 0 );

		if ( $price_per_kg <= 0 && $price_per_ft <= 0 ) {
			return null;
		}

		$price = ( (float) $weight_kg * $price_per_kg ) + ( (float) $coil_feet * $price_per_ft );

		$rounding = (float) get_option( 'ccp_rounding', 0 );
		if ( $rounding > 0 ) {
			$price = ceil( $price / $rounding ) * $rounding;
		}

		/**
		 * امکان تغییر قیمت محاسبه‌شده با فیلتر
		 */
		return (float) apply_filters( 'ccp_calculated_price', $price, $weight_kg, $coil_feet );
	}

	/**
	 * به‌روزرسانی قیمت یک محصول (ساده یا متغیر به همراه همه گونه‌ها)
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

		$coil_feet = (float) $product->get_meta( self::META_COIL_FEET );
		$updated   = 0;

		if ( $product->is_type( 'variable' ) ) {
			foreach ( $product->get_children() as $variation_id ) {
				$variation = wc_get_product( $variation_id );
				if ( ! $variation ) {
					continue;
				}

				$weight = (float) $variation->get_meta( self::META_WEIGHT );
				if ( $weight <= 0 ) {
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

			// همگام‌سازی بازه قیمت محصول متغیر.
			if ( $updated > 0 ) {
				WC_Product_Variable::sync( $product_id );
			}
		} else {
			$weight = (float) $product->get_meta( self::META_WEIGHT );
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
