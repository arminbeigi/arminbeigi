#!/usr/bin/env bash
# ============================================================
#   ساخت .dmg مک روی لینوکس (best-effort)
#   پایتون مک باندل می‌شود؛ dmg با genisoimage ساخته می‌شود.
#   توجه: روش مطمئن‌تر، اجرای build_on_mac.command روی خود مک است.
#
#   پیش‌نیاز: apt-get install -y genisoimage icnsutils
#   متغیر ARCH:  x86_64-apple-darwin (Intel)  |  aarch64-apple-darwin (Apple Silicon)
# ============================================================
set -euo pipefail
ARCH="${ARCH:-x86_64-apple-darwin}"
PYVER="${PYVER:-3.12.13}"; PBS_TAG="${PBS_TAG:-20260610}"
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/.." && pwd)"
B="$HERE/build"; rm -rf "$B"; mkdir -p "$B/payload"

echo "▶ دانلود پایتون مک ($ARCH)"
curl -fsSL -A "Mozilla/5.0" -o "$B/py.tar.gz" \
  "https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_TAG}/cpython-${PYVER}+${PBS_TAG}-${ARCH}-install_only.tar.gz"
tar xzf "$B/py.tar.gz" -C "$B/payload"
SP="$B/payload/python/lib/python3.12/site-packages"
rm -rf "$B/payload/python/include" "$B/payload/python/share"

PLATS="--platform macosx_10_9_x86_64 --platform macosx_10_12_x86_64 --platform macosx_11_0_x86_64 --platform macosx_12_0_x86_64 --platform macosx_10_9_universal2 --platform macosx_11_0_universal2"
[ "$ARCH" = "aarch64-apple-darwin" ] && PLATS="--platform macosx_11_0_arm64 --platform macosx_12_0_arm64 --platform macosx_13_0_arm64 --platform macosx_14_0_arm64 --platform macosx_11_0_universal2"

echo "▶ نصب کتابخانه‌ها (wheel مک)"
pip install --target "$SP" $PLATS --python-version 312 --abi cp312 --abi abi3 --abi none --only-binary=:all: --upgrade \
    customtkinter cryptography requests darkdetect packaging tkinterdnd2 \
    rubpy aiohttp aiofiles colorama pydantic pydantic-core typing_extensions magic-filter protobuf six
SRC="$B/src"; mkdir -p "$SRC"
pip download --no-deps --no-binary :all: -d "$SRC" aiobale blackboxprotobuf || true
for t in "$SRC"/*.tar.gz; do tar xzf "$t" -C "$SRC"; done
for p in aiobale blackboxprotobuf; do d=$(find "$SRC" -maxdepth 2 -type d -name "$p"|head -1); [ -n "$d" ] && cp -r "$d" "$SP/"; done
rm -rf "$SP"/tkinterdnd2/tkdnd/linux-* "$SP"/tkinterdnd2/tkdnd/win-* 2>/dev/null || true
find "$B/payload" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

echo "▶ ساخت .app"
APP="$B/InvoiceAutomator.app"; RES="$APP/Contents/Resources"
mkdir -p "$RES" "$APP/Contents/MacOS"
cp -R "$B/payload/python" "$RES/python"
cp -R "$REPO/gui" "$REPO/modules" "$REPO/assets" "$RES/"
cp "$REPO/run_gui.py" "$REPO/config.example.yaml" "$RES/"
command -v png2icns >/dev/null && png2icns "$RES/icon.icns" "$REPO/assets/icon.png" >/dev/null 2>&1 || true
printf '#!/bin/bash\nDIR="$(cd "$(dirname "$0")/../Resources" && pwd)"\nexport TK_SILENCE_DEPRECATION=1\nexec "$DIR/python/bin/python3.12" "$DIR/run_gui.py"\n' > "$APP/Contents/MacOS/InvoiceAutomator"
chmod +x "$APP/Contents/MacOS/InvoiceAutomator"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>InvoiceAutomator</string>
  <key>CFBundleExecutable</key><string>InvoiceAutomator</string>
  <key>CFBundleIdentifier</key><string>com.shofazh.invoiceautomator</string>
  <key>CFBundleVersion</key><string>1.0.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleIconFile</key><string>icon.icns</string>
  <key>LSMinimumSystemVersion</key><string>10.13</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST

echo "▶ ساخت dmg"
D="$B/dmg"; rm -rf "$D"; mkdir -p "$D"; cp -R "$APP" "$D/"; ln -s /Applications "$D/Applications"
mkdir -p "$REPO/dist"; rm -f "$REPO/dist/InvoiceAutomator.dmg"
genisoimage -V "InvoiceAutomator" -D -R -apple -no-pad -quiet -o "$REPO/dist/InvoiceAutomator.dmg" "$D"
echo "✅ $REPO/dist/InvoiceAutomator.dmg"
