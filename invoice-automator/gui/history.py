"""
تاریخچه‌ی ارسال‌ها — ذخیره‌ی رمزنگاری‌شده‌ی هر ارسال روی همین دستگاه.

هر رکورد: زمان، فایل، شماره و نام مشتری، کانال‌ها و نتیجه.
"""

import json
import time

from gui import settings_store as store

MAX_RECORDS = 500


def _file():
    return store.config_dir() / "history.enc"


def get_records() -> list:
    p = _file()
    if not p.exists():
        return []
    try:
        from gui.settings_store import _fernet
        return json.loads(_fernet().decrypt(p.read_bytes()).decode("utf-8"))
    except Exception:
        return []


def _save(records: list):
    try:
        from gui.settings_store import _fernet
        data = json.dumps(records[:MAX_RECORDS], ensure_ascii=False).encode("utf-8")
        _file().write_bytes(_fernet().encrypt(data))
    except Exception:
        pass


def add_record(file: str, info: dict, channels: list, report: dict):
    """افزودن یک رکورد به ابتدای تاریخچه."""
    import os
    rec = {
        "time": time.time(),
        "file": file,
        "filename": os.path.basename(file),
        "phone": info.get("phone", ""),
        "name": (info.get("name") or "").strip(),
        "serial": info.get("serial", "") or "",
        "channels": list(channels),
        "ok": list(report.get("ok", [])),
        "fail": [str(x).split(":")[0] for x in report.get("fail", [])],
    }
    records = get_records()
    records.insert(0, rec)
    _save(records)


def clear():
    try:
        _file().unlink(missing_ok=True)
    except Exception:
        pass
