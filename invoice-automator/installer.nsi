; ╔══════════════════════════════════════════════════════════════╗
; ║   اسکریپت ساخت نصب‌کننده‌ی «سامانه ارسال پیش‌فاکتور» (NSIS)      ║
; ╚══════════════════════════════════════════════════════════════╝
;
; این فایل را با NSIS کامپایل کنید تا یک Setup.exe مستقل ساخته شود که
; پایتونِ همراه و کل برنامه را نصب می‌کند (بدون نیاز به نصب پایتون روی
; سیستم مقصد).
;
; روش ساده: روی build_installer.bat دابل‌کلیک کنید.
; روش دستی: makensis installer.nsi
;
; پیش‌نیاز: NSIS 3.x  →  https://nsis.sourceforge.io/Download

Unicode true
SetCompressor /SOLID lzma

; ── اطلاعات کلی ──────────────────────────────────────────────────────
!define APP_NAME      "سامانه ارسال پیش‌فاکتور"
!define APP_ID        "InvoiceAutomator"
!define APP_PUBLISHER "Shofazh"
!define APP_VERSION   "1.1.0"
!define APP_EXE       "$INSTDIR\python\pythonw.exe"
!define APP_ARGS      '"$INSTDIR\run_gui.py"'
!define APP_ICON      "assets\icon.ico"

Name "${APP_NAME}"
OutFile "Output\InvoiceAutomator-Setup.exe"
; نصب در پوشه‌ی کاربر تا نیازی به دسترسی Administrator نباشد
InstallDir "$LOCALAPPDATA\Programs\${APP_ID}"
InstallDirRegKey HKCU "Software\${APP_ID}" "InstallDir"
RequestExecutionLevel user

!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_ID}"

; ── رابط مدرن ────────────────────────────────────────────────────────
!include "MUI2.nsh"

!define MUI_ICON   "${APP_ICON}"
!define MUI_UNICON "${APP_ICON}"
!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

; صفحه‌ی پایان + گزینه‌ی اجرای برنامه
!define MUI_FINISHPAGE_RUN "${APP_EXE}"
!define MUI_FINISHPAGE_RUN_PARAMETERS "${APP_ARGS}"
!define MUI_FINISHPAGE_RUN_TEXT "اجرای ${APP_NAME}"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; زبان رابط نصب‌کننده. «English» همیشه در NSIS موجود است؛ متن‌های فارسی
; برنامه (نام، عنوان بخش‌ها و دکمه‌ی اجرا) مستقل از این زبان نمایش داده
; می‌شوند. اگر بسته‌ی زبان فارسی را دارید می‌توانید خط زیر را فعال کنید.
;!insertmacro MUI_LANGUAGE "Farsi"
!insertmacro MUI_LANGUAGE "English"

; ── نصب ──────────────────────────────────────────────────────────────
Section "نصب برنامه" SecMain
  SetOutPath "$INSTDIR"

  ; فایل‌های برنامه (نسخه‌ی همراهِ پایتون + سورس)
  File /r "python"
  File /r "gui"
  File /r "modules"
  File /r "assets"
  File "run_gui.py"
  File /nonfatal "config.example.yaml"
  File /nonfatal "Readme.txt"
  File /nonfatal "تغییرات-جدید.txt"

  ; میانبرها
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut  "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "${APP_EXE}" '${APP_ARGS}' "$INSTDIR\${APP_ICON}"
  CreateShortCut  "$DESKTOP\${APP_NAME}.lnk"                 "${APP_EXE}" '${APP_ARGS}' "$INSTDIR\${APP_ICON}"

  ; uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  CreateShortCut  "$SMPROGRAMS\${APP_NAME}\حذف ${APP_NAME}.lnk" "$INSTDIR\uninstall.exe"

  ; ثبت در «افزودن یا حذف برنامه‌ها»
  WriteRegStr HKCU "Software\${APP_ID}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName"     "${APP_NAME}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion"  "${APP_VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher"       "${APP_PUBLISHER}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon"     "$INSTDIR\${APP_ICON}"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
SectionEnd

; ── حذف ──────────────────────────────────────────────────────────────
Section "Uninstall"
  Delete "$DESKTOP\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\حذف ${APP_NAME}.lnk"
  RMDir  "$SMPROGRAMS\${APP_NAME}"

  RMDir /r "$INSTDIR\python"
  RMDir /r "$INSTDIR\gui"
  RMDir /r "$INSTDIR\modules"
  RMDir /r "$INSTDIR\assets"
  Delete "$INSTDIR\run_gui.py"
  Delete "$INSTDIR\config.example.yaml"
  Delete "$INSTDIR\Readme.txt"
  Delete "$INSTDIR\تغییرات-جدید.txt"
  Delete "$INSTDIR\uninstall.exe"
  RMDir  "$INSTDIR"

  DeleteRegKey HKCU "${UNINST_KEY}"
  DeleteRegKey HKCU "Software\${APP_ID}"
SectionEnd
