#!/usr/bin/env python3
"""
آپلود خودکار لیست قیمت به shofazh.com/price-lists/

فایل PDF یا Excel را در پوشه "لیست قیمت" روی دسکتاپ بگذارید.
سیستم آن را مستقیم به وردپرس آپلود می‌کند.
"""

import sys, time, base64, logging, mimetypes, json
from datetime import datetime
from pathlib import Path

import requests, yaml
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

BASE_DIR   = Path(__file__).parent
DB_FILE    = BASE_DIR / "uploaded_files.json"
ALLOWED    = {".pdf", ".xlsx", ".xls", ".csv"}


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

def load_db():
    return json.loads(DB_FILE.read_text(encoding="utf-8")) if DB_FILE.exists() else {}

def save_db(db):
    DB_FILE.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")


class WP:
    def __init__(self, cfg):
        self.base = cfg["url"].rstrip("/")
        token = base64.b64encode(f"{cfg['username']}:{cfg['app_password']}".encode()).decode()
        self.auth = {"Authorization": f"Basic {token}"}

    def upload(self, path: Path) -> dict:
        mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        with open(path, "rb") as f:
            r = requests.post(
                f"{self.base}/wp-json/wp/v2/media",
                headers={**self.auth, "Content-Disposition": f'attachment; filename="{path.name}"'},
                files={"file": (path.name, f, mime)},
                timeout=120,
            )
        r.raise_for_status()
        d = r.json()
        return {"id": d["id"], "url": d["source_url"]}

    def get_page(self, slug) -> tuple[int, str]:
        r = requests.get(f"{self.base}/wp-json/wp/v2/pages",
                         headers=self.auth, params={"slug": slug, "per_page": 1}, timeout=30)
        r.raise_for_status()
        p = r.json()[0]
        return p["id"], p.get("content", {}).get("raw", "")

    def update_page(self, page_id, content):
        r = requests.post(f"{self.base}/wp-json/wp/v2/pages/{page_id}",
                          headers={**self.auth, "Content-Type": "application/json"},
                          json={"content": content}, timeout=30)
        r.raise_for_status()


class Handler(FileSystemEventHandler):
    def __init__(self, cfg):
        self.wp      = WP(cfg["wordpress"])
        self.slug    = cfg["price_list_page_slug"]
        self.watch   = Path(cfg["folders"]["watch"])
        self.db      = load_db()
        self._page   = None
        self.log     = logging.getLogger("PriceList")

    def _page_cached(self):
        if not self._page:
            self._page = self.wp.get_page(self.slug)
            self.log.info(f"صفحه پیدا شد — ID: {self._page[0]}")
        return self._page

    def _key(self, p: Path):
        try:    return str(p.relative_to(self.watch))
        except: return p.name

    def process(self, path: Path):
        if path.suffix.lower() not in ALLOWED or not path.exists():
            return
        key = self._key(path)
        if key in self.db:
            self.log.info(f"⏭  قبلاً آپلود شده: {path.name}")
            return

        self.log.info(f"📤 آپلود: {path.name}")
        try:
            media = self.wp.upload(path)
            self.log.info(f"✅ آپلود شد: {media['url']}")

            page_id, content = self._page_cached()
            size_kb = path.stat().st_size // 1024
            ext     = path.suffix.upper().lstrip(".")
            date    = datetime.now().strftime("%Y/%m/%d")
            entry   = (f'\n<p>📄 <a href="{media["url"]}" target="_blank">'
                       f'{path.stem}</a>'
                       f' <small>({ext} — {size_kb} KB — {date})</small></p>\n')
            self.wp.update_page(page_id, content + entry)
            self._page = (page_id, content + entry)
            self.log.info("✅ صفحه price-lists به‌روز شد")

            self.db[key] = {"url": media["url"], "date": date}
            save_db(self.db)

        except Exception as e:
            self.log.error(f"❌ خطا: {e}")

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
    log = logging.getLogger("PriceList")

    watch = Path(cfg["folders"]["watch"])
    watch.mkdir(parents=True, exist_ok=True)

    log.info("=" * 50)
    log.info("🚀 سیستم آپلود لیست قیمت")
    log.info(f"📂 پوشه: {watch}")
    log.info(f"🌐 سایت: {cfg['wordpress']['url']}/{cfg['price_list_page_slug']}/")
    log.info("=" * 50)

    handler = Handler(cfg)

    # فایل‌های موجود
    existing = [f for f in watch.rglob("*") if f.is_file() and f.suffix.lower() in ALLOWED]
    new_files = [f for f in existing if handler._key(f) not in handler.db]
    if new_files:
        log.info(f"📦 {len(new_files)} فایل جدید پیدا شد")
        for f in new_files:
            handler.process(f)
    else:
        log.info(f"✅ همه {len(existing)} فایل قبلاً آپلود شده‌اند")

    observer = Observer()
    observer.schedule(handler, str(watch), recursive=True)
    observer.start()
    log.info("👀 در انتظار فایل جدید...")

    try:
        while True:
            time.sleep(5)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


if __name__ == "__main__":
    main()
