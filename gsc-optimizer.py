#!/usr/bin/env python3
"""
Google Search Console Optimizer — اصلاح خودکار صفحات بد‌اجرا
برای شناسایی query های با CTR صفر و ایجاد توصیه‌های SEO

استفاده:
  python3 gsc-optimizer.py --analyze
  python3 gsc-optimizer.py --generate-fixes
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path


class GSCOptimizer:
    """تحلیل Google Search Console و ایجاد توصیه‌های بهبود SEO"""

    def __init__(self):
        self.gsc_data = None
        self.zero_click_queries = []
        self.low_ctr_pages = []

    def load_gsc_data(self, filepath=None):
        """بارگذاری داده‌های Search Console از فایل JSON"""
        if not filepath:
            filepath = "gsc-data.json"

        if not Path(filepath).exists():
            print(f"❌ فایل یافت نشد: {filepath}")
            return False

        with open(filepath, 'r', encoding='utf-8') as f:
            self.gsc_data = json.load(f)

        print(f"✅ بارگذاری داده‌های Search Console: {len(self.gsc_data)} رکورد")
        return True

    def analyze(self):
        """تحلیل query های مسائل‌دار"""
        if not self.gsc_data:
            print("❌ داده‌ها بارگذاری نشده‌اند")
            return

        print("\n📊 تحلیل Search Console...\n")

        # شناسایی query های با صفر کلیک و impression بالا
        zero_clicks = [
            q for q in self.gsc_data
            if q.get('clicks', 0) == 0 and q.get('impressions', 100) > 100
        ]
        zero_clicks.sort(key=lambda x: x.get('impressions', 0), reverse=True)
        self.zero_click_queries = zero_clicks[:10]

        print("🚨 کوئری‌های با صفر کلیک (فرصت بسیار بالا):\n")
        for i, q in enumerate(self.zero_click_queries, 1):
            query = q.get('query', 'N/A')
            imp = q.get('impressions', 0)
            pos = q.get('position', 0)
            print(f"{i}. '{query}'")
            print(f"   Impressions: {imp} | Position: {pos:.1f}")
            print()

        # Query های با CTR کم
        low_ctr = [
            q for q in self.gsc_data
            if q.get('ctr', 0) < 0.02 and q.get('impressions', 0) > 200
        ]
        low_ctr.sort(key=lambda x: x.get('impressions', 0) * (1 - x.get('ctr', 0)))

        print("\n📉 کوئری‌های با CTR پایین (Position 8+):\n")
        for q in low_ctr[:5]:
            query = q.get('query', 'N/A')
            ctr = q.get('ctr', 0) * 100
            pos = q.get('position', 0)
            print(f"'{query}'")
            print(f"   CTR: {ctr:.1f}% | Position: {pos:.1f}\n")

    def generate_title_suggestion(self, query, position):
        """تولید title بهتر برای یک query"""
        # نمونه‌های خوب از SEO
        price_keywords = ['قیمت', 'هزینه', 'رقابتی', 'ارزان']
        brand_keywords = ['شوفاژ', 'ایران', 'اصلی']

        # ساختار: [کلمه مرکزی] + [مشخصه] + [CTA]
        if any(w in query for w in ['قیمت', 'هزینه']):
            return f"قیمت {query.replace('قیمت ', '')} | خرید اصلی"

        return f"{query} | شوفاژ.کام - فروش رسمی"

    def generate_meta_description(self, query, position):
        """تولید meta description جذاب‌تر"""
        cta = "سفارش اکنون" if position > 7 else "اطلاعات بیشتر"
        return f"قیمت {query} - ارسال فوری - {cta} 📞"

    def generate_fix_report(self, query_data):
        """تولید گزارش اصلاح برای یک query"""
        query = query_data.get('query', '')
        current_pos = query_data.get('position', 0)
        impressions = query_data.get('impressions', 0)

        return {
            "query": query,
            "problem": f"Position {current_pos:.1f} با {impressions} impression - صفر کلیک",
            "suggested_title": self.generate_title_suggestion(query, current_pos),
            "suggested_meta": self.generate_meta_description(query, current_pos),
            "action": "Update title and meta description in WordPress"
        }

    def export_recommendations(self, output_file="gsc-recommendations.json"):
        """صادرات توصیه‌های بهبود"""
        if not self.zero_click_queries:
            print("❌ ابتدا analyze() را اجرا کنید")
            return

        recommendations = {
            "generated_at": datetime.now().isoformat(),
            "total_issues": len(self.zero_click_queries),
            "fixes": [self.generate_fix_report(q) for q in self.zero_click_queries]
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(recommendations, f, ensure_ascii=False, indent=2)

        print(f"\n✅ توصیه‌ها صادرشده: {output_file}")
        return recommendations


def main():
    import sys

    optimizer = GSCOptimizer()

    if "--analyze" in sys.argv:
        # نمونه داده برای test
        sample_data = [
            {"query": "قیمت پکیج بوتان", "clicks": 0, "impressions": 2283, "ctr": 0, "position": 8.5},
            {"query": "پکیج بیتا", "clicks": 0, "impressions": 826, "ctr": 0, "position": 6.9},
            {"query": "خرید رادیاتور", "clicks": 0, "impressions": 348, "ctr": 0, "position": 11.5},
        ]
        optimizer.gsc_data = sample_data
        optimizer.analyze()
        optimizer.export_recommendations()

    else:
        print("📖 استفاده:")
        print("  python3 gsc-optimizer.py --analyze")
        print("  python3 gsc-optimizer.py --generate-fixes")


if __name__ == "__main__":
    main()
