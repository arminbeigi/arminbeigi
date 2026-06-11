#!/usr/bin/env python3
"""
آپلود خودکار لیست قیمت به صفحه shofazh.com/price-lists/

فایل PDF/Excel را در پوشه watch_folder بگذارید.
سیستم آن را به مدیا وردپرس آپلود می‌کند و لینک دانلود را
به صفحه price-lists اضافه می‌کند.
"""

import os
import sys
import time
import shutil
import base64
import logging
import mimetypes
from datetime import datetime
from pathlib import Path

import requests
import yaml
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

BASE_DIR = Path(__file__).parent


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


def load_config():
    path = BASE_DIR / "config.yaml"
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


class WordPressUploader:
    def __init__(self, cfg):
        self.base = cfg["url"].rstrip("/")
        creds = f"{cfg['username']}:{cfg['app_password']}"
        token = base64.b64encode(creds.encode()).decode()
        self.headers = {"Authorization": f"Basic {token}"}

    def upload_media(self, file_path: Path) -> dict:
        mime = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        with open(file_path, "rb") as f:
            resp = requests.post(
                f"{self.base}/wp-json/wp/v2/media",
                headers={**self.headers, "Content-Disposition": f'attachment; filename="{file_path.name}"'},
                files={"file": (file_path.name, f, mime)},
                timeout=60,
            )
        resp.raise_for_status()
        data = resp.json()
        return {"id": data["id"], "url": data["source_url"], "title": data.get("title", {}).get("rendered", file_path.name)}

    def get_page_id(self, slug: str) -> int:
        resp = requests.get(
            f"{self.base}/wp-json/wp/v2/pages",
            headers=self.headers,
            params={"slug": slug, "per_page": 1},
            timeout=30,
        )
        resp.raise_for_status()
        pages = resp.json()
        if not pages:
            raise ValueError(f"صفحه‌ای با slug '{slug}' پیدا نشد")
        return pages[0]["id"]

    def get_page_content(self, page_id: int) -> str:
        resp = requests.get(
            f"{self.base}/wp-json/wp/v2/pages/{page_id}",
            headers=self.headers,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("content", {}).get("raw", "")

    def update_page_content(self, page_id: int, content: str):
        resp = requests.post(
            f"{self.base}/wp-json/wp/v2/pages/{page_id}",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"content": content},
            timeout=30,
        )
        resp.raise_for_status()


def build_file_entry(media: dict, file_path: Path) -> str:
    now = datetime.now().strftime("%Y/%m/%d")
    size_kb = file_path.stat().st_size // 1024
    ext = file_path.suffix.upper().lstrip(".")
    return (
        f'\n<p>📄 <a href="{media["url"]}" target="_blank" rel="noopener">'
        f'{media["title"]}</a> '
        f'<small>({ext} — {size_kb} KB — {now})</small></p>\n'
    )


class PriceListHandler(FileSystemEventHandler):
    def __init__(self, cfg):
        self.cfg = cfg
        self.wp = WordPressUploader(cfg["wordpress"])
        self.watch_dir = BASE_DIR / cfg["folders"]["watch"]
        self.uploaded_dir = BASE_DIR / cfg["folders"]["uploaded"]
        self.uploaded_dir.mkdir(exist_ok=True)
        self.allowed = set(cfg.get("allowed_extensions", [".pdf", ".xlsx", ".xls", ".csv"]))
        self._page_id = None
        self.logger = logging.getLogger("PriceListUploader")

    def _page_id_cached(self):
        if self._page_id is None:
            self._page_id = self.wp.get_page_id(self.cfg["price_list_page_slug"])
            self.logger.info(f"آی‌دی صفحه price-lists: {self._page_id}")
        return self._page_id

    def process(self, file_path: Path):
        if file_path.suffix.lower() not in self.allowed:
            return
        if not file_path.exists():
            return

        self.logger.info(f"فایل جدید: {file_path.name}")
        try:
            media = self.wp.upload_media(file_path)
            self.logger.info(f"آپلود شد: {media['url']}")

            page_id = self._page_id_cached()
            content = self.wp.get_page_content(page_id)
            entry = build_file_entry(media, file_path)
            new_content = content + entry
            self.wp.update_page_content(page_id, new_content)
            self.logger.info(f"صفحه price-lists به‌روز شد")

            if self.cfg["general"].get("move_after_upload"):
                dest = self.uploaded_dir / file_path.name
                shutil.move(str(file_path), str(dest))
                self.logger.info(f"فایل منتقل شد به: {dest}")

        except Exception as e:
            self.logger.error(f"خطا در پردازش {file_path.name}: {e}")

    def on_created(self, event):
        if not event.is_directory:
            time.sleep(1)  # صبر تا فایل کامل کپی شود
            self.process(Path(event.src_path))

    def on_moved(self, event):
        if not event.is_directory:
            time.sleep(1)
            self.process(Path(event.dest_path))


def main():
    cfg = load_config()
    setup_logging(cfg["general"].get("log_level", "INFO"))
    logger = logging.getLogger("PriceListUploader")

    watch_dir = BASE_DIR / cfg["folders"]["watch"]
    watch_dir.mkdir(exist_ok=True)

    logger.info("=" * 50)
    logger.info("🚀 سیستم آپلود لیست قیمت شروع شد")
    logger.info(f"📂 پوشه زیر نظر: {watch_dir}")
    logger.info(f"🌐 سایت: {cfg['wordpress']['url']}")
    logger.info(f"📄 صفحه مقصد: /{cfg['price_list_page_slug']}/")
    logger.info("=" * 50)

    handler = PriceListHandler(cfg)

    # پردازش فایل‌های موجود در پوشه
    existing = list(watch_dir.glob("*"))
    if existing:
        logger.info(f"{len(existing)} فایل موجود پیدا شد، در حال پردازش...")
        for f in existing:
            if f.is_file():
                handler.process(f)

    observer = Observer()
    observer.schedule(handler, str(watch_dir), recursive=False)
    observer.start()
    logger.info("✅ در انتظار فایل جدید...")

    try:
        while True:
            time.sleep(5)
    except KeyboardInterrupt:
        observer.stop()
        logger.info("سرویس متوقف شد.")
    observer.join()


if __name__ == "__main__":
    main()
