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

from gui import settings_store as _store


# ── نشست روبیکا ──────────────────────────────────────────────────────
# نام/مسیر نشست ثابت است و کنار سایر تنظیمات (در پوشه‌ی کاربر) ذخیره
# می‌شود تا هم بخش ورود و هم بخش ارسال از یک نشست استفاده کنند.
RUBIKA_SESSION_NAME = "rubika_account"


def rubika_session_path() -> str:
    """مسیر پایه‌ی فایل نشست روبیکا (rubpy پسوند .rp را خودش اضافه می‌کند)."""
    return str(_store.config_dir() / RUBIKA_SESSION_NAME)


def rubika_is_logged_in(settings: dict = None) -> bool:
    """
    آیا ورود یک‌باره‌ی روبیکا انجام شده است؟

    صرفِ وجود فایل نشست کافی نیست؛ rubpy فایل .rp را به‌محض ساخت کلاینت
    (حتی پیش از ورود موفق) می‌سازد. بنابراین جدول session را بررسی می‌کنیم
    که فقط پس از ورود موفق دارای رکورد با auth معتبر می‌شود.
    """
    import sqlite3
    from pathlib import Path as _P
    session_file = _P(rubika_session_path() + ".rp")
    if not session_file.exists():
        return False
    try:
        con = sqlite3.connect(str(session_file))
        try:
            row = con.execute("select auth from session limit 1").fetchone()
        finally:
            con.close()
        return bool(row and row[0])
    except sqlite3.Error:
        return False


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
    if settings.get("rubika", {}).get("enabled") and rubika_is_logged_in(settings):
        result.append("rubika")
    return result


def analyze_file(pdf_path: str) -> dict:
    """استخراج اطلاعات از نام فایل (تلفن، فاکتور، نام). در صورت خطا ValueError."""
    return extract_invoice_data(pdf_path)


def is_valid_phone(phone: str) -> bool:
    """بررسی قالب استاندارد شماره موبایل ایران (09xxxxxxxxx)."""
    import re
    return bool(re.fullmatch(r"09\d{9}", (phone or "").strip()))


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
            # نشست ذخیره‌شده‌ی حاصل از ورود یک‌باره را به‌عنوان auth می‌دهیم
            rb_cfg = dict(settings.get("rubika", {}))
            rb_cfg["auth"] = rubika_session_path()
            rubika = RubikaSender(rb_cfg)
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
            if not rubika_is_logged_in(settings):
                return False, "هنوز وارد روبیکا نشده‌اید — روی «ورود به روبیکا» بزنید."
            phone = cfg.get("phone", "")
            return True, f"وارد شده{' با ' + phone if phone else ''} — تست واقعی هنگام ارسال انجام می‌شود."

    except Exception as e:
        return False, f"خطا: {e}"

    return False, "کانال ناشناخته"


# ── ورود یک‌باره به روبیکا با شماره و کد تأیید ──────────────────────────
class RubikaLogin:
    """
    مدیریت ورود تعاملی روبیکا برای رابط گرافیکی.

    rubpy به‌صورت پیش‌فرض کد تأیید و رمز دومرحله‌ای را با input() از کنسول
    می‌گیرد. اینجا input() را به‌صورت موقت با یک صف جایگزین می‌کنیم تا
    مقادیر از پنجره‌ی گرافیکی تأمین شوند. کل فرایند در یک نخ جداگانه اجرا
    می‌شود و رویدادها از طریق صف به رابط گزارش داده می‌شوند.

    رویدادهای ارسالی در صف events:
        ("code",    prompt)   → برنامه باید کد تأیید را بپرسد
        ("password", hint)    → نیاز به رمز عبور دومرحله‌ای
        ("success", phone)    → ورود موفق
        ("error",   message)  → خطا

    پاسخ‌ها با submit(value) برگردانده می‌شوند.
    """

    def __init__(self, phone: str):
        import queue
        self.phone = (phone or "").strip()
        self.events: "queue.Queue" = queue.Queue()
        self._inputs: "queue.Queue" = queue.Queue()
        self._thread = None

    def submit(self, value: str):
        """تحویل کد تأیید یا رمز عبور واردشده توسط کاربر به فرایند ورود."""
        self._inputs.put(value)

    def start(self):
        import threading
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    # نخ پس‌زمینه --------------------------------------------------------
    def _run(self):
        import builtins
        import asyncio

        original_input = builtins.input

        def gui_input(prompt: str = "") -> str:
            low = str(prompt).lower()
            if "pass" in low or "رمز" in low:
                self.events.put(("password", str(prompt)))
            else:
                self.events.put(("code", str(prompt)))
            # تا زمانی که کاربر مقدار را وارد کند، منتظر می‌مانیم
            return str(self._inputs.get())

        builtins.input = gui_input
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            from rubpy import Client

            async def _flow():
                # phone_number را مستقیم به start() می‌دهیم تا rubpy مرحله‌ی
                # پرسیدن و تأیید شماره را رد کند و مستقیم کد تأیید بفرستد.
                # (نکته: __aenter__ شماره را به start منتقل نمی‌کند، پس
                #  از context manager استفاده نمی‌کنیم.)
                client = Client(name=rubika_session_path(),
                                phone_number=self.phone)
                try:
                    await client.start(phone_number=self.phone)
                    me = await client.get_me()
                    user = getattr(me, "user", me)
                    return getattr(user, "phone", self.phone)
                finally:
                    try:
                        await client.disconnect()
                    except Exception:
                        pass

            phone = loop.run_until_complete(_flow())
            self.events.put(("success", phone or self.phone))
        except Exception as e:
            self.events.put(("error", str(e)))
        finally:
            builtins.input = original_input
            try:
                loop.close()
            except Exception:
                pass


def rubika_logout(settings: dict = None) -> None:
    """حذف نشست ذخیره‌شده‌ی روبیکا (خروج از حساب)."""
    from pathlib import Path as _P
    for suffix in (".rp", ""):
        f = _P(rubika_session_path() + suffix)
        try:
            if f.exists():
                f.unlink()
        except OSError:
            pass
