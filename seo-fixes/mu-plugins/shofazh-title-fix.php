<?php
/**
 * Plugin Name: Shofazh Title Fix — collapse duplicated site name
 * Description: Fixes the doubled "دات کام دات کام" that appears in some SEO titles
 *              (e.g. category/archive pages). Works with Yoast SEO and the generic
 *              WordPress document title. Drop this file in wp-content/mu-plugins/.
 * Author: shofazh.com
 * Version: 1.0
 */

if (!defined('ABSPATH')) { exit; }

/**
 * Collapse any accidental repetition of "دات کام" into a single occurrence.
 * "... شوفاژ دات کام دات کام" -> "... شوفاژ دات کام"
 */
function shofazh_fix_dup_title($title) {
    if (!is_string($title) || $title === '') {
        return $title;
    }
    return preg_replace('/(دات\s*کام)(\s*دات\s*کام)+/u', '$1', $title);
}

// Yoast SEO frontend <title>
add_filter('wpseo_title', 'shofazh_fix_dup_title', 99);

// Generic WordPress document title (fallback / non-Yoast contexts)
add_filter('pre_get_document_title', 'shofazh_fix_dup_title', 99);
add_filter('document_title_parts', function ($parts) {
    foreach ($parts as $k => $v) {
        $parts[$k] = shofazh_fix_dup_title($v);
    }
    return $parts;
}, 99);
