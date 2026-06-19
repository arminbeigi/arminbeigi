"""
هسته‌ی پردازش ارسال پیش‌فاکتور برای رابط گرافیکی.

این ماژول از همان ماژول‌های موجود (modules/) استفاده می‌کند ولی
به‌جای خواندن config.yaml، تنظیمات را از ذخیره‌گاه رمزنگاری‌شده می‌گیرد
و فقط کانال‌هایی را اجرا می‌کند که کاربر انتخاب کرده است.
"""

import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from modules.pdf_parser import extract_invoice_data
from modules.wp_uploader import WordPressUploader
from modules.sms_kavenegar import KavenegarSMS
from modules.whatsapp_sender import WhatsAppSender
from modules.bale_sender import BaleSender
from modules.rubika_sender import RubikaSender


CHANNEL_LABELS = {
    "wordpress": "وردپرس",
    "kavenegar": "پیامک",
    "whatsapp": "واتساپ",
    "bale": "بله",
    "rubika": "روبیکا",
}


def available_channels(settings: dict) -> list[str]:
    """کانال‌هایی که هم فعال‌اند و هم اطلاعات لازم را دارند."""
    result = []
    if settings.get("wordpress", {}).get("enabled") and settings["wordpress"].get("url"):
        result.append("wordpress")
    if settings.get("kavenegar", {}).get("enabled") and settings["kavenegar"].get("api_key"):
        result.append("kavenegar")
    wa = settings.get("whatsapp", {})
    if wa.get("enabled"):
        result.append("whatsapp")  # حتی بدون API می‌تواند لینک wa.me بسازد
    if settings.get("bale", {}).get("enabled") and settings["bale"].get("bot_token"):
        result.append("bale")
    if settings.get("rubika", {}).get("enabled") and settings["rubika"].get("auth"):
        result.append("rubika")
    return result


def analyze_file(pdf_path: str) -> dict:
    """استخراج اطلاعات از نام فایل (تلفن، فاکتور، نام). در صورت خطا ValueError."""
    return extract_invoice_data(pdf_path)


def process_pdf(pdf_path: str, settings: dict, channels: list[str], log=print) -> dict:
    """
    پردازش یک فایل PDF برای کانال‌های انتخاب‌شده.

    Args:
        pdf_path : مسیر فایل
        settings : دیکشنری تنظیمات (از settings_store)
        channels : لیست کانال‌های انتخاب‌شده، مثل ["kavenegar", "bale"]
        log      : تابعی برای نمایش پیام‌های زنده در رابط گرافیکی

    Returns:
        dict: {"file", "ok": [...], "fail": [...], "short_link"}
    """
    report = {"file": pdf_path, "ok": [], "fail": [], "short_link": ""}

    log(f"📄 پردازش فایل: {os.path.basename(pdf_path)}")

    # ── استخراج اطلاعات ──
    try:
        info = analyze_file(pdf_path)
    except ValueError as e:
        log(f"❌ {e}")
        report["fail"].append(f"parse: {e}")
        return report

    phone = info["phone"]
    serial = info.get("serial", "")
    name = info.get("name") or "مشتری گرامی"
    log(f"☎ {phone}  |  📄 فاکتور: {serial or '—'}  |  👤 {name}")

    # ── وردپرس (آپلود + لینک کوتاه) ──
    short_link = ""
    if "wordpress" in channels:
        try:
            wp = WordPressUploader(settings["wordpress"])
            short_link = wp.upload_and_get_short_link(
                pdf_path, serial, {"method": "wordpress"}
            )
            report["short_link"] = short_link
            log(f"✅ وردپرس — لینک: {short_link}")
            report["ok"].append("wordpress")
        except Exception as e:
            log(f"❌ وردپرس: {e}")
            report["fail"].append(f"wordpress: {e}")

    # ── ساخت توابع ارسال برای کانال‌های انتخاب‌شده ──
    tasks = {}

    if "kavenegar" in channels:
        def send_sms():
            sms = KavenegarSMS(settings["kavenegar"])
            return "kavenegar", sms.send_invoice_sms(phone, info, short_link)
        tasks["kavenegar"] = send_sms

    if "whatsapp" in channels:
        def send_whatsapp():
            wa = WhatsAppSender(settings.get("whatsapp", {}))
            r = wa.send_invoice(phone, pdf_path, info, short_link)
            return "whatsapp", r
        tasks["whatsapp"] = send_whatsapp

    if "bale" in channels:
        def send_bale():
            bale = BaleSender(settings.get("bale", {}))
            return "bale", bale.send_invoice(phone, pdf_path, info, short_link)
        tasks["bale"] = send_bale

    if "rubika" in channels:
        def send_rubika():
            rubika = RubikaSender(settings.get("rubika", {}))
            return "rubika", rubika.send_invoice(phone, pdf_path, info, short_link)
        tasks["rubika"] = send_rubika

    # ── ارسال موازی ──
    if tasks:
        with ThreadPoolExecutor(max_workers=max(1, len(tasks))) as executor:
            futures = {executor.submit(fn): key for key, fn in tasks.items()}
            for future in as_completed(futures):
                key = futures[future]
                label = CHANNEL_LABELS.get(key, key)
                try:
                    _, r = future.result()
                    if r.get("success"):
                        log(f"✅ {label} → {phone}")
                        report["ok"].append(key)
                        if r.get("fallback_link"):
                            log(f"   📎 لینک دستی واتساپ: {r['fallback_link']}")
                    else:
                        log(f"⚠️ {label}: {r.get('error', 'خطای نامشخص')}")
                        report["fail"].append(f"{key}: {r.get('error', '')}")
                except Exception as e:
                    log(f"❌ {label}: {e}")
                    report["fail"].append(f"{key}: {e}")

    log(f"📊 نتیجه: {len(report['ok'])} موفق | {len(report['fail'])} خطا")
    return report


