; نصاب گرافیکی «یارا — دستیار هوشمند کسب‌وکار» — ساخته‌شده با NSIS
; پشتیبانی از آپدیت: اگر نسخه‌ی قبلی نصب باشد، روی همان مسیر بروزرسانی می‌شود.
; تنظیمات و لاگین در %APPDATA%/YaraPro هستند و دست نمی‌خورند.
Unicode true
!include "MUI2.nsh"

!define APPNAME    "یارا — دستیار هوشمند کسب‌وکار"
!define APPNAME_EN "YaraPro"
!define COMPANY    "Shofazh"
!define VERSION    "1.0.0"
!define UNINSTKEY  "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME_EN}"

Name "${APPNAME}"
OutFile "YaraPro-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\YaraPro"
InstallDirRegKey HKCU "${UNINSTKEY}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma

Icon "assets\icon.ico"
UninstallIcon "assets\icon.ico"

VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=1065 "ProductName" "${APPNAME}"
VIAddVersionKey /LANG=1065 "CompanyName" "${COMPANY}"
VIAddVersionKey /LANG=1065 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1065 "FileDescription" "${APPNAME}"
VIAddVersionKey /LANG=1065 "LegalCopyright" "${COMPANY}"

; ── ظاهر ویزارد ──
!define MUI_ICON "assets\icon.ico"
!define MUI_UNICON "assets\icon.ico"
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "اجرای برنامه"
!define MUI_FINISHPAGE_RUN_FUNCTION "LaunchApp"
!define MUI_FINISHPAGE_NOREBOOTSUPPORT

; ── صفحات نصب ──
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; ── صفحات حذف ──
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Farsi"

; اجرای برنامه از صفحه‌ی پایانی
Function LaunchApp
  SetOutPath "$INSTDIR"
  Exec '"$INSTDIR\python\pythonw.exe" "$INSTDIR\run_gui.py"'
FunctionEnd

; ============================================================
;   بخش نصب (نصب تازه + آپدیت روی نسخه‌ی قبلی)
; ============================================================
Section "Install"
  ; بستن برنامه‌ی قبلی اگر در حال اجراست
  nsExec::ExecToLog 'taskkill /F /IM pythonw.exe'
  Sleep 1000

  SetOutPath "$INSTDIR"

  ; حذف فایل‌های قدیمی قبل از کپی نسخه‌ی جدید
  ; (تنظیمات در %APPDATA% هستند و دست نمی‌خورند)
  RMDir /r "$INSTDIR\python"
  RMDir /r "$INSTDIR\gui"
  RMDir /r "$INSTDIR\modules"
  RMDir /r "$INSTDIR\assets"
  Delete "$INSTDIR\run_gui.py"
  Delete "$INSTDIR\run_gui.pyw"

  ; کل محتوای برنامه (پایتون باندل‌شده + کد + آیکن)
  File /r "payload\*"

  ; میانبر دسکتاپ (بازنویسی میانبر قبلی)
  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\python\pythonw.exe" '"$INSTDIR\run_gui.py"' "$INSTDIR\assets\icon.ico" 0

  ; میانبر منوی استارت
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\python\pythonw.exe" '"$INSTDIR\run_gui.py"' "$INSTDIR\assets\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"

  ; حذف‌کننده
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; ثبت در «افزودن یا حذف برنامه‌ها»
  WriteRegStr   HKCU "${UNINSTKEY}" "DisplayName"     "${APPNAME}"
  WriteRegStr   HKCU "${UNINSTKEY}" "DisplayVersion"  "${VERSION}"
  WriteRegStr   HKCU "${UNINSTKEY}" "Publisher"       "${COMPANY}"
  WriteRegStr   HKCU "${UNINSTKEY}" "DisplayIcon"     "$INSTDIR\assets\icon.ico"
  WriteRegStr   HKCU "${UNINSTKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr   HKCU "${UNINSTKEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr   HKCU "${UNINSTKEY}" "QuietUninstallString" '"$INSTDIR\uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "EstimatedSize" 200000
SectionEnd

; ============================================================
;   بخش حذف
; ============================================================
Section "Uninstall"
  nsExec::ExecToLog 'taskkill /F /IM pythonw.exe'
  Sleep 500

  Delete "$DESKTOP\${APPNAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APPNAME}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNINSTKEY}"
  ; تنظیمات در %APPDATA%/YaraPro باقی می‌مانند (حذف نمی‌شوند)
SectionEnd
