@echo off
chcp 65001 >nul
title ساخت فایل نصب - سامانه ارسال پیش فاکتور
cd /d "%~dp0"

echo.
echo ============================================================
echo    ساخت فایل نصب (Setup.exe) - سامانه ارسال پیش فاکتور
echo ============================================================
echo.

REM ── پیدا کردن makensis (کامپایلر NSIS) ──
set "MAKENSIS="
where makensis >nul 2>nul && set "MAKENSIS=makensis"
if not defined MAKENSIS if exist "%ProgramFiles(x86)%\NSIS\makensis.exe" set "MAKENSIS=%ProgramFiles(x86)%\NSIS\makensis.exe"
if not defined MAKENSIS if exist "%ProgramFiles%\NSIS\makensis.exe"      set "MAKENSIS=%ProgramFiles%\NSIS\makensis.exe"

if not defined MAKENSIS (
    echo [خطا] NSIS نصب نیست.
    echo.
    echo لطفا NSIS را نصب کنید سپس دوباره این فایل را اجرا کنید:
    echo     https://nsis.sourceforge.io/Download
    echo.
    pause
    exit /b 1
)

echo NSIS پیدا شد: %MAKENSIS%
echo.

if not exist "Output" mkdir "Output"

echo در حال کامپایل installer.nsi ...
echo.
"%MAKENSIS%" "installer.nsi"

if errorlevel 1 (
    echo.
    echo [خطا] ساخت فایل نصب با مشکل مواجه شد.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo    ✅ انجام شد!
echo    خروجی:  Output\InvoiceAutomator-Setup.exe
echo ============================================================
echo.
pause
