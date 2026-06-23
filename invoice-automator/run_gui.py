#!/usr/bin/env python3
"""
نقطه‌ی شروع برنامه‌ی گرافیکی.

اجرا روی ویندوز:
    python run_gui.py
یا پس از ساخت نصاب، فایل اجرایی YaraPro (در پوشه‌ی نصب).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gui.app import main

if __name__ == "__main__":
    main()
