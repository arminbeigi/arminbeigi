#!/usr/bin/env python3
"""تولید هویت بصری یارا/YaraPro: نشانه (mark)، آیکن اپ (ico/png) و لوگوی کامل."""
import math, os
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = "/home/user/arminbeigi"
OUT = f"{ROOT}/brand/assets"
APP_ASSETS = f"{ROOT}/invoice-automator/assets"
FONT_BOLD = f"{ROOT}/invoice-automator/gui/assets/fonts/Vazirmatn-Bold.ttf"
os.makedirs(OUT, exist_ok=True)

INDIGO = (91, 108, 255)
VIOLET = (124, 77, 255)
TEAL   = (34, 211, 180)
WHITE  = (255, 255, 255)

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def gradient(size):
    """گرادیان مورب indigo→violet."""
    base = 256
    g = Image.new("RGB", (base, base))
    px = g.load()
    for y in range(base):
        for x in range(base):
            t = (x + y) / (2 * (base - 1))
            px[x, y] = lerp(INDIGO, VIOLET, t)
    return g.resize((size, size), Image.BICUBIC)

def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m

def spark(draw, cx, cy, r, color, waist=0.34):
    """جرقه‌ی چهارپر (sparkle)."""
    w = r * waist
    pts = [(cx, cy - r), (cx + w, cy - w), (cx + r, cy), (cx + w, cy + w),
           (cx, cy + r), (cx - w, cy + w), (cx - r, cy), (cx - w, cy - w)]
    draw.polygon(pts, fill=color)

def make_mark(size, with_tile=True):
    """نشانه‌ی یارا: کاشی گرادیانی + حباب گفتگوی سفید + جرقه‌ی فیروزه‌ای."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if with_tile:
        tile = gradient(size).convert("RGBA")
        tile.putalpha(rounded_mask(size, int(size * 0.235)))
        img.alpha_composite(tile)

    d = ImageDraw.Draw(img)
    # حباب گفتگو (سفید) با گوشه‌های گرد + دنباله
    pad = size * 0.26
    bx0, by0, bx1, by1 = pad, pad * 0.92, size - pad, size - pad * 1.04
    br = (bx1 - bx0) * 0.30
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=br, fill=WHITE)
    # دنباله‌ی حباب (پایین-چپ)
    tw = (bx1 - bx0) * 0.22
    tx = bx0 + (bx1 - bx0) * 0.24
    d.polygon([(tx, by1 - 2), (tx + tw, by1 - 2), (tx, by1 + tw * 0.95)], fill=WHITE)

    # جرقه‌ی اصلی فیروزه‌ای + جرقه‌ی کوچک گرادیانی
    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    R = (bx1 - bx0) * 0.30
    spark(d, cx + R * 0.18, cy + R * 0.05, R, TEAL)
    spark(d, cx - R * 0.62, cy - R * 0.62, R * 0.42, INDIGO)
    return img

# ── آیکن اپ (mark با کاشی) ──
master = make_mark(1024)
master.save(f"{OUT}/yara-mark.png")
master.save(f"{APP_ASSETS}/icon.png")
# ico چندسایزه
sizes = [16, 24, 32, 48, 64, 128, 256]
master.resize((256, 256), Image.LANCZOS).save(
    f"{APP_ASSETS}/icon.ico", sizes=[(s, s) for s in sizes])
print("✅ آیکن اپ ساخته شد: icon.png + icon.ico")

# ── لوگوی کامل (نشانه + ورد‌مارک «یارا» + تگ‌لاین) ──
# ── لوگوی کامل (نشانه + ورد‌مارک «یارا» + تگ‌لاین) ──
def full_logo(dark_bg):
    """در فارسی راست‌چین: ورد‌مارک سمت راست، نشانه سمت چپِ آن.
    عرض کافی برای نمایش کامل تگ‌لاین «دستیار هوشمند کسب‌وکار»."""
    W, H = 1200, 340
    bg = (15, 17, 23, 255) if dark_bg else (0, 0, 0, 0)
    img = Image.new("RGBA", (W, H), bg)

    d = ImageDraw.Draw(img)
    text_col = WHITE if dark_bg else (26, 28, 35)
    dim_col = (154, 160, 180) if dark_bg else (110, 116, 130)
    wf = ImageFont.truetype(FONT_BOLD, 150)
    tf = ImageFont.truetype(FONT_BOLD, 40)

    # ورد‌مارک «یارا» — راست‌چین، با تکیه به لبه‌ی راست
    margin = 70
    rx = W - margin
    word_y, tag_y = 60, 230
    d.text((rx, word_y), "یارا", font=wf, fill=text_col,
           direction="rtl", language="fa", anchor="ra")
    d.text((rx, tag_y), "دستیار هوشمند کسب‌وکار", font=tf, fill=dim_col,
           direction="rtl", language="fa", anchor="ra")

    # نشانه را زیر/سمت چپ ورد‌مارک با فاصله می‌چینیم.
    # برای راست‌چین: لبه‌ی چپِ کلِ متن = چپ‌ترین عرض ورد‌مارک + تگ‌لاین.
    w_bbox = d.textbbox((rx, word_y), "یارا", font=wf,
                        direction="rtl", language="fa", anchor="ra")
    t_bbox = d.textbbox((rx, tag_y), "دستیار هوشمند کسب‌وکار", font=tf,
                        direction="rtl", language="fa", anchor="ra")
    text_left = min(w_bbox[0], t_bbox[0])
    mark_size = 240
    mx = text_left - mark_size - 50
    my = (H - mark_size) // 2
    img.alpha_composite(make_mark(mark_size), (mx, my))

    # برش به محتوای واقعی + حاشیه‌ی مساوی
    pad = 70
    left = max(0, mx - pad)
    right = min(W, rx + 30)
    cropped = img.crop((left, 0, right, H))
    return cropped

full_logo(True).save(f"{OUT}/yara-logo-dark.png")
full_logo(False).save(f"{OUT}/yara-logo-light.png")
print("✅ لوگوی کامل ساخته شد: yara-logo-dark.png + yara-logo-light.png")
print("اندازه‌ی آیکن:", os.path.getsize(f"{APP_ASSETS}/icon.ico"), "بایت")
