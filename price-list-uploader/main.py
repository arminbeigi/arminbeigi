#!/usr/bin/env python3
"""
سیستم همگام‌سازی لیست قیمت با shofazh.com/price-lists/

- هر پوشه داخل watch_folder = یک برند
- فایل‌های جدید خودکار آپلود می‌شوند
- صفحه سایت کاملاً بر اساس پوشه‌ها بازسازی می‌شود
- دیتابیس JSON فایل‌های آپلود شده را نگه می‌دارد
"""

import sys
import time
import shutil
import base64
import logging
import mimetypes
import json
from datetime import datetime
from pathlib import Path

import requests
import yaml
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

BASE_DIR = Path(__file__).parent
DB_FILE = BASE_DIR / "uploaded_files.json"


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
    with open(BASE_DIR / "config.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_db() -> dict:
    if DB_FILE.exists():
        with open(DB_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_db(db: dict):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)


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
                timeout=120,
            )
        resp.raise_for_status()
        data = resp.json()
        return {"id": data["id"], "url": data["source_url"], "title": data.get("title", {}).get("rendered", file_path.stem)}

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

    def update_page_content(self, page_id: int, content: str):
        resp = requests.post(
            f"{self.base}/wp-json/wp/v2/pages/{page_id}",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"content": content},
            timeout=30,
        )
        resp.raise_for_status()


def build_page_html(db: dict, watch_dir: Path, allowed: set) -> str:
    """ساخت HTML کامل صفحه بر اساس ساختار پوشه‌ها"""
    html = ""
    brands = {}

    for key, info in db.items():
        brand = info.get("brand", "عمومی")
        brands.setdefault(brand, []).append(info)

    # مرتب‌سازی برندها
    for brand in sorted(brands.keys()):
        files = brands[brand]
        html += f'\n<h3>📁 {brand}</h3>\n<ul>\n'
        for f in sorted(files, key=lambda x: x["name"]):
            size_kb = f.get("size_kb", 0)
            date = f.get("date", "")
            ext = Path(f["name"]).suffix.upper().lstrip(".")
            html += (
                f'  <li>📄 <a href="{f["url"]}" target="_blank" rel="noopener">'
                f'{f["name"]}</a>'
                f' <small>({ext}'
                f'{" — " + str(size_kb) + " KB" if size_kb else ""}'
                f'{" — " + date if date else ""})</small></li>\n'
            )
        html += '</ul>\n'

    if not html:
        html = "<p>لیست قیمتی موجود نیست.</p>"

    return html


class PriceListHandler(FileSystemEventHandler):
    def __init__(self, cfg):
        self.cfg = cfg
        self.wp = WordPressUploader(cfg["wordpress"])
        self.watch_dir = BASE_DIR / cfg["folders"]["watch"]
        self.allowed = set(cfg.get("allowed_extensions", [".pdf", ".xlsx", ".xls", ".csv"]))
        self._page_id = None
        self.logger = logging.getLogger("PriceListUploader")
        self.db = load_db()

    def _page_id_cached(self):
        if self._page_id is None:
            self._page_id = self.wp.get_page_id(self.cfg["price_list_page_slug"])
            self.logger.info(f"آی‌دی صفحه: {self._page_id}")
        return self._page_id

    def _db_key(self, file_path: Path) -> str:
        try:
            return str(file_path.relative_to(self.watch_dir))
        except ValueError:
            return file_path.name

    def _brand(self, file_path: Path) -> str:
        try:
            rel = file_path.relative_to(self.watch_dir)
            return rel.parts[0] if len(rel.parts) > 1 else "عمومی"
        except ValueError:
            return "عمومی"

    def rebuild_page(self):
        try:
            page_id = self._page_id_cached()
            content = build_page_html(self.db, self.watch_dir, self.allowed)
            self.wp.update_page_content(page_id, content)
            self.logger.info(f"✅ صفحه price-lists بازسازی شد ({len(self.db)} فایل)")
        except Exception as e:
            self.logger.error(f"خطا در بازسازی صفحه: {e}")

    def process(self, file_path: Path):
        if file_path.suffix.lower() not in self.allowed:
            return
        if not file_path.exists():
            return

        key = self._db_key(file_path)
        brand = self._brand(file_path)

        # اگر قبلاً آپلود شده، رد شو
        if key in self.db:
            self.logger.info(f"⏭  قبلاً آپلود شده: {file_path.name}")
            return

        self.logger.info(f"📤 آپلود: {file_path.name} (برند: {brand})")
        try:
            media = self.wp.upload_media(file_path)
            size_kb = file_path.stat().st_size // 1024

            self.db[key] = {
                "name": file_path.name,
                "brand": brand,
                "url": media["url"],
                "id": media["id"],
                "size_kb": size_kb,
                "date": datetime.now().strftime("%Y/%m/%d"),
            }
            save_db(self.db)
            self.logger.info(f"✅ آپلود شد: {media['url']}")
            self.rebuild_page()

        except Exception as e:
            self.logger.error(f"❌ خطا در آپلود {file_path.name}: {e}")

    def scan_all(self):
        """اسکن کامل پوشه و آپلود فایل‌های جدید"""
        files = [f for f in self.watch_dir.rglob("*") if f.is_file() and f.suffix.lower() in self.allowed]
        new_files = [f for f in files if self._db_key(f) not in self.db]

        if new_files:
            self.logger.info(f"📦 {len(new_files)} فایل جدید پیدا شد")
            for f in new_files:
                self.process(f)
        else:
            self.logger.info(f"✅ همه {len(files)} فایل قبلاً آپلود شده‌اند")
            if files:
                self.rebuild_page()

    def on_created(self, event):
        if not event.is_directory:
            time.sleep(2)
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
    logger.info("🚀 سیستم همگام‌سازی لیست قیمت")
    logger.info(f"📂 پوشه: {watch_dir}")
    logger.info(f"🌐 سایت: {cfg['wordpress']['url']}/{cfg['price_list_page_slug']}/")
    logger.info("=" * 50)

    handler = PriceListHandler(cfg)
    handler.scan_all()

    observer = Observer()
    observer.schedule(handler, str(watch_dir), recursive=True)
    observer.start()
    logger.info("👀 در انتظار فایل جدید...")

    try:
        while True:
            time.sleep(5)
    except KeyboardInterrupt:
        observer.stop()
        logger.info("سرویس متوقف شد.")
    observer.join()


if __name__ == "__main__":
    main()
