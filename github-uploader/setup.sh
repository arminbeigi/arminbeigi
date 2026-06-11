#!/bin/bash
# ╔══════════════════════════════════════════════════════╗
# ║   راه‌اندازی آپلودر خودکار — یک‌بار اجرا کن       ║
# ╚══════════════════════════════════════════════════════╝

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_NAME="com.arminbeigi.github-uploader"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

echo
echo "══════════════════════════════════════════"
echo "  📤 نصب آپلودر خودکار گیت‌هاب پیج"
echo "══════════════════════════════════════════"
echo

# Python check
if ! command -v python3 &>/dev/null; then
    echo "❌ Python3 پیدا نشد. از python.org نصب کن و دوباره بیا."
    exit 1
fi

PYTHON=$(command -v python3)
echo "🐍 Python: $PYTHON ($(python3 --version))"

# نصب کتابخانه‌ها
echo
echo "📦 نصب کتابخانه‌ها..."
pip3 install -r "$DIR/requirements.txt" --quiet

# بررسی توکن
if grep -q "YOUR_TOKEN_HERE" "$DIR/config.yaml"; then
    echo
    echo "────────────────────────────────────────────"
    echo "⚠️  لطفاً ابتدا توکن گیت‌هاب رو تنظیم کن:"
    echo
    echo "  ۱. این لینک رو باز کن:"
    echo "     https://github.com/settings/tokens/new"
    echo "  ۲. Note: یه اسم بذار (مثلاً: site-uploader)"
    echo "  ۳. تیک  repo  رو بزن"
    echo "  ۴. Generate token → توکن رو کپی کن"
    echo "  ۵. در config.yaml، توکن رو جای YOUR_TOKEN_HERE بذار"
    echo "────────────────────────────────────────────"
    echo
    open "$DIR/config.yaml"
    read -rp "بعد از ذخیره config.yaml اینجا Enter بزن..."
    echo
fi

# ساخت LaunchAgent (اجرای خودکار بعد از هر روشن شدن مک)
mkdir -p "$(dirname "$PLIST_PATH")"
mkdir -p "$DIR/logs"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${PYTHON}</string>
        <string>${DIR}/watcher.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${DIR}/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${DIR}/logs/stderr.log</string>
</dict>
</plist>
EOF

# بارگذاری سرویس
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

WATCH_FOLDER=$(python3 -c "
import yaml, os
c = yaml.safe_load(open('$DIR/config.yaml'))
print(os.path.expanduser(c['watch']['folder']))
")

echo
echo "══════════════════════════════════════════"
echo "✅ نصب کامل شد! سیستم داره اجرا می‌شه."
echo
echo "📂 پوشه watch_folder:"
echo "   $WATCH_FOLDER"
echo
echo "راهنمای استفاده:"
echo "  ← فایل رو داخل پوشه برند مربوطه بذار"
echo "  ← چند ثانیه صبر کن"
echo "  ← فایل روی سایت آپلود می‌شه ✅"
echo
echo "دستورات مفید:"
echo "  توقف:   launchctl unload \"$PLIST_PATH\""
echo "  شروع:   launchctl load \"$PLIST_PATH\""
echo "  لاگ:    tail -f \"$DIR/logs/stdout.log\""
echo "══════════════════════════════════════════"
echo
