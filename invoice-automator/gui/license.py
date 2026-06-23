"""
سیستم فعال‌سازی لایسنس «کارا».

- فعال‌سازی آنلاین با کلیدی که فروشگاه ووکامرس (License Manager for WooCommerce)
  می‌سازد؛ از طریق یک endpoint سفارشی روی سایت فروشگاه: /wp-json/kara/v1/activate
- ذخیره‌ی رمزنگاری‌شده‌ی وضعیت فعال‌سازی، گره‌خورده به همین دستگاه.
- تست رایگان یک‌باره و مهلت کار آفلاین.

نکته: آدرس فروشگاه را در STORE_URL تنظیم کنید.
"""

import json
import time
import uuid
import hashlib
import platform
import getpass

from gui import settings_store as store

# آدرس فروشگاه ووکامرس (بدون اسلش انتهایی) — این را تغییر دهید
STORE_URL = "https://getkara.ir"

TRIAL_DAYS = 7            # طول تست رایگان
OFFLINE_GRACE_DAYS = 14   # مهلت کار آفلاین پس از آخرین اعتبارسنجی موفق


def device_id() -> str:
    raw = f"{uuid.getnode()}-{platform.node()}-{getpass.getuser()}-{platform.machine()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def _lic_file():
    return store.config_dir() / "license.enc"


def _load() -> dict:
    p = _lic_file()
    if not p.exists():
        return {}
    try:
        from gui.settings_store import _fernet
        return json.loads(_fernet().decrypt(p.read_bytes()).decode("utf-8"))
    except Exception:
        return {}


def _save(d: dict):
    try:
        from gui.settings_store import _fernet
        _lic_file().write_bytes(_fernet().encrypt(json.dumps(d, ensure_ascii=False).encode("utf-8")))
    except Exception:
        pass


def _to_epoch(value) -> float | None:
    """تبدیل تاریخ (ISO یا epoch) به epoch. None = مادام‌العمر."""
    if not value:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        from datetime import datetime
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except Exception:
        return None


def status() -> dict:
    """وضعیت فعلی لایسنس: state ∈ {active, trial, expired, none}"""
    d = _load()
    now = time.time()
    dev = device_id()

    # تست رایگان
    tu = d.get("trial_until")
    if tu and now < tu and d.get("device") == dev and d.get("state") != "active":
        return {"state": "trial", "days_left": int((tu - now) / 86400) + 1}

    if d.get("state") == "active" and d.get("device") == dev:
        exp = d.get("expires_at")
        if exp and now > exp:
            return {"state": "expired", "plan": d.get("plan", "")}
        # مهلت آفلاین
        days_left = int((exp - now) / 86400) + 1 if exp else None
        return {"state": "active", "plan": d.get("plan", ""), "days_left": days_left}

    if tu and now >= tu:
        return {"state": "expired", "trial": True}
    return {"state": "none"}


def is_usable() -> bool:
    return status()["state"] in ("active", "trial")


def start_trial() -> tuple[bool, str]:
    d = _load()
    if d.get("trial_used"):
        return False, "تست رایگان قبلاً روی این دستگاه استفاده شده است."
    d.update(trial_used=True, trial_until=time.time() + TRIAL_DAYS * 86400,
             device=device_id())
    _save(d)
    return True, f"تست رایگان {TRIAL_DAYS} روزه فعال شد."


def activate(key: str) -> tuple[bool, str]:
    """فعال‌سازی آنلاین کلید لایسنس از طریق فروشگاه."""
    import requests
    key = (key or "").strip()
    if not key:
        return False, "کلید لایسنس را وارد کنید."
    try:
        r = requests.post(
            f"{STORE_URL}/wp-json/kara/v1/activate",
            json={"license_key": key, "device": device_id()},
            timeout=25,
        )
        data = r.json()
    except Exception as e:
        return False, f"خطا در اتصال به سرور فعال‌سازی: {e}"

    if not data.get("success"):
        return False, data.get("message", "کلید نامعتبر یا منقضی است.")

    d = _load()
    d.update(
        state="active", key=key, device=device_id(),
        plan=data.get("plan", "حرفه‌ای"),
        expires_at=_to_epoch(data.get("expires_at")),
        activated_at=time.time(), last_check=time.time(),
    )
    _save(d)
    return True, "فعال‌سازی با موفقیت انجام شد. سپاس از خرید شما!"


def deactivate():
    """حذف فعال‌سازی محلی (مثلاً برای انتقال به دستگاه دیگر)."""
    try:
        _lic_file().unlink(missing_ok=True)
    except Exception:
        pass


def store_url() -> str:
    return STORE_URL
