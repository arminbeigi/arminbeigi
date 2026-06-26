"""
ذخیره‌سازی محلی رمزنگاری‌شده‌ی تنظیمات و اطلاعات ورود پیام‌رسان‌ها.

هیچ اطلاعاتی داخل کد یا گیت ذخیره نمی‌شود. همه‌ی اطلاعات ورود
به‌صورت رمزنگاری‌شده در پوشه‌ی کاربر (روی همان کامپیوتر) نگه‌داری می‌شود:

  Windows : %APPDATA%/YaraPro/
  Linux   : ~/.config/YaraPro/
  macOS   : ~/Library/Application Support/YaraPro/

کلید رمزنگاری از شناسه‌ی مخصوص همان دستگاه + یک نمک تصادفی ساخته می‌شود،
بنابراین فایل تنظیمات روی دستگاه دیگری قابل‌خواندن نیست.
"""

import os
import sys
import json
import uuid
import base64
import getpass
import platform
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


APP_NAME = "YaraPro"


# ── ساختار پیش‌فرض تنظیمات ─────────────────────────────────────────
DEFAULT_SETTINGS = {
    "appearance": "system",        # dark | light | system (پیش‌فرض: تبعیت از سیستم)
    # تاریخچه‌ی شماره‌های ارسال‌شده (برای اتوفیل فیلد شماره مشتری)
    "phone_history": [],
    # متن پیام (کپشن فایل) که برای مشتری ارسال می‌شود. متغیرها: {name} {invoice} {link}
    "welcome_message": "{name} عزیز، پیش‌فاکتور شما آماده است.",
    "wordpress": {
        "enabled": False,
        "url": "",
        "username": "",
        "app_password": "",
    },
    # پنل پیامکِ خودِ کاربر — پشتیبانی از سرویس‌دهنده‌های رایج ایران.
    # فایل پیش‌فاکتور پشت‌صحنه روی هاست مرجع آپلود می‌شود و لینک کوتاهِ
    # غیرقابل‌حدس با همین پنل (و اعتبار خودِ کاربر) برای مشتری ارسال می‌گردد.
    "sms_panel": {
        "enabled": False,
        "provider": "kavenegar",   # kavenegar | smsir | melipayamak | ghasedak | ippanel | custom
        "api_key": "",
        "line": "",
        "username": "",
        "password": "",
        "url": "",
        "body_template": "",
    },
    # نگه‌داری برای سازگاری با نسخه‌های قدیمی (کاوه‌نگار مستقل)
    "kavenegar": {
        "enabled": False,
        "api_key": "",
        "sender": "",
        "template": (
            "مشتری گرامی\n"
            "پیش فاکتور شماره {invoice_number} صادر شد.\n"
            "مشاهده و دانلود:\n"
            "{link}"
        ),
    },
    "whatsapp": {
        "enabled": False,
        "phone_number_id": "",
        "access_token": "",
    },
    # بله — اکانت شخصی (لاگین با شماره + کد تأیید، نه ربات)
    "bale": {
        "enabled": False,
        "phone": "",
        "logged_in": False,
    },
    # روبیکا — اکانت شخصی (لاگین با شماره + کد تأیید)
    "rubika": {
        "enabled": False,
        "phone": "",
        "logged_in": False,
    },
}


def sessions_dir() -> Path:
    """پوشه‌ی نگه‌داری فایل‌های نشست لاگین پیام‌رسان‌ها."""
    path = config_dir() / "sessions"
    path.mkdir(parents=True, exist_ok=True)
    return path


def config_dir() -> Path:
    """پوشه‌ی نگه‌داری تنظیمات بر اساس سیستم‌عامل."""
    if sys.platform.startswith("win"):
        base = os.environ.get("APPDATA") or str(Path.home())
    elif sys.platform == "darwin":
        base = str(Path.home() / "Library" / "Application Support")
    else:
        base = os.environ.get("XDG_CONFIG_HOME") or str(Path.home() / ".config")
    path = Path(base) / APP_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path


def _settings_file() -> Path:
    return config_dir() / "settings.enc"


def _salt_file() -> Path:
    return config_dir() / "key.salt"


def _machine_secret() -> bytes:
    """شناسه‌ی نسبتاً پایدار مخصوص همین دستگاه و کاربر."""
    parts = [
        platform.node(),
        getpass.getuser(),
        str(uuid.getnode()),          # آدرس MAC
        platform.machine(),
    ]
    return "|".join(parts).encode("utf-8")


def _get_or_create_salt() -> bytes:
    salt_path = _salt_file()
    if salt_path.exists():
        return salt_path.read_bytes()
    salt = os.urandom(16)
    salt_path.write_bytes(salt)
    try:
        os.chmod(salt_path, 0o600)
    except OSError:
        pass
    return salt


def _fernet() -> Fernet:
    salt = _get_or_create_salt()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=390000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(_machine_secret()))
    return Fernet(key)


def _merge_defaults(data: dict) -> dict:
    """ادغام داده‌ی ذخیره‌شده با ساختار پیش‌فرض (برای سازگاری نسخه‌ها)."""
    merged = json.loads(json.dumps(DEFAULT_SETTINGS))  # کپی عمیق
    for key, value in (data or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key].update(value)
        else:
            merged[key] = value
    return merged


def _migrate(data: dict) -> dict:
    """مهاجرت نرم از نسخه‌های قدیمی به ساختار جدید."""
    # کاوه‌نگارِ مستقل قبلی ⇒ پنل پیامک (اگر هنوز تنظیم نشده)
    kv = data.get("kavenegar", {})
    sp = data.get("sms_panel", {})
    if kv.get("api_key") and not sp.get("api_key"):
        sp.update(
            provider="kavenegar",
            api_key=kv.get("api_key", ""),
            line=kv.get("sender", ""),
            enabled=sp.get("enabled") or kv.get("enabled", False),
        )
        data["sms_panel"] = sp
    return data


def load_settings() -> dict:
    """خواندن تنظیمات. اگر فایلی نباشد یا خراب باشد، پیش‌فرض برمی‌گردد."""
    path = _settings_file()
    if not path.exists():
        return _merge_defaults({})
    try:
        decrypted = _fernet().decrypt(path.read_bytes())
        data = json.loads(decrypted.decode("utf-8"))
        return _migrate(_merge_defaults(data))
    except (InvalidToken, ValueError, json.JSONDecodeError):
        # فایل با کلید دستگاه دیگری ساخته شده یا خراب است
        return _merge_defaults({})


def save_settings(settings: dict) -> None:
    """ذخیره‌ی رمزنگاری‌شده‌ی تنظیمات روی دیسک."""
    payload = json.dumps(settings, ensure_ascii=False).encode("utf-8")
    token = _fernet().encrypt(payload)
    path = _settings_file()
    path.write_bytes(token)
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
