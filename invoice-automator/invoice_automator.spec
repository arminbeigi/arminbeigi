# -*- mode: python ; coding: utf-8 -*-
# فایل پیکربندی PyInstaller برای ساخت برنامه‌ی ویندوزی.
# ساخت:  pyinstaller invoice_automator.spec --noconfirm

import customtkinter
import os

ctk_path = os.path.dirname(customtkinter.__file__)

block_cipher = None

a = Analysis(
    ['run_gui.py'],
    pathex=[],
    binaries=[],
    datas=[
        # فایل‌های assets کاستوم‌تی‌کینتر باید همراه برنامه باشند
        (ctk_path, 'customtkinter'),
        # فونت فارسی باندل‌شده
        ('gui/assets/fonts', 'gui/assets/fonts'),
        # آیکن برنامه
        ('assets', 'assets'),
    ],
    hiddenimports=[
        'rubpy',
        'kavenegar',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='InvoiceAutomator',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,           # بدون پنجره‌ی کنسول (برنامه‌ی گرافیکی)
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/icon.ico',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='InvoiceAutomator',
)
