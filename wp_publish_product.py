#!/usr/bin/env python3
"""
انتشار خودکار صفحه محصول + متادیتای SEO در شوفاژ دات کام

استفاده:
    python wp_publish_product.py --html f55-product-content.html --post-id 4525

جستجوی post-id:
    python wp_publish_product.py --find-product "F55"
    یا: پنل وردپرس > محصولات > ویرایش > URL شامل ?post=XXXX

روش کار:
    1. قیمت فعال محصول را از WooCommerce API می‌گیرد
    2. قیمت را به JSON-LD در HTML تزریق می‌کند (رفع خطای Google Search Console)
    3. فایل SEO را می‌خواند
    4. HTML را با WP REST API (content.raw) منتشر می‌کند — تگ <style> حفظ می‌شود
    5. Elementor را برای این صفحه غیرفعال می‌کند
    6. Rank Math و Yoast SEO meta را ست می‌کند
"""

import argparse
import json
import os
import re
import sys
import requests
from pathlib import Path

WP_URL      = "https://shofazh.com"
WP_USER     = os.environ.get("WP_USER", "admin")
WP_APP_PASS = os.environ.get("WP_APP_PASS", "")

if not WP_APP_PASS:
    print("خطا: متغیر محیطی WP_APP_PASS تعریف نشده است.", file=sys.stderr)
    sys.exit(1)

WP_API  = f"{WP_URL}/wp-json/wp/v2"
WC_API  = f"{WP_URL}/wp-json/wc/v3"
AUTH    = (WP_USER, WP_APP_PASS)
HEADERS = {"User-Agent": "ShofazhContentBot/1.0"}


def _safe_json(response: requests.Response) -> dict:
    """پارس JSON بدون crash — در صورت خطا dict خالی برمی‌گردد"""
    try:
        return response.json()
    except (ValueError, requests.exceptions.JSONDecodeError):
        return {}


def fetch_product_price(post_id: int) -> str:
    """قیمت فعال محصول را از WooCommerce API می‌گیرد"""
    r = requests.get(f"{WC_API}/products/{post_id}", auth=AUTH, headers=HEADERS, timeout=15)
    if r.status_code == 200:
        data = _safe_json(r)
        price = data.get("price") or data.get("regular_price", "")
        if price:
            print(f"   💰 قیمت: {price} IRR")
        else:
            print("   ⚠️  قیمتی در WooCommerce تنظیم نشده")
        return price
    print(f"   ⚠️  دریافت قیمت ناموفق ({r.status_code})")
    return ""


def inject_price_into_html(html: str, price: str) -> str:
    """قیمت را به فیلد offers.price در JSON-LD اضافه می‌کند"""
    if not price:
        return html

    def patch_schema(match):
        try:
            schema = json.loads(match.group(1))
            graph = schema.get("@graph", [schema] if isinstance(schema, dict) else [])
            for item in graph:
                if item.get("@type") == "Product":
                    offers = item.get("offers", {})
                    if isinstance(offers, dict) and "price" not in offers:
                        offers["price"] = price
                        item["offers"] = offers
            return f'<script type="application/ld+json">\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n</script>'
        except Exception:
            return match.group(0)

    return re.sub(r'<script\s+type="application/ld\+json">(.*?)</script>',
                  patch_schema, html, flags=re.DOTALL)


