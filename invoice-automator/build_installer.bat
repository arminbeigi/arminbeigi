@echo off
REM ============================================================
REM   ساخت نصب‌کننده‌ی تک‌فایلی (InvoiceAutomator-Setup.exe)
REM
REM   این اسکریپت روی «کامپیوتر سازنده» (developer) اجرا می‌شود:
REM     ۱. برنامه را با PyInstaller به همراه پایتون باندل می‌کند
REM     ۲. Inno Setup را در صورت نبود نصب می‌کند
REM     ۳. یک Setup.exe تک‌فایلی در پوشه Output می‌سازد
REM
REM   کاربر نهایی فقط Setup.exe را اجرا می‌کند و به پایتون نیازی ندارد.
REM ============================================================
chcp 65001 >nul
title ساخت نصب‌کننده سامانه ارسال پیش‌فاکتور
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================================
echo        ساخت نصب‌کننده تک‌فایلی
echo ============================================================
echo.

REM ── ۱. اطمینان از وجود پایتون (برای ساخت لازم است) ──
call :find_python
if not defined PYEXE (
    echo پایتون برای ساخت یافت نشد. در حال نصب خودکار...
    call :install_python
    call :refresh_path
    call :find_python
)
if not defined PYEXE (
    echo [خطا] پایتون پیدا/نصب نشد. لطفا دستی نصب کنید: https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('%PYEXE% --version 2^>^&1') do echo پایتون: %%v

REM ── ۲. محیط مجازی و وابستگی‌ها ──
if not exist ".venv\" (
    echo ساخت محیط مجازی...
    %PYEXE% -m venv .venv
)
call .venv\Scripts\activate.bat
echo نصب وابستگی‌ها و PyInstaller...
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
pip install pyinstaller
if errorlevel 1 (
    echo [خطا] نصب وابستگی‌ها ناموفق بود.
    pause
    exit /b 1
)

REM ── ۳. ساخت برنامه با PyInstaller (پایتون باندل می‌شود) ──
echo.
echo ساخت برنامه با PyInstaller...
pyinstaller invoice_automator.spec --noconfirm
if not exist "dist\InvoiceAutomator\InvoiceAutomator.exe" (
    echo [خطا] خروجی PyInstaller ساخته نشد.
    pause
    exit /b 1
)

REM ── ۴. اطمینان از وجود Inno Setup ──
call :find_iscc
if not defined ISCC (
    echo Inno Setup یافت نشد. در حال نصب با winget...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install -e --id JRSoftware.InnoSetup --silent --accept-package-agreements --accept-source-agreements
    )
    call :find_iscc
)
if not defined ISCC (
    echo [خطا] Inno Setup پیدا/نصب نشد.
    echo لطفا آن را از https://jrsoftware.org/isdl.php نصب کنید و دوباره اجرا کنید.
    pause
    exit /b 1
)
echo Inno Setup: %ISCC%

REM ── ۵. کامپایل نصب‌کننده ──
echo.
echo ساخت نصب‌کننده...
"%ISCC%" installer.iss
if errorlevel 1 (
    echo [خطا] ساخت نصب‌کننده ناموفق بود.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo        انجام شد!
echo ============================================================
echo نصب‌کننده ساخته شد:
echo    Output\InvoiceAutomator-Setup.exe
echo.
echo این فایل را به کاربر نهایی بدهید. با یک دابل‌کلیک نصب می‌شود
echo و نیازی به نصب پایتون ندارد.
echo.
pause
exit /b 0


REM ============================================================
REM   زیرروال‌ها
REM ============================================================

:find_python
set "PYEXE="
python --version >nul 2>&1
if not errorlevel 1 (
    python -c "import sys" >nul 2>&1
    if not errorlevel 1 set "PYEXE=python"
)
if defined PYEXE exit /b 0
py -3 --version >nul 2>&1
if not errorlevel 1 set "PYEXE=py -3"
if defined PYEXE exit /b 0
for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%ProgramFiles%\Python312\python.exe"
) do (
    if exist "%%~P" (
        set "PYEXE=%%~P"
        exit /b 0
    )
)
exit /b 0

:install_python
set "PY_VER=3.12.4"
where winget >nul 2>&1
if not errorlevel 1 (
    winget install -e --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements --scope user
    if not errorlevel 1 exit /b 0
)
set "ARCH=amd64"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARCH=arm64"
set "PY_URL=https://www.python.org/ftp/python/%PY_VER%/python-%PY_VER%-%ARCH%.exe"
set "PY_INSTALLER=%TEMP%\python-%PY_VER%-%ARCH%.exe"
powershell -NoProfile -Command ^
  "try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;" ^
  "Invoke-WebRequest -Uri '%PY_URL%' -OutFile '%PY_INSTALLER%' -UseBasicParsing; exit 0 } catch { exit 1 }"
if errorlevel 1 exit /b 1
"%PY_INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_launcher=1
del "%PY_INSTALLER%" >nul 2>&1
exit /b 0

:refresh_path
for /f "tokens=2,*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%b"
for /f "tokens=2,*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USR_PATH=%%b"
set "PATH=%SYS_PATH%;%USR_PATH%;%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts"
exit /b 0

:find_iscc
set "ISCC="
for %%P in (
    "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
    "%ProgramFiles%\Inno Setup 6\ISCC.exe"
    "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
) do (
    if exist "%%~P" (
        set "ISCC=%%~P"
        exit /b 0
    )
)
where iscc >nul 2>&1
if not errorlevel 1 set "ISCC=iscc"
exit /b 0
