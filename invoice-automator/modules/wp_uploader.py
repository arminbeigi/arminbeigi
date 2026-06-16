"""
آپلود PDF به وردپرس و ساخت لینک کوتاه اختصاصی
"""

import os
import re
import requests
import logging
import hashlib
import time

logger = logging.getLogger(__name__)


class WordPressUploader:
    def __init__(self, config: dict):
        self.base_url = config["url"].rstrip("/")
        self.username = config["username"]
        self.app_password = config["app_password"]
        self.api_url = f"{self.base_url}/wp-json/wp/v2"

    def upload_pdf(self, pdf_path: str, invoice_serial: str = None) -> dict:
        """
        آپلود PDF به مدیا وردپرس

        Returns:
            dict: {url, id, link, slug}
        """
        filename = os.path.basename(pdf_path)

        # نام فایل اختصاصی با شماره فاکتور
        if invoice_serial:
            ext = os.path.splitext(filename)[1]
            filename = f"invoice-{invoice_serial}{ext}"

        logger.info(f"آپلود PDF به وردپرس: {filename}")

        with open(pdf_path, "rb") as f:
            file_data = f.read()

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "User-Agent": "Mozilla/5.0 InvoiceBot/1.0",
        }

        response = requests.post(
            f"{self.api_url}/media",
            headers=headers,
            data=file_data,
            auth=(self.username, self.app_password),
            timeout=60,
        )

        if response.status_code not in (200, 201):
            logger.error(f"خطا در آپلود: {response.status_code} - {response.text}")
            raise Exception(f"آپلود به وردپرس ناموفق: {response.status_code}")

        media = response.json()
        result = {
            "id": media["id"],
            "url": media["source_url"],
            "link": media.get("link", media["source_url"]),
            "slug": media.get("slug", ""),
        }

        logger.info(f"آپلود موفق - URL: {result['url']}")
        return result

    def create_short_link(self, target_url: str, invoice_serial: str = None) -> str:
        """
        ساخت لینک کوتاه اختصاصی

        روش ۱: استفاده از صفحه ریدایرکت وردپرس
        روش ۲: اگر افزونه Pretty Links یا YOURLS نصب باشد
        """
        # --- روش ۱: ساخت صفحه ریدایرکت ---
        slug = f"inv-{invoice_serial}" if invoice_serial else f"inv-{int(time.time())}"

        # ساخت یک صفحه با ریدایرکت به فایل PDF
        redirect_html = f"""<!-- wp:paragraph -->
<p><a href="{target_url}">دانلود پیش فاکتور</a></p>
<!-- /wp:paragraph -->
<script>window.location.href="{target_url}";</script>"""

        page_data = {
            "title": f"پیش فاکتور {invoice_serial or ''}",
            "slug": slug,
            "status": "publish",
            "content": redirect_html,
            "template": "",  # بدون قالب (ریدایرکت سریع)
        }

        response = requests.post(
            f"{self.api_url}/pages",
            json=page_data,
            headers={"User-Agent": "Mozilla/5.0 InvoiceBot/1.0"},
            auth=(self.username, self.app_password),
            timeout=30,
        )

        if response.status_code in (200, 201):
            page = response.json()
            # از لینک واقعی که وردپرس برگردانده استفاده کن (ممکن است slug تغییر کرده باشد)
            short_link = page.get("link") or f"{self.base_url}/{slug}"
            # اگر صفحه publish نشده باشد (مثلاً draft)، لینک کار نمی‌کند → لینک مستقیم
            if page.get("status") != "publish":
                logger.warning("صفحه ریدایرکت publish نشد، از لینک مستقیم استفاده می‌شود")
                return target_url
            # تأیید نهایی: مطمئن شو لینک کوتاه واقعاً باز می‌شود (۲۰۰)؛ وگرنه لینک مستقیم
            if self._link_works(short_link):
                logger.info(f"لینک کوتاه ساخته شد: {short_link}")
                return short_link
            logger.warning(f"لینک کوتاه {short_link} باز نشد (۴۰۴)، از لینک مستقیم استفاده می‌شود")
            return target_url

        # --- روش ۲: فقط لینک مستقیم ---
        logger.warning("ساخت صفحه ریدایرکت ناموفق، از لینک مستقیم استفاده می‌شود")
        return target_url

    def _link_works(self, url: str) -> bool:
        """بررسی اینکه لینک واقعاً باز می‌شود (HTTP 200)"""
        try:
            r = requests.get(
                url,
                headers={"User-Agent": "Mozilla/5.0 InvoiceBot/1.0"},
                timeout=15,
                allow_redirects=True,
            )
            return r.status_code == 200
        except Exception as e:
            logger.debug(f"بررسی لینک کوتاه: {e}")
            return False

    def create_short_link_yourls(self, target_url: str, yourls_url: str,
                                  yourls_signature: str, keyword: str = None) -> str:
        """ساخت لینک کوتاه با YOURLS"""
        params = {
            "signature": yourls_signature,
            "action": "shorturl",
            "url": target_url,
            "format": "json",
        }
        if keyword:
            params["keyword"] = keyword

        response = requests.get(yourls_url + "/yourls-api.php", params=params, timeout=15)
        if response.status_code == 200:
            data = response.json()
            return data.get("shorturl", target_url)

        return target_url

    def upload_and_get_short_link(self, pdf_path: str, invoice_serial: str = None,
                                   shortener_config: dict = None) -> str:
        """آپلود + ساخت لینک کوتاه در یک مرحله"""
        # آپلود
        media = self.upload_pdf(pdf_path, invoice_serial)

        # لینک کوتاه
        method = (shortener_config or {}).get("method", "wordpress")

        if method == "yourls":
            return self.create_short_link_yourls(
                media["url"],
                shortener_config["yourls_url"],
                shortener_config["yourls_signature"],
                keyword=f"inv{invoice_serial}" if invoice_serial else None,
            )
        else:
            return self.create_short_link(media["url"], invoice_serial)
