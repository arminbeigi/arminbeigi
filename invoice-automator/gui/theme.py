"""رنگ‌ها، فونت و ثابت‌های ظاهری برنامه."""

# ── پالت رنگ (دارک‌مود مدرن) ──
COLORS = {
    "bg":          "#0f1117",   # پس‌زمینه اصلی
    "sidebar":     "#161922",   # نوار کناری
    "card":        "#1c2030",   # کارت‌ها
    "card_hover":  "#232838",
    "accent":      "#5b6cff",   # رنگ تأکیدی (بنفش-آبی)
    "accent_hover": "#4757e6",
    "accent_dim":  "#2d3354",
    "success":     "#22c55e",
    "warning":     "#f59e0b",
    "danger":      "#ef4444",
    "text":        "#e6e8ef",
    "text_dim":    "#9aa0b4",
    "border":      "#2a2f42",
    "input":       "#11141d",
}

# ── فونت‌ها (Vazirmatn اگر نصب باشد، وگرنه فونت پیش‌فرض ویندوز) ──
FONT_FAMILY = "Vazirmatn"
FONT_FALLBACK = "Tahoma"

# ── اطلاعات کانال‌ها برای نمایش در رابط ──
CHANNELS = [
    {
        "key": "wordpress",
        "title": "وردپرس",
        "icon": "🌐",
        "desc": "آپلود PDF و ساخت لینک کوتاه",
        "fields": [
            ("url", "آدرس سایت", "https://example.com", False),
            ("username", "نام کاربری", "admin", False),
            ("app_password", "رمز عبور اپلیکیشن", "xxxx xxxx xxxx xxxx", True),
        ],
        "help": "وردپرس > کاربران > نمایه > رمزهای عبور اپلیکیشن > رمز جدید",
    },
    {
        "key": "kavenegar",
        "title": "پیامک (کاوه‌نگار)",
        "icon": "📱",
        "desc": "ارسال لینک پیش‌فاکتور با پیامک",
        "fields": [
            ("api_key", "کلید API", "کلید API کاوه‌نگار", True),
            ("sender", "شماره فرستنده", "10008663", False),
            ("template", "قالب پیام", "متن پیامک با {invoice_number} و {link}", False),
        ],
        "help": "panel.kavenegar.com > تنظیمات > کلید API",
    },
    {
        "key": "whatsapp",
        "title": "واتساپ",
        "icon": "💬",
        "desc": "ارسال با WhatsApp Cloud API یا لینک wa.me",
        "fields": [
            ("phone_number_id", "Phone Number ID", "اختیاری — خالی = لینک wa.me", False),
            ("access_token", "Access Token", "اختیاری", True),
        ],
        "help": "خالی گذاشتن فیلدها ⇐ فقط لینک wa.me ساخته می‌شود (باز کردن دستی).",
    },
    {
        "key": "bale",
        "title": "بله",
        "icon": "🔵",
        "desc": "ارسال فایل از طریق ربات بله",
        "fields": [
            ("bot_token", "توکن ربات", "توکن دریافتی از BotFather", True),
        ],
        "help": "در بله به @BotFather پیام دهید → /newbot → توکن را کپی کنید. مشتری باید ربات را /start کرده باشد.",
    },
    {
        "key": "rubika",
        "title": "روبیکا",
        "icon": "🟣",
        "desc": "ارسال با اکانت شخصی روبیکا",
        "fields": [
            ("auth", "نام نشست (auth)", "shofazh", False),
        ],
        "help": "نیاز به لاگین یک‌باره با شماره تلفن دارد (rubika_login.py). با احتیاط استفاده شود.",
    },
]
