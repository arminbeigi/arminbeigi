"""
ارسال پیامک از طریق «پنل پیامک خودِ کاربر».

برخلاف نسخه‌ی قبلی که فقط کاوه‌نگار را پشتیبانی می‌کرد، اینجا ساختار
پنل‌های پیامکِ رایج ایران به‌صورت یکپارچه پشتیبانی می‌شود. کاربر در
تنظیمات، سرویس‌دهنده‌ی خودش را انتخاب و اطلاعات ورودش را وارد می‌کند؛
پیامک با همان پنل (و اعتبار خودِ کاربر) ارسال می‌شود.

سرویس‌دهنده‌های پشتیبانی‌شده:
  • kavenegar    کاوه‌نگار          (کلید API + خط)
  • smsir        sms.ir            (کلید API + شماره خط)
  • melipayamak  ملی‌پیامک/فراپیامک  (نام کاربری + رمز + خط)
  • ghasedak     قاصدک             (کلید API + خط)
  • ippanel      فراز اس‌ام‌اس/ippanel (کلید API + خط)
  • custom       سفارشی            (آدرس دلخواه با {phone} و {message})

هر سرویس‌دهنده یک تابع send(cfg, phone, message) و یک test(cfg) دارد.
"""

import logging
import requests

logger = logging.getLogger(__name__)

TIMEOUT = 30


# ─────────────────────────── کاوه‌نگار ───────────────────────────
def _kavenegar_send(cfg, phone, message):
    api = (cfg.get("api_key") or "").strip()
    url = f"https://api.kavenegar.com/v1/{api}/sms/send.json"
    data = {"receptor": phone, "message": message}
    if cfg.get("line"):
        data["sender"] = cfg["line"]
    r = requests.post(url, data=data, timeout=TIMEOUT)
    j = r.json()
    if j.get("return", {}).get("status") == 200:
        return {"success": True, "data": j}
    return {"success": False, "error": j.get("return", {}).get("message", "خطای کاوه‌نگار")}


def _kavenegar_test(cfg):
    api = (cfg.get("api_key") or "").strip()
    if not api:
        return False, "کلید API را وارد کنید."
    r = requests.get(f"https://api.kavenegar.com/v1/{api}/account/info.json", timeout=15)
    j = r.json()
    if j.get("return", {}).get("status") == 200:
        cr = j.get("entries", {}).get("remaincredit", "?")
        return True, f"کلید معتبر است. اعتبار: {cr} ریال"
    return False, j.get("return", {}).get("message", "کلید نامعتبر")


# ─────────────────────────── sms.ir ───────────────────────────
def _smsir_send(cfg, phone, message):
    api = (cfg.get("api_key") or "").strip()
    headers = {"X-API-KEY": api, "Content-Type": "application/json", "Accept": "application/json"}
    body = {"lineNumber": cfg.get("line", ""), "messageText": message, "mobiles": [phone]}
    r = requests.post("https://api.sms.ir/v1/send/bulk", json=body, headers=headers, timeout=TIMEOUT)
    j = r.json()
    if j.get("status") == 1:
        return {"success": True, "data": j}
    return {"success": False, "error": j.get("message", "خطای sms.ir")}


def _smsir_test(cfg):
    api = (cfg.get("api_key") or "").strip()
    if not api:
        return False, "کلید API را وارد کنید."
    r = requests.get("https://api.sms.ir/v1/credit", headers={"X-API-KEY": api, "Accept": "application/json"}, timeout=15)
    j = r.json()
    if j.get("status") == 1:
        return True, f"کلید معتبر است. اعتبار: {j.get('data', '?')}"
    return False, j.get("message", "کلید نامعتبر")


# ─────────────────────────── ملی‌پیامک / فراپیامک ───────────────────────────
def _melipayamak_send(cfg, phone, message):
    data = {
        "username": cfg.get("username", ""),
        "password": cfg.get("password", ""),
        "to": phone,
        "from": cfg.get("line", ""),
        "text": message,
    }
    r = requests.post("https://rest.payamak-panel.com/api/SendSMS/SendSMS",
                      data=data, timeout=TIMEOUT)
    j = r.json()
    # RetStatus == 1 یعنی موفق
    if str(j.get("RetStatus")) == "1":
        return {"success": True, "data": j}
    return {"success": False, "error": j.get("StrRetStatus", "خطای ملی‌پیامک")}


