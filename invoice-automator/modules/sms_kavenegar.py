"""
ارسال پیامک از طریق کاوه‌نگار
"""

import requests
import logging

logger = logging.getLogger(__name__)

KAVENEGAR_API_URL = "https://api.kavenegar.com/v1/{api_key}/sms/send.json"


class KavenegarSMS:
    def __init__(self, config: dict):
        self.api_key = config["api_key"]
        self.sender = config.get("sender", "10008663")
        self.template = config.get("template", "پیش فاکتور شماره {invoice_number}: {link}")

    def send_sms(self, phone: str, message: str) -> dict:
        """ارسال پیامک ساده"""
        url = KAVENEGAR_API_URL.format(api_key=self.api_key)

        params = {
            "receptor": phone,
            "sender": self.sender,
            "message": message,
        }

        logger.info(f"ارسال پیامک به {phone}")

        try:
            response = requests.post(url, data=params, timeout=30)
            result = response.json()

            if result.get("return", {}).get("status") == 200:
                logger.info(f"پیامک با موفقیت ارسال شد به {phone}")
                return {"success": True, "data": result}
            else:
                error_msg = result.get("return", {}).get("message", "خطای نامشخص")
                logger.error(f"خطا در ارسال پیامک: {error_msg}")
                return {"success": False, "error": error_msg}

        except Exception as e:
            logger.error(f"خطا در اتصال به کاوه‌نگار: {e}")
            return {"success": False, "error": str(e)}

    def send_invoice_sms(self, phone: str, invoice_data: dict, link: str) -> dict:
        """ارسال پیامک پیش فاکتور با قالب پیش‌فرض"""
        from .pdf_parser import format_amount

        link_line = link if link else "لینک متعاقباً ارسال می‌شود"

        message = self.template.format(
            invoice_number=invoice_data.get("serial", ""),
            total_amount=format_amount(invoice_data.get("total", "")),
            link=link_line,
        )

        return self.send_sms(phone, message)

    def check_status(self, message_id: str) -> dict:
        """بررسی وضعیت ارسال پیامک"""
        url = f"https://api.kavenegar.com/v1/{self.api_key}/sms/status.json"
        params = {"messageid": message_id}

        try:
            response = requests.get(url, params=params, timeout=15)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def get_credit(self) -> str:
        """بررسی اعتبار باقی‌مانده"""
        url = f"https://api.kavenegar.com/v1/{self.api_key}/account/info.json"
        try:
            response = requests.get(url, timeout=15)
            data = response.json()
            remaining = data.get("entries", {}).get("remaincredit", "نامشخص")
            return f"اعتبار باقی‌مانده: {remaining} ریال"
        except Exception as e:
            return f"خطا: {e}"
