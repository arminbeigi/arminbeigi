"""
آپلود پیش‌فاکتور روی هاست مرجع و ساخت لینک کوتاهِ غیرقابل‌حدس.

این بخش «پشت‌صحنه» است و کاربر آن را نمی‌بیند: فایل PDF روی هاست ما
(yarapro.ir در نسخه‌ی تجاری) آپلود می‌شود و یک لینک کوتاه با توکنِ
تصادفی برمی‌گردد — مثل  https://yarapro.ir/f/Xk7mP2qR  — که ساختارش
قابل‌پیش‌بینی نیست (نه inv-123).

سپس این لینک با پنل پیامکِ خودِ کاربر برای مشتری ارسال می‌شود.

احراز هویت: کلید لایسنسِ همان کاربر (تا فقط مشتریان معتبر بتوانند آپلود کنند).
در نسخه‌ی شخصی (shofazh) که لایسنس لازم نیست، شناسه‌ی دستگاه فرستاده می‌شود.
"""

import os
import logging
import requests

logger = logging.getLogger(__name__)

# هاست بدون SSL هنوز؛ تأیید گواهی غیرفعال است (مثل بقیه‌ی بخش‌ها).
VERIFY_SSL = False


def _endpoint() -> str:
    from gui import edition
    return f"{edition.relay_host()}/wp-json/yara/v1/file"


def _auth_payload() -> dict:
    """شناسه‌ی احراز هویت برای آپلود (کلید لایسنس + شناسه‌ی دستگاه)."""
    payload = {}
    try:
        from gui import license as lic
        payload["device"] = lic.device_id()
        key = lic.current_key()
        if key:
            payload["license_key"] = key
    except Exception:
        pass
    return payload


def upload_invoice(pdf_path: str, invoice_serial: str = "",
                   customer_name: str = "") -> str:
    """
    آپلود فایل و دریافت لینک کوتاه. در صورت خطا، استثنا پرتاب می‌کند.

    Returns:
        str: لینک کوتاه مثل https://yarapro.ir/f/Xk7mP2qR
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError("فایل پیش‌فاکتور پیدا نشد.")

    data = _auth_payload()
    data["serial"] = invoice_serial or ""
    data["name"] = customer_name or ""

    filename = os.path.basename(pdf_path)
    with open(pdf_path, "rb") as f:
        files = {"file": (filename, f, "application/pdf")}
        logger.info(f"آپلود پیش‌فاکتور به هاست مرجع: {filename}")
        resp = requests.post(
            _endpoint(), data=data, files=files,
            timeout=90, verify=VERIFY_SSL,
            headers={"User-Agent": "YaraApp/1.0"},
        )

    try:
        j = resp.json()
    except Exception:
        raise Exception(f"پاسخ نامعتبر از سرور (کد {resp.status_code}).")

    if resp.status_code != 200 or not j.get("success"):
        raise Exception(j.get("message", f"آپلود ناموفق (کد {resp.status_code}).") )

    url = j.get("url")
    if not url:
        raise Exception("لینک کوتاه دریافت نشد.")
    logger.info(f"لینک کوتاه ساخته شد: {url}")
    return url
