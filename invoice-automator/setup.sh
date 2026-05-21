#!/bin/bash
# ╔══════════════════════════════════════════════════╗
# ║   نصب خودکار سیستم ارسال پیش فاکتور             ║
# ║   این اسکریپت را روی مک اجرا کنید               ║
# ╚══════════════════════════════════════════════════╝

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  🔧 نصب سیستم ارسال خودکار پیش فاکتور          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# مسیر پروژه
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📂 مسیر پروژه: $PROJECT_DIR"

# ── بررسی Python ──────────────────────────────────
if command -v python3 &>/dev/null; then
    PYTHON_PATH=$(which python3)
elif command -v python &>/dev/null; then
    PYTHON_PATH=$(which python)
else
    echo "❌ Python پیدا نشد!"
    echo "   از https://www.python.org/downloads/ نصب کنید"
    exit 1
fi
echo "✅ Python: $PYTHON_PATH ($($PYTHON_PATH --version 2>&1))"

# ── بررسی pip ─────────────────────────────────────
if command -v pip3 &>/dev/null; then
    PIP="pip3"
elif command -v pip &>/dev/null; then
    PIP="pip"
else
    echo "❌ pip پیدا نشد! در حال نصب..."
    curl https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
    $PYTHON_PATH /tmp/get-pip.py
    PIP="$PYTHON_PATH -m pip"
fi

# ── ساخت پوشه‌ها ───────────────────────────────────
mkdir -p "$PROJECT_DIR/watch_folder"
mkdir -p "$PROJECT_DIR/processed"
mkdir -p "$PROJECT_DIR/logs"
echo "✅ پوشه‌ها ساخته شدند"

# ── نصب پکیج‌ها ────────────────────────────────────
echo ""
echo "📦 در حال نصب پکیج‌ها..."

PKGS="watchdog requests pyyaml kavenegar rubpy"

MIRRORS=(
    "https://mirror.iranserver.com/pypi/simple/"
    "http://repo.iut.ac.ir/repo/pypi/simple/"
    "https://mirrors.aliyun.com/pypi/simple/"
    "https://pypi.tuna.tsinghua.edu.cn/simple/"
    ""
)

SUCCESS=false
for MIRROR in "${MIRRORS[@]}"; do
    if [ -z "$MIRROR" ]; then
        echo "   تلاش با pypi.org..."
        CMD="$PIP install $PKGS --no-input"
    else
        echo "   میرور: $MIRROR"
        HOST=$(echo "$MIRROR" | sed 's|https\?://||' | cut -d/ -f1)
        CMD="$PIP install $PKGS --index-url $MIRROR --trusted-host $HOST --no-input"
    fi
    if $CMD; then
        echo "✅ نصب پکیج‌ها تمام شد"
        SUCCESS=true
        break
    fi
done

if [ "$SUCCESS" = false ]; then
    echo "❌ نصب پکیج‌ها ناموفق بود. اینترنت را بررسی کنید."
    exit 1
fi

# ── ساخت LaunchAgent (اجرای خودکار با روشن شدن مک) ──
MAC_USER=$(whoami)
MAC_HOME=$(eval echo ~$MAC_USER)
PLIST_DIR="$MAC_HOME/Library/LaunchAgents"
PLIST_PATH="$PLIST_DIR/com.shofazh.invoice-automator.plist"

mkdir -p "$PLIST_DIR"

echo ""
echo "🔄 ساخت سرویس خودکار..."

cat > "$PLIST_PATH" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.shofazh.invoice-automator</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PYTHON_PATH</string>
        <string>$PROJECT_DIR/main.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$PROJECT_DIR/logs/service.log</string>
    <key>StandardErrorPath</key>
    <string>$PROJECT_DIR/logs/service-error.log</string>
</dict>
</plist>
PLISTEOF

echo "✅ فایل سرویس ساخته شد"

# ── فعال‌سازی سرویس ────────────────────────────────
# توقف سرویس قبلی اگر در حال اجراست
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# macOS 13+ از bootstrap استفاده می‌کند
OS_MAJOR=$(sw_vers -productVersion 2>/dev/null | cut -d. -f1)
if [ -n "$OS_MAJOR" ] && [ "$OS_MAJOR" -ge 13 ] 2>/dev/null; then
    launchctl load "$PLIST_PATH" 2>/dev/null || \
    launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null || true
else
    launchctl load "$PLIST_PATH" 2>/dev/null || true
fi

sleep 2

# ── نتیجه نهایی ────────────────────────────────────
if launchctl list 2>/dev/null | grep -q shofazh; then
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║  🎉 نصب با موفقیت انجام شد!                     ║"
    echo "╠══════════════════════════════════════════════════╣"
    echo "║                                                  ║"
    echo "║  📂 پوشه PDF:                                   ║"
    echo "║  $PROJECT_DIR/watch_folder"
    echo "║                                                  ║"
    echo "║  فایل PDF را با فرمت زیر نامگذاری کنید:        ║"
    echo "║    09xxxxxxxxx.pdf                               ║"
    echo "║    09xxxxxxxxx-شماره_فاکتور.pdf                  ║"
    echo "║    نام-09xxxxxxxxx-شماره_فاکتور.pdf              ║"
    echo "║                                                  ║"
    echo "║  🔄 سرویس با روشن شدن مک خودکار اجراست        ║"
    echo "╚══════════════════════════════════════════════════╝"
else
    echo ""
    echo "⚠️  سرویس خودکار فعال نشد."
    echo "    برای اجرای دستی:"
    echo "    $PYTHON_PATH $PROJECT_DIR/main.py"
    echo ""
    echo "    لاگ خطا:"
    echo "    cat $PROJECT_DIR/logs/service-error.log"
fi

echo ""
echo "📋 دستورات مفید:"
echo "   اجرای دستی:  $PYTHON_PATH $PROJECT_DIR/main.py"
echo "   لاگ:         tail -f $PROJECT_DIR/logs/service.log"
echo "   وضعیت:       launchctl list | grep shofazh"
echo "   توقف:        launchctl unload $PLIST_PATH"
echo "   شروع مجدد:   launchctl load $PLIST_PATH"
echo ""
