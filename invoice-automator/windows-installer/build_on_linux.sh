#!/usr/bin/env bash
# ============================================================
#   ساخت نصاب گرافیکی ویندوزی (InvoiceAutomator-Setup.exe) روی لینوکس
#
#   این اسکریپت:
#     ۱. پایتون قابل‌حمل ویندوزی (با tkinter) را دانلود می‌کند
#     ۲. کتابخانه‌ها را به‌صورت wheel ویندوزی داخلش نصب می‌کند
#     ۳. کد برنامه را کنار آن می‌چیند (payload)
#     ۴. با NSIS یک Setup.exe گرافیکی می‌سازد
#
#   پیش‌نیاز:  apt-get install -y nsis p7zip-full  +  pip (پایتون لینوکس)
#   اجرا   :  bash windows-installer/build_on_linux.sh
#   خروجی  :  windows-installer/build/InvoiceAutomator-Setup.exe
# ============================================================
set -euo pipefail

PYVER="${PYVER:-3.12.13}"
PBS_TAG="${PBS_TAG:-20260610}"   # تگ ریلیز python-build-standalone
ARCH="x86_64-pc-windows-msvc"

HERE="$(cd "$(dirname "$0")" && pwd)"
APP_ROOT="$(cd "$HERE/.." && pwd)"
BUILD="$HERE/build"
PAYLOAD="$BUILD/payload"

echo "▶ پاک‌سازی و آماده‌سازی پوشه‌ی build"
rm -rf "$BUILD"; mkdir -p "$PAYLOAD"

echo "▶ دانلود پایتون قابل‌حمل ویندوزی ($PYVER)"
URL="https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_TAG}/cpython-${PYVER}+${PBS_TAG}-${ARCH}-install_only.tar.gz"
curl -fsSL -A "Mozilla/5.0" -o "$BUILD/py.tar.gz" "$URL"
tar xzf "$BUILD/py.tar.gz" -C "$PAYLOAD"   # ⇒ $PAYLOAD/python

echo "▶ سبک‌سازی پایتون (حذف فایل‌های زمان‌کامپایل/تست)"
P="$PAYLOAD/python"
rm -rf "$P/include" "$P/libs" "$P/Scripts" \
       "$P/tcl/tix8.4.3" "$P/tcl/nmake" "$P/tcl/dde1.4" "$P/tcl/reg1.3" \
       "$P/Lib/test" "$P/Lib/idlelib" "$P/Lib/ensurepip" "$P/Lib/lib2to3" "$P/Lib/turtledemo" 2>/dev/null || true
rm -f  "$P"/tcl/*.lib "$P"/tcl/*Config.sh "$P"/DLLs/*.lib "$P"/*.pdb 2>/dev/null || true
find "$P" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

echo "▶ نصب کتابخانه‌ها (wheel ویندوزی) داخل پایتون باندل‌شده"
SP="$P/Lib/site-packages"
pip install --target "$SP" --platform win_amd64 --python-version 312 \
    --abi abi3 --abi cp312 --abi none --only-binary=:all: --upgrade \
    customtkinter cryptography requests darkdetect packaging tkinterdnd2
# روبیکا (rubpy) — اکانت شخصی
pip install --target "$SP" --platform win_amd64 --python-version 312 \
    --abi abi3 --abi cp312 --abi none --only-binary=:all: rubpy || \
    echo "⚠ rubpy نصب نشد؛ بقیه‌ی کانال‌ها کار می‌کنند."

# بله (aiobale) — اکانت شخصی. وابستگی‌های باینری به‌صورت wheel ویندوزی:
pip install --target "$SP" --platform win_amd64 --python-version 312 \
    --abi abi3 --abi cp312 --abi none --only-binary=:all: \
    aiohttp aiofiles colorama pydantic pydantic-core typing_extensions \
    magic-filter protobuf six || echo "⚠ برخی وابستگی‌های بله نصب نشد."
# aiobale و blackboxprotobuf فقط sdist دارند و پایتون خالص‌اند؛ به‌جای ساخت
# wheel (که با setuptools سیستم خطا می‌دهد) سورس را مستقیم کپی می‌کنیم.
SRCDL="$BUILD/srcdl"; mkdir -p "$SRCDL"
pip download --no-deps --no-binary :all: -d "$SRCDL" aiobale blackboxprotobuf || true
for tgz in "$SRCDL"/*.tar.gz; do tar xzf "$tgz" -C "$SRCDL"; done
for pkg in aiobale blackboxprotobuf; do
    d=$(find "$SRCDL" -maxdepth 2 -type d -name "$pkg" | head -1)
    if [ -n "$d" ]; then cp -r "$d" "$SP/"; echo "   ✅ کپی $pkg"; else echo "   ⚠ $pkg یافت نشد"; fi
done

echo "▶ چیدن کد برنامه در payload"
cp -r "$APP_ROOT/gui" "$APP_ROOT/modules" "$APP_ROOT/assets" "$PAYLOAD/"
cp "$APP_ROOT/run_gui.py" "$APP_ROOT/config.example.yaml" "$PAYLOAD/"
# توجه: نام فایل‌ها داخل payload باید ASCII باشد (makensis روی لینوکس با اسم
# غیر‌ASCII کرش می‌کند)، بنابراین راهنما را با نام انگلیسی کپی می‌کنیم.
cp "$APP_ROOT/راهنمای-نصب.txt" "$PAYLOAD/Readme.txt" 2>/dev/null || true
find "$PAYLOAD" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

echo "▶ کپی آیکن و اسکریپت NSIS"
mkdir -p "$BUILD/assets"
cp "$APP_ROOT/assets/icon.ico" "$BUILD/assets/"
cp "$HERE/installer.nsi" "$BUILD/installer.nsi"

echo "▶ کامپایل نصاب با NSIS"
( cd "$BUILD" && makensis -V2 installer.nsi )

echo ""
echo "✅ انجام شد: $BUILD/InvoiceAutomator-Setup.exe"
ls -lh "$BUILD/InvoiceAutomator-Setup.exe"