def parse_seo_file(path: Path) -> dict:
    """فایل {slug}-seo.md تولیدشده توسط اسکیل را می‌خواند"""
    text = path.read_text(encoding="utf-8")
    fields = {}
    for section in re.split(r'\n##\s+', text):
        lines = section.strip().splitlines()
        if not lines:
            continue
        header = lines[0].strip()
        value  = "\n".join(lines[1:]).strip()
        if not value:
            continue
        if "SEO Title"       in header or "عنوان سئو"           in header:
            fields["seo_title"]        = value
        elif "Meta Description" in header or "توضیحات متا"       in header:
            fields["meta_description"] = value
        elif "Focus Keyphrase" in header or "کلمه کلیدی کانونی" in header:
            fields["focus_keyword"]    = value
        elif "URL Slug"        in header or "نامک پیشنهادی"      in header:
            fields["slug"]             = value.strip().strip("`")
        elif "Open Graph"      in header or "شبکه‌های اجتماعی"   in header:
            if "Title" in header or "عنوان" in header:
                fields["og_title"]       = value
            else:
                fields["og_description"] = value
        elif "Twitter"         in header:
            if "Title" in header or "عنوان" in header:
                fields["twitter_title"]       = value
            else:
                fields["twitter_description"] = value
    return fields


def build_seo_meta(seo: dict) -> dict:
    """فیلدهای Rank Math و Yoast را هر دو ست می‌کند (هر کدام فعال باشد کار می‌کند)"""
    m = {}
    if seo.get("seo_title"):
        m["rank_math_title"]        = seo["seo_title"]
        m["_yoast_wpseo_title"]     = seo["seo_title"]
    if seo.get("meta_description"):
        m["rank_math_description"]  = seo["meta_description"]
        m["_yoast_wpseo_metadesc"]  = seo["meta_description"]
    if seo.get("focus_keyword"):
        m["rank_math_focus_keyword"] = seo["focus_keyword"]
        m["_yoast_wpseo_focuskw"]    = seo["focus_keyword"]
    if seo.get("og_title"):
        m["rank_math_og_title"]              = seo["og_title"]
        m["_yoast_wpseo_opengraph-title"]    = seo["og_title"]
    if seo.get("og_description"):
        m["rank_math_og_description"]        = seo["og_description"]
        m["_yoast_wpseo_opengraph-description"] = seo["og_description"]
    if seo.get("twitter_title"):
        m["rank_math_twitter_title"]         = seo["twitter_title"]
        m["_yoast_wpseo_twitter-title"]      = seo["twitter_title"]
    if seo.get("twitter_description"):
        m["rank_math_twitter_description"]   = seo["twitter_description"]
        m["_yoast_wpseo_twitter-description"] = seo["twitter_description"]
    return m


def publish_to_wp(post_id: int, html_path: Path, seo: dict, dry_run: bool = False) -> bool:
    html = html_path.read_text(encoding="utf-8")

    print("\n💰 دریافت قیمت از WooCommerce...")
    price = fetch_product_price(post_id)
    html  = inject_price_into_html(html, price)

    seo_meta = build_seo_meta(seo)

    if dry_run:
        print("\n[DRY RUN — ارسال نمی‌شود]")
        print(f"  post_id   : {post_id}")
        print(f"  html      : {html_path.name} ({len(html):,} کاراکتر)")
        print(f"  seo_title : {seo.get('seo_title', '—')}")
        print(f"  focus_kw  : {seo.get('focus_keyword', '—')}")
        print(f"  price     : {price or '—'}")
        return True

    meta_payload = {
        "_elementor_edit_mode": "",
        "_elementor_data":      "[]",
        "_elementor_css":       "",
    }
    meta_payload.update(seo_meta)

    print(f"\n📤 ارسال به WP REST API (post-id={post_id})...")
    r = requests.post(
        f"{WP_API}/product/{post_id}",
        json={"content": {"raw": html}, "status": "publish", "meta": meta_payload},
        auth=AUTH, headers=HEADERS, timeout=60,
    )
    print(f"   POST → {r.status_code}")

    if r.status_code in (200, 201):
        data       = _safe_json(r)
        link       = data.get("link") or data.get("permalink") or f"{WP_URL}/?p={post_id}"
        raw_saved  = data.get("content", {}).get("raw", "")
        style_ok   = "<style" in raw_saved if raw_saved else None

        print(f"\n✅ منتشر شد!")
        print(f"   لینک     : {link}")
        if style_ok is not None:
            print(f"   تگ <style>: {'حفظ شد ✓' if style_ok else 'ممکن است strip شده باشد — کش را چک کنید'}")
        print(f"   Elementor : غیرفعال")

        if seo_meta:
            print(f"\n📝 ست کردن SEO meta با WooCommerce API...")
            wc_seo_meta = [{"key": k, "value": v} for k, v in seo_meta.items()]
            r_seo = requests.post(
                f"{WC_API}/products/{post_id}",
                json={"meta_data": wc_seo_meta},
                auth=AUTH, headers=HEADERS, timeout=30,
            )
            if r_seo.status_code in (200, 201):
                print(f"   ✅ SEO meta ست شد ({len(seo_meta)} فیلد)")
                if seo.get("seo_title"):
                    print(f"   SEO title : {seo['seo_title']}")
                if seo.get("focus_keyword"):
                    print(f"   Focus KW  : {seo['focus_keyword']}")
            else:
                print(f"   ⚠️  SEO meta ناموفق ({r_seo.status_code}): {r_seo.text[:200]}")

        return True

    print(f"   WP API ناموفق ({r.status_code}) — WC API را امتحان می‌کنیم")
    wc_meta = [{"key": k, "value": v} for k, v in meta_payload.items()]
    r2 = requests.post(
        f"{WC_API}/products/{post_id}",
        json={"description": html, "status": "publish", "meta_data": wc_meta},
        auth=AUTH, headers=HEADERS, timeout=60,
    )
    if r2.status_code in (200, 201):
        data2 = _safe_json(r2)
        print(f"\n⚠️  WC API منتشر کرد (تگ <style> ممکن است حذف شده باشد)")
        print(f"   لینک: {data2.get('permalink', '')}")
        return True

    print(f"   خطا {r2.status_code}: {r2.text[:200]}")
    print("❌ انتشار ناموفق.")
    return False


