"""
برنامه‌ی گرافیکی ارسال خودکار پیش‌فاکتور — نسخه‌ی ویندوز.

ساخته‌شده با CustomTkinter. شامل:
  • صفحه‌ی ورود/تنظیمات جداگانه برای هر پیام‌رسان
  • انتخاب اینکه از کدام پیام‌رسان‌ها استفاده شود
  • انتخاب دستی فایل PDF و ارسال هم‌زمان
  • ذخیره‌ی محلی رمزنگاری‌شده‌ی اطلاعات ورود
"""

import os
import sys
import queue
import threading
from pathlib import Path

import customtkinter as ctk
from tkinter import filedialog, messagebox

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from gui import settings_store as store
from gui import core
from gui import license as lic
from gui.fonts import load_persian_font, app_icon_path
from gui.theme import COLORS, CHANNELS, FONT_FALLBACK

# کشیدن‌ورهاکردن فایل (اختیاری؛ اگر نبود، بی‌خطا نادیده گرفته می‌شود)
try:
    from tkinterdnd2 import TkinterDnD, DND_FILES
    _DND_OK = True
except Exception:
    _DND_OK = False

if _DND_OK:
    class _AppBase(ctk.CTk, TkinterDnD.DnDWrapper):
        pass
else:
    _AppBase = ctk.CTk

# خانواده‌ی فونت فعال؛ پس از فراخوانی load_persian_font مقداردهی می‌شود
_FONT_FAMILY = FONT_FALLBACK


def _font(size=14, weight="normal"):
    return ctk.CTkFont(family=_FONT_FAMILY, size=size, weight=weight)