def _melipayamak_test(cfg):
    if not (cfg.get("username") and cfg.get("password")):
        return False, "نام کاربری و رمز را وارد کنید."
    r = requests.post("https://rest.payamak-panel.com/api/SendSMS/GetCredit",
                      data={"username": cfg["username"], "password": cfg["password"]}, timeout=15)
    j = r.json()
    if str(j.get("RetStatus")) == "1":
        return True, f"ورود معتبر است. اعتبار: {j.get('Value', '?')}"
    return False, j.get("StrRetStatus", "نام کاربری یا رمز نادرست")


# ─────────────────────────── قاصدک ───────────────────────────
def _ghasedak_send(cfg, phone, message):
    api = (cfg.get("api_key") or "").strip()
    headers = {"apikey": api, "Content-Type": "application/x-www-form-urlencoded"}
    data = {"message": message, "receptor": phone, "linenumber": cfg.get("line", "")}
    r = requests.post("https://api.ghasedak.me/v2/sms/send/simple",
                      data=data, headers=headers, timeout=TIMEOUT)
    j = r.json()
    if j.get("result", {}).get("code") == 200:
        return {"success": True, "data": j}
    return {"success": False, "error": j.get("result", {}).get("message", "خطای قاصدک")}


def _ghasedak_test(cfg):
    api = (cfg.get("api_key") or "").strip()
    if not api:
        return False, "کلید API را وارد کنید."
    r = requests.post("https://api.ghasedak.me/v2/account/info",
                      headers={"apikey": api}, timeout=15)
    j = r.json()
    if j.get("result", {}).get("code") == 200:
        return True, "کلید معتبر است."
    return False, j.get("result", {}).get("message", "کلید نامعتبر")


# ─────────────────────────── فراز اس‌ام‌اس / ippanel ───────────────────────────
def _ippanel_send(cfg, phone, message):
    api = (cfg.get("api_key") or "").strip()
    headers = {"Authorization": f"AccessKey {api}", "Content-Type": "application/json"}
    body = {
        "sending_type": "webservice",
        "from_number": cfg.get("line", ""),
        "message": message,
        "params": {"recipients": [phone]},
    }
    r = requests.post("https://api2.ippanel.com/api/v1/sms/send/webservice/single",
                      json=body, headers=headers, timeout=TIMEOUT)
    j = r.json()
    if str(j.get("status", "")).lower() in ("ok", "success") or j.get("code") in (200, "200"):
        return {"success": True, "data": j}
    return {"success": False, "error": j.get("message", "خطای ippanel")}


def _ippanel_test(cfg):
    api = (cfg.get("api_key") or "").strip()
    if not api:
        return False, "کلید API را وارد کنید."
    try:
        r = requests.get("https://api2.ippanel.com/api/v1/sms/accounting/credit/show",
                         headers={"Authorization": f"AccessKey {api}"}, timeout=15)
        j = r.json()
        if str(j.get("status", "")).lower() in ("ok", "success"):
            return True, "کلید معتبر است."
        return False, j.get("message", "کلید نامعتبر")
    except Exception as e:
        return False, f"خطا: {e}"


