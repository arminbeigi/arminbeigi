#!/bin/bash
# ============================================================
#   ساخت نسخه‌ی مک (.app + .dmg) — روی خود macOS اجرا شود
#   این روش مطمئن‌ترین است (با hdiutil و بدون مشکل مجوز/قرنطینه).
#
#   اجرا: این فایل را در Terminal بکشید و Enter بزنید، یا:
#         bash build_on_mac.command
#   خروجی: dist/YaraPro.dmg
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."   # ریشه‌ی پروژه

PYVER="3.12.13"
PBS_TAG="20260610"
# تشخیص خودکار معماری مک
if [ "$(uname -m)" = "arm64" ]; then ARCH="aarch64-apple-darwin"; else ARCH="x86_64-apple-darwin"; fi

BUILD="macos-installer/build"
APP="$BUILD/YaraPro.app"
RES="$APP/Contents/Resources"
rm -rf "$BUILD"; mkdir -p "$RES" "$APP/Contents/MacOS" "$BUILD/dmg"

echo "▶ دانلود پایتون قابل‌حمل مک ($ARCH)"
URL="https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_TAG}/cpython-${PYVER}+${PBS_TAG}-${ARCH}-install_only.tar.gz"
curl -fsSL -o "$BUILD/py.tar.gz" "$URL"
tar xzf "$BUILD/py.tar.gz" -C "$BUILD"      # ⇒ $BUILD/python
mv "$BUILD/python" "$RES/python"

echo "▶ نصب کتابخانه‌ها"
SP="$RES/python/lib/python3.12/site-packages"
"$RES/python/bin/python3.12" -m pip install --upgrade pip >/dev/null
"$RES/python/bin/python3.12" -m pip install \
    customtkinter cryptography requests darkdetect packaging tkinterdnd2 \
    rubpy aiobale
# (روی مک، pip خودش wheel/سورس درست را نصب می‌کند)

echo "▶ چیدن کد برنامه"
cp -R gui modules assets run_gui.py config.example.yaml "$RES/"
find "$RES" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

echo "▶ ساخت آیکن و لانچر"
# icns از png (با ابزار مک)
if command -v sips >/dev/null && command -v iconutil >/dev/null; then
  ICONSET="$BUILD/icon.iconset"; mkdir -p "$ICONSET"
  for s in 16 32 64 128 256 512; do
    sips -z $s $s assets/icon.png --out "$ICONSET/icon_${s}x${s}.png" >/dev/null 2>&1 || true
    d=$((s*2)); sips -z $d $d assets/icon.png --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null 2>&1 || true
  done
  iconutil -c icns "$ICONSET" -o "$RES/icon.icns" 2>/dev/null || true
fi

cat > "$APP/Contents/MacOS/YaraPro" <<'LAUNCH'
#!/bin/bash
DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"
export TK_SILENCE_DEPRECATION=1
exec "$DIR/python/bin/python3.12" "$DIR/run_gui.py"
LAUNCH
chmod +x "$APP/Contents/MacOS/YaraPro"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>YaraPro</string>
  <key>CFBundleDisplayName</key><string>یارا — دستیار هوشمند کسب‌وکار</string>
  <key>CFBundleExecutable</key><string>YaraPro</string>
  <key>CFBundleIdentifier</key><string>com.shofazh.yarapro</string>
  <key>CFBundleVersion</key><string>1.0.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleIconFile</key><string>icon.icns</string>
  <key>LSMinimumSystemVersion</key><string>10.13</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST

# امضای ad-hoc تا بدون اخطار «آسیب‌دیده» اجرا شود
codesign --force --deep -s - "$APP" 2>/dev/null || true

echo "▶ ساخت dmg"
cp -R "$APP" "$BUILD/dmg/"
ln -s /Applications "$BUILD/dmg/Applications"
mkdir -p dist
rm -f dist/YaraPro.dmg
hdiutil create -volname "YaraPro" -srcfolder "$BUILD/dmg" \
    -ov -format UDZO dist/YaraPro.dmg

echo ""
echo "✅ انجام شد: dist/YaraPro.dmg"
