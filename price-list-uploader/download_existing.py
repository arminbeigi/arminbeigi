#!/usr/bin/env python3
"""
دانلود تمام فایل‌های مدیا وردپرس (کل wp-content/uploads)
با حفظ ساختار پوشه‌بندی سال/ماه
"""

import base64
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote

import requests
import yaml

BASE_DIR = Path(__file__).parent


def load_config():
    with open(BASE_DIR / "config.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def wp_headers(wp):
    creds = f"{wp['username']}:{wp['app_password']}"
    token = base64.b64encode(creds.encode()).decode()
    return {"Authorization": f"Basic {token}"}


def get_all_media(wp_url, headers):
    items = []
    page = 1
    while True:
        r = requests.get(
            f"{wp_url}/wp-json/wp/v2/media",
            headers=headers,
            params={"per_page": 100, "page": page},
            timeout=30,
        )
        if r.status_code == 400:
            break
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        items.extend(batch)
        total_pages = int(r.headers.get("X-WP-TotalPages", 1))
        print(f"  صفحه {page}/{total_pages} — {len(items)} فایل تا اینجا")
        if page >= total_pages:
            break
        page += 1
    return items


def download_file(url: str, base_url: str, dest_root: Path) -> bool:
    # حفظ ساختار پوشه: wp-content/uploads/2024/03/file.pdf
    path = urlparse(url).path
    rel = path.split("/wp-content/uploads/", 1)[-1]
    filename = unquote(rel)
    dest = dest_root / filename
    dest.parent.mkdir(parents=True, exist_ok=True)

    if dest.exists():
        print(f"  ⏭  موجود: {filename}")
        return True
    try:
        r = requests.get(url, timeout=120, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        size_kb = dest.stat().st_size // 1024
        print(f"  ✅ {filename} ({size_kb} KB)")
        return True
    except Exception as e:
        print(f"  ❌ خطا: {filename} — {e}")
        return False


def main():
    cfg = load_config()
    wp = cfg["wordpress"]
    wp_url = wp["url"].rstrip("/")
    headers = wp_headers(wp)

    dest_root = BASE_DIR / "wp-uploads"
    dest_root.mkdir(exist_ok=True)

    print(f"🔍 دریافت لیست فایل‌های مدیا از {wp_url} ...")
    try:
        items = get_all_media(wp_url, headers)
    except Exception as e:
        print(f"❌ خطا در اتصال به API: {e}")
        sys.exit(1)

    if not items:
        print("⚠️  هیچ فایلی در مدیا پیدا نشد.")
        return

    print(f"\n📦 {len(items)} فایل پیدا شد — شروع دانلود...\n")

    ok = 0
    for item in items:
        url = item.get("source_url", "")
        if url:
            if download_file(url, wp_url, dest_root):
                ok += 1

    print(f"\n✅ {ok} از {len(items)} فایل دانلود شد.")
    print(f"📂 مسیر: {dest_root}")


if __name__ == "__main__":
    main()
