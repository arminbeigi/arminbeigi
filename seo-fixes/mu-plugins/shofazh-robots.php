<?php
/**
 * Plugin Name: Shofazh robots.txt rules
 * Description: Appends WooCommerce-safe Disallow rules for session/param/filter URLs
 *              to the virtual robots.txt via the `robots_txt` filter. Use this instead
 *              of editing robots.txt by hand. Drop in wp-content/mu-plugins/.
 * Author: shofazh.com
 * Version: 1.0
 */

if (!defined('ABSPATH')) { exit; }

add_filter('robots_txt', function ($output, $public) {
    // Only add rules when the site is public (respect "discourage search engines").
    if (!$public) {
        return $output;
    }
    $rules = "\n# --- shofazh custom (WooCommerce-safe) ---\n"
        . "Allow: /wp-admin/admin-ajax.php\n"
        . "Disallow: /cart/\n"
        . "Disallow: /checkout/\n"
        . "Disallow: /my-account/\n"
        . "Disallow: /*?login=\n"
        . "Disallow: /*?add-to-cart=\n"
        . "Disallow: /*?add_to_wishlist=\n"
        . "Disallow: /*?removed_item=\n"
        . "Disallow: /*?orderby=\n"
        . "Disallow: /*?min_price=\n"
        . "Disallow: /*?max_price=\n"
        . "Disallow: /*?filter_\n"
        . "Disallow: /*?s=\n";
    return $output . $rules;
}, 20, 2);
