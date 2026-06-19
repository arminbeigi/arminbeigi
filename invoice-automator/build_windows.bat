@echo off
REM ============================================================
REM   ساخت فایل اجرایی ویندوز (InvoiceAutomator.exe)
REM   این فایل را روی ویندوز اجرا کنید (دابل‌کلیک یا از CMD).
REM ============================================================
chcp 65001 >nul
echo.
echo ====== ساخت برنامه ارسال پیش‌فاکتور ======
echo.

REM ۱. ساخت محیط مجازی در صورت نبود
if not exist ".venv\" (
    echo ساخت محیط مجازی...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

REM ۲. نصب وابستگی‌ها
echo نصب وابستگی‌ها...
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

REM ۳. ساخت فایل اجرایی
echo ساخت فایل اجرایی...
pyinstaller invoice_automator.spec --noconfirm

echo.
echo ====== انجام شد! ======
echo فایل اجرایی در پوشه dist\InvoiceAutomator\ ساخته شد.
echo فایل dist\InvoiceAutomator\InvoiceAutomator.exe را اجرا کنید.
echo.
pause
