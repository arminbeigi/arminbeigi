"""
چاپ چک صیادی — تبدیل عدد به حروف، تاریخ شمسی، و تولید PDF برای چاپ روی چک فیزیکی.

طراحی برای «چاپ روی چک واقعی»: نرم‌افزار فقط متن را در مختصات کالیبره‌شده
روی برگه‌ی چکی که داخل پرینتر گذاشته‌اید چاپ می‌کند (پس‌زمینه خالی است).
موقعیت‌ها بر حسب میلی‌متر از گوشه‌ی بالا-راست ذخیره می‌شوند و کاربر می‌تواند
با ابزار کالیبراسیون آن‌ها را برای پرینتر/بانک خودش تنظیم و ذخیره کند.
"""

import os
import tempfile
import datetime


# ─────────────────────────── عدد به حروف فارسی ───────────────────────────
_YEKAN = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
_DAH = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده',
        'هفده', 'هجده', 'نوزده']
_DAHGAN = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
_SADGAN = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد',
           'هشتصد', 'نهصد']
_SCALE = ['', ' هزار', ' میلیون', ' میلیارد', ' هزار میلیارد', ' میلیون میلیارد']


def _three(n: int) -> str:
    """تبدیل عددِ ۰ تا ۹۹۹ به حروف."""
    parts = []
    s = n // 100
    d = n % 100
    if s:
        parts.append(_SADGAN[s])
    if d >= 10 and d <= 19:
        parts.append(_DAH[d - 10])
    else:
        t = d // 10
        u = d % 10
        if t:
            parts.append(_DAHGAN[t])
        if u:
            parts.append(_YEKAN[u])
    return ' و '.join(parts)


def num_to_words_fa(n: int) -> str:
    """تبدیل عدد صحیح به حروف فارسی (مثلاً 1250000 → «یک میلیون و دویست و پنجاه هزار»)."""
    try:
        n = int(n)
    except (ValueError, TypeError):
        return ''
    if n == 0:
        return 'صفر'
    if n < 0:
        return 'منفی ' + num_to_words_fa(-n)

    groups = []
    while n > 0:
        groups.append(n % 1000)
        n //= 1000

    parts = []
    for i in range(len(groups) - 1, -1, -1):
        g = groups[i]
        if g == 0:
            continue
        parts.append(_three(g) + _SCALE[i])
    return ' و '.join(parts)


def amount_words(amount: int, unit: str = 'ریال') -> str:
    """مبلغ به حروف همراه با واحد (ریال/تومان)."""
    w = num_to_words_fa(amount)
    if not w:
        return ''
    return f'{w} {unit}'


# ─────────────────────────── تاریخ شمسی ───────────────────────────
def gregorian_to_jalali(gy, gm, gd):
    g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    if gy > 1600:
        jy = 979
        gy -= 1600
    else:
        jy = 0
        gy -= 621
    gy2 = gy + 1 if gm > 2 else gy
    days = (365 * gy + (gy2 + 3) // 4 - (gy2 + 99) // 100 + (gy2 + 399) // 400
            - 80 + gd + g_d_m[gm - 1])
    jy += 33 * (days // 12053)
    days %= 12053
    jy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        jy += (days - 1) // 365
        days = (days - 1) % 365
    if days < 186:
        jm = 1 + days // 31
        jd = 1 + days % 31
    else:
        jm = 7 + (days - 186) // 30
        jd = 1 + (days - 186) % 30
    return jy, jm, jd


def today_jalali() -> str:
    """تاریخ امروز به‌صورت رشته‌ی شمسی YYYY/MM/DD."""
    now = datetime.date.today()
    jy, jm, jd = gregorian_to_jalali(now.year, now.month, now.day)
    return f'{jy:04d}/{jm:02d}/{jd:02d}'


def to_persian_digits(s: str) -> str:
    return str(s).translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))


def group_digits(n) -> str:
    """جداسازی سه‌رقمی با کاما برای نمایش مبلغ عددی."""
    try:
        return f'{int(n):,}'
    except (ValueError, TypeError):
        return str(n)


# ─────────────────────────── چیدمان و کالیبراسیون ───────────────────────────
# کالیبره‌شده برای چک صیادی استاندارد بانک مرکزی ایران (200×83 میلی‌متر).
# x = فاصله از لبه‌ی راست (چون متن راست‌چین است)
# y = فاصله از لبه‌ی بالا
# هر فیلد: x, y (میلی‌متر), اندازه‌ی فونت (pt)
DEFAULT_CONFIG = {
    "page": {"w": 200.0, "h": 83.0},
    "offset": {"x": 0.0, "y": 0.0},
    "fields": {
        "date":         {"x": 26.0,  "y": 9.0,  "size": 11, "enabled": True},
        "amount_num":   {"x": 14.0,  "y": 19.5, "size": 13, "enabled": True},
        "payee":        {"x": 55.0,  "y": 25.0, "size": 11, "enabled": True},
        "amount_words": {"x": 55.0,  "y": 35.0, "size": 10, "enabled": True},
        "description":  {"x": 55.0,  "y": 47.0, "size": 10, "enabled": True},
        "sayad_id":     {"x": 100.0, "y": 63.0, "size": 10, "enabled": True},
    },
}

