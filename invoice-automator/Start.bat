@echo off
REM اجرای سامانه ارسال پیش‌فاکتور
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".venv\Scripts\activate.bat" (
    echo برنامه هنوز نصب نشده است. ابتدا فایل setup.bat را اجرا کنید.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat
REM اجرای بدون پنجره کنسول (pythonw)
start "" pythonw run_gui.py
