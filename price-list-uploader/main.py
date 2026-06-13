#!/usr/bin/env python3
"""
سیستم همگام‌سازی لیست قیمت با GitHub Pages

ساختار watch_folder:
  watch_folder/
    DAB_داب/
      price_list.pdf    ← لیست قیمت
      brand_logo.jpg    ← لوگو (اختیاری)
    GREE_گری/
      price_list.pdf
      brand_logo.jpg
    index.html          ← صفحه اصلی (دست نزنید)
    manifest.json       ← خودکار به‌روز می‌شود

هر تغییر → manifest.json به‌روز → push به gh-pages → GitHub Pages deploy
"""

import subprocess
import sys
import time
import json
import logging
from datetime import datetime
from pathlib import Path

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
    with open(BASE_DIR / "config.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def run(cmd, cwd=None, check=True):
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if check and result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def setup_repo(watch_dir: Path, repo_url: str, logger):
    """اگر watch_folder git repo نیست، gh-pages را clone می‌کند"""
    if (watch_dir / ".git").exists():
        logger.info("✅ ریپو موجود است")
        run(["git", "pull", "origin", "gh-pages"], cwd=watch_dir)
        logger.info("✅ به‌روز شد")
        return

    logger.info(f"📥 در حال clone کردن gh-pages از {repo_url} ...")
    watch_dir.mkdir(parents=True, exist_ok=True)
    run(["git", "clone", "--branch", "gh-pages", "--single-branch", repo_url, str(watch_dir)])
    logger.info("✅ clone انجام شد")


def scan_brands(watch_dir: Path) -> list[dict]:
    """اسکن پوشه‌های برند و ساخت لیست"""
    brands = []
    for d in sorted(watch_dir.iterdir()):
        if not d.is_dir() or d.name.startswith("."):
            continue

        pdf = d / "price_list.pdf"
        has_pdf = pdf.exists()

        # پیدا کردن لوگو
        logo_ext = ""
        has_logo = False
        for ext in [".jpg", ".jpeg", ".png", ".webp", ".svg"]:
            if (d / f"brand_logo{ext}").exists():
                logo_ext = ext
                has_logo = True
                break

        # نام برند از نام پوشه
        brand_name = d.name.replace("_", " ").strip()

        updated_at = int(pdf.stat().st_mtime) if has_pdf else int(d.stat().st_mtime)

        brands.append({
            "slug": d.name,
            "brand": brand_name,
            "date": "",
            "has_pdf": has_pdf,
            "has_image": has_logo,
            "has_logo": has_logo,
            "logo_ext": logo_ext,
            "updated_at": updated_at,
        })

    # مرتب‌سازی بر اساس تاریخ آپدیت (جدیدترین اول)
    brands.sort(key=lambda x: x["updated_at"], reverse=True)
    return brands


def update_manifest(watch_dir: Path, logger) -> bool:
    """به‌روزرسانی manifest.json و بازگشت True اگر تغییر داشت"""
    manifest_path = watch_dir / "manifest.json"
    brands = scan_brands(watch_dir)

    new_content = json.dumps(brands, ensure_ascii=False, indent=2)

    old_content = ""
    if manifest_path.exists():
        old_content = manifest_path.read_text(encoding="utf-8")

    if new_content == old_content:
        return False

    manifest_path.write_text(new_content, encoding="utf-8")
    logger.info(f"📋 manifest.json به‌روز شد ({len(brands)} برند)")
    return True


def git_push(watch_dir: Path, message: str, logger):
    """commit و push به gh-pages"""
    try:
        run(["git", "add", "-A"], cwd=watch_dir)
        status = run(["git", "status", "--porcelain"], cwd=watch_dir)
        if not status:
            logger.info("⏭  هیچ تغییری برای commit نیست")
            return

        run(["git", "commit", "-m", message], cwd=watch_dir)
        run(["git", "push", "origin", "gh-pages"], cwd=watch_dir)
        logger.info(f"🚀 Push شد: {message}")
    except RuntimeError as e:
        logger.error(f"❌ خطا در git push: {e}")


# فایل‌هایی که تغییرشان اهمیت دارد
WATCHED_SUFFIXES = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".svg"}
SKIP_NAMES = {"manifest.json", "index.html", ".DS_Store"}


class SiteHandler(FileSystemEventHandler):
    def __init__(self, watch_dir: Path, logger):
        self.watch_dir = watch_dir
        self.logger = logger
        self._pending = False
        self._last_event = 0

    def _should_handle(self, path: Path) -> bool:
        if path.name in SKIP_NAMES:
            return False
        if path.suffix.lower() not in WATCHED_SUFFIXES:
            return False
        if path.name.startswith("."):
            return False
        return True

    def _trigger(self, path: Path, action: str):
        if not self._should_handle(path):
            return
        self.logger.info(f"📁 {action}: {path.relative_to(self.watch_dir)}")
        self._last_event = time.time()
        self._pending = True

    def on_created(self, event):
        if not event.is_directory:
            self._trigger(Path(event.src_path), "فایل جدید")

    def on_modified(self, event):
        if not event.is_directory:
            self._trigger(Path(event.src_path), "فایل تغییر کرد")

    def on_moved(self, event):
        if not event.is_directory:
            self._trigger(Path(event.dest_path), "فایل جابجا شد")

    def on_deleted(self, event):
        if not event.is_directory:
            self._trigger(Path(event.src_path), "فایل حذف شد")

    def flush_if_idle(self):
        """اگر ۵ ثانیه از آخرین رویداد گذشته، push کن"""
        if self._pending and (time.time() - self._last_event) >= 5:
            self._pending = False
            changed = update_manifest(self.watch_dir, self.logger)
            msg = f"update: به‌روزرسانی لیست قیمت — {datetime.now():%Y-%m-%d %H:%M}"
            git_push(self.watch_dir, msg, self.logger)


def main():
    cfg = load_config()
    setup_logging(cfg["general"].get("log_level", "INFO"))
    logger = logging.getLogger("PriceListSync")

    watch_dir = BASE_DIR / cfg["folders"]["watch"]
    repo_url = cfg.get("github", {}).get("repo_url", "")

    logger.info("=" * 55)
    logger.info("🚀 سیستم همگام‌سازی لیست قیمت با GitHub Pages")
    logger.info(f"📂 پوشه: {watch_dir}")
    logger.info("=" * 55)

    if repo_url:
        setup_repo(watch_dir, repo_url, logger)

    # به‌روزرسانی اولیه manifest
    changed = update_manifest(watch_dir, logger)
    if changed:
        git_push(watch_dir, "update: sync اولیه manifest.json", logger)

    brands = scan_brands(watch_dir)
    logger.info(f"📦 {len(brands)} برند در پوشه یافت شد")

    handler = SiteHandler(watch_dir, logger)
    observer = Observer()
    observer.schedule(handler, str(watch_dir), recursive=True)
    observer.start()
    logger.info("👀 در انتظار تغییرات...")

    try:
        while True:
            handler.flush_if_idle()
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        logger.info("سرویس متوقف شد.")
    observer.join()


if __name__ == "__main__":
    main()
