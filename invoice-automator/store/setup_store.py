#!/usr/bin/env python3
"""
ساخت خودکار فروشگاه کارا روی وردپرس/ووکامرس از طریق REST API.

این اسکریپت:
  ۱. صفحه‌ی فروش (لندینگ) را به‌صورت یک برگه می‌سازد و خانه قرار می‌دهد.
  ۲. ۴ محصول (پلن‌ها) را در ووکامرس می‌سازد (مجازی + قابل‌دانلود + لایسنس).
  ۳. دسته‌ی «لایسنس کارا» را می‌سازد.

پیش‌نیاز روی سایت: WooCommerce + License Manager for WooCommerce نصب باشند.

تنظیمات از متغیرهای محیطی خوانده می‌شود:
  KARA_WP_URL        آدرس سایت (مثل https://getkara.ir)
  KARA_WP_USER       نام کاربری وردپرس
  KARA_WP_APP_PASS   «رمز عبور اپلیکیشن» وردپرس (نمایه > رمزهای عبور اپلیکیشن)
  KARA_WC_KEY        Consumer Key ووکامرس (ووکامرس > تنظیمات > پیشرفته > REST API)
  KARA_WC_SECRET     Consumer Secret ووکامرس
  KARA_DOWNLOAD_URL  لینک مستقیم نصاب (اختیاری)

اجرا:  python store/setup_store.py
"""

import os
import sys
import json
from pathlib import Path

import requests

WP_URL = os.environ.get("KARA_WP_URL", "").rstrip("/")
WP_USER = os.environ.get("KARA_WP_USER", "")
WP_PASS = os.environ.get("KARA_WP_APP_PASS", "")
WC_KEY = os.environ.get("KARA_WC_KEY", "")
WC_SECRET = os.environ.get("KARA_WC_SECRET", "")
DOWNLOAD_URL = os.environ.get("KARA_DOWNLOAD_URL", f"{WP_URL}/downloads/InvoiceAutomator-Setup.exe")

HERE = Path(__file__).resolve().parent

PLANS = [
    {"sku": "KARA-BASIC", "name": "کارا — پلن پایه (۱ ساله)", "price": "990000", "featured": False,
     "short": "یک کانال دلخواه، ارسال نامحدود، متن با متغیر",
     "desc": "ارسال خودکار پیش‌فاکتور از یک کانال دلخواه، ارسال نامحدود، متن هوشمند با متغیر، پشتیبانی ایمیلی. لایسنس یک‌ساله برای ۱ دستگاه."},
    {"sku": "KARA-PRO", "name": "کارا — پلن حرفه‌ای (۱ ساله)", "price": "1990000", "featured": True,
     "short": "همه کانال‌ها، چت دوطرفه، لینک کوتاه، تشخیص خودکار شماره",
     "desc": "ارسال هم‌زمان به پیامک، واتساپ، بله و روبیکا، چت دوطرفه با اکانت شخصی، لینک کوتاه وردپرس، تشخیص خودکار شماره، تاریخچه ارسال، پشتیبانی اولویت‌دار. لایسنس یک‌ساله برای ۱ دستگاه."},
    {"sku": "KARA-BIZ", "name": "کارا — پلن کسب‌وکار (۱ ساله)", "price": "3990000", "featured": False,
     "short": "تمام امکانات حرفه‌ای + چند کاربر + ماژول‌های آینده",
     "desc": "تمام امکانات حرفه‌ای، فعال‌سازی روی چند دستگاه، دسترسی به ماژول‌های آینده (دستیار هوشمند)، پشتیبانی اختصاصی."},
    {"sku": "KARA-LIFETIME", "name": "کارا — لایسنس مادام‌العمر (محدود)", "price": "4990000", "featured": False,
     "short": "پلن حرفه‌ای، یک‌بار پرداخت، ویژه پذیرندگان اولیه",
     "desc": "تمام امکانات حرفه‌ای، پرداخت یک‌باره بدون تمدید، یک سال آپدیت رایگان. ویژه ۵۰ مشتری اول."},
]