# ─────────────────────────── سفارشی (هر پنل دیگر) ───────────────────────────
def _custom_send(cfg, phone, message):
    """
    آدرس سفارشی با جای‌گذاری {phone}، {message} و {line}.
    اگر body_template خالی باشد ⇒ درخواست GET؛ وگرنه POST با همان بدنه.
    """
    import urllib.parse as up
    enc_msg = up.quote(message)
    url = (cfg.get("url") or "").replace("{phone}", phone) \
        .replace("{message}", enc_msg).replace("{line}", cfg.get("line", ""))
    body_tpl = (cfg.get("body_template") or "").strip()
    try:
        if body_tpl:
            body = body_tpl.replace("{phone}", phone).replace("{message}", message) \
                .replace("{line}", cfg.get("line", ""))
            ctype = "application/json" if body.lstrip().startswith("{") else \
                    "application/x-www-form-urlencoded"
            r = requests.post(url, data=body.encode("utf-8"),
                              headers={"Content-Type": ctype}, timeout=TIMEOUT)
        else:
            r = requests.get(url, timeout=TIMEOUT)
        if 200 <= r.status_code < 300:
            return {"success": True, "data": {"http": r.status_code, "body": r.text[:300]}}
        return {"success": False, "error": f"کد HTTP {r.status_code}: {r.text[:160]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _custom_test(cfg):
    if not (cfg.get("url") or "").strip():
        return False, "آدرس وب‌سرویس را وارد کنید."
    return True, "آماده است. با «ارسال آزمایشی» در عمل بررسی کنید."


# ─────────────────────────── رجیستری سرویس‌دهنده‌ها ───────────────────────────
# هر فیلد: (کلید، برچسب، placeholder، محرمانه)
PROVIDERS = {
    "kavenegar": {
        "label": "کاوه‌نگار (Kavenegar)",
        "fields": [
            ("api_key", "کلید API", "از پنل کاوه‌نگار > تنظیمات", True),
            ("line",    "شماره خط (اختیاری)", "مثلاً 10008663 — خالی = خط پیش‌فرض", False),
        ],
        "help": "panel.kavenegar.com ← تنظیمات حساب کاربری ← کلید API. شماره خط اختیاری است.",
        "send": _kavenegar_send, "test": _kavenegar_test,
    },
    "smsir": {
        "label": "اس‌ام‌اس‌دات‌آی‌آر (sms.ir)",
        "fields": [
            ("api_key", "کلید API", "از پنل sms.ir > توسعه‌دهندگان", True),
            ("line",    "شماره خط", "شماره خط ارسالی شما", False),
        ],
        "help": "sms.ir ← بخش «توسعه‌دهندگان / وب‌سرویس» ← کلید API (نسخه ۳). شماره خط را از همان پنل بردارید.",
        "send": _smsir_send, "test": _smsir_test,
    },
    "melipayamak": {
        "label": "ملی‌پیامک / فراپیامک",
        "fields": [
            ("username", "نام کاربری", "نام کاربری پنل", False),
            ("password", "رمز عبور", "رمز عبور پنل", True),
            ("line",     "شماره خط", "شماره خط ارسالی (از/From)", False),
        ],
        "help": "ملی‌پیامک ← همان نام کاربری و رمز پنل + شماره خط ارسالی شما. (وب‌سرویس REST).",
        "send": _melipayamak_send, "test": _melipayamak_test,
    },
    "ghasedak": {
        "label": "قاصدک (Ghasedak)",
        "fields": [
            ("api_key", "کلید API (apikey)", "از پنل قاصدک", True),
            ("line",    "شماره خط", "شماره خط (linenumber)", False),
        ],
        "help": "ghasedak.me ← بخش وب‌سرویس ← apikey. شماره خط ارسالی را وارد کنید.",
        "send": _ghasedak_send, "test": _ghasedak_test,
    },
    "ippanel": {
        "label": "فراز اس‌ام‌اس / ippanel",
        "fields": [
            ("api_key", "کلید دسترسی (AccessKey)", "از پنل ← وب‌سرویس", True),
            ("line",    "شماره خط", "شماره خط ارسالی", False),
        ],
        "help": "ippanel/فراز ← بخش وب‌سرویس ← AccessKey + شماره خط ارسالی.",
        "send": _ippanel_send, "test": _ippanel_test,
    },
    "custom": {
        "label": "سفارشی (سایر پنل‌ها)",
        "fields": [
            ("url",           "آدرس وب‌سرویس", "https://panel.example/send?to={phone}&text={message}", False),
            ("body_template", "بدنه‌ی POST (اختیاری)", 'خالی = GET. مثلاً: to={phone}&text={message}', False),
            ("line",          "شماره خط (اختیاری)", "اگر در آدرس از {line} استفاده کردید", False),
        ],
        "help": "برای هر پنل دیگری: آدرس وب‌سرویس را با {phone}، {message} و {line} بنویسید. "
                "اگر «بدنه POST» را پر کنید، درخواست POST می‌شود؛ وگرنه GET.",
        "send": _custom_send, "test": _custom_test,
    },
}

PROVIDER_ORDER = ["kavenegar", "smsir", "melipayamak", "ghasedak", "ippanel", "custom"]


def provider_labels() -> dict:
    return {k: PROVIDERS[k]["label"] for k in PROVIDER_ORDER}


def send_sms(cfg: dict, phone: str, message: str) -> dict:
    """ارسال یک پیامک با پنل انتخاب‌شده در cfg['provider']."""
    prov = (cfg or {}).get("provider", "kavenegar")
    spec = PROVIDERS.get(prov)
    if not spec:
        return {"success": False, "error": f"سرویس‌دهنده‌ی ناشناخته: {prov}"}
    try:
        logger.info(f"ارسال پیامک با پنل {prov} به {phone}")
        return spec["send"](cfg, phone, message)
    except Exception as e:
        logger.error(f"خطای ارسال پیامک ({prov}): {e}")
        return {"success": False, "error": str(e)}


def test_panel(cfg: dict) -> tuple:
    """تست اعتبار پنل پیامک."""
    prov = (cfg or {}).get("provider", "kavenegar")
    spec = PROVIDERS.get(prov)
    if not spec:
        return False, f"سرویس‌دهنده‌ی ناشناخته: {prov}"
    try:
        return spec["test"](cfg)
    except Exception as e:
        return False, f"خطا: {e}"
