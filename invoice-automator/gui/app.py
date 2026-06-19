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
from gui.fonts import load_persian_font
from gui.theme import COLORS, CHANNELS, FONT_FALLBACK

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
            theme_frame, values=["dark", "light", "system"],
            command=self._change_theme, font=_font(12),
            fg_color=COLORS["card"], button_color=COLORS["accent"])
        self.theme_menu.set(self.settings.get("appearance", "dark"))
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
        ctk.CTkLabel(page, text="فایل PDF را انتخاب کنید و پیام‌رسان‌های مقصد را مشخص کنید.",
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

        # کارت انتخاب کانال‌ها
        ch_card = ctk.CTkFrame(page, fg_color=COLORS["card"], corner_radius=14,
                               border_width=1, border_color=COLORS["border"])
        ch_card.grid(row=3, column=0, sticky="ew", pady=18)
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
        self.send_btn.grid(row=4, column=0, sticky="ew", pady=(6, 14))

        # ناحیه‌ی لاگ زنده
        ctk.CTkLabel(page, text="گزارش زنده", font=_font(15, "bold"),
                     text_color=COLORS["text"], anchor="e").grid(
            row=5, column=0, sticky="ew", pady=(8, 4))
        self.log_box = ctk.CTkTextbox(page, height=200, font=_font(13),
                                      fg_color=COLORS["input"], corner_radius=10,
                                      border_width=1, border_color=COLORS["border"])
        self.log_box.grid(row=6, column=0, sticky="ew")
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
        try:
            info = core.analyze_file(self.selected_file)
            name = info.get("name") or "—"
            self.info_label.configure(
                text=f"☎ {info['phone']}   |   📄 فاکتور: {info.get('serial') or '—'}   |   👤 {name}",
                text_color=COLORS["accent"])
        except ValueError as e:
            self.info_label.configure(text=f"⚠ {e}", text_color=COLORS["warning"])

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
        channels = [k for k, v in self.channel_check_vars.items() if v.get()]
        if not channels:
            messagebox.showwarning("توجه", "حداقل یک پیام‌رسان را انتخاب کنید.")
            return

        self.send_btn.configure(state="disabled", text="در حال ارسال…")
        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.configure(state="disabled")

        def worker():
            try:
                core.process_pdf(self.selected_file, self.settings, channels, log=self._log)
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
            card = ChannelCard(scroll, ch, self.settings, on_test=self._test_channel)
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
        self.settings["appearance"] = self.theme_menu.get()
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
