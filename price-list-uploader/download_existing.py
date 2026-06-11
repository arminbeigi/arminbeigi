#!/usr/bin/env python3
"""
دانلود فایل‌های لیست قیمت موجود در shofazh.com/price-lists/
و ذخیره در پوشه uploaded (بدون آپلود مجدد)
"""

import base64
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote

import requests
import yaml

BASE_DIR = Path(__file__).parent


def load_config():
    with open(BASE_DIR / "config.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def wp_headers(cfg):
    creds = f"{cfg['username']}:{cfg['app_password']}"
    token = base64.b64encode(creds.encode()).decode()
    return {"Authorization": f"Basic {token}"}


def get_page_content(cfg):
    wp = cfg["wordpress"]
    headers = wp_headers(wp)
    r = requests.get(
        f"{wp['url']}/wp-json/wp/v2/pages",
        headers=headers,
        params={"slug": cfg["price_list_page_slug"], "per_page": 1},
        timeout=30,
    )
    r.raise_for_status()
    pages = r.json()
    if not pages:
        print("❌ صفحه price-lists پیدا نشد")
        sys.exit(1)
    raw = pages[0].get("content", {}).get("rendered", "") or pages[0].get("content", {}).get("raw", "")
    return raw


def extract_urls(html: str, base_url: str) -> list[str]:
    pattern = re.compile(r'href=["\'](' + re.escape(base_url) + r'/wp-content/uploads/[^"\']+)["\']', re.IGNORECASE)
    urls = list(dict.fromkeys(pattern.findall(html)))
    return urls


def download_file(url: str, dest_dir: Path) -> Path | None:
    filename = unquote(Path(urlparse(url).path).name)
    dest = dest_dir / filename
    if dest.exists():
        print(f"  ⏭  موجود است: {filename}")
        return dest
    try:
        r = requests.get(url, timeout=60, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        size_kb = dest.stat().st_size // 1024
        print(f"  ✅ دانلود شد: {filename} ({size_kb} KB)")
        return dest
    except Exception as e:
        print(f"  ❌ خطا در دانلود {filename}: {e}")
        return None


def main():
    cfg = load_config()
    wp_url = cfg["wordpress"]["url"].rstrip("/")
    uploaded_dir = BASE_DIR / cfg["folders"]["uploaded"]
    uploaded_dir.mkdir(exist_ok=True)

    print("🔍 در حال دریافت محتوای صفحه price-lists...")
    html = get_page_content(cfg)

    urls = extract_urls(html, wp_url)
    if not urls:
        print("⚠️  هیچ فایلی در صفحه price-lists پیدا نشد.")
        print("    (ممکن است فایل‌ها با روش دیگری لینک شده باشند)")
        return

    print(f"📄 {len(urls)} فایل پیدا شد:\n")
    downloaded = 0
    for url in urls:
        result = download_file(url, uploaded_dir)
        if result:
            downloaded += 1

    print(f"\n✅ {downloaded} از {len(urls)} فایل دانلود شد.")
    print(f"📂 مسیر: {uploaded_dir}")


if __name__ == "__main__":
    main()
