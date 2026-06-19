@echo off
REM ============================================================
REM   نصب و راه‌اندازی «سامانه ارسال پیش‌فاکتور» روی ویندوز
REM   این فایل را دابل‌کلیک کنید.
REM ============================================================
chcp 65001 >nul
title نصب سامانه ارسال پیش‌فاکتور
cd /d "%~dp0"

echo.
echo ============================================================
echo        نصب سامانه ارسال پیش فاکتور
echo ============================================================
echo.

REM ── ۱. بررسی نصب بودن پایتون ──
python --version >nul 2>&1
if errorlevel 1 (
    echo [خطا] پایتون روی این سیستم پیدا نشد.
    echo.
    echo لطفا ابتدا Python 3.10 یا بالاتر را از آدرس زیر نصب کنید:
    echo     https://www.python.org/downloads/
    echo.
    echo نکته مهم: هنگام نصب، تیک گزینه "Add Python to PATH" را بزنید.
    echo.
    pause
    exit /b 1
)

for /f "tokens=2" %%v in ('python --version 2^>^&1') do echo نسخه پایتون: %%v
echo.

REM ── ۲. ساخت محیط مجازی ──
if not exist ".venv\" (
    echo ساخت محیط مجازی...
    python -m venv .venv
    if errorlevel 1 (
        echo [خطا] ساخت محیط مجازی ناموفق بود.
        pause
        exit /b 1
    )
)

call .venv\Scripts\activate.bat

REM ── ۳. نصب وابستگی‌ها ──
echo نصب کتابخانه‌های مورد نیاز... (ممکن است چند دقیقه طول بکشد)
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
    echo [خطا] نصب وابستگی‌ها ناموفق بود. اتصال اینترنت را بررسی کنید.
    pause
    exit /b 1
)

REM ── ۴. ساخت شورتکات اجرا روی دسکتاپ ──
echo ساخت شورتکات روی دسکتاپ...
set "TARGET=%~dp0Start.bat"
set "SHORTCUT=%USERPROFILE%\Desktop\سامانه ارسال پیش‌فاکتور.lnk"
powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath='%TARGET%';" ^
  "$s.WorkingDirectory='%~dp0';" ^
  "$s.IconLocation='%SystemRoot%\System32\shell32.dll,165';" ^
  "$s.Description='سامانه ارسال پیش فاکتور';" ^
  "$s.Save()" >nul 2>&1

echo.
echo ============================================================
echo        نصب با موفقیت انجام شد!
echo ============================================================
echo.
echo برای اجرای برنامه:
echo    - روی شورتکات روی دسکتاپ دابل‌کلیک کنید
echo    - یا فایل Start.bat را اجرا کنید
echo.

REM ── ۵. اجرای فوری برنامه ──
choice /c YN /m "آیا می‌خواهید برنامه همین حالا اجرا شود؟ (Y=بله / N=خیر)"
if errorlevel 2 goto :end
start "" "%~dp0Start.bat"

:end
echo.
pause
