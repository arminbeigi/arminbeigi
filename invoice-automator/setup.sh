#!/bin/bash
# ╔══════════════════════════════════════════════════╗
# ║   نصب خودکار سیستم ارسال پیش فاکتور             ║
# ║   این اسکریپت را روی مک جدید اجرا کنید          ║
# ╚══════════════════════════════════════════════════╝

set -e

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  🔧 نصب سیستم ارسال خودکار پیش فاکتور          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# مسیر پروژه
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📂 مسیر پروژه: $PROJECT_DIR"

# ساخت پوشه‌ها
mkdir -p "$PROJECT_DIR/watch_folder"
mkdir -p "$PROJECT_DIR/processed"
mkdir -p "$PROJECT_DIR/logs"
echo "✅ پوشه‌ها ساخته شدند"

# بررسی Python
if ! command -v python3 &>/dev/null; then
    echo "❌ Python3 پیدا نشد!"
    echo "   از https://www.python.org/downloads/ نصب کنید"
    exit 1
fi
PYTHON_PATH=$(which python3)
echo "✅ Python: $PYTHON_PATH ($(python3 --version))"

# نصب پکیج‌ها
echo ""
echo "📦 نصب پکیج‌های مورد نیاز..."
pip3 install pdfplumber watchdog requests pyyaml 2>/dev/null || \
pip3 install --index-url https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com pdfplumber watchdog requests pyyaml

# نصب rubpy (اختیاری)
pip3 install rubpy 2>/dev/null || \
pip3 install --index-url https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com rubpy 2>/dev/null || \
echo "⚠️ rubpy نصب نشد (اختیاری - برای روبیکا)"

echo "✅ پکیج‌ها نصب شدند"

# تنظیم نام کاربری مک
MAC_USER=$(whoami)
MAC_HOME=$(eval echo ~$MAC_USER)

# ساخت LaunchAgent
PLIST_PATH="$MAC_HOME/Library/LaunchAgents/com.shofazh.invoice-automator.plist"
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

echo "✅ سرویس ساخته شد"

# فعال‌سازی سرویس
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"
echo "✅ سرویس فعال شد"

# بررسی
sleep 2
if launchctl list | grep -q shofazh; then
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║  🎉 نصب با موفقیت انجام شد!                     ║"
    echo "╠══════════════════════════════════════════════════╣"
    echo "║                                                  ║"
    echo "║  📂 پوشه PDF:  $PROJECT_DIR/watch_folder"
    echo "║                                                  ║"
    echo "║  فایل PDF را با فرمت زیر بگذارید:              ║"
    echo "║    09xxxxxxxxx-شماره_فاکتور.pdf                  ║"
    echo "║                                                  ║"
    echo "║  🔄 سرویس با روشن شدن مک خودکار اجراست        ║"
    echo "╚══════════════════════════════════════════════════╝"
else
    echo "⚠️ سرویس اجرا نشد. لاگ‌ها را بررسی کنید:"
    echo "   cat $PROJECT_DIR/logs/service-error.log"
fi

echo ""
echo "📋 دستورات مفید:"
echo "   وضعیت:    launchctl list | grep shofazh"
echo "   لاگ:      tail -f $PROJECT_DIR/logs/service.log"
echo "   توقف:     launchctl unload $PLIST_PATH"
echo "   شروع:     launchctl load $PLIST_PATH"
echo ""
