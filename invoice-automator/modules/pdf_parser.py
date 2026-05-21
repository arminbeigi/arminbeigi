"""
استخراج اطلاعات از نام فایل PDF

فرمت‌های قابل قبول نام فایل:
  09122724191.pdf              → فقط شماره تلفن
  09122724191-1821.pdf         → شماره تلفن + شماره فاکتور
  09122724191_1821.pdf         → شماره تلفن + شماره فاکتور
  مشیری-09122724191.pdf       → نام مشتری + شماره تلفن
  مشیری-09122724191-1821.pdf  → نام + شماره + فاکتور
"""

import os
import re
import logging

logger = logging.getLogger(__name__)


def extract_invoice_data(pdf_path: str) -> dict:
    """استخراج اطلاعات از نام فایل PDF"""

    filename = os.path.basename(pdf_path)
    name_part = os.path.splitext(filename)[0]  # بدون .pdf

    logger.info(f"تحلیل نام فایل: {filename}")

    result = {
        "phone": None,
        "name": None,
        "serial": None,
        "filename": filename,
    }

    # پیدا کردن شماره موبایل (09xxxxxxxxx)
    phone_match = re.search(r'(09\d{9})', name_part)
    if phone_match:
        result["phone"] = phone_match.group(1)
    else:
        raise ValueError(
            f"شماره تلفن در نام فایل یافت نشد!\n"
            f"  نام فایل: {filename}\n"
            f"  فرمت صحیح: 09xxxxxxxxx.pdf یا 09xxxxxxxxx-شماره_فاکتور.pdf"
        )

    # حذف شماره تلفن و جداکننده‌ها، باقی‌مانده = نام + شماره فاکتور
    remaining = name_part.replace(result["phone"], "").strip("-_ ")

    # پیدا کردن شماره فاکتور (عدد خالص)
    serial_match = re.search(r'(\d+)', remaining)
    if serial_match:
        result["serial"] = serial_match.group(1)
        remaining = remaining.replace(result["serial"], "").strip("-_ ")

    # باقی‌مانده = نام مشتری (اختیاری)
    if remaining:
        result["name"] = remaining.strip("-_ ")

    logger.info(
        f"✅ تلفن={result['phone']}"
        f" | فاکتور={result['serial'] or '—'}"
        f" | نام={result['name'] or '—'}"
    )

    return result


def format_phone_international(phone: str) -> str:
    """تبدیل 09xx به +989xx"""
    if phone.startswith("09"):
        return "+98" + phone[1:]
    return phone


def format_amount(amount_str: str) -> str:
    """فرمت‌بندی مبلغ با جداکننده هزارگان"""
    if not amount_str:
        return "نامشخص"
    try:
        return f"{int(amount_str):,}"
    except ValueError:
        return amount_str


if __name__ == "__main__":
    # تست سریع
    test_names = [
        "/tmp/09122724191.pdf",
        "/tmp/09122724191-1821.pdf",
        "/tmp/مشیری-09122724191-1821.pdf",
        "/tmp/09122724191_1821.pdf",
    ]
    for name in test_names:
        try:
            data = extract_invoice_data(name)
            print(f"  {os.path.basename(name):40s} → ☎ {data['phone']}  📄 {data['serial'] or '—':6s}  👤 {data['name'] or '—'}")
        except ValueError as e:
            print(f"  ❌ {e}")
