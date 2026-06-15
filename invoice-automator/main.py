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
import json
import queue
import shutil
import yaml
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
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
from modules.bale_user_sender import BaleUserSender
from modules.rubika_sender import RubikaSender

logger = logging.getLogger("InvoiceBot")

# ── محافظ ضدِ ارسال تکراری ──────────────────────
# هر فاکتور فقط یک‌بار ارسال می‌شود. کلیدهای ارسال‌شده در این فایل ذخیره می‌شوند.
_registry_lock = threading.Lock()
_REGISTRY_FILE = BASE_DIR / "logs" / "sent_invoices.json"
_in_progress: set = set()


def _load_sent() -> set:
    """خواندن لیست فاکتورهای ارسال‌شده از فایل"""
    try:
        return set(json.loads(_REGISTRY_FILE.read_text(encoding="utf-8")))
    except Exception:
        return set()


def _mark_sent(key: str):
    """ثبت یک فاکتور به‌عنوان ارسال‌شده"""
    with _registry_lock:
        sent = _load_sent()
        sent.add(key)
        _REGISTRY_FILE.parent.mkdir(exist_ok=True)
        _REGISTRY_FILE.write_text(
            json.dumps(sorted(sent), ensure_ascii=False), encoding="utf-8"
        )


def _claim(key: str) -> bool:
    """رزرو یک فاکتور برای پردازش. اگر قبلاً ارسال شده یا در حال ارسال است → False"""
    with _registry_lock:
        if key in _in_progress or key in _load_sent():
            return False
        _in_progress.add(key)
        return True


def _release(key: str):
    """آزادسازی رزرو فاکتور (در پایان پردازش)"""
    with _registry_lock:
        _in_progress.discard(key)


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

    # تبدیل مسیر نسبی به مطلق
    pdf_path = str(Path(pdf_path).resolve())
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

    # ── محافظ ضدِ تکرار: هر فاکتور فقط یک‌بار ارسال شود ──
    dedup_key = serial or os.path.basename(pdf_path)
    if not _claim(dedup_key):
        logger.warning(f"⏭️ فاکتور {dedup_key} قبلاً ارسال شده — دوباره ارسال نشد")
        return report

    try:
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

        # ── اگر لینک ساخته نشد، هیچ پیامی ارسال نکن ──
        # (تا مشتری پیامک/پیام بدونِ لینک نگیرد. فایل برای تلاش مجدد باقی می‌ماند.)
        if not short_link:
            logger.error(
                "⛔ لینک دانلود ساخته نشد (خطای وردپرس) — هیچ پیامی ارسال نشد. "
                "فایل در پوشه باقی ماند؛ پس از رفع مشکل وردپرس، دوباره برنامه را اجرا کنید."
            )
            report["fail"].append("aborted: no_link")
            logger.info(f"📊 {len(report['ok'])}/5 موفق | {len(report['fail'])} خطا")
            logger.info(f"{'═'*50}\n")
            return report

        # ── ۳-۶. ارسال موازی (پیامک، واتساپ، بله، روبیکا) ──
        def send_sms():
            sms = KavenegarSMS(config["kavenegar"])
            return "sms", sms.send_invoice_sms(phone, info, short_link)

        def send_whatsapp():
            wa = WhatsAppSender(config.get("whatsapp", {}))
            r = wa.send_invoice(phone, pdf_path, info, short_link)
            if r.get("fallback_link"):
                logger.info(f"📎 واتساپ دستی: {r['fallback_link']}")
            return "whatsapp", r

        def send_bale():
            # اولویت ۱: اکانت شخصی (چت واقعی دو‌طرفه)
            bale_config = config.get("bale", {})
            if bale_config.get("user_session_file"):
                bale = BaleUserSender(bale_config)
                result = bale.send_invoice(phone, pdf_path, info, short_link)
                key = "bale_user" if result.get("success") else "bale"
            else:
                # اولویت ۲: ربات (فقط برای مشتری‌های که ربات را استارت کردند)
                bale = BaleSender(bale_config)
                result = bale.send_invoice(phone, pdf_path, info, short_link)
                key = "bale"
            return key, result

        def send_rubika():
            rubika = RubikaSender(config.get("rubika", {}))
            return "rubika", rubika.send_invoice(phone, pdf_path, info, short_link)

        labels = {"sms": "پیامک", "whatsapp": "واتساپ", "bale": "بله (ربات)", "bale_user": "بله (شخصی)", "rubika": "روبیکا"}

        def record(key, r):
            label = labels.get(key, key)
            if r.get("success"):
                logger.info(f"✅ {label} → {phone}")
                report["ok"].append(key)
            else:
                logger.warning(f"⚠️ {label}: {r.get('error')}")
                report["fail"].append(f"{key}: {r.get('error','')}")

        # پیامک، واتساپ، روبیکا را موازی می‌فرستیم
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(fn): fn.__name__ for fn in (send_sms, send_whatsapp, send_rubika)}
            for future in as_completed(futures):
                try:
                    key, r = future.result()
                    record(key, r)
                except Exception as e:
                    fn_name = futures[future]
                    logger.error(f"❌ {fn_name}: {e}")
                    report["fail"].append(f"{fn_name}: {e}")

        # بله را در thread اصلی می‌فرستیم (aiobale در thread جانبی session را نمی‌خواند)
        try:
            key, r = send_bale()
            record(key, r)
        except Exception as e:
            logger.error(f"❌ send_bale: {e}")
            report["fail"].append(f"bale: {e}")

        # ── ۷. ثبت ارسال موفق (محافظ ضدِ تکرار) + انتقال فایل ──
        _mark_sent(dedup_key)

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
    finally:
        _release(dedup_key)


class InvoiceHandler(FileSystemEventHandler):
    """فقط مسیر فایل را به صف می‌دهد؛ پردازش در thread اصلی انجام می‌شود
    (چون aiobale برای خواندن session به thread اصلی نیاز دارد)."""

    def __init__(self, watch_dir, work_queue):
        self.watch_dir = str(Path(watch_dir).resolve())
        self.queue = work_queue

    def on_created(self, event):
        self._enqueue(event.src_path, event.is_directory)

    def on_moved(self, event):
        self._enqueue(event.dest_path, event.is_directory)

    def _enqueue(self, path, is_dir):
        if is_dir or not path.lower().endswith(".pdf"):
            return
        if str(Path(path).parent.resolve()) != self.watch_dir:
            return
        self.queue.put(path)


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

    # پردازش PDF های موجود (در thread اصلی)
    for pdf in sorted(watch_dir.glob("*.pdf")):
        process_invoice(str(pdf), config)

    # نظارت مداوم: watchdog فقط مسیر را به صف می‌دهد،
    # پردازش واقعی اینجا در thread اصلی انجام می‌شود
    work_queue = queue.Queue()
    observer = Observer()
    observer.schedule(InvoiceHandler(watch_dir, work_queue), str(watch_dir), recursive=False)
    observer.start()

    try:
        while True:
            try:
                path = work_queue.get(timeout=1)
            except queue.Empty:
                continue
            time.sleep(1)  # صبر تا کپی فایل کامل شود
            if os.path.exists(path):
                try:
                    process_invoice(path, config)
                except Exception as e:
                    logger.error(f"❌ خطا: {e}")
    except KeyboardInterrupt:
        print("\n⏹️ متوقف شد.")
        observer.stop()
    observer.join()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        config = load_config()
        setup_logging("INFO")
        pdf_path = str(Path(sys.argv[1]).resolve())
        process_invoice(pdf_path, config)
    else:
        main()
