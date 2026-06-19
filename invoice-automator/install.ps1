#Requires -Version 5.0
<#
    نصب‌کننده‌ی «سامانه ارسال پیش‌فاکتور»
    - نصب خودکار پایتون در صورت نبود
    - کپی برنامه به پوشه‌ی کاربر و ساخت محیط مجازی
    - ساخت آیکن دسکتاپ و منوی استارت
    - ثبت در «افزودن یا حذف برنامه‌ها»ی ویندوز (Uninstall)

    اجرا برای نصب :  از طریق INSTALL.bat
    اجرا برای حذف :  install.ps1 -Uninstall   (به‌صورت خودکار در Uninstall ویندوز)
#>
param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'

$AppName    = 'سامانه ارسال پیش‌فاکتور'
$AppId      = 'InvoiceAutomator'
$Publisher  = 'Shofazh'
$Version    = '1.0.0'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\InvoiceAutomator'
$RegPath    = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$AppId"
$DesktopLnk = Join-Path ([Environment]::GetFolderPath('Desktop')) "$AppName.lnk"
$StartLnk   = Join-Path (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs') "$AppName.lnk"

function Pause-Exit($code) {
    Write-Host ''
    Read-Host 'برای بستن این پنجره Enter را بزنید'
    exit $code
}

# ============================================================
#   حالت حذف نصب (Uninstall)
# ============================================================
if ($Uninstall) {
    Write-Host "در حال حذف $AppName ..."
    Set-Location $env:TEMP
    foreach ($lnk in @($DesktopLnk, $StartLnk)) {
        if (Test-Path $lnk) { Remove-Item $lnk -Force -ErrorAction SilentlyContinue }
    }
    if (Test-Path $RegPath) { Remove-Item $RegPath -Recurse -Force -ErrorAction SilentlyContinue }
    if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue }
    Write-Host 'حذف کامل شد.'
    Start-Sleep -Seconds 1
    exit 0
}

# ============================================================
#   حالت نصب
# ============================================================
Write-Host '============================================================'
Write-Host "        نصب $AppName"
Write-Host '============================================================'
Write-Host ''

$Src = $PSScriptRoot

function Find-Python {
    foreach ($c in @('python', 'py')) {
        try {
            $v = & $c --version 2>&1
            if ($LASTEXITCODE -eq 0 -and "$v" -match 'Python 3') { return $c }
        } catch {}
    }
    return $null
}

function Refresh-Path {
    $m = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $u = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$m;$u;$env:LOCALAPPDATA\Programs\Python\Python312;$env:LOCALAPPDATA\Programs\Python\Python312\Scripts"
}

# ── ۱. پایتون ──
# نکته: عمداً از winget استفاده نمی‌کنیم؛ روی بعضی سیستم‌ها خطای گواهی
# (0x8a15005e) می‌دهد. دانلود مستقیم از python.org مطمئن‌تر است.
$py = Find-Python
if (-not $py) {
    Write-Host 'پایتون یافت نشد؛ در حال دانلود و نصب از python.org ...'
    $pv  = '3.12.4'
    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'amd64' }
    $url = "https://www.python.org/ftp/python/$pv/python-$pv-$arch.exe"
    $out = Join-Path $env:TEMP "python-$pv.exe"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $ProgressPreference = 'SilentlyContinue'   # دانلود بسیار سریع‌تر
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    } catch {
        Write-Host "[خطا] دانلود پایتون ناموفق بود: $_"
        Write-Host 'پایتون را دستی از https://www.python.org/downloads/ نصب کنید'
        Write-Host '(هنگام نصب تیک «Add Python to PATH» را بزنید) و دوباره INSTALL.bat را اجرا کنید.'
        Pause-Exit 1
    }
    Write-Host 'نصب پایتون... (چند لحظه صبر کنید)'
    Start-Process $out -ArgumentList '/quiet','InstallAllUsers=0','PrependPath=1','Include_pip=1','Include_launcher=1' -Wait
    Remove-Item $out -Force -ErrorAction SilentlyContinue
    Refresh-Path
    $py = Find-Python
}
if (-not $py) {
    Write-Host '[خطا] نصب خودکار پایتون انجام نشد.'
    Write-Host 'لطفا پایتون را دستی از https://www.python.org/downloads/ نصب کنید (تیک Add Python to PATH) و دوباره اجرا کنید.'
    Pause-Exit 1
}
Write-Host "پایتون آماده است: $(& $py --version)"

