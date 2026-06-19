"""
لاگین تلفنی پیام‌رسان‌ها (روبیکا و بله) با شماره + کد تأیید.

هر سرویس یک لوپ asyncio پایدار در یک ترد جداگانه دارد تا کلاینت بین
مرحله‌ی «ارسال کد» و «تأیید کد» زنده بماند. نشست‌ها در پوشه‌ی
sessions ذخیره می‌شوند تا دفعه‌ی بعد نیازی به لاگین مجدد نباشد.

⚠ توجه: این بخش به سرور واقعی بله/روبیکا متصل می‌شود و فقط روی
سیستم کاربر با سیم‌کارت واقعی قابل‌آزمایش است.
"""

import asyncio
import threading
from pathlib import Path

from gui import settings_store as store


def _normalize_ir(phone: str) -> str:
    """09xxxxxxxxx → 98xxxxxxxxxx"""
    p = (phone or "").strip().replace(" ", "")
    if p.startswith("0"):
        return "98" + p[1:]
    if p.startswith("+98"):
        return p[1:]
    if p.startswith("98"):
        return p
    return p


class _AsyncWorker:
    """یک لوپ asyncio پایدار روی یک ترد پس‌زمینه."""

    def __init__(self):
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_forever()

    def run(self, coro, timeout=90):
        fut = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return fut.result(timeout=timeout)


# ============================================================
#   روبیکا (rubpy)
# ============================================================
class RubikaLogin:
    def __init__(self):
        self._w = _AsyncWorker()
        self._client = None
        self._pending = {}   # phone, phone_code_hash, public_key

    def _session_name(self) -> str:
        return str(store.sessions_dir() / "rubika")

    def send_code(self, phone: str):
        """مرحله ۱: ارسال کد تأیید به شماره."""
        try:
            return self._w.run(self._send_code(phone))
        except Exception as e:
            return False, f"خطا: {e}"

    async def _send_code(self, phone: str):
        from rubpy import Client
        norm = _normalize_ir(phone)
        self._client = Client(name=self._session_name())
        await self._client.connect()
        result = await self._client.send_code(phone_number=norm, send_type="SMS")
        status = getattr(result, "status", None)
        if status not in ("OK", "SendPassKey", None):
            return False, f"وضعیت: {status}"
        self._pending = {
            "phone": norm,
            "raw_phone": phone.strip(),
            "phone_code_hash": getattr(result, "phone_code_hash", None),
        }
        return True, "کد تأیید پیامک شد."

    def verify_code(self, code: str):
        """مرحله ۲: تأیید کد و تکمیل لاگین."""
        try:
            return self._w.run(self._verify_code(code))
        except Exception as e:
            return False, f"خطا: {e}", None

    async def _verify_code(self, code: str):
        from rubpy.crypto import Crypto as RubCrypto
        try:
            from Crypto.PublicKey import RSA
            from Crypto.Signature import pkcs1_15
        except Exception:
            RSA = pkcs1_15 = None

        c = self._client
        phone = self._pending["phone"]
        public_key, c.private_key = RubCrypto.create_keys()
        signed = await c.sign_in(
            phone_code=code.strip(),
            phone_number=phone,
            phone_code_hash=self._pending["phone_code_hash"],
            public_key=public_key,
        )
        if getattr(signed, "status", None) != "OK":
            return False, f"کد نامعتبر است (وضعیت: {getattr(signed,'status','?')}).", None

        signed.auth = RubCrypto.decrypt_RSA_OAEP(c.private_key, signed.auth)
        c.key = RubCrypto.passphrase(signed.auth)
        c.auth = signed.auth
        c.decode_auth = RubCrypto.decode_auth(c.auth)
        if RSA is not None and c.private_key:
            c.import_key = pkcs1_15.new(RSA.import_key(c.private_key.encode()))
        c.session.insert(
            auth=c.auth,
            guid=signed.user.user_guid,
            user_agent=c.user_agent,
            phone_number=signed.user.phone,
            private_key=c.private_key,
        )
        await c.register_device(device_model=c.name)
        try:
            await c.disconnect()
        except Exception:
            pass
        return True, "ورود موفق بود.", self._pending.get("raw_phone")

    def logout(self):
        try:
            for f in store.sessions_dir().glob("rubika*"):
                f.unlink(missing_ok=True)
            return True, "خروج انجام شد."
        except Exception as e:
            return False, f"خطا: {e}"


# ============================================================
#   بله (aiobale) — اکانت شخصی
# ============================================================
class BaleLogin:
    def __init__(self):
        self._w = _AsyncWorker()
        self._client = None
        self._pending = {}

    def _session_file(self) -> str:
        return str(store.sessions_dir() / "bale.bale")

    def send_code(self, phone: str):
        try:
            return self._w.run(self._send_code(phone))
        except Exception as e:
            return False, f"خطا: {e}"

    async def _send_code(self, phone: str):
        from aiobale import Client
        norm = _normalize_ir(phone)
        self._client = Client(session_file=self._session_file())
        await self._client.connect()
        resp = await self._client.start_phone_auth(int(norm))
        self._pending = {
            "raw_phone": phone.strip(),
            "transaction_hash": getattr(resp, "transaction_hash", None),
        }
        return True, "کد تأیید پیامک شد."

    def verify_code(self, code: str):
        try:
            return self._w.run(self._verify_code(code))
        except Exception as e:
            return False, f"خطا: {e}", None

    async def _verify_code(self, code: str):
        resp = await self._client.validate_code(
            transaction_hash=self._pending["transaction_hash"],
            code=code.strip(),
        )
        # نشست به‌صورت خودکار در session_file ذخیره می‌شود
        try:
            await self._client.disconnect()
        except Exception:
            pass
        return True, "ورود موفق بود.", self._pending.get("raw_phone")

    def logout(self):
        try:
            Path(self._session_file()).unlink(missing_ok=True)
            return True, "خروج انجام شد."
        except Exception as e:
            return False, f"خطا: {e}"


# نمونه‌های سراسری (تا لوپ async زنده بماند)
rubika_login = RubikaLogin()
bale_login = BaleLogin()
