@echo off
REM ============================================================
REM   نصب «سامانه ارسال پیش‌فاکتور»
REM   این فایل را دابل‌کلیک کنید.
REM ============================================================
chcp 65001 >nul
title نصب سامانه ارسال پیش‌فاکتور
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"

if errorlevel 1 (
    echo.
    echo نصب با مشکل مواجه شد. پیام بالا را بررسی کنید.
    pause
)
