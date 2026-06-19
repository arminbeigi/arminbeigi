@echo off
REM ============================================================
REM   نصب و راه‌اندازی «سامانه ارسال پیش‌فاکتور» روی ویندوز
REM   اگر پایتون نصب نباشد، به‌صورت خودکار نصب می‌شود.
REM   این فایل را دابل‌کلیک کنید.
REM ============================================================
chcp 65001 >nul
title نصب سامانه ارسال پیش‌فاکتور
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================================
echo        نصب سامانه ارسال پیش فاکتور
echo ============================================================
echo.

REM ── نسخه پایتونی که در صورت نبود نصب می‌شود ──
set "PY_VER=3.12.4"

REM ── ۱. بررسی نصب بودن پایتون ──
call :find_python
if defined PYEXE goto :have_python

echo پایتون روی این سیستم پیدا نشد.
echo در حال تلاش برای نصب خودکار پایتون %PY_VER% ...
echo ------------------------------------------------------------
call :install_python

REM تازه‌سازی PATH و بررسی مجدد
call :refresh_path
call :find_python
if defined PYEXE goto :have_python

echo.
echo [خطا] نصب خودکار پایتون انجام نشد.
echo لطفا پایتون را به‌صورت دستی از آدرس زیر نصب کنید:
echo     https://www.python.org/downloads/
echo ⚠ هنگام نصب تیک "Add Python to PATH" را بزنید، سپس دوباره setup.bat را اجرا کنید.
echo.
pause
exit /b 1

:have_python
echo.
for /f "tokens=*" %%v in ('%PYEXE% --version 2^>^&1') do echo پایتون آماده است: %%v
echo.

REM ── ۲. ساخت محیط مجازی ──
if not exist ".venv\" (
    echo ساخت محیط مجازی...
    %PYEXE% -m venv .venv
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
exit /b 0


REM ============================================================
REM   زیرروال‌ها
REM ============================================================

:find_python
REM پیدا کردن یک پایتون قابل‌استفاده و قراردادن آن در PYEXE
set "PYEXE="
REM ۱) دستور python
python --version >nul 2>&1
if not errorlevel 1 (
    REM مطمئن شو این همان پایتون واقعی است نه میانبر فروشگاه مایکروسافت
    python -c "import sys" >nul 2>&1
    if not errorlevel 1 set "PYEXE=python"
)
if defined PYEXE exit /b 0
REM ۲) لانچر py
py -3 --version >nul 2>&1
if not errorlevel 1 set "PYEXE=py -3"
if defined PYEXE exit /b 0
REM ۳) مسیرهای رایج نصب
for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%ProgramFiles%\Python312\python.exe"
    "%ProgramFiles%\Python311\python.exe"
    "C:\Python312\python.exe"
) do (
    if exist "%%~P" (
        set "PYEXE=%%~P"
        exit /b 0
    )
)
exit /b 0


:install_python
REM روش ۱: winget (در ویندوز ۱۰/۱۱ معمولاً موجود است)
where winget >nul 2>&1
if not errorlevel 1 (
    echo نصب با استفاده از winget...
    winget install -e --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements --scope user
    if not errorlevel 1 exit /b 0
    echo winget موفق نبود، تلاش با دانلود مستقیم...
)

REM روش ۲: دانلود مستقیم نصب‌کننده رسمی و نصب بی‌صدا (بدون نیاز به ادمین)
set "ARCH=amd64"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARCH=arm64"
set "PY_URL=https://www.python.org/ftp/python/%PY_VER%/python-%PY_VER%-%ARCH%.exe"
set "PY_INSTALLER=%TEMP%\python-%PY_VER%-%ARCH%.exe"

echo دانلود نصب‌کننده پایتون از python.org ...
powershell -NoProfile -Command ^
  "try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;" ^
  "Invoke-WebRequest -Uri '%PY_URL%' -OutFile '%PY_INSTALLER%' -UseBasicParsing; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo [خطا] دانلود نصب‌کننده پایتون ناموفق بود.
    exit /b 1
)

echo نصب پایتون (بی‌صدا، فقط برای کاربر فعلی)...
"%PY_INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_launcher=1 AssociateFiles=0
set "RC=%ERRORLEVEL%"
del "%PY_INSTALLER%" >nul 2>&1
REM کد خروجی 0 = موفق ، 3010 = نصب شد ولی نیاز به ری‌استارت
if "%RC%"=="0" exit /b 0
if "%RC%"=="3010" exit /b 0
echo [خطا] نصب پایتون با خطا مواجه شد (کد %RC%).
exit /b 1


:refresh_path
REM تازه‌سازی متغیر PATH از رجیستری (تا بدون ری‌استارت در همین پنجره کار کند)
for /f "tokens=2,*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%b"
for /f "tokens=2,*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USR_PATH=%%b"
set "PATH=%SYS_PATH%;%USR_PATH%"
REM افزودن مسیرهای رایج نصب پایتون به‌صورت دستی (محکم‌کاری)
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts"
exit /b 0
