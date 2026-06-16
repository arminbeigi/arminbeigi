<?php
/**
 * هنگام حذف کامل افزونه از ووردپرس اجرا می‌شود و تنظیمات را پاک می‌کند.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'shofazh_vpn_settings' );
