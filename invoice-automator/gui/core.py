"""
هسته‌ی پردازش ارسال پیش‌فاکتور برای رابط گرافیکی.

این ماژول از همان ماژول‌های موجود (modules/) استفاده می‌کند ولی
به‌جای خواندن config.yaml، تنظیمات را از ذخیره‌گاه رمزنگاری‌شده می‌گیرد
و فقط کانال‌هایی را اجرا می‌کند که کاربر انتخاب کرده است.
"""

import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FutureTimeout

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from modules.pdf_parser import extract_invoice_data
from modules.wp_uploader import WordPressUploader
from modules import sms_panel
from modules import file_relay
from modules.whatsapp_sender import WhatsAppSender
from modules.bale_sender import BaleSender
from modules.rubika_sender import RubikaSender


CHANNEL_LABELS = {
    "wordpress": "وردپرس",
    "sms_panel": "پیامک",
    "whatsapp": "واتساپ",
    "bale": "بله",
    "rubika": "روبیکا",
}


def available_channels(settings: dict) -> list[str]:
    """کانال‌هایی که هم فعال‌اند و هم اطلاعات لازم را دارند."""
    result = []
    if settings.get("wordpress", {}).get("enabled") and settings["wordpress"].get("url"):
        result.append("wordpress")
    sp = settings.get("sms_panel", {})
    if sp.get("enabled") and _sms_panel_ready(sp):
        result.append("sms_panel")
    wa = settings.get("whatsapp", {})
    if wa.get("enabled"):
        result.append("whatsapp")  # حتی بدون API می‌تواند لینک wa.me بسازد
    if settings.get("bale", {}).get("enabled") and settings["bale"].get("logged_in"):
        result.append("bale")
    if settings.get("rubika", {}).get("enabled") and settings["rubika"].get("logged_in"):
        result.append("rubika")
    return result


def _sms_panel_ready(sp: dict) -> bool:
    """آیا پنل پیامک حداقلِ اطلاعات لازم را دارد؟"""
    prov = sp.get("provider", "kavenegar")
    if prov in ("kavenegar", "smsir", "ghasedak", "ippanel"):
        return bool(sp.get("api_key"))
    if prov == "melipayamak":
        return bool(sp.get("username") and sp.get("password"))
    if prov == "custom":
        return bool(sp.get("url"))
    return False


def analyze_file(pdf_path: str) -> dict:
    """استخراج اطلاعات از نام فایل (تلفن، فاکتور، نام). در صورت خطا ValueError."""
    return extract_invoice_data(pdf_path)


def is_valid_phone(phone: str) -> bool:
    """بررسی قالب استاندارد شماره موبایل ایران (09xxxxxxxxx)."""
    import re
    return bool(re.fullmatch(r"09\d{9}", (phone or "").strip()))


# متغیرهای قابل‌استفاده در متن پیام (برای نمایش راهنما در رابط)
MESSAGE_VARIABLES = [
    ("{name}", "نام مشتری (اگر خالی باشد: مشتری)"),
    ("{invoice}", "شماره فاکتور"),
    ("{link}", "لینک کوتاه پیش‌فاکتور"),
]


def render_message(template: str, name: str = "", invoice: str = "", link: str = "") -> str:
    """جایگزینی متغیرها در متن پیام."""
    if not template:
        return ""
    out = template
    out = out.replace("{name}", name or "مشتری")
    out = out.replace("{invoice}", invoice or "")
    out = out.replace("{invoice_number}", invoice or "")
    out = out.replace("{link}", link or "")
    return out.strip()


