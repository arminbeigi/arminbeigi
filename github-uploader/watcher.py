#!/usr/bin/env python3
"""
📤 آپلود خودکار فایل به سایت گیت‌هاب پیج
============================================
هر فایلی که داخل زیرپوشه‌های watch_folder بذاری،
به صورت خودکار روی سایت آپلود می‌شه.

ساختار:
  watch_folder/
  ├── جی پلاس/
  │   └── catalog.pdf   ← آپلود به: brands/جی پلاس/catalog.pdf
  └── شوفاژکار/
      └── price.pdf     ← آپلود به: brands/شوفاژکار/price.pdf
"""

import os
import sys
import time
import logging
import base64
from pathlib import Path
from datetime import datetime

import yaml
import requests
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

BASE_DIR = Path(__file__).parent


def setup_logging(level: str = "INFO"):
    log_dir = BASE_DIR / "logs"
    log_dir.mkdir(exist_ok=True)
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(
                log_dir / f"{datetime.now():%Y%m%d}.log", encoding="utf-8"
            ),
            logging.StreamHandler(sys.stdout),
        ],
    )


def load_config() -> dict:
    with open(BASE_DIR / "config.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def upload_file(local_path: Path, config: dict) -> bool:
    """آپلود یک فایل از مک به گیت‌هاب از طریق API"""
    gh = config["github"]
    watch_root = Path(config["watch"]["folder"]).expanduser().resolve()
    prefix = gh.get("dest_prefix", "").strip("/")

    rel = local_path.relative_to(watch_root)
    dest = f"{prefix}/{rel}".replace("\\", "/") if prefix else str(rel).replace("\\", "/")

    url = f"https://api.github.com/repos/{gh['owner']}/{gh['repo']}/contents/{dest}"
    headers = {
        "Authorization": f"token {gh['token']}",
        "Accept": "application/vnd.github.v3+json",
    }

    with open(local_path, "rb") as f:
        content = base64.b64encode(f.read()).decode()

    # اگه فایل قبلاً وجود داشته باشه، SHA لازمه
    r = requests.get(url, headers=headers, params={"ref": gh["branch"]}, timeout=15)
    sha = r.json().get("sha") if r.status_code == 200 else None

    payload: dict = {
        "message": f"{'Update' if sha else 'Add'} {dest}",
        "content": content,
        "branch": gh["branch"],
    }
    if sha:
        payload["sha"] = sha

    r = requests.put(url, json=payload, headers=headers, timeout=60)

    if r.status_code in (200, 201):
        logging.info(f"✅ آپلود شد → {dest}")
        return True

    logging.error(f"❌ خطا در آپلود {dest}: {r.status_code} — {r.text[:300]}")
    return False


class UploadHandler(FileSystemEventHandler):
    def __init__(self, config: dict):
        self.config = config
        self.watch_root = Path(config["watch"]["folder"]).expanduser().resolve()
        self.extensions = set(
            config.get("general", {}).get("extensions", [".pdf"])
        )
        self._queued: set = set()

    def _eligible(self, path_str: str) -> bool:
        p = Path(path_str).resolve()
        # فقط فایل‌های داخل زیرپوشه‌ها (نه مستقیم کنار watch_folder)
        if p.parent == self.watch_root:
            return False
        return p.suffix.lower() in self.extensions

    def on_created(self, event):
        if not event.is_directory and self._eligible(event.src_path):
            self._schedule(Path(event.src_path))

    def on_moved(self, event):
        if not event.is_directory and self._eligible(event.dest_path):
            self._schedule(Path(event.dest_path))

    def _schedule(self, path: Path):
        key = str(path)
        if key in self._queued:
            return
        self._queued.add(key)
        time.sleep(1.5)  # صبر تا کپی فایل کامل بشه
        if path.exists():
            logging.info(f"📄 فایل جدید: {path.name}  (پوشه: {path.parent.name})")
            try:
                upload_file(path, self.config)
            except Exception as e:
                logging.error(f"❌ خطای آپلود: {e}")
        self._queued.discard(key)


def main():
    config = load_config()
    setup_logging(config.get("general", {}).get("log_level", "INFO"))

    if "YOUR_TOKEN_HERE" in config["github"]["token"]:
        print("⚠️  توکن گیت‌هاب تنظیم نشده!")
        print("   config.yaml رو باز کن و github.token رو پر کن.")
        print("   راهنما: github.com/settings/tokens/new  (دسترسی repo)")
        sys.exit(1)

    watch_dir = Path(config["watch"]["folder"]).expanduser()
    watch_dir.mkdir(parents=True, exist_ok=True)

    # ساخت زیرپوشه‌های برند
    for brand in config.get("brands", []):
        (watch_dir / brand).mkdir(exist_ok=True)

    print(f"""
╔══════════════════════════════════════════════════════════╗
║     📤 آپلود خودکار به سایت گیت‌هاب پیج                ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  📂 پوشه نظارت:                                         ║
║     {str(watch_dir):<54s} ║
║                                                          ║
║  فایل رو داخل پوشه برند مربوطه بذار:                   ║
║    ✔  watch_folder/جی پلاس/catalog.pdf                  ║
║    ✔  watch_folder/شوفاژکار/price-list.pdf              ║
║                                                          ║
║  برای توقف: Ctrl+C                                      ║
╚══════════════════════════════════════════════════════════╝
""")

    observer = Observer()
    observer.schedule(UploadHandler(config), str(watch_dir), recursive=True)
    observer.start()
    logging.info("✅ سیستم نظارت فعال شد.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n⏹️  متوقف شد.")
        observer.stop()
    observer.join()


if __name__ == "__main__":
    main()
