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
from gui.fonts import load_persian_font, app_icon_path
from gui.theme import COLORS, CHANNELS, FONT_FALLBACK

# خانواده‌ی فونت فعال؛ پس از فراخوانی load_persian_font مقداردهی می‌شود
_FONT_FAMILY = FONT_FALLBACK

# نگاشت برچسب فارسی منوی تم به مقدار داخلی CustomTkinter و بالعکس
_THEME_TO_FA = {"system": "سیستم", "light": "روشن", "dark": "تیره"}
_FA_TO_THEME = {v: k for k, v in _THEME_TO_FA.items()}


def _font(size=14, weight="normal"):
    return ctk.CTkFont(family=_FONT_FAMILY, size=size, weight=weight)


class ChannelCard(ctk.CTkFrame):
    """کارت تنظیمات یک پیام‌رسان در صفحه‌ی تنظیمات."""

    def __init__(self, master, channel: dict, settings: dict, on_test, on_login=None):
        super().__init__(master, fg_color=COLORS["card"], corner_radius=14,
                         border_width=1, border_color=COLORS["border"])
        self.channel = channel
        self.key = channel["key"]
        self.settings = settings
        self.on_test = on_test
        self.on_login = on_login
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

        # ── فیلدهای ورودی ──
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

        # ── بخش ورود (مخصوص روبیکا: ورود با شماره و کد تأیید) ──
        if channel.get("login"):
            self._build_login(body)

        # ── راهنما ──
        if channel.get("help"):
            ctk.CTkLabel(self, text="ℹ " + channel["help"], font=_font(11),
                         text_color=COLORS["text_dim"], anchor="e",
                         wraplength=560, justify="right").grid(
                row=2, column=0, sticky="ew", padx=18, pady=(0, 8))

        # ── دکمه‌ی تست اتصال ──
        footer = ctk.CTkFrame(self, fg_color="transparent")
        footer.grid(row=3, column=0, sticky="ew", padx=18, pady=(0, 16))
        footer.grid_columnconfigure(0, weight=1)

        self.status_lbl = ctk.CTkLabel(footer, text="", font=_font(12), anchor="e")
        self.status_lbl.grid(row=0, column=0, sticky="ew", padx=(0, 10))

        ctk.CTkButton(footer, text="تست اتصال", width=110, font=_font(13),
                      fg_color=COLORS["accent_dim"], hover_color=COLORS["accent"],
                      command=self._test).grid(row=0, column=1)

        self._on_toggle()

    def _on_toggle(self):
        # کم‌رنگ کردن کارت در حالت غیرفعال (صرفاً ظاهری)
        self.configure(border_color=COLORS["accent"] if self.enabled_var.get()
                       else COLORS["border"])

    # ── بخش ورود (روبیکا) ───────────────────────────────────────────
    def _build_login(self, parent):
        """نمایش وضعیت ورود و دکمه‌ی ورود/خروج برای کانال‌های مبتنی بر لاگین."""
        wrap = ctk.CTkFrame(parent, fg_color="transparent")
        wrap.grid(row=0, column=0, sticky="ew", pady=(8, 2))
        wrap.grid_columnconfigure(0, weight=1)

        self.login_status_lbl = ctk.CTkLabel(
            wrap, text="", font=_font(13), anchor="e", justify="right")
        self.login_status_lbl.grid(row=0, column=0, sticky="ew", padx=(0, 10))

        self.login_btn = ctk.CTkButton(
            wrap, text="", width=150, font=_font(13, "bold"), corner_radius=8,
            fg_color=COLORS["accent"], hover_color=COLORS["accent_hover"],
            command=self._login_clicked)
        self.login_btn.grid(row=0, column=1)

        self.logout_btn = ctk.CTkButton(
            wrap, text="خروج", width=80, font=_font(13), corner_radius=8,
            fg_color=COLORS["accent_dim"], hover_color=COLORS["danger"],
            command=self._logout_clicked)
        self.logout_btn.grid(row=0, column=2, padx=(8, 0))

        self.refresh_login_status()

    def refresh_login_status(self):
        """به‌روزرسانی متن و دکمه‌ها بر اساس وضعیت ورود فعلی."""
        if not hasattr(self, "login_status_lbl"):
            return
        logged_in = core.rubika_is_logged_in(self.settings)
        phone = self.settings.get(self.key, {}).get("phone", "")
        if logged_in:
            txt = "✅ وارد شده‌اید" + (f" — {phone}" if phone else "")
            self.login_status_lbl.configure(text=txt, text_color=COLORS["success"])
            self.login_btn.configure(text="ورود مجدد")
            self.logout_btn.grid()
        else:
            self.login_status_lbl.configure(
                text="هنوز وارد نشده‌اید", text_color=COLORS["text_dim"])
            self.login_btn.configure(text="ورود به روبیکا")
            self.logout_btn.grid_remove()

    def _login_clicked(self):
        if self.on_login:
            self.on_login(self)

    def _logout_clicked(self):
        if not messagebox.askyesno(
                "خروج از روبیکا",
                "نشست ذخیره‌شده حذف می‌شود و برای ارسال بعدی باید دوباره وارد شوید.\nادامه می‌دهید؟"):
            return
        core.rubika_logout(self.settings)
        self.settings[self.key]["logged_in"] = False
        self.settings[self.key]["phone"] = ""
        try:
            store.save_settings(self.settings)
        except Exception:
            pass
        self.refresh_login_status()

    def collect(self) -> dict:
        """جمع‌آوری مقادیر فعلی فیلدها."""
        data = {"enabled": self.enabled_var.get()}
        for fkey, widget in self.field_vars.items():
            if isinstance(widget, ctk.CTkTextbox):
                data[fkey] = widget.get("1.0", "end").strip()
            else:
                data[fkey] = widget.get().strip()
        return data

    def _test(self):
        self.status_lbl.configure(text="در حال تست…", text_color=COLORS["text_dim"])
        data = self.collect()
        self.settings[self.key].update(data)
        self.on_test(self.key, self.status_lbl)


class InvoiceApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.settings = store.load_settings()

        # بارگذاری فونت فارسی باندل‌شده پیش از ساخت رابط
        global _FONT_FAMILY
        _FONT_FAMILY = load_persian_font()

        ctk.set_appearance_mode(self.settings.get("appearance", "dark"))
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
            theme_frame, values=["سیستم", "روشن", "تیره"],
            command=self._change_theme, font=_font(12),
            fg_color=COLORS["card"], button_color=COLORS["accent"])
        self.theme_menu.set(_THEME_TO_FA.get(self.settings.get("appearance", "system"), "سیستم"))
        self.theme_menu.pack(fill="x")
        ctk.CTkLabel(theme_frame, text="حالت نمایش", font=_font(11),
                     text_color=COLORS["text_dim"]).pack(pady=(4, 0))

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
            file_card, text="هنوز فایلی انتخاب نشده است", font=_font(14),
            text_color=COLORS["text_dim"], anchor="e")
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
            entry = ctk.CTkEntry(fields_box, textvariable=var, placeholder_text=placeholder,
                                 font=_font(14), fg_color=COLORS["input"], justify="right",
                                 border_color=COLORS["border"], corner_radius=8, height=40)
            entry.grid(row=r, column=0, sticky="ew")
            r += 1
            if var is self.phone_var:
                self.phone_entry = entry
                # پیام راهنمای اعتبارسنجی زنده، درست زیر فیلد شماره
                self.phone_hint = ctk.CTkLabel(fields_box, text="", font=_font(11),
                                               text_color=COLORS["text_dim"], anchor="e")
                self.phone_hint.grid(row=r, column=0, sticky="ew", pady=(2, 0))
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
            title="انتخاب فایل پیش‌فاکتور",
            filetypes=[("PDF files", "*.pdf"), ("All files", "*.*")])
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

        self.cards: dict[str, ChannelCard] = {}
        for i, ch in enumerate(CHANNELS):
            card = ChannelCard(scroll, ch, self.settings, on_test=self._test_channel,
                               on_login=self._rubika_login)
            card.grid(row=i, column=0, sticky="ew", pady=(0, 16))
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
        self.settings["appearance"] = _FA_TO_THEME.get(
            self.theme_menu.get(), self.settings.get("appearance", "system"))
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
        # value برچسب فارسی است؛ به مقدار داخلی تبدیل می‌کنیم
        mode = _FA_TO_THEME.get(value, "system")
        ctk.set_appearance_mode(mode)
        self.settings["appearance"] = mode
        # ذخیره‌ی فوری تا انتخاب کاربر پس از بستن برنامه هم بماند
        try:
            store.save_settings(self.settings)
        except Exception:
            pass

    # ── دیالوگ ورود به روبیکا ────────────────────────────────────────
    def _rubika_login(self, card):
        RubikaLoginDialog(self, card)