FIELD_LABELS = {
    "date": "تاریخ",
    "payee": "در وجه",
    "amount_words": "مبلغ به حروف",
    "amount_num": "مبلغ (عدد)",
    "sayad_id": "شناسه صیاد",
    "description": "بابت",
}


def get_config(settings: dict) -> dict:
    """ادغام تنظیمات ذخیره‌شده با پیش‌فرض."""
    import copy
    cfg = copy.deepcopy(DEFAULT_CONFIG)
    saved = (settings or {}).get("cheque", {})
    if saved.get("page"):
        cfg["page"].update(saved["page"])
    if saved.get("offset"):
        cfg["offset"].update(saved["offset"])
    for k, v in (saved.get("fields") or {}).items():
        if k in cfg["fields"]:
            cfg["fields"][k].update(v)
    return cfg


def build_values(data: dict) -> dict:
    """ساخت متن نهایی هر فیلد از روی داده‌های فرم."""
    amount = data.get("amount") or 0
    unit = data.get("unit", "ریال")
    return {
        "date":         to_persian_digits(data.get("date", "")),
        "payee":        data.get("payee", ""),
        "amount_words": amount_words(amount, unit),
        "amount_num":   to_persian_digits(group_digits(amount)) + " " + unit,
        "sayad_id":     to_persian_digits(data.get("sayad_id", "")),
        "description":  data.get("description", ""),
    }


# ─────────────────────────── فونت‌ها ───────────────────────────
FONTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "fonts")

AVAILABLE_FONTS = {
    "Vazirmatn":  {"file": "Vazirmatn-Bold.ttf",  "label": "وزیرمتن (پیش‌فرض)"},
    "Sahel":      {"file": "Sahel-Bold.ttf",       "label": "ساحل"},
    "Shabnam":    {"file": "Shabnam-Bold.ttf",      "label": "شبنم"},
    "Samim":      {"file": "Samim-Bold.ttf",        "label": "صمیم"},
}


def get_available_fonts() -> dict[str, str]:
    """فونت‌های موجود: {key: label}. فقط فونت‌هایی که فایلشان وجود دارد."""
    result = {}
    for key, info in AVAILABLE_FONTS.items():
        if os.path.exists(os.path.join(FONTS_DIR, info["file"])):
            result[key] = info["label"]
    return result


def _font_path(font_key: str = "Vazirmatn"):
    info = AVAILABLE_FONTS.get(font_key, AVAILABLE_FONTS["Vazirmatn"])
    p = os.path.join(FONTS_DIR, info["file"])
    return p if os.path.exists(p) else None


# ─────────────────────────── تولید PDF ───────────────────────────
def generate_pdf(data: dict, config: dict, out_path: str = None,
                 font_key: str = "Vazirmatn") -> str:
    """تولید PDF با متنِ چک در مختصات کالیبره‌شده (پس‌زمینه خالی)."""
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import arabic_reshaper
    from bidi.algorithm import get_display

    def fa(t):
        return get_display(arabic_reshaper.reshape(str(t)))

    fp = _font_path(font_key)
    font_name = "Helvetica"
    reg_name = f"YaraChq_{font_key}"
    if fp:
        try:
            pdfmetrics.getFont(reg_name)
        except KeyError:
            pdfmetrics.registerFont(TTFont(reg_name, fp))
        font_name = reg_name

    if not out_path:
        out_path = os.path.join(tempfile.gettempdir(), "yara_cheque.pdf")

    pw, ph = config["page"]["w"], config["page"]["h"]
    ox, oy = config["offset"]["x"], config["offset"]["y"]
    c = canvas.Canvas(out_path, pagesize=(pw * mm, ph * mm))

    values = build_values(data)
    for key, field in config["fields"].items():
        if not field.get("enabled", True):
            continue
        text = values.get(key, "")
        if not text:
            continue
        c.setFont(font_name, field["size"])
        right_anchor = pw - (field["x"] + ox)
        y_from_bottom = ph - (field["y"] + oy)
        c.drawRightString(right_anchor * mm, y_from_bottom * mm, fa(text))
    c.showPage()
    c.save()
    return out_path


def print_pdf(pdf_path: str) -> bool:
    """ارسال PDF به چاپگر پیش‌فرض (ویندوز) یا باز کردن آن."""
    try:
        if os.name == "nt":
            os.startfile(pdf_path, "print")  # noqa
            return True
        # سایر سیستم‌ها: فقط باز کن
        import subprocess
        opener = "xdg-open" if os.uname().sysname == "Linux" else "open"
        subprocess.Popen([opener, pdf_path])
        return True
    except Exception:
        return False
