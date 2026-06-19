"""رنگ‌ها، فونت و ثابت‌های ظاهری برنامه."""

# ── پالت رنگ: هر مقدار یک جفت (روشن، تیره) است تا CustomTkinter
#    بین حالت روشن و تیره به‌صورت خودکار سوییچ کند. ──
COLORS = {
    "bg":          ("#f0f2f5", "#0f1117"),   # پس‌زمینه اصلی
    "sidebar":     ("#ffffff", "#161922"),   # نوار کناری
    "card":        ("#ffffff", "#1c2030"),   # کارت‌ها
    "card_hover":  ("#eceff4", "#232838"),
    "accent":      ("#5b6cff", "#5b6cff"),   # رنگ تأکیدی (بنفش-آبی)
    "accent_hover": ("#4757e6", "#4757e6"),
    "accent_dim":  ("#dfe3ff", "#2d3354"),
    "success":     ("#16a34a", "#22c55e"),
    "warning":     ("#d97706", "#f59e0b"),
    "danger":      ("#dc2626", "#ef4444"),
    "text":        ("#1a1c23", "#e6e8ef"),
    "text_dim":    ("#6b7280", "#9aa0b4"),
    "border":      ("#d4d7e0", "#2a2f42"),
    "input":       ("#f7f8fa", "#11141d"),
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
        "desc": "ارسال با اکانت شخصی (چت دوطرفه با مشتری)",
        "login": True,   # ورود با شماره + کد تأیید
        "help": "یک‌بار با شماره‌ی خودتان وارد شوید (کد تأیید پیامک می‌شود). پیام از همین شماره برای مشتری ارسال و چت دوطرفه ساخته می‌شود.",
    },
    {
        "key": "rubika",
        "title": "روبیکا",
        "icon": "🟣",
        "desc": "ارسال با اکانت شخصی (چت دوطرفه با مشتری)",
        "login": True,   # ورود با شماره + کد تأیید
        "help": "یک‌بار با شماره‌ی خودتان وارد شوید (کد تأیید پیامک می‌شود). پیام از همین شماره برای مشتری ارسال می‌شود.",
    },
]
