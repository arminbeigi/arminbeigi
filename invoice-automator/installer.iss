; ============================================================
;   اسکریپت Inno Setup — نصب‌کننده‌ی گرافیکی تک‌فایلی
;   خروجی: Output\InvoiceAutomator-Setup.exe
;
;   ویژگی‌ها:
;     • نصب گرافیکی (بدون cmd)
;     • ثبت در «افزودن یا حذف برنامه‌ها»ی ویندوز (Uninstall)
;     • گزینه‌ی ساخت آیکن روی دسکتاپ هنگام نصب
;     • آیکن اختصاصی برنامه
;     • پایتون باندل‌شده (از خروجی PyInstaller) — کاربر به پایتون نیاز ندارد
;
;   ساخت: build_installer.bat را روی ویندوز اجرا کنید.
; ============================================================

#define MyAppName "سامانه ارسال پیش‌فاکتور"
#define MyAppNameEn "InvoiceAutomator"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Shofazh"
#define MyAppURL "https://shofazh.com"
#define MyAppExeName "InvoiceAutomator.exe"

[Setup]
; شناسه‌ی یکتای برنامه (برای به‌روزرسانی/حذف صحیح)
AppId={{6B4C13AE-F73E-430F-8890-9F46F495D657}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppNameEn}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
; نصب در سطح کاربر تا نیازی به دسترسی ادمین نباشد
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=Output
OutputBaseFilename=InvoiceAutomator-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
; آیکن نصب‌کننده و آیکنی که در لیست Uninstall نمایش داده می‌شود
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
; گزینه‌ی ساخت آیکن دسکتاپ (به‌صورت پیش‌فرض تیک‌خورده)
Name: "desktopicon"; Description: "ساخت آیکن روی دسکتاپ"; GroupDescription: "میانبرها:"

[Files]
; کل خروجی PyInstaller (شامل پایتون و کتابخانه‌ها)
Source: "dist\{#MyAppNameEn}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; منوی استارت
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\حذف {#MyAppName}"; Filename: "{uninstallexe}"
; آیکن دسکتاپ (وابسته به انتخاب کاربر)
Name: "{userdesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; اجرای اختیاری برنامه پس از پایان نصب
Filename: "{app}\{#MyAppExeName}"; Description: "اجرای {#MyAppName}"; Flags: nowait postinstall skipifsilent
