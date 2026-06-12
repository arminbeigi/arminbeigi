<?php
/**
 * جداول وزن کارخانه — منابع کویل‌دار و دوجداره
 *
 * وزن هر مخزن بر اساس ظرفیت (لیتر) و ضخامت ورق از این جداول خوانده می‌شود
 * و ویژگی «وزن» خود محصول در سایت ملاک نیست.
 *
 * @package CopperCoilPricing
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CCP_Tables {

	/**
	 * جدول منابع کویل‌دار: ظرفیت => [ 'feet' => سطح کویل (فوت), 'weights' => [ ضخامت => وزن kg ] ]
	 *
	 * @return array
	 */
	public static function coil_table() {
		return array(
			200   => array( 'feet' => 8,   'weights' => array( 'k-4' => 70,  'k-5' => 88,  'k-6' => 106,  'k-8' => 140 ) ),
			300   => array( 'feet' => 10,  'weights' => array( 'k-4' => 90,  'k-5' => 112, 'k-6' => 135,  'k-8' => 180 ) ),
			400   => array( 'feet' => 12,  'weights' => array( 'k-4' => 120, 'k-5' => 140, 'k-6' => 165,  'k-8' => 220 ) ),
			500   => array( 'feet' => 15,  'weights' => array( 'k-4' => 140, 'k-5' => 165, 'k-6' => 189,  'k-8' => 250 ) ),
			600   => array( 'feet' => 19,  'weights' => array( 'k-4' => 150, 'k-5' => 200, 'k-6' => 240,  'k-8' => 290 ) ),
			800   => array( 'feet' => 23,  'weights' => array( 'k-4' => 180, 'k-5' => 240, 'k-6' => 290,  'k-8' => 352 ) ),
			1000  => array( 'feet' => 27,  'weights' => array( 'k-4' => 210, 'k-5' => 260, 'k-6' => 315,  'k-8' => 408 ) ),
			1200  => array( 'feet' => 29,  'weights' => array( 'k-4' => 240, 'k-5' => 310, 'k-6' => 375,  'k-8' => 500 ) ),
			1500  => array( 'feet' => 38,  'weights' => array( 'k-4' => 260, 'k-5' => 340, 'k-6' => 410,  'k-8' => 546 ) ),
			2000  => array( 'feet' => 61,  'weights' => array( 'k-4' => 350, 'k-5' => 420, 'k-6' => 510,  'k-8' => 680 ) ),
			2500  => array( 'feet' => 72,  'weights' => array( 'k-5' => 490, 'k-6' => 590, 'k-8' => 785 ) ),
			3000  => array( 'feet' => 83,  'weights' => array( 'k-5' => 560, 'k-6' => 670, 'k-8' => 895 ) ),
			4000  => array( 'feet' => 92,  'weights' => array( 'k-5' => 680, 'k-6' => 814, 'k-8' => 1085 ) ),
			5000  => array( 'feet' => 110, 'weights' => array( 'k-5' => 804, 'k-6' => 970, 'k-8' => 1290 ) ),
			6000  => array( 'feet' => 135, 'weights' => array( 'k-6' => 1044, 'k-8' => 1392 ) ),
			8000  => array( 'feet' => 185, 'weights' => array( 'k-8' => 1600 ) ),
			10000 => array( 'feet' => 205, 'weights' => array( 'k-8' => 1900 ) ),
		);
	}

	/**
	 * جدول منابع دوجداره: ظرفیت => [ ضخامت جداره => وزن kg ] — فوت کویل ندارد.
	 *
	 * @return array
	 */
	public static function double_table() {
		return array(
			300  => array( '4-2' => 112, '4-2/5' => 125, '4-3' => 140, '5-2/5' => 152, '5-3' => 160 ),
			400  => array( '4-2' => 135, '4-2/5' => 145, '4-3' => 155, '5-2/5' => 172, '5-3' => 180 ),
			500  => array( '4-2' => 155, '4-2/5' => 165, '4-3' => 180, '5-2/5' => 200, '5-3' => 210 ),
			600  => array( '4-2' => 170, '4-2/5' => 180, '4-3' => 190, '5-2/5' => 217, '5-3' => 230 ),
			800  => array( '4-2' => 220, '4-2/5' => 260, '4-3' => 275, '5-2/5' => 307, '5-3' => 320 ),
			1000 => array( '4-2' => 270, '4-2/5' => 285, '4-3' => 306, '5-2/5' => 340, '5-3' => 360 ),
			1500 => array( '4-3' => 378, '5-3' => 450 ),
			2000 => array( '5-3' => 550 ),
		);
	}

	/**
	 * دریافت جدول وزن بر اساس نوع محصول
	 *
	 * @param string $type 'coil' یا 'double'.
	 * @param int    $capacity ظرفیت به لیتر.
	 * @return array [ ضخامت => وزن ] یا آرایه خالی.
	 */
	public static function get_weights( $type, $capacity ) {
		$capacity = (int) $capacity;
		if ( 'double' === $type ) {
			$table = self::double_table();
			return isset( $table[ $capacity ] ) ? $table[ $capacity ] : array();
		}
		$table = self::coil_table();
		return isset( $table[ $capacity ] ) ? $table[ $capacity ]['weights'] : array();
	}

	/**
	 * متراژ کویل (فوت) برای منبع کویل‌دار
	 *
	 * @param int $capacity ظرفیت به لیتر.
	 * @return float
	 */
	public static function get_coil_feet( $capacity ) {
		$table    = self::coil_table();
		$capacity = (int) $capacity;
		return isset( $table[ $capacity ] ) ? (float) $table[ $capacity ]['feet'] : 0;
	}

	/**
	 * لیست ظرفیت‌های موجود هر نوع
	 *
	 * @param string $type 'coil' یا 'double'.
	 * @return int[]
	 */
	public static function get_capacities( $type ) {
		return array_keys( 'double' === $type ? self::double_table() : self::coil_table() );
	}

	/**
	 * نرمال‌سازی مقدار ضخامت برای تطبیق با کلید جدول
	 *
	 * اعداد فارسی/عربی را لاتین، حروف را کوچک و فاصله‌ها و جداکننده‌های مختلف را یکسان می‌کند.
	 * مثال: «K-4»، «k4»، «ک-۴» => «k-4» / «۴-۲/۵»، «4_2.5» => «4-2/5»
	 *
	 * @param string $value مقدار خام ویژگی.
	 * @return string
	 */
	public static function normalize_thickness( $value ) {
		$value = trim( (string) $value );

		$persian = array( '۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩' );
		$latin   = array( '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' );
		$value   = str_replace( $persian, $latin, $value );

		$value = strtolower( $value );
		$value = str_replace( array( 'ک', 'k' ), 'k', $value );
		$value = str_replace( array( '–', '—', 'ـ', '_', ' ' ), '-', $value );
		$value = str_replace( array( '٫', '،', ',', '.' ), '/', $value );
		$value = preg_replace( '/-+/', '-', $value );
		$value = trim( $value, '-' );

		// «k4» => «k-4».
		$value = preg_replace( '/^k(\d)/', 'k-$1', $value );

		return $value;
	}

	/**
	 * یافتن وزن یک گونه از روی مقدار ضخامت ورق آن
	 *
	 * @param string $type      'coil' یا 'double'.
	 * @param int    $capacity  ظرفیت به لیتر.
	 * @param string $thickness مقدار خام ویژگی ضخامت.
	 * @return float|null وزن به کیلوگرم یا null اگر یافت نشود.
	 */
	public static function lookup_weight( $type, $capacity, $thickness ) {
		$weights    = self::get_weights( $type, $capacity );
		$normalized = self::normalize_thickness( $thickness );

		foreach ( $weights as $key => $weight ) {
			if ( self::normalize_thickness( $key ) === $normalized ) {
				return (float) $weight;
			}
		}

		// مقایسه بدون جداکننده‌ها برای حالت‌هایی مثل «42/5».
		$bare = str_replace( '-', '', $normalized );
		foreach ( $weights as $key => $weight ) {
			if ( str_replace( '-', '', self::normalize_thickness( $key ) ) === $bare ) {
				return (float) $weight;
			}
		}

		return null;
	}
}