# ── توابع تست اتصال هر سرویس (برای دکمه‌ی «تست اتصال») ──────────────
def test_channel(channel: str, settings: dict) -> tuple[bool, str]:
    """تست سریع اعتبار اطلاعات ورود یک کانال."""
    cfg = settings.get(channel, {})
    try:
        if channel == "wordpress":
            import requests
            url = cfg["url"].rstrip("/") + "/wp-json/wp/v2/users/me"
            resp = requests.get(url, auth=(cfg["username"], cfg["app_password"]), timeout=15)
            if resp.status_code == 200:
                return True, f"اتصال موفق — کاربر: {resp.json().get('name', '')}"
            return False, f"خطای احراز هویت (کد {resp.status_code})"

        if channel == "kavenegar":
            import requests
            url = f"https://api.kavenegar.com/v1/{cfg['api_key']}/account/info.json"
            resp = requests.get(url, timeout=15)
            data = resp.json()
            if data.get("return", {}).get("status") == 200:
                return True, "کلید API معتبر است."
            return False, f"کلید نامعتبر: {data.get('return', {}).get('message', '')}"

        if channel == "bale":
            import requests
            url = f"https://tapi.bale.ai/bot{cfg['bot_token']}/getMe"
            resp = requests.get(url, timeout=15)
            data = resp.json()
            if data.get("ok"):
                return True, f"ربات معتبر: @{data['result'].get('username', '')}"
            return False, "توکن ربات نامعتبر است."

        if channel == "whatsapp":
            if not (cfg.get("phone_number_id") and cfg.get("access_token")):
                return True, "حالت لینک wa.me فعال است (بدون API)."
            import requests
            url = f"https://graph.facebook.com/v18.0/{cfg['phone_number_id']}"
            resp = requests.get(
                url, headers={"Authorization": f"Bearer {cfg['access_token']}"}, timeout=15
            )
            if resp.status_code == 200:
                return True, "اتصال واتساپ API موفق بود."
            return False, f"خطا (کد {resp.status_code})"

        if channel == "rubika":
            if not cfg.get("auth"):
                return False, "نشست (auth) روبیکا وارد نشده است."
            return True, "اطلاعات روبیکا ثبت شده — تست واقعی هنگام ارسال انجام می‌شود."

    except Exception as e:
        return False, f"خطا: {e}"

    return False, "کانال ناشناخته"
