; ============================================================
;   اسکریپت Inno Setup برای ساخت نصب‌کننده‌ی تک‌فایلی
;   خروجی: Output\InvoiceAutomator-Setup.exe
;
;   این فایل پوشه‌ی dist\InvoiceAutomator (خروجی PyInstaller) را
;   که شامل پایتون باندل‌شده است، در یک Setup.exe بسته‌بندی می‌کند.
;   کاربر نهایی نیازی به نصب پایتون ندارد.
;
;   ساخت: build_installer.bat را اجرا کنید (یا ISCC installer.iss).
; ============================================================

#define MyAppName "سامانه ارسال پیش‌فاکتور"
#define MyAppNameEn "InvoiceAutomator"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Shofazh"
#define MyAppExeName "InvoiceAutomator.exe"

[Setup]
AppId={{8F3A7C21-5D4E-4B9A-9C12-INVOICEAUTO01}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
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
; در صورت داشتن آیکن، مسیر آن را اینجا بگذارید:
; SetupIconFile=assets\icon.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "ساخت آیکن روی دسکتاپ"; GroupDescription: "میانبرها:"; Flags: checkedonce

[Files]
; کل خروجی PyInstaller (شامل پایتون و کتابخانه‌ها)
Source: "dist\{#MyAppNameEn}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\حذف {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{userdesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "اجرای برنامه پس از نصب"; Flags: nowait postinstall skipifsilent