def find_product(term: str) -> None:
    """post-id محصول را با جستجوی نام پیدا می‌کند"""
    print(f"\n🔍 جستجو: {term}")
    r = requests.get(f"{WC_API}/products",
                     params={"search": term, "per_page": 10},
                     auth=AUTH, headers=HEADERS, timeout=20)
    if r.status_code == 200:
        results = _safe_json(r)
        if results:
            print(f"{'ID':>8}  {'نام'}")
            print("-" * 50)
            for p in results:
                print(f"{p['id']:>8}  {p.get('name', p.get('slug', ''))}")
            return
    print("محصولی پیدا نشد.")


def main():
    parser = argparse.ArgumentParser(description="انتشار صفحه محصول شوفاژ دات کام")
    parser.add_argument("--html",          help="فایل HTML محصول")
    parser.add_argument("--seo",           help="فایل SEO مارک‌داون")
    parser.add_argument("--post-id",       type=int, help="post-id وردپرس")
    parser.add_argument("--find-product",  help="جستجوی محصول برای یافتن post-id")
    parser.add_argument("--dry-run",       action="store_true", help="نمایش بدون ارسال")
    args = parser.parse_args()

    if args.find_product:
        find_product(args.find_product)
        return

    if not args.html or not args.post_id:
        parser.error("--html و --post-id الزامی هستند")

    html_path = Path(args.html)
    if not html_path.exists():
        print(f"❌ فایل یافت نشد: {html_path}")
        sys.exit(1)

    seo = {}
    seo_path = Path(args.seo) if args.seo else \
               html_path.with_name(html_path.stem.replace("-product-content", "") + "-seo.md")
    if seo_path.exists():
        seo = parse_seo_file(seo_path)
        print(f"\n📄 SEO: {seo_path.name}")
        print(f"   عنوان   : {seo.get('seo_title', '—')}")
        print(f"   کلیدواژه: {seo.get('focus_keyword', '—')}")
    else:
        print(f"⚠️  فایل SEO پیدا نشد — بدون SEO ادامه می‌دهد")

    success = publish_to_wp(args.post_id, html_path, seo, dry_run=args.dry_run)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