def _check_config():
    missing = [k for k, v in {
        "KARA_WP_URL": WP_URL, "KARA_WP_USER": WP_USER, "KARA_WP_APP_PASS": WP_PASS,
        "KARA_WC_KEY": WC_KEY, "KARA_WC_SECRET": WC_SECRET}.items() if not v]
    if missing:
        print("❌ این متغیرها تنظیم نشده‌اند:", ", ".join(missing))
        sys.exit(1)


def wc(method, path, **kw):
    return requests.request(method, f"{WP_URL}/wp-json/wc/v3/{path}",
                            auth=(WC_KEY, WC_SECRET), timeout=30, **kw)


def wp(method, path, **kw):
    return requests.request(method, f"{WP_URL}/wp-json/wp/v2/{path}",
                            auth=(WP_USER, WP_PASS), timeout=30, **kw)


def ensure_category(name):
    r = wc("GET", "products/categories", params={"search": name})
    for c in r.json() if r.ok else []:
        if c.get("name") == name:
            return c["id"]
    r = wc("POST", "products/categories", json={"name": name})
    return r.json().get("id") if r.ok else None


def create_products():
    cat_id = ensure_category("لایسنس کارا")
    cat = [{"id": cat_id}] if cat_id else []
    for p in PLANS:
        # اگر محصول با همین SKU هست، رد شود
        existing = wc("GET", "products", params={"sku": p["sku"]})
        if existing.ok and existing.json():
            print(f"↷ از قبل هست: {p['sku']}")
            continue
        payload = {
            "name": p["name"], "type": "simple", "sku": p["sku"],
            "regular_price": p["price"], "virtual": True, "downloadable": True,
            "featured": p["featured"], "short_description": p["short"],
            "description": p["desc"], "categories": cat,
            "downloads": [{"name": "نصاب کارا (ویندوز)", "file": DOWNLOAD_URL}],
        }
        r = wc("POST", "products", json=payload)
        print(("✅ ساخته شد: " if r.ok else f"❌ خطا ({r.status_code}): ") + p["sku"])


def create_landing_page():
    html = (HERE / "landing.html").read_text(encoding="utf-8")
    # فقط محتوای داخل <body> + استایل را برای برگه نگه می‌داریم
    import re
    style = "".join(re.findall(r"<style>.*?</style>", html, re.S))
    body = re.search(r"<body>(.*?)</body>", html, re.S)
    content = style + (body.group(1) if body else html)

    # بررسی وجود برگه‌ی قبلی
    existing = wp("GET", "pages", params={"search": "کارا — فروش", "per_page": 5})
    page_id = None
    for pg in existing.json() if existing.ok else []:
        if "کارا" in pg.get("title", {}).get("rendered", ""):
            page_id = pg["id"]; break

    data = {"title": "کارا — فروش", "content": content, "status": "publish"}
    if page_id:
        r = wp("POST", f"pages/{page_id}", json=data)
    else:
        r = wp("POST", "pages", json=data)
    if r.ok:
        pid = r.json()["id"]
        print(f"✅ صفحه فروش ساخته شد (id={pid}): {WP_URL}/?page_id={pid}")
        # قرار دادن به‌عنوان صفحه‌ی خانه
        requests.post(f"{WP_URL}/wp-json/wp/v2/settings",
                      auth=(WP_USER, WP_PASS),
                      json={"show_on_front": "page", "page_on_front": pid}, timeout=30)
    else:
        print(f"❌ خطا در ساخت صفحه ({r.status_code}): {r.text[:200]}")


def main():
    _check_config()
    print(f"اتصال به {WP_URL} ...")
    me = wp("GET", "users/me")
    if not me.ok:
        print(f"❌ احراز هویت وردپرس ناموفق ({me.status_code}). رمز اپلیکیشن را بررسی کنید.")
        sys.exit(1)
    print(f"✅ ورود موفق: {me.json().get('name')}")
    create_products()
    create_landing_page()
    print("\n🎉 فروشگاه پایه ساخته شد. مرحله‌ی بعد: اتصال درگاه پرداخت و افزونه‌ی لایسنس.")


if __name__ == "__main__":
    main()