class ChannelCard(ctk.CTkFrame):
    """کارت تنظیمات یک پیام‌رسان در صفحه‌ی تنظیمات."""

    def __init__(self, master, channel: dict, settings: dict, on_test):
        super().__init__(master, fg_color=COLORS["card"], corner_radius=14,
                         border_width=1, border_color=COLORS["border"])
        self.channel = channel
        self.key = channel["key"]
        self.settings = settings
        self.on_test = on_test
        self.field_vars: dict[str, ctk.StringVar] = {}

        self.grid_columnconfigure(0, weight=1)

        # ── سرتیتر: آیکن + عنوان + سوییچ فعال‌سازی ──
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=18, pady=(16, 6))
        header.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(header, text=channel["icon"], font=_font(26)).grid(
            row=0, column=0, rowspan=2, padx=(0, 12))
        ctk.CTkLabel(header, text=channel["title"], font=_font(17, "bold"),
                     text_color=COLORS["text"], anchor="w").grid(
            row=0, column=1, sticky="w")
        ctk.CTkLabel(header, text=channel["desc"], font=_font(12),
                     text_color=COLORS["text_dim"], anchor="w").grid(
            row=1, column=1, sticky="w")

        self.enabled_var = ctk.BooleanVar(value=settings[self.key].get("enabled", False))
        self.switch = ctk.CTkSwitch(
            header, text="فعال", variable=self.enabled_var, font=_font(13),
            progress_color=COLORS["accent"], command=self._on_toggle)
        self.switch.grid(row=0, column=2, rowspan=2, padx=(12, 0))

        # ── بدنه: یا فیلدهای ورودی، یا UI لاگین تلفنی ──
        if channel.get("login"):
            self._build_login_ui()
            self._build_help_footer()
            self._on_toggle()
            return

        body = ctk.CTkFrame(self, fg_color="transparent")
        body.grid(row=1, column=0, sticky="ew", padx=18, pady=(4, 8))
        body.grid_columnconfigure(0, weight=1)

        for i, (fkey, label, placeholder, secret) in enumerate(channel["fields"]):
            ctk.CTkLabel(body, text=label, font=_font(12, "bold"),
                         text_color=COLORS["text_dim"], anchor="e").grid(
                row=i * 2, column=0, sticky="ew", pady=(8, 2))

            var = ctk.StringVar(value=settings[self.key].get(fkey, ""))
            self.field_vars[fkey] = var

            if fkey == "template":
                # قالب پیام چندخطی
                box = ctk.CTkTextbox(body, height=90, font=_font(13),
                                     fg_color=COLORS["input"], border_width=1,
                                     border_color=COLORS["border"], corner_radius=8)
                box.grid(row=i * 2 + 1, column=0, sticky="ew")
                box.insert("1.0", settings[self.key].get(fkey, ""))
                self.field_vars[fkey] = box  # textbox به‌جای StringVar
            else:
                entry = ctk.CTkEntry(
                    body, textvariable=var, placeholder_text=placeholder,
                    font=_font(13), fg_color=COLORS["input"], justify="right",
                    border_color=COLORS["border"], corner_radius=8, height=38,
                    show="•" if secret else "")
                entry.grid(row=i * 2 + 1, column=0, sticky="ew")

        self._build_help_footer()
        self._on_toggle()

    def _build_help_footer(self):
        # ── راهنما ──
        if self.channel.get("help"):
            ctk.CTkLabel(self, text="ℹ " + self.channel["help"], font=_font(11),
                         text_color=COLORS["text_dim"], anchor="e",
                         wraplength=560, justify="right").grid(
                row=2, column=0, sticky="ew", padx=18, pady=(0, 8))

        # ── دکمه‌ی تست/وضعیت ──
        footer = ctk.CTkFrame(self, fg_color="transparent")
        footer.grid(row=3, column=0, sticky="ew", padx=18, pady=(0, 16))
        footer.grid_columnconfigure(0, weight=1)

        self.status_lbl = ctk.CTkLabel(footer, text="", font=_font(12), anchor="e")
        self.status_lbl.grid(row=0, column=0, sticky="ew", padx=(0, 10))

        ctk.CTkButton(footer, text="بررسی وضعیت", width=110, font=_font(13),
                      fg_color=COLORS["accent_dim"], hover_color=COLORS["accent"],
                      command=self._test).grid(row=0, column=1)

    # ──────────────────────────── UI لاگین تلفنی (بله/روبیکا)
    def _build_login_ui(self):
        from gui.messenger_login import rubika_login, bale_login
        self._manager = {"rubika": rubika_login, "bale": bale_login}[self.key]

        body = ctk.CTkFrame(self, fg_color="transparent")
        body.grid(row=1, column=0, sticky="ew", padx=18, pady=(4, 8))
        body.grid_columnconfigure(0, weight=1)

        # وضعیت لاگین
        self.login_status = ctk.CTkLabel(body, font=_font(13, "bold"), anchor="e")
        self.login_status.grid(row=0, column=0, sticky="ew", pady=(4, 8))

        # شماره
        ctk.CTkLabel(body, text="شماره موبایل (همین اکانت)", font=_font(12, "bold"),
                     text_color=COLORS["text_dim"], anchor="e").grid(
            row=1, column=0, sticky="ew", pady=(4, 2))
        self.login_phone = ctk.StringVar(value=self.settings[self.key].get("phone", ""))
        self.phone_entry = ctk.CTkEntry(
            body, textvariable=self.login_phone, placeholder_text="09xxxxxxxxx",
            font=_font(13), fg_color=COLORS["input"], justify="right",
            border_color=COLORS["border"], corner_radius=8, height=38)
        self.phone_entry.grid(row=2, column=0, sticky="ew")

        self.send_code_btn = ctk.CTkButton(
            body, text="ارسال کد تأیید", height=38, font=_font(13),
            fg_color=COLORS["accent"], hover_color=COLORS["accent_hover"],
            command=self._send_code)
        self.send_code_btn.grid(row=3, column=0, sticky="ew", pady=(8, 4))

        # کد تأیید (ابتدا غیرفعال)
        ctk.CTkLabel(body, text="کد تأیید پیامک‌شده", font=_font(12, "bold"),
                     text_color=COLORS["text_dim"], anchor="e").grid(
            row=4, column=0, sticky="ew", pady=(8, 2))
        self.login_code = ctk.StringVar()
        self.code_entry = ctk.CTkEntry(
            body, textvariable=self.login_code, placeholder_text="------",
            font=_font(13), fg_color=COLORS["input"], justify="right",
            border_color=COLORS["border"], corner_radius=8, height=38)
        self.code_entry.grid(row=5, column=0, sticky="ew")
        self.code_entry.configure(state="disabled")

        self.verify_btn = ctk.CTkButton(
            body, text="تأیید و ورود", height=38, font=_font(13),
            fg_color=COLORS["success"], hover_color="#1ea34f",
            command=self._verify_code, state="disabled")
        self.verify_btn.grid(row=6, column=0, sticky="ew", pady=(8, 4))

        self.logout_btn = ctk.CTkButton(
            body, text="خروج از حساب", height=34, font=_font(12),
            fg_color="transparent", border_width=1, border_color=COLORS["danger"],
            text_color=COLORS["danger"], hover_color=COLORS["card_hover"],
            command=self._do_logout)
        self.logout_btn.grid(row=7, column=0, sticky="ew", pady=(2, 4))

        self._refresh_login_state()

    def _refresh_login_state(self):
        info = self.settings[self.key]
        if info.get("logged_in"):
            self.login_status.configure(
                text=f"✅ وارد شده با شماره {info.get('phone','')}",
                text_color=COLORS["success"])
            self.logout_btn.configure(state="normal")
        else:
            self.login_status.configure(text="⚠ هنوز وارد نشده‌اید",
                                        text_color=COLORS["warning"])
            self.logout_btn.configure(state="disabled")
        # دکمه خروج همیشه دیده می‌شود (در حالت غیرلاگین غیرفعال است)
        self.logout_btn.grid()

    def _busy(self, btn, text):
        btn.configure(state="disabled", text=text)

    def _send_code(self):
        phone = self.login_phone.get().strip()
        if not core.is_valid_phone(phone):
            self.login_status.configure(text="⚠ شماره باید 09xxxxxxxxx باشد",
                                        text_color=COLORS["danger"])
            return
        self._busy(self.send_code_btn, "در حال ارسال کد…")

        def worker():
            ok, msg = self._manager.send_code(phone)
            def done():
                self.send_code_btn.configure(state="normal", text="ارسال مجدد کد")
                color = COLORS["success"] if ok else COLORS["danger"]
                self.login_status.configure(text=("📩 " if ok else "❌ ") + msg, text_color=color)
                if ok:
                    self.code_entry.configure(state="normal")
                    self.verify_btn.configure(state="normal")
            self.after(0, done)
        threading.Thread(target=worker, daemon=True).start()

    def _verify_code(self):
        code = self.login_code.get().strip()
        if not code:
            return
        self._busy(self.verify_btn, "در حال ورود…")

        def worker():
            ok, msg, phone = self._manager.verify_code(code)
            def done():
                self.verify_btn.configure(state="normal", text="تأیید و ورود")
                if ok:
                    self.settings[self.key].update(
                        enabled=True, logged_in=True,
                        phone=phone or self.login_phone.get().strip())
                    self.enabled_var.set(True)
                    try:
                        store.save_settings(self.settings)
                    except Exception:
                        pass
                    self.code_entry.configure(state="disabled")
                    self.verify_btn.configure(state="disabled")
                    self._refresh_login_state()
                    self._on_toggle()
                else:
                    self.login_status.configure(text="❌ " + msg, text_color=COLORS["danger"])
            self.after(0, done)
        threading.Thread(target=worker, daemon=True).start()

    def _do_logout(self):
        ok, msg = self._manager.logout()
        self.settings[self.key].update(logged_in=False, phone="")
        try:
            store.save_settings(self.settings)
        except Exception:
            pass
        self._refresh_login_state()

    def _on_toggle(self):
        # کم‌رنگ کردن کارت در حالت غیرفعال (صرفاً ظاهری)
        self.configure(border_color=COLORS["accent"] if self.enabled_var.get()
                       else COLORS["border"])

    def collect(self) -> dict:
        """جمع‌آوری مقادیر فعلی فیلدها."""
        if self.channel.get("login"):
            # برای کانال‌های لاگین، وضعیت لاگین حفظ می‌شود
            data = dict(self.settings.get(self.key, {}))
            data["enabled"] = self.enabled_var.get()
            return data
        data = {"enabled": self.enabled_var.get()}
        for fkey, widget in self.field_vars.items():
            if isinstance(widget, ctk.CTkTextbox):
                data[fkey] = widget.get("1.0", "end").strip()
            else:
                data[fkey] = widget.get().strip()
        return data

    def _test(self):
        self.status_lbl.configure(text="در حال بررسی…", text_color=COLORS["text_dim"])
        data = self.collect()
        self.settings[self.key].update(data)
        self.on_test(self.key, self.status_lbl)