def process_pdf(pdf_path: str, settings: dict, channels: list[str], log=print,
                info: dict = None) -> dict:
    """
    پردازش یک فایل PDF برای کانال‌های انتخاب‌شده.

    Args:
        pdf_path : مسیر فایل
        settings : دیکشنری تنظیمات (از settings_store)
        channels : لیست کانال‌های انتخاب‌شده، مثل ["kavenegar", "bale"]
        log      : تابعی برای نمایش پیام‌های زنده در رابط گرافیکی
        info     : اطلاعات دستی مشتری {"phone", "serial", "name"}.
                   اگر None باشد، از نام فایل استخراج می‌شود.

    Returns:
        dict: {"file", "ok": [...], "fail": [...], "short_link"}
    """
    report = {"file": pdf_path, "ok": [], "fail": [], "short_link": ""}

    log(f"📄 پردازش فایل: {os.path.basename(pdf_path)}")

    # ── تعیین اطلاعات مشتری (دستی یا از روی نام فایل) ──
    if info is None:
        try:
            info = analyze_file(pdf_path)
        except ValueError as e:
            log(f"❌ {e}")
            report["fail"].append(f"parse: {e}")
            return report

    phone = (info.get("phone") or "").strip()
    if not phone:
        log("❌ شماره موبایل مشتری وارد نشده است.")
        report["fail"].append("phone: شماره موبایل خالی است")
        return report

    # تکمیل فیلدهای موردنیاز ماژول‌ها
    info.setdefault("filename", os.path.basename(pdf_path))
    info["phone"] = phone
    serial = info.get("serial", "") or ""
    name = info.get("name") or "مشتری گرامی"
    log(f"☎ {phone}  |  📄 فاکتور: {serial or '—'}  |  👤 {name}")

    # ── ساخت لینک کوتاه پیش‌فاکتور ──
    short_link = ""
    customer_name_for_link = (info.get("name") or "").strip()
    if "wordpress" in channels:
        # کاربرانی که سایت وردپرس خودشان را وصل کرده‌اند
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

    # اگر هنوز لینکی نداریم و کانالی نیاز به لینک دارد (پیامک)، فایل را
    # پشت‌صحنه روی هاست مرجع آپلود کن و لینک کوتاهِ غیرقابل‌حدس بساز.
    needs_link = any(ch in channels for ch in ("sms_panel", "whatsapp", "bale", "rubika"))
    if not short_link and needs_link:
        try:
            short_link = file_relay.upload_invoice(pdf_path, serial, customer_name_for_link)
            report["short_link"] = short_link
            log(f"🔗 لینک پیش‌فاکتور آماده شد: {short_link}")
        except Exception as e:
            log(f"⚠️ ساخت لینک پیش‌فاکتور ناموفق بود: {e}")

    # متن خوش‌آمدگویی با جایگزینی متغیرها ({name}, {invoice}, {link})
    customer_name = (info.get("name") or "").strip() or "مشتری"
    welcome = render_message(settings.get("welcome_message", ""),
                             name=customer_name, invoice=serial, link=short_link)

    # مسیر نشست‌های لاگین‌شده
    from gui import settings_store as _store
    sess = _store.sessions_dir()

    # ── ساخت توابع ارسال برای کانال‌های انتخاب‌شده ──
    tasks = {}

    if "sms_panel" in channels:
        def send_sms():
            # متن از «متن پیام» مشترک؛ اگر لینک در متن نباشد، ته متن اضافه می‌شود.
            text = (welcome or "").strip()
            if short_link and short_link not in text:
                text = (text + "\n" + short_link).strip() if text else short_link
            return "sms_panel", sms_panel.send_sms(settings["sms_panel"], phone, text)
        tasks["sms_panel"] = send_sms

    if "whatsapp" in channels:
        def send_whatsapp():
            wa = WhatsAppSender(settings.get("whatsapp", {}))
            r = wa.send_invoice(phone, pdf_path, info, short_link)
            return "whatsapp", r
        tasks["whatsapp"] = send_whatsapp

    if "bale" in channels:
        def send_bale():
            cfg = dict(settings.get("bale", {}))
            cfg["session_file"] = str(sess / "bale.bale")
            bale = BaleSender(cfg)
            return "bale", bale.send_invoice(phone, pdf_path, info, short_link, welcome)
        tasks["bale"] = send_bale

    if "rubika" in channels:
        def send_rubika():
            cfg = dict(settings.get("rubika", {}))
            cfg["session_name"] = str(sess / "rubika")
            rubika = RubikaSender(cfg)
            return "rubika", rubika.send_invoice(phone, pdf_path, info, short_link, welcome)
        tasks["rubika"] = send_rubika

    # ── ارسال موازی با تایم‌اوت برای جلوگیری از هنگ کل ارسال ──
    if tasks:
        # هر کانال حداکثر ۹۰ ثانیه؛ اگر یکی نشست، بقیه کارشان را ادامه می‌دهند
        SEND_TIMEOUT = 90
        with ThreadPoolExecutor(max_workers=max(1, len(tasks))) as executor:
            futures = {executor.submit(fn): key for key, fn in tasks.items()}
            for future in as_completed(futures, timeout=None):
                key = futures[future]
                label = CHANNEL_LABELS.get(key, key)
                try:
                    _, r = future.result(timeout=SEND_TIMEOUT)
                    if r.get("success"):
                        log(f"✅ {label} → {phone}")
                        report["ok"].append(key)
                        if r.get("fallback_link"):
                            log(f"   📎 لینک دستی واتساپ: {r['fallback_link']}")
                    else:
                        log(f"⚠️ {label}: {r.get('error', 'خطای نامشخص')}")
                        report["fail"].append(f"{key}: {r.get('error', '')}")
                except FutureTimeout:
                    log(f"⏱️ {label}: تایم‌اوت ({SEND_TIMEOUT} ثانیه) — رد شد")
                    report["fail"].append(f"{key}: timeout")
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

        if channel == "sms_panel":
            return sms_panel.test_panel(cfg)

        if channel == "bale":
            if cfg.get("logged_in"):
                return True, f"وارد شده با شماره {cfg.get('phone','')}"
            return False, "وارد نشده‌اید — ابتدا با شماره لاگین کنید."

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
            if cfg.get("logged_in"):
                return True, f"وارد شده با شماره {cfg.get('phone','')}"
            return False, "وارد نشده‌اید — ابتدا با شماره لاگین کنید."

    except Exception as e:
        return False, f"خطا: {e}"

    return False, "کانال ناشناخته"


def send_test_sms(settings: dict, phone: str) -> tuple[bool, str]:
    """ارسال یک پیامک آزمایشی واقعی با پنل پیامکِ تنظیم‌شده."""
    if not is_valid_phone(phone):
        return False, "شماره موبایل را درست وارد کنید (09xxxxxxxxx)."
    brand = "یارا"
    try:
        from gui import edition
        brand = edition.brand()
    except Exception:
        pass
    msg = f"پیام آزمایشی {brand}\nپنل پیامک شما درست تنظیم شده است. ✅"
    r = sms_panel.send_sms(settings.get("sms_panel", {}), phone, msg)
    if r.get("success"):
        return True, "پیامک آزمایشی ارسال شد. صندوق پیام گوشی را بررسی کنید."
    return False, r.get("error", "ارسال ناموفق بود.")