# ── ۲. کپی فایل‌ها به پوشه‌ی نصب ──
Write-Host 'کپی فایل‌های برنامه...'
if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
foreach ($item in @('gui', 'modules', 'assets', 'run_gui.py', 'requirements.txt',
                    'rubika_login.py', 'config.example.yaml', 'install.ps1', 'راهنمای-نصب.txt')) {
    $p = Join-Path $Src $item
    if (Test-Path $p) { Copy-Item $p -Destination $InstallDir -Recurse -Force }
}

# ── ۳. محیط مجازی و وابستگی‌ها ──
Write-Host 'ساخت محیط مجازی و نصب کتابخانه‌ها... (چند دقیقه)'
& $py -m venv (Join-Path $InstallDir '.venv')
$venvPy = Join-Path $InstallDir '.venv\Scripts\python.exe'
$pyw    = Join-Path $InstallDir '.venv\Scripts\pythonw.exe'
& $venvPy -m pip install --upgrade pip
& $venvPy -m pip install -r (Join-Path $InstallDir 'requirements.txt')
if ($LASTEXITCODE -ne 0) {
    Write-Host '[خطا] نصب کتابخانه‌ها ناموفق بود. اتصال اینترنت را بررسی کنید.'
    Pause-Exit 1
}

# ── ۴. ساخت میانبرها ──
Write-Host 'ساخت آیکن دسکتاپ و منوی استارت...'
$icon = Join-Path $InstallDir 'assets\icon.ico'
$wsh  = New-Object -ComObject WScript.Shell
function New-Shortcut($path) {
    $sc = $wsh.CreateShortcut($path)
    $sc.TargetPath       = $pyw
    $sc.Arguments        = 'run_gui.py'
    $sc.WorkingDirectory = $InstallDir
    if (Test-Path $icon) { $sc.IconLocation = $icon }
    $sc.Description      = $AppName
    $sc.Save()
}
New-Shortcut $DesktopLnk
New-Shortcut $StartLnk

# ── ۵. ثبت در «افزودن یا حذف برنامه‌ها» ──
Write-Host 'ثبت در فهرست برنامه‌های ویندوز...'
$uninstCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\install.ps1`" -Uninstall"
if (-not (Test-Path $RegPath)) { New-Item -Path $RegPath -Force | Out-Null }
New-ItemProperty $RegPath -Name 'DisplayName'     -Value $AppName    -PropertyType String -Force | Out-Null
New-ItemProperty $RegPath -Name 'DisplayVersion'  -Value $Version    -PropertyType String -Force | Out-Null
New-ItemProperty $RegPath -Name 'Publisher'       -Value $Publisher  -PropertyType String -Force | Out-Null
New-ItemProperty $RegPath -Name 'DisplayIcon'     -Value $icon       -PropertyType String -Force | Out-Null
New-ItemProperty $RegPath -Name 'InstallLocation' -Value $InstallDir -PropertyType String -Force | Out-Null
New-ItemProperty $RegPath -Name 'UninstallString' -Value $uninstCmd  -PropertyType String -Force | Out-Null
New-ItemProperty $RegPath -Name 'NoModify'        -Value 1           -PropertyType DWord  -Force | Out-Null
New-ItemProperty $RegPath -Name 'NoRepair'        -Value 1           -PropertyType DWord  -Force | Out-Null
New-ItemProperty $RegPath -Name 'EstimatedSize'   -Value 180000      -PropertyType DWord  -Force | Out-Null

Write-Host ''
Write-Host '============================================================'
Write-Host '        نصب با موفقیت انجام شد!'
Write-Host '============================================================'
Write-Host 'آیکن برنامه روی دسکتاپ ساخته شد.'
Write-Host 'برای حذف: تنظیمات ویندوز > Apps > سامانه ارسال پیش‌فاکتور > Uninstall'
Write-Host ''

# ── ۶. اجرای برنامه ──
try { Start-Process $pyw -ArgumentList 'run_gui.py' -WorkingDirectory $InstallDir } catch {}
Start-Sleep -Seconds 2
