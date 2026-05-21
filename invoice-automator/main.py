#!/usr/bin/env python3
"""
🔄 سیستم ارسال خودکار پیش فاکتور
===================================
فایل PDF را با نام شماره‌تلفن مشتری در پوشه watch_folder قرار دهید:

  09122724191.pdf
  09122724191-1821.pdf         (شماره تلفن - شماره فاکتور)
  مشیری-09122724191-1821.pdf   (نام - شماره تلفن - شماره فاکتور)

سیستم به صورت خودکار:
  ✅ PDF را در وردپرس آپلود و لینک کوتاه می‌سازد
  ✅ لینک را از طریق کاوه‌نگار پیامک می‌کند
  ✅ PDF را به واتساپ، بله و روبیکا ارسال می‌کند
"""

import os
import sys
import time
import shutil
import yaml
import logging
from datetime import datetime
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

from modules.pdf_parser import extract_invoice_data, format_phone_international
from modules.wp_uploader import WordPressUploader
from modules.sms_kavenegar import KavenegarSMS
from modules.whatsapp_sender import WhatsAppSender
from modules.bale_sender import BaleSender
from modules.rubika_sender import RubikaSender

logger = logging.getLogger("InvoiceBot")


def setup_logging(level="INFO"):
    log_dir = BASE_DIR / "logs"
    log_dir.mkdir(exist_ok=True)
    logging.basicConfig(
        level=getattr(logging, level),
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(log_dir / f"{datetime.now():%Y%m%d}.log", encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def load_config() -> dict:
    config_path = BASE_DIR / "config.yaml"
    with open(config_path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def process_invoice(pdf_path: str, config: dict) -> dict:
    """پردازش کامل یک فایل PDF"""

    report = {"file": pdf_path, "ok": [], "fail": []}

    # ── ۱. استخراج اطلاعات از نام فایل ──
    logger.info(f"{'═'*50}")
    logger.info(f"📄 {os.path.basename(pdf_path)}")

    try:
        info = extract_invoice_data(pdf_path)
    except ValueError as e:
        logger.error(f"❌ {e}")
        return report

    phone = info["phone"]
    serial = info.get("serial", "")
    name = info.get("name", "مشتری گرامی")

    # ── ۲. آپلود وردپرس + لینک کوتاه ──
    short_link = ""
    try:
        wp = WordPressUploader(config["wordpress"])
        short_link = wp.upload_and_get_short_link(pdf_path, serial, config.get("shortener"))
        logger.info(f"✅ لینک: {short_link}")
        report["ok"].append("wordpress")
    except Exception as e:
        logger.error(f"❌ وردپرس: {e}")
        report["fail"].append(f"wordpress: {e}")

    # ── ۳. پیامک کاوه‌نگار ──
    try:
        sms = KavenegarSMS(config["kavenegar"])
        r = sms.send_invoice_sms(phone, info, short_link)
        if r.get("success"):
            logger.info(f"✅ پیامک → {phone}")
            report["ok"].append("sms")
        else:
            logger.warning(f"⚠️ پیامک: {r.get('error')}")
            report["fail"].append(f"sms: {r.get('error')}")
    except Exception as e:
        logger.error(f"❌ پیامک: {e}")
        report["fail"].append(f"sms: {e}")

    # ── ۴. واتساپ ──
    try:
        wa = WhatsAppSender(config.get("whatsapp", {}))
        r = wa.send_invoice(phone, pdf_path, info, short_link)
        if r.get("success"):
            logger.info(f"✅ واتساپ → {phone}")
            report["ok"].append("whatsapp")
        else:
            if r.get("fallback_link"):
                logger.info(f"📎 واتساپ دستی: {r['fallback_link']}")
            report["fail"].append(f"whatsapp: {r.get('error','')}")
    except Exception as e:
        logger.error(f"❌ واتساپ: {e}")
        report["fail"].append(f"whatsapp: {e}")

    # ── ۵. بله ──
    try:
        bale = BaleSender(config.get("bale", {}))
        r = bale.send_invoice(phone, pdf_path, info, short_link)
        if r.get("success"):
            logger.info(f"✅ بله → {phone}")
            report["ok"].append("bale")
        else:
            logger.warning(f"⚠️ بله: {r.get('error')}")
            report["fail"].append(f"bale: {r.get('error','')}")
    except Exception as e:
        logger.error(f"❌ بله: {e}")
        report["fail"].append(f"bale: {e}")

    # ── ۶. روبیکا ──
    try:
        rubika = RubikaSender(config.get("rubika", {}))
        r = rubika.send_invoice(phone, pdf_path, info, short_link)
        if r.get("success"):
            logger.info(f"✅ روبیکا → {phone}")
            report["ok"].append("rubika")
        else:
            logger.warning(f"⚠️ روبیکا: {r.get('error')}")
            report["fail"].append(f"rubika: {r.get('error','')}")
    except Exception as e:
        logger.error(f"❌ روبیکا: {e}")
        report["fail"].append(f"rubika: {e}")

    # ── ۷. انتقال فایل ──
    if config.get("general", {}).get("move_after_process", True):
        try:
            dest_dir = BASE_DIR / config["folders"]["processed"]
            dest_dir.mkdir(exist_ok=True)
            dest = dest_dir / os.path.basename(pdf_path)
            shutil.move(pdf_path, str(dest))
            logger.info(f"📁 منتقل شد → {dest.name}")
        except Exception as e:
            logger.warning(f"⚠️ انتقال: {e}")

    logger.info(f"📊 {len(report['ok'])}/5 موفق | {len(report['fail'])} خطا")
    logger.info(f"{'═'*50}\n")
    return report


class InvoiceHandler(FileSystemEventHandler):
    def __init__(self, config):
        self.config = config
        self._done = set()

    def on_created(self, event):
        if event.is_directory or not event.src_path.lower().endswith(".pdf"):
            return
        self._process(event.src_path)

    def on_moved(self, event):
        if event.is_directory or not event.dest_path.lower().endswith(".pdf"):
            return
        self._process(event.dest_path)

    def _process(self, path):
        if path in self._done:
            return
        self._done.add(path)
        time.sleep(1)  # صبر تا کپی کامل شود
        if os.path.exists(path):
            try:
                process_invoice(path, self.config)
            except Exception as e:
                logger.error(f"❌ خطا: {e}")


def main():
    config = load_config()
    setup_logging(config.get("general", {}).get("log_level", "INFO"))

    watch_dir = (BASE_DIR / config["folders"]["watch"]).resolve()
    watch_dir.mkdir(exist_ok=True)

    print(f"""
╔══════════════════════════════════════════════════╗
║     🔄 سیستم ارسال خودکار پیش فاکتور           ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  📂 پوشه نظارت: {str(watch_dir):<32s} ║
║                                                  ║
║  فایل PDF را با این فرمت نامگذاری کنید:         ║
║    09xxxxxxxxx.pdf                               ║
║    09xxxxxxxxx-شماره_فاکتور.pdf                  ║
║                                                  ║
║  سپس فایل را در پوشه بالا قرار دهید.           ║
║  برای توقف: Ctrl+C                              ║
╚══════════════════════════════════════════════════╝
""")

    # پردازش PDF های موجود
    for pdf in sorted(watch_dir.glob("*.pdf")):
        process_invoice(str(pdf), config)

    # نظارت مداوم
    observer = Observer()
    observer.schedule(InvoiceHandler(config), str(watch_dir), recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n⏹️ متوقف شد.")
        observer.stop()
    observer.join()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        config = load_config()
        setup_logging("INFO")
        process_invoice(sys.argv[1], config)
    else:
        main()
