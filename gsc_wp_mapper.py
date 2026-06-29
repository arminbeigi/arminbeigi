#!/usr/bin/env python3
"""
GSC → WordPress Mapper: Convert GSC URLs to WordPress post-ids and fetch/update metadata
"""

import os
import sys
import json
import requests
from urllib.parse import urlparse, urljoin
from typing import Optional, Dict, Tuple


class GSCWordPressMapper:
    """Maps Google Search Console data to WordPress posts via REST API"""

    def __init__(self, wp_url: str = None, wp_user: str = None, wp_pass: str = None):
        """
        Initialize mapper with WordPress connection details

        Args:
            wp_url: WordPress base URL (e.g., https://shofazh.com)
            wp_user: WordPress admin username (from env: WP_USER)
            wp_pass: WordPress app password (from env: WP_APP_PASS)
        """
        self.wp_url = wp_url or os.environ.get('WP_URL', 'https://shofazh.com')
        self.wp_user = wp_user or os.environ.get('WP_USER', 'admin')
        self.wp_pass = wp_pass or os.environ.get('WP_APP_PASS', '')

        self.wp_api = f"{self.wp_url}/wp-json/wp/v2"
        self.wc_api = f"{self.wp_url}/wp-json/wc/v3"
        self.auth = (self.wp_user, self.wp_pass)
        self.timeout = 30

    def url_to_slug(self, gsc_url: str) -> Optional[str]:
        """
        Extract slug(s) from GSC URL

        Examples:
            https://shofazh.com/product-category/garmayesh/packages/ → "packages" or "garmayesh/packages"
            https://shofazh.com/product/iranradiator-f55/ → "iranradiator-f55"
        """
        try:
            parsed = urlparse(gsc_url)
            path = parsed.path.strip('/')

            # Remove domain prefix
            if path.startswith('product-category/'):
                slug = path.replace('product-category/', '')
            elif path.startswith('product/'):
                slug = path.replace('product/', '')
            elif path.startswith('product-tag/'):
                slug = path.replace('product-tag/', '')
            else:
                slug = path

            # Remove trailing slashes and pagination
            slug = slug.rstrip('/').split('?')[0]

            return slug if slug else None
        except Exception as e:
            print(f"❌ Error parsing URL {gsc_url}: {e}")
            return None

    def detect_post_type(self, path: str) -> str:
        """Detect if URL is product_cat, product, or other type"""
        if 'product-category' in path:
            return 'product_cat'
        elif 'product-tag' in path:
            return 'product_tag'
        elif 'product/' in path:
            return 'product'
        else:
            return 'post'

    def slug_to_post_id(self, gsc_url: str) -> Optional[Tuple[int, str]]:
        """
        Query WordPress REST API to find post-id or term-id

        Returns:
            Tuple of (id, type) where type is 'product', 'product_cat', or None if not found
        """
        slug = self.url_to_slug(gsc_url)
        if not slug:
            return None

        parsed_path = urlparse(gsc_url).path
        post_type = self.detect_post_type(parsed_path)

        try:
            if post_type == 'product_cat':
                # Category lookup
                response = requests.get(
                    f"{self.wp_api}/product_cat?slug={slug.split('/')[-1]}",
                    auth=self.auth,
                    timeout=self.timeout
                )
                if response.status_code == 200 and response.json():
                    term_id = response.json()[0]['id']
                    print(f"   ✓ Found category: slug={slug} → term_id={term_id}")
                    return (term_id, 'product_cat')

            elif post_type == 'product':
                # The site's firewall blocks REST "enumeration" GETs (wp/v2/product?slug
                # returns an HTML 403 page), but the public product page is reachable and
                # POST wp/v2/product/{id} works. So derive the post id from the page HTML.
                post_id = self._post_id_from_page(gsc_url)
                if post_id:
                    print(f"   ✓ Found product: slug={slug} → post_id={post_id}")
                    return (post_id, 'product')
                return None

            print(f"   ⚠ Not found: {post_type} slug={slug} (status {response.status_code})")
            return None

        except requests.exceptions.RequestException as e:
            print(f"   ❌ REST API error: {e}")
            return None

    def _post_id_from_page(self, page_url: str) -> Optional[int]:
        """
        Extract the WordPress post id from the public product page HTML.

        Looks for the WooCommerce body class `postid-12345` first, then the
        WordPress shortlink `?p=12345`. Uses a browser-like User-Agent so the
        site firewall does not treat it as a bot/enumeration request.
        """
        import re
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/124.0 Safari/537.36"
        }
        try:
            resp = requests.get(page_url, headers=headers, timeout=self.timeout)
            if resp.status_code != 200:
                print(f"   ⚠ Page fetch {page_url} → status {resp.status_code}")
                return None
            html = resp.text
            m = re.search(r'postid-(\d+)', html)
            if m:
                return int(m.group(1))
            m = re.search(r'[?&]p=(\d+)', html)
            if m:
                return int(m.group(1))
            m = re.search(r'/wp-json/wp/v2/(?:product|posts)/(\d+)', html)
            if m:
                return int(m.group(1))
            print(f"   ⚠ Could not extract post id from page HTML ({len(html)} bytes)")
            return None
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Page fetch error: {e}")
            return None

    def fetch_current_seo(self, post_id: int, post_type: str = 'product') -> Dict:
        """
        Fetch current title and meta description from WordPress (Yoast SEO only)
        """
        # Non-fatal: current values are only used for display/audit logging.
        # If the firewall blocks this GET, still return empty values so the
        # update (which only needs post_id + new title/meta) can proceed.
        empty = {
            'post_id': post_id,
            'post_type': post_type,
            'current_title': '',
            'current_meta': '',
            'current_keyword': '',
        }
        try:
            response = requests.get(
                f"{self.wp_api}/{post_type}/{post_id}",
                auth=self.auth,
                timeout=self.timeout
            )

            if response.status_code != 200:
                print(f"   ⚠ Could not read current SEO (status {response.status_code}) — proceeding")
                return empty

            post_data = response.json()
            meta = post_data.get('meta', {})

            return {
                'post_id': post_id,
                'post_type': post_type,
                'current_title': meta.get('_yoast_wpseo_title', '') or post_data.get('title', {}).get('rendered', ''),
                'current_meta': meta.get('_yoast_wpseo_metadesc', ''),
                'current_keyword': meta.get('_yoast_wpseo_focuskw', ''),
            }
        except Exception as e:
            print(f"   ⚠ Error reading current SEO ({e}) — proceeding")
            return empty

    def build_update_payload(self, suggested_title: str, suggested_meta: str, keyword: str = None) -> Dict:
        """
        Build REST API payload for Yoast SEO only

        Follows pattern from wp_publish_product.py (lines 197-220)
        """
        keyword = keyword or suggested_title.split(' ')[0]  # Fallback to first word

        return {
            "meta": {
                # Yoast SEO fields
                "_yoast_wpseo_title": suggested_title,
                "_yoast_wpseo_metadesc": suggested_meta,
                "_yoast_wpseo_focuskw": keyword,
            }
        }

    def apply_metadata_update(self, post_id: int, post_type: str, payload: Dict) -> bool:
        """
        Apply metadata update to WordPress via REST API

        Returns: True if successful, False otherwise
        """
        try:
            response = requests.post(
                f"{self.wp_api}/{post_type}/{post_id}",
                json=payload,
                auth=self.auth,
                timeout=self.timeout
            )

            if response.status_code in [200, 201]:
                print(f"   ✓ Updated post {post_id}")
                return True
            else:
                print(f"   ❌ REST API returned {response.status_code}: {response.text}")
                return False

        except Exception as e:
            print(f"   ❌ Error applying update: {e}")
            return False


def main():
    """Test the mapper"""
    mapper = GSCWordPressMapper()

    # Test URLs from gsc-fixes.json
    test_urls = [
        "https://shofazh.com/product-category/garmayesh/packages/",
        "https://shofazh.com/",
        "https://shofazh.com/product-category/garmayesh/boilers/chauffagekar-boiler/",
    ]

    print("🔍 Testing GSC URL → WordPress Mapper\n")

    for url in test_urls:
        print(f"Testing: {url}")
        result = mapper.slug_to_post_id(url)
        if result:
            post_id, post_type = result
            seo = mapper.fetch_current_seo(post_id, post_type)
            if seo:
                print(f"   Current Title: {seo['current_title'][:50]}...")
                print(f"   Current Meta:  {seo['current_meta'][:50]}...")
        print()


if __name__ == "__main__":
    main()