class InvoiceApp(_AppBase):
    def __init__(self):
        super().__init__()
        self.settings = store.load_settings()

        # بارگذاری فونت فارسی باندل‌شده پیش از ساخت رابط
        global _FONT_FAMILY
        _FONT_FAMILY = load_persian_font()

        ctk.set_appearance_mode(self.settings.get("appearance", "system"))
        ctk.set_default_color_theme("blue")

        self.title("سامانه ارسال پیش‌فاکتور")
        self.geometry("1040x720")
        self.minsize(900, 640)
        self.configure(fg_color=COLORS["bg"])

        # آیکن پنجره و نوار وظیفه
        icon = app_icon_path()
        if icon:
            try:
                self.iconbitmap(icon)
            except Exception:
                pass

        self.selected_file: str | None = None
        self.channel_check_vars: dict[str, ctk.BooleanVar] = {}
        self.log_queue: queue.Queue = queue.Queue()

        self._build_layout()
        self._show_send()
        self._poll_log()
        self._setup_dnd()
        self.after(300, self._check_license_on_start)

    # ──────────────────────────────────────────────── لایسنس
    def _check_license_on_start(self):
        self._refresh_license_badge()
        if not lic.is_usable():
            self._open_activation()

    def _refresh_license_badge(self):
        st = lic.status()
        if not hasattr(self, "license_badge"):
            return
        if st["state"] == "active":
            d = st.get("days_left")
            txt = "✅ نسخه فعال" + (f" ({d} روز)" if d else " (دائمی)")
            col = COLORS["success"]
        elif st["state"] == "trial":
            txt = f"⏳ تست رایگان: {st['days_left']} روز"
            col = COLORS["warning"]
        else:
            txt = "🔒 غیرفعال — فعال‌سازی"
            col = COLORS["danger"]
        self.license_badge.configure(text=txt, text_color=col)

    def _open_activation(self):
        win = ctk.CTkToplevel(self)
        win.title("فعال‌سازی کارا")
        win.geometry("460x420")
        win.configure(fg_color=COLORS["bg"])
        win.transient(self)
        try:
            win.grab_set()
        except Exception:
            pass

        ctk.CTkLabel(win, text="🔑 فعال‌سازی کارا", font=_font(20, "bold"),
                     text_color=COLORS["text"]).pack(pady=(24, 4))
        ctk.CTkLabel(win, text="کلید لایسنسی که هنگام خرید دریافت کردید را وارد کنید.",
                     font=_font(12), text_color=COLORS["text_dim"], wraplength=400).pack(pady=(0, 16))

        key_var = ctk.StringVar()
        ctk.CTkEntry(win, textvariable=key_var, placeholder_text="XXXX-XXXX-XXXX-XXXX",
                     font=_font(14), justify="center", width=380, height=42,
                     fg_color=COLORS["input"], border_color=COLORS["border"]).pack(pady=(0, 6))

        status_lbl = ctk.CTkLabel(win, text="", font=_font(12), wraplength=400)
        status_lbl.pack(pady=(2, 8))

        def do_activate():
            status_lbl.configure(text="در حال فعال‌سازی…", text_color=COLORS["text_dim"])
            def worker():
                ok, msg = lic.activate(key_var.get())
                def done():
                    status_lbl.configure(text=("✅ " if ok else "❌ ") + msg,
                                         text_color=COLORS["success"] if ok else COLORS["danger"])
                    if ok:
                        self._refresh_license_badge()
                        win.after(1200, win.destroy)
                self.after(0, done)
            threading.Thread(target=worker, daemon=True).start()

        def do_trial():
            ok, msg = lic.start_trial()
            status_lbl.configure(text=("✅ " if ok else "❌ ") + msg,
                                 text_color=COLORS["success"] if ok else COLORS["danger"])
            if ok:
                self._refresh_license_badge()
                win.after(1000, win.destroy)

        ctk.CTkButton(win, text="فعال‌سازی", height=44, font=_font(15, "bold"),
                      fg_color=COLORS["accent"], hover_color=COLORS["accent_hover"],
                      command=do_activate).pack(fill="x", padx=40, pady=(6, 6))
        ctk.CTkButton(win, text=f"شروع تست رایگان {lic.TRIAL_DAYS} روزه", height=40, font=_font(13),
                      fg_color=COLORS["card"], hover_color=COLORS["card_hover"],
                      command=do_trial).pack(fill="x", padx=40, pady=2)
        ctk.CTkButton(win, text="خرید لایسنس 🛒", height=36, font=_font(13),
                      fg_color="transparent", border_width=1, border_color=COLORS["accent"],
                      text_color=COLORS["accent"], hover_color=COLORS["card_hover"],
                      command=lambda: __import__("webbrowser").open(lic.store_url())).pack(
            fill="x", padx=40, pady=(8, 4))

    def _setup_dnd(self):
        """فعال‌سازی کشیدن‌ورهاکردن فایل روی پنجره."""
        if not _DND_OK:
            return
        try:
            self.TkdndVersion = TkinterDnD._require(self)
            self.drop_target_register(DND_FILES)
            self.dnd_bind("<<Drop>>", self._on_drop)
        except Exception:
            pass

    def _on_drop(self, event):
        import re
        data = getattr(event, "data", "") or ""
        matches = re.findall(r"\{[^}]*\}|\S+", data)
        if not matches:
            return
        path = matches[0].strip("{}").strip()
        if path:
            self.selected_file = path
            self._show_send()           # نمایش صفحه‌ی ارسال و پیش‌پر شدن فیلدها
            self._refresh_file_label()

    # ──────────────────────────────────────────────── چیدمان کلی
    def _build_layout(self):
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # نوار کناری (سمت راست برای حس RTL)
        sidebar = ctk.CTkFrame(self, fg_color=COLORS["sidebar"], corner_radius=0, width=230)
        sidebar.grid(row=0, column=0, sticky="nsw")
        sidebar.grid_propagate(False)

        ctk.CTkLabel(sidebar, text="🧾", font=_font(40)).pack(pady=(28, 4))
        ctk.CTkLabel(sidebar, text="ارسال پیش‌فاکتور", font=_font(18, "bold"),
                     text_color=COLORS["text"]).pack()
        ctk.CTkLabel(sidebar, text="Invoice Automator", font=_font(11),
                     text_color=COLORS["text_dim"]).pack(pady=(0, 24))

        self.nav_buttons = {}
        for key, label, icon in [("send", "ارسال فاکتور", "📤"),
                                  ("settings", "تنظیمات پیام‌رسان‌ها", "⚙")]:
            btn = ctk.CTkButton(
                sidebar, text=f"  {icon}  {label}", anchor="e", height=46,
                font=_font(14), corner_radius=10, fg_color="transparent",
                hover_color=COLORS["card"], text_color=COLORS["text"],
                command=lambda k=key: self._navigate(k))
            btn.pack(fill="x", padx=14, pady=4)
            self.nav_buttons[key] = btn

        # سوییچ تم در پایین نوار کناری
        theme_frame = ctk.CTkFrame(sidebar, fg_color="transparent")
        theme_frame.pack(side="bottom", fill="x", padx=14, pady=18)
        self.theme_menu = ctk.CTkOptionMenu(
            theme_frame, values=["dark", "light", "system"],
            command=self._change_theme, font=_font(12),
            fg_color=COLORS["card"], button_color=COLORS["accent"])
        self.theme_menu.set(self.settings.get("appearance", "system"))
        self.theme_menu.pack(fill="x")
        ctk.CTkLabel(theme_frame, text="حالت نمایش", font=_font(11),
                     text_color=COLORS["text_dim"]).pack(pady=(4, 0))

        # نشان وضعیت لایسنس (کلیک = فعال‌سازی)
        self.license_badge = ctk.CTkLabel(theme_frame, text="", font=_font(12, "bold"),
                                          text_color=COLORS["text_dim"], cursor="hand2")
        self.license_badge.pack(pady=(12, 0))
        self.license_badge.bind("<Button-1>", lambda e: self._open_activation())

        # ناحیه‌ی محتوای اصلی
        self.content = ctk.CTkFrame(self, fg_color=COLORS["bg"], corner_radius=0)
        self.content.grid(row=0, column=1, sticky="nsew")
        self.content.grid_columnconfigure(0, weight=1)
        self.content.grid_rowconfigure(0, weight=1)

    def _navigate(self, key):
        for k, btn in self.nav_buttons.items():
            btn.configure(fg_color=COLORS["accent"] if k == key else "transparent")
        if key == "send":
            self._show_send()
        else:
            self._show_settings()

    def _clear_content(self):
        for w in self.content.winfo_children():
            w.destroy()

    # ──────────────────────────────────────────────── صفحه‌ی ارسال
    def _show_send(self):
        self._navigate_buttons("send")
        self._clear_content()

        page = ctk.CTkScrollableFrame(self.content, fg_color="transparent")
        page.grid(row=0, column=0, sticky="nsew", padx=30, pady=24)
        page.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(page, text="ارسال پیش‌فاکتور", font=_font(24, "bold"),
                     text_color=COLORS["text"], anchor="e").grid(
            row=0, column=0, sticky="ew")
        ctk.CTkLabel(page, text="فایل PDF را انتخاب کنید، شماره مشتری را وارد یا تأیید کنید و پیام‌رسان‌ها را مشخص کنید.",
                     font=_font(13), text_color=COLORS["text_dim"], anchor="e").grid(
            row=1, column=0, sticky="ew", pady=(0, 18))

        # کارت انتخاب فایل
        file_card = ctk.CTkFrame(page, fg_color=COLORS["card"], corner_radius=14,
                                 border_width=1, border_color=COLORS["border"])
        file_card.grid(row=2, column=0, sticky="ew")
        file_card.grid_columnconfigure(0, weight=1)

        self.file_label = ctk.CTkLabel(
            file_card, text="هنوز فایلی انتخاب نشده است  —  فایل را می‌توانید اینجا رها کنید (Drag & Drop)",
            font=_font(14), text_color=COLORS["text_dim"], anchor="e")
        self.file_label.grid(row=0, column=0, sticky="ew", padx=20, pady=(18, 4))

        self.info_label = ctk.CTkLabel(
            file_card, text="", font=_font(13), text_color=COLORS["accent"], anchor="e")
        self.info_label.grid(row=1, column=0, sticky="ew", padx=20, pady=(0, 8))

        ctk.CTkButton(file_card, text="📂 انتخاب فایل PDF", height=44, width=180,
                      font=_font(14, "bold"), corner_radius=10,
                      fg_color=COLORS["accent"], hover_color=COLORS["accent_hover"],
                      command=self._pick_file).grid(row=2, column=0, padx=20,
                                                     pady=(0, 18), sticky="e")

        # کارت اطلاعات مشتری (ورود دستی / تأیید)
        info_card = ctk.CTkFrame(page, fg_color=COLORS["card"], corner_radius=14,
                                 border_width=1, border_color=COLORS["border"])
        info_card.grid(row=3, column=0, sticky="ew", pady=18)
        info_card.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(info_card, text="اطلاعات مشتری", font=_font(15, "bold"),
                     text_color=COLORS["text"], anchor="e").grid(
            row=0, column=0, sticky="ew", padx=20, pady=(16, 2))
        ctk.CTkLabel(info_card,
                     text="در صورت انتخاب فایل، این فیلدها از روی نام فایل پیش‌پر می‌شوند؛ می‌توانید تغییر دهید.",
                     font=_font(11), text_color=COLORS["text_dim"], anchor="e",
                     wraplength=600, justify="right").grid(
            row=1, column=0, sticky="ew", padx=20, pady=(0, 8))

        fields_box = ctk.CTkFrame(info_card, fg_color="transparent")
        fields_box.grid(row=2, column=0, sticky="ew", padx=20, pady=(0, 18))
        fields_box.grid_columnconfigure(0, weight=1)

        self.phone_var = ctk.StringVar()
        self.serial_var = ctk.StringVar()
        self.name_var = ctk.StringVar()
        self.phone_entry = None

        r = 0
        for var, label, placeholder in [
            (self.phone_var, "شماره موبایل مشتری *", "09xxxxxxxxx"),
            (self.serial_var, "شماره فاکتور (اختیاری)", "مثلاً 1821"),
            (self.name_var, "نام مشتری (اختیاری)", "مثلاً آقای مشیری"),
        ]:
            ctk.CTkLabel(fields_box, text=label, font=_font(12, "bold"),
                         text_color=COLORS["text_dim"], anchor="e").grid(
                row=r, column=0, sticky="ew", pady=(8, 2))
            r += 1
            if var is self.phone_var:
                # فیلد شماره به‌صورت combobox با تاریخچه‌ی شماره‌های قبلی (اتوفیل)
                history = list(self.settings.get("phone_history", []))
                entry = ctk.CTkComboBox(
                    fields_box, variable=var, values=history,
                    font=_font(14), fg_color=COLORS["input"], justify="right",
                    border_color=COLORS["border"], corner_radius=8, height=40,
                    button_color=COLORS["accent"], button_hover_color=COLORS["accent_hover"],
                    command=lambda _v: self._validate_phone_live())
                entry.grid(row=r, column=0, sticky="ew")
                r += 1
                self.phone_entry = entry
                self.phone_hint = ctk.CTkLabel(fields_box, text="", font=_font(11),
                                               text_color=COLORS["text_dim"], anchor="e")
                self.phone_hint.grid(row=r, column=0, sticky="ew", pady=(2, 0))
                r += 1
            else:
                entry = ctk.CTkEntry(fields_box, textvariable=var, placeholder_text=placeholder,
                                     font=_font(14), fg_color=COLORS["input"], justify="right",
                                     border_color=COLORS["border"], corner_radius=8, height=40)
                entry.grid(row=r, column=0, sticky="ew")
                r += 1

        # اعتبارسنجی زنده هنگام تایپ
        self.phone_var.trace_add("write", lambda *_: self._validate_phone_live())
        self._validate_phone_live()

        # کارت انتخاب کانال‌ها
        ch_card = ctk.CTkFrame(page, fg_color=COLORS["card"], corner_radius=14,
                               border_width=1, border_color=COLORS["border"])
        ch_card.grid(row=4, column=0, sticky="ew", pady=(0, 18))
        ch_card.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(ch_card, text="ارسال از طریق:", font=_font(15, "bold"),
                     text_color=COLORS["text"], anchor="e").grid(
            row=0, column=0, sticky="ew", padx=20, pady=(16, 8))

        avail = core.available_channels(self.settings)
        self.channel_check_vars = {}

        row = 1
        if not avail:
            ctk.CTkLabel(
                ch_card,
                text="هیچ پیام‌رسانی فعال نشده است. ابتدا از بخش «تنظیمات پیام‌رسان‌ها» اطلاعات ورود را وارد کنید.",
                font=_font(13), text_color=COLORS["warning"], anchor="e",
                wraplength=600, justify="right").grid(
                row=row, column=0, sticky="ew", padx=20, pady=(0, 16))
        else:
            for ch in CHANNELS:
                if ch["key"] not in avail:
                    continue
                var = ctk.BooleanVar(value=True)
                self.channel_check_vars[ch["key"]] = var
                cb = ctk.CTkCheckBox(
                    ch_card, text=f"  {ch['icon']}  {ch['title']}", variable=var,
                    font=_font(14), checkbox_width=24, checkbox_height=24,
                    fg_color=COLORS["accent"], hover_color=COLORS["accent_hover"])
                cb.grid(row=row, column=0, sticky="e", padx=24, pady=6)
                row += 1
            ctk.CTkLabel(ch_card, text="", height=8).grid(row=row, column=0)

        # دکمه‌ی ارسال
        self.send_btn = ctk.CTkButton(
            page, text="🚀 شروع ارسال", height=52, font=_font(16, "bold"),
            corner_radius=12, fg_color=COLORS["success"], hover_color="#1ea34f",
            command=self._start_send)
        self.send_btn.grid(row=5, column=0, sticky="ew", pady=(6, 14))

        # ناحیه‌ی لاگ زنده
        ctk.CTkLabel(page, text="گزارش زنده", font=_font(15, "bold"),
                     text_color=COLORS["text"], anchor="e").grid(
            row=6, column=0, sticky="ew", pady=(8, 4))
        self.log_box = ctk.CTkTextbox(page, height=200, font=_font(13),
                                      fg_color=COLORS["input"], corner_radius=10,
                                      border_width=1, border_color=COLORS["border"])
        self.log_box.grid(row=7, column=0, sticky="ew")
        self.log_box.configure(state="disabled")

        if self.selected_file:
            self._refresh_file_label()

    def _navigate_buttons(self, active):
        for k, btn in self.nav_buttons.items():
            btn.configure(fg_color=COLORS["accent"] if k == active else "transparent")

    def _pick_file(self):
        path = filedialog.askopenfilename(
            title="انتخاب فایل پیش‌فاکتور یا عکس",
            filetypes=[
                ("فایل‌های مجاز", "*.pdf *.jpg *.jpeg *.png *.webp *.gif *.bmp *.tif *.tiff"),
                ("PDF", "*.pdf"),
                ("تصویر", "*.jpg *.jpeg *.png *.webp *.gif *.bmp *.tif *.tiff"),
                ("همه فایل‌ها", "*.*"),
            ])
        if path:
            self.selected_file = path
            self._refresh_file_label()

    def _refresh_file_label(self):
        self.file_label.configure(text=os.path.basename(self.selected_file),
                                  text_color=COLORS["text"])
        # تلاش برای پیش‌پرکردن فیلدهای مشتری از روی نام فایل (بدون اجبار)
        try:
            info = core.analyze_file(self.selected_file)
            self.phone_var.set(info.get("phone") or "")
            self.serial_var.set(info.get("serial") or "")
            self.name_var.set(info.get("name") or "")
            self.info_label.configure(
                text="✅ اطلاعات از نام فایل پیش‌پر شد (در صورت نیاز ویرایش کنید).",
                text_color=COLORS["success"])
        except ValueError:
            self.info_label.configure(
                text="⚠ شماره‌ای در نام فایل یافت نشد — لطفاً شماره مشتری را دستی وارد کنید.",
                text_color=COLORS["warning"])

    def _validate_phone_live(self):
        """تغییر رنگ حاشیه و پیام راهنمای فیلد شماره هنگام تایپ."""
        if not getattr(self, "phone_entry", None):
            return
        phone = self.phone_var.get().strip()
        if not phone:
            self.phone_entry.configure(border_color=COLORS["border"])
            self.phone_hint.configure(text="", text_color=COLORS["text_dim"])
        elif core.is_valid_phone(phone):
            self.phone_entry.configure(border_color=COLORS["success"])
            self.phone_hint.configure(text="✅ شماره معتبر است.", text_color=COLORS["success"])
        else:
            self.phone_entry.configure(border_color=COLORS["danger"])
            self.phone_hint.configure(
                text="⚠ شماره باید با 09 شروع شود و ۱۱ رقم باشد.",
                text_color=COLORS["danger"])

    def _record_phone_history(self, phone: str):
        """افزودن شماره به ابتدای تاریخچه (یکتا، حداکثر ۲۰ مورد) و ذخیره."""
        hist = list(self.settings.get("phone_history", []))
        if phone in hist:
            hist.remove(phone)
        hist.insert(0, phone)
        self.settings["phone_history"] = hist[:20]
        try:
            store.save_settings(self.settings)
        except Exception:
            pass
        # به‌روزرسانی مقادیر combobox
        try:
            self.phone_entry.configure(values=self.settings["phone_history"])
        except Exception:
            pass

    def _log(self, msg: str):
        self.log_queue.put(msg)

    def _poll_log(self):
        try:
            while True:
                msg = self.log_queue.get_nowait()
                self.log_box.configure(state="normal")
                self.log_box.insert("end", msg + "\n")
                self.log_box.see("end")
                self.log_box.configure(state="disabled")
        except queue.Empty:
            pass
        self.after(120, self._poll_log)

    def _start_send(self):
        if not lic.is_usable():
            messagebox.showwarning("فعال‌سازی لازم است",
                                   "برای ارسال، ابتدا برنامه را فعال کنید یا تست رایگان را شروع کنید.")
            self._open_activation()
            return
        if not self.selected_file:
            messagebox.showwarning("توجه", "ابتدا یک فایل PDF انتخاب کنید.")
            return

        phone = self.phone_var.get().strip()
        if not phone:
            messagebox.showwarning("توجه", "شماره موبایل مشتری را وارد کنید.")
            return
        if not core.is_valid_phone(phone):
            if not messagebox.askyesno(
                "بررسی شماره",
                f"شماره «{phone}» در قالب استاندارد 09xxxxxxxxx نیست.\nمی‌خواهید با همین شماره ادامه دهید؟"):
                return

        channels = [k for k, v in self.channel_check_vars.items() if v.get()]
        if not channels:
            messagebox.showwarning("توجه", "حداقل یک پیام‌رسان را انتخاب کنید.")
            return

        info = {
            "phone": phone,
            "serial": self.serial_var.get().strip(),
            "name": self.name_var.get().strip() or None,
        }

        # ثبت شماره در تاریخچه‌ی اتوفیل
        self._record_phone_history(phone)

        self.send_btn.configure(state="disabled", text="در حال ارسال…")
        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.configure(state="disabled")

        def worker():
            try:
                core.process_pdf(self.selected_file, self.settings, channels,
                                 log=self._log, info=info)
            except Exception as e:
                self._log(f"❌ خطای غیرمنتظره: {e}")
            finally:
                self.after(0, lambda: self.send_btn.configure(
                    state="normal", text="🚀 شروع ارسال"))

        threading.Thread(target=worker, daemon=True).start()

    def _insert_welcome(self, text: str):
        """درج متغیر/ایموجی در محل مکان‌نما در باکس متن خوش‌آمد."""
        try:
            self.welcome_box.insert("insert", text)
            self.welcome_box.focus_set()
        except Exception:
            try:
                self.welcome_box.insert("end", text)
            except Exception:
                pass

    # ──────────────────────────────────────────────── صفحه‌ی تنظیمات
    def _show_settings(self):
        self._navigate_buttons("settings")
        self._clear_content()

        wrapper = ctk.CTkFrame(self.content, fg_color="transparent")
        wrapper.grid(row=0, column=0, sticky="nsew", padx=30, pady=24)
        wrapper.grid_columnconfigure(0, weight=1)
        wrapper.grid_rowconfigure(1, weight=1)

        head = ctk.CTkFrame(wrapper, fg_color="transparent")
        head.grid(row=0, column=0, sticky="ew")
        head.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(head, text="تنظیمات پیام‌رسان‌ها", font=_font(24, "bold"),
                     text_color=COLORS["text"], anchor="e").grid(row=0, column=0, sticky="ew")
        ctk.CTkLabel(head, text="اطلاعات ورود فقط روی همین کامپیوتر و به‌صورت رمزنگاری‌شده ذخیره می‌شود.",
                     font=_font(13), text_color=COLORS["text_dim"], anchor="e").grid(
            row=1, column=0, sticky="ew", pady=(0, 12))

        scroll = ctk.CTkScrollableFrame(wrapper, fg_color="transparent")
        scroll.grid(row=1, column=0, sticky="nsew")
        scroll.grid_columnconfigure(0, weight=1)

        # ── کارت متن خوش‌آمدگویی پیش‌فرض ──
        wcard = ctk.CTkFrame(scroll, fg_color=COLORS["card"], corner_radius=14,
                             border_width=1, border_color=COLORS["border"])
        wcard.grid(row=0, column=0, sticky="ew", pady=(0, 16))
        wcard.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(wcard, text="💬  متن پیام (برای همه‌ی پیام‌رسان‌ها)", font=_font(15, "bold"),
                     text_color=COLORS["text"], anchor="e").grid(
            row=0, column=0, sticky="ew", padx=18, pady=(16, 2))
        ctk.CTkLabel(wcard, text="این متن برای پیامک، بله و روبیکا استفاده می‌شود. در پیامک لینک خودکار اضافه می‌شود.",
                     font=_font(11), text_color=COLORS["text_dim"], anchor="e",
                     wraplength=600, justify="right").grid(row=1, column=0, sticky="ew", padx=18)
        self.welcome_box = ctk.CTkTextbox(wcard, height=70, font=_font(13),
                                          fg_color=COLORS["input"], corner_radius=8,
                                          border_width=1, border_color=COLORS["border"])
        self.welcome_box.grid(row=2, column=0, sticky="ew", padx=18, pady=(6, 4))
        self.welcome_box.insert("1.0", self.settings.get("welcome_message", ""))

        # راهنمای متغیرها (کلیک = درج در متن)
        ctk.CTkLabel(wcard, text="متغیرها (کلیک کنید تا در متن درج شود):", font=_font(11, "bold"),
                     text_color=COLORS["text_dim"], anchor="e").grid(
            row=3, column=0, sticky="ew", padx=18, pady=(4, 2))
        varbar = ctk.CTkFrame(wcard, fg_color="transparent")
        varbar.grid(row=4, column=0, sticky="e", padx=18)
        for i, (var, desc) in enumerate(core.MESSAGE_VARIABLES):
            ctk.CTkButton(varbar, text=f"{var}  ({desc})", height=28, font=_font(11),
                          fg_color=COLORS["accent_dim"], hover_color=COLORS["accent"],
                          text_color=COLORS["text"], anchor="e",
                          command=lambda v=var: self._insert_welcome(v)).grid(
                row=i, column=0, sticky="ew", pady=2)
        varbar.grid_columnconfigure(0, weight=1)

        # نوار ایموجی (کلیک = درج)
        ctk.CTkLabel(wcard, text="ایموجی:", font=_font(11, "bold"),
                     text_color=COLORS["text_dim"], anchor="e").grid(
            row=5, column=0, sticky="ew", padx=18, pady=(8, 2))
        emoji_bar = ctk.CTkFrame(wcard, fg_color="transparent")
        emoji_bar.grid(row=6, column=0, sticky="e", padx=18, pady=(0, 16))
        emojis = ["🌹", "😊", "🙏", "✅", "📄", "🧾", "👋", "💐", "🛍️", "📌", "🔗", "❤️", "🌷", "⭐"]
        for i, em in enumerate(emojis):
            ctk.CTkButton(emoji_bar, text=em, width=38, height=34, font=_font(16),
                          fg_color=COLORS["card_hover"], hover_color=COLORS["accent_dim"],
                          command=lambda e=em: self._insert_welcome(e)).grid(
                row=0, column=i, padx=2)

        self.cards: dict[str, ChannelCard] = {}
        for i, ch in enumerate(CHANNELS):
            card = ChannelCard(scroll, ch, self.settings, on_test=self._test_channel)
            card.grid(row=i + 1, column=0, sticky="ew", pady=(0, 16))
            self.cards[ch["key"]] = card

        # دکمه‌ی ذخیره (ثابت پایین)
        save_bar = ctk.CTkFrame(wrapper, fg_color="transparent")
        save_bar.grid(row=2, column=0, sticky="ew", pady=(8, 0))
        save_bar.grid_columnconfigure(0, weight=1)
        self.save_status = ctk.CTkLabel(save_bar, text="", font=_font(13), anchor="e")
        self.save_status.grid(row=0, column=0, sticky="ew", padx=(0, 12))
        ctk.CTkButton(save_bar, text="💾 ذخیره تنظیمات", height=46, width=190,
                      font=_font(15, "bold"), corner_radius=10,
                      fg_color=COLORS["accent"], hover_color=COLORS["accent_hover"],
                      command=self._save_settings).grid(row=0, column=1)

    def _save_settings(self):
        for key, card in self.cards.items():
            self.settings[key].update(card.collect())
        self.settings["appearance"] = self.theme_menu.get()
        self.settings["welcome_message"] = self.welcome_box.get("1.0", "end").strip()
        try:
            store.save_settings(self.settings)
            self.save_status.configure(text="✅ تنظیمات ذخیره شد.",
                                       text_color=COLORS["success"])
        except Exception as e:
            self.save_status.configure(text=f"❌ خطا در ذخیره: {e}",
                                       text_color=COLORS["danger"])

    def _test_channel(self, key, status_lbl):
        def worker():
            ok, msg = core.test_channel(key, self.settings)
            color = COLORS["success"] if ok else COLORS["danger"]
            icon = "✅" if ok else "❌"
            self.after(0, lambda: status_lbl.configure(text=f"{icon} {msg}", text_color=color))
        threading.Thread(target=worker, daemon=True).start()

    def _change_theme(self, value):
        ctk.set_appearance_mode(value)
        self.settings["appearance"] = value


def main():
    app = InvoiceApp()
    app.mainloop()


if __name__ == "__main__":
    main()
