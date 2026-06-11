#!/bin/bash
# نصب سیستم آپلود خودکار لیست قیمت

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📂 مسیر پروژه: $PROJECT_DIR"

# Python
if command -v python3 &>/dev/null; then
    PYTHON=$(which python3)
else
    echo "❌ Python پیدا نشد!"; exit 1
fi
echo "✅ Python: $($PYTHON --version 2>&1)"

# pip
PIP="$PYTHON -m pip"

# پوشه‌ها
mkdir -p "$PROJECT_DIR/watch_folder" "$PROJECT_DIR/uploaded" "$PROJECT_DIR/logs"
echo "✅ پوشه‌ها ساخته شدند"

# نصب پکیج‌ها
echo "📦 نصب پکیج‌ها..."
$PIP install -r "$PROJECT_DIR/requirements.txt" --break-system-packages -q 2>/dev/null || \
$PIP install -r "$PROJECT_DIR/requirements.txt" -q
echo "✅ پکیج‌ها نصب شدند"

# LaunchAgent برای مک
if [[ "$(uname)" == "Darwin" ]]; then
    PLIST="$HOME/Library/LaunchAgents/com.shofazh.price-list-uploader.plist"
    mkdir -p "$(dirname "$PLIST")"
    cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.shofazh.price-list-uploader</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PYTHON</string>
        <string>$PROJECT_DIR/main.py</string>
    </array>
    <key>WorkingDirectory</key><string>$PROJECT_DIR</string>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>$PROJECT_DIR/logs/service.log</string>
    <key>StandardErrorPath</key><string>$PROJECT_DIR/logs/service-error.log</string>
</dict>
</plist>
EOF
    launchctl unload "$PLIST" 2>/dev/null
    launchctl load "$PLIST" 2>/dev/null
    echo "✅ سرویس مک فعال شد"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ نصب تمام شد!                            ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  📂 پوشه لیست قیمت:                        ║"
echo "║  $PROJECT_DIR/watch_folder"
echo "║                                              ║"
echo "║  فایل PDF/Excel را در این پوشه بگذارید.    ║"
echo "║  خودکار به سایت آپلود می‌شود.              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "اجرای دستی: $PYTHON $PROJECT_DIR/main.py"
