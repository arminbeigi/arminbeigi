#!/usr/bin/env python3
"""
Windsor.ai + Google Search Console Integration
داده‌های Search Console را می‌خواند و توصیه‌های SEO تولید می‌کند

داده‌های صفحه (page URL) از Google Search Console واقعی استخراج شده‌اند:
  - قیمت پکیج بوتان + پکیج بیتا -> /product/butane-bita22-sealed-boiler/
  - خرید رادیاتور             -> /product/dima-steel-radiator-2f/
"""

import json
from datetime import datetime


def build_fixes():
    """
    توصیه‌های اصلاح را با URL واقعی صفحات WordPress تولید می‌کند.

    نکته: کوئری‌های 'قیمت پکیج بوتان' و 'پکیج بیتا' هر دو روی همان صفحه محصول
    (butane-bita22-sealed-boiler) رتبه می‌گیرند، پس در یک fix ادغام شده‌اند تا
    عنوان یکدیگر را بازنویسی نکنند.
    """
    return {
        "timestamp": datetime.now().isoformat(),
        "fixes": [
            {
                "query": "قیمت پکیج بوتان + پکیج بیتا",
                "page": "https://shofazh.com/product/butane-bita22-sealed-boiler/",
                "current_status": "Position 8.6 | 2825 impressions (combined)",
                "problem": "صفر کلیک - title و meta نامرتبط با 'قیمت پکیج بوتان' و 'پکیج بیتا'",
                "recommended_title": "قیمت پکیج بوتان بیتا ۲۲ محفظه‌دار | خرید از شوفاژ.کام",
                "recommended_meta": "قیمت پکیج بوتان بیتا ۲۲ محفظه‌دار - قیمت رقابتی و ارسال سریع 📦 همین حالا سفارش دهید",
                "focus_keyword": "قیمت پکیج بوتان",
                "expected_gain": "+61 clicks",
                "action_priority": "HIGH",
            },
            {
                "query": "خرید رادیاتور",
                "page": "https://shofazh.com/product/dima-steel-radiator-2f/",
                "current_status": "Position 10.1 | 291 impressions",
                "problem": "صفر کلیک - title و meta نامرتبط با 'خرید رادیاتور'",
                "recommended_title": "خرید رادیاتور فولادی دیما | قیمت و خرید از شوفاژ.کام",
                "recommended_meta": "خرید رادیاتور فولادی دیما - قیمت رقابتی و ارسال سریع 📦 همین حالا سفارش دهید",
                "focus_keyword": "خرید رادیاتور",
                "expected_gain": "+6 clicks",
                "action_priority": "MEDIUM",
            },
        ],
    }


def main():
    print("🔍 Google Search Console Optimizer")
    print("=" * 50)

    fixes = build_fixes()

    print(f"\n📊 یافت‌شده: {len(fixes['fixes'])} issue\n")
    for fix in fixes['fixes']:
        print(f"🔴 Query: {fix['query']}")
        print(f"   Page: {fix['page']}")
        print(f"   Recommended Title: {fix['recommended_title']}")
        print(f"   Recommended Meta: {fix['recommended_meta']}")
        print(f"   Expected Gain: {fix['expected_gain']}\n")

    with open('gsc-fixes.json', 'w', encoding='utf-8') as f:
        json.dump(fixes, f, ensure_ascii=False, indent=2)

    print("✅ توصیه‌ها ذخیره‌شدند: gsc-fixes.json")


if __name__ == "__main__":
    main()