class RubikaLoginDialog(ctk.CTkToplevel):
    """
    پنجره‌ی ورود یک‌باره به روبیکا.

    مرحله ۱: کاربر شماره‌ی اکانت روبیکا را وارد و «ارسال کد» را می‌زند.
    مرحله ۲: کد تأییدی که در روبیکا دریافت کرده را وارد و «تأیید» می‌زند.
    در صورت فعال بودن رمز دومرحله‌ای، فیلد رمز نیز نمایش داده می‌شود.
    """

    def __init__(self, master, card):
        super().__init__(master)
        self.card = card
        self.login: core.RubikaLogin | None = None
        self._await_kind = None   # "code" | "password"

        self.title("ورود به روبیکا")
        self.geometry("440x340")
        self.resizable(False, False)
        self.configure(fg_color=COLORS["bg"])
        self.transient(master)
        self.grab_set()

        self.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(self, text="🟣  ورود به روبیکا", font=_font(18, "bold"),
                     text_color=COLORS["text"]).grid(row=0, column=0, pady=(20, 4), padx=24)
        ctk.CTkLabel(self,
                     text="شماره‌ی اکانت روبیکای خود را وارد کنید. کد تأیید در روبیکای شما ارسال می‌شود.",
                     font=_font(12), text_color=COLORS["text_dim"], wraplength=380,
                     justify="right").grid(row=1, column=0, pady=(0, 12), padx=24)

        # فیلد شماره
        prev_phone = card.settings.get("rubika", {}).get("phone", "")
        self.phone_var = ctk.StringVar(value=prev_phone)
        self.phone_entry = ctk.CTkEntry(
            self, textvariable=self.phone_var, placeholder_text="09xxxxxxxxx",
            font=_font(14), fg_color=COLORS["input"], justify="right",
            border_color=COLORS["border"], corner_radius=8, height=40)
        self.phone_entry.grid(row=2, column=0, sticky="ew", padx=24)

        # فیلد کد/رمز (در ابتدا پنهان)
        self.code_var = ctk.StringVar()
        self.code_entry = ctk.CTkEntry(
            self, textvariable=self.code_var, placeholder_text="کد تأیید",
            font=_font(14), fg_color=COLORS["input"], justify="center",
            border_color=COLORS["border"], corner_radius=8, height=40)

        self.status_lbl = ctk.CTkLabel(self, text="", font=_font(12),
                                       text_color=COLORS["text_dim"], wraplength=380,
                                       justify="right")
        self.status_lbl.grid(row=4, column=0, pady=(10, 4), padx=24)

        self.action_btn = ctk.CTkButton(
            self, text="ارسال کد", height=44, font=_font(14, "bold"),
            corner_radius=10, fg_color=COLORS["accent"],
            hover_color=COLORS["accent_hover"], command=self._on_action)
        self.action_btn.grid(row=5, column=0, sticky="ew", padx=24, pady=(4, 18))

    # ── کنترل دکمه اصلی بسته به مرحله ──
    def _on_action(self):
        if self.login is None:
            self._send_code()
        else:
            self._submit_value()

    def _send_code(self):
        phone = self.phone_var.get().strip()
        if not core.is_valid_phone(phone):
            self.status_lbl.configure(
                text="⚠ شماره باید با 09 شروع شود و ۱۱ رقم باشد.",
                text_color=COLORS["danger"])
            return
        self.phone_entry.configure(state="disabled")
        self.action_btn.configure(state="disabled", text="در حال ارسال کد…")
        self.status_lbl.configure(text="در حال اتصال به روبیکا…",
                                  text_color=COLORS["text_dim"])
        self.login = core.RubikaLogin(phone)
        self.login.start()
        self._poll_events()

    def _submit_value(self):
        value = self.code_var.get().strip()
        if not value:
            self.status_lbl.configure(text="مقدار را وارد کنید.",
                                      text_color=COLORS["danger"])
            return
        self.action_btn.configure(state="disabled", text="در حال بررسی…")
        self.status_lbl.configure(text="در حال تأیید…", text_color=COLORS["text_dim"])
        self.login.submit(value)
        self._await_kind = None
        self._poll_events()

    def _poll_events(self):
        import queue as _q
        try:
            while True:
                kind, payload = self.login.events.get_nowait()
                if kind == "code":
                    self._prompt_for("code")
                    return
                elif kind == "password":
                    self._prompt_for("password")
                    return
                elif kind == "success":
                    self._on_success(payload)
                    return
                elif kind == "error":
                    self._on_error(payload)
                    return
        except _q.Empty:
            pass
        self.after(150, self._poll_events)

    def _prompt_for(self, kind):
        self._await_kind = kind
        self.code_var.set("")
        self.code_entry.grid(row=3, column=0, sticky="ew", padx=24, pady=(10, 0))
        if kind == "password":
            self.code_entry.configure(placeholder_text="رمز عبور دومرحله‌ای", show="•")
            self.status_lbl.configure(
                text="این حساب رمز دومرحله‌ای دارد؛ رمز را وارد کنید.",
                text_color=COLORS["warning"])
            self.action_btn.configure(state="normal", text="تأیید رمز")
        else:
            self.code_entry.configure(placeholder_text="کد تأیید", show="")
            self.status_lbl.configure(
                text="✅ کد تأیید به روبیکای شما ارسال شد. آن را وارد کنید.",
                text_color=COLORS["success"])
            self.action_btn.configure(state="normal", text="تأیید و ورود")
        self.code_entry.focus_set()

    def _on_success(self, phone):
        rb = self.card.settings.setdefault("rubika", {})
        rb["logged_in"] = True
        rb["phone"] = phone or self.phone_var.get().strip()
        rb["auth"] = core.rubika_session_path()
        rb.setdefault("enabled", True)
        rb["enabled"] = True
        try:
            store.save_settings(self.card.settings)
        except Exception:
            pass
        self.card.enabled_var.set(True)
        self.card.refresh_login_status()
        self.status_lbl.configure(text="✅ ورود با موفقیت انجام شد.",
                                  text_color=COLORS["success"])
        messagebox.showinfo("روبیکا", "ورود با موفقیت انجام شد.")
        self.destroy()

    def _on_error(self, msg):
        self.login = None
        self.phone_entry.configure(state="normal")
        self.action_btn.configure(state="normal", text="تلاش دوباره")
        self.status_lbl.configure(text=f"❌ خطا: {msg}", text_color=COLORS["danger"])


def main():
    app = InvoiceApp()
    app.mainloop()


if __name__ == "__main__":
    main()
