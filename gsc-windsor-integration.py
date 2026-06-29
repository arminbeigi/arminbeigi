#!/usr/bin/env python3
"""
Windsor.ai + Google Search Console Integration
داده‌های Search Console را می‌خواند و توصیه‌های SEO می‌دهد

نیاز: Windsor.ai API access (توسط Claude نگاه داشته می‌شود)
"""

import json
import os
from datetime import datetime, timedelta


class WindsorGSCIntegration:
    """اتصال Windsor.ai برای تحلیل Search Console"""

    def __init__(self):
        self.connector_id = "searchconsole"
        self.account_id = "https://shofazh.com/"
        self.data_cache = None

    def analyze_zero_click_queries(self, data):
        """شناسایی query های با صفر کلیک و impression بالا"""
        issues = []

        for record in data:
            if record.get('clicks', 0) == 0 and record.get('impressions', 0) > 100:
                issue = {
                    "query": record.get('query', 'N/A'),
                    "impressions": record.get('impressions', 0),
                    "position": record.get('position', 0),
                    "potential_clicks": int(record.get('impressions', 0) * 0.02),  # 2% expected CTR
                    "severity": "HIGH" if record.get('impressions', 0) > 500 else "MEDIUM"
                }
                issues.append(issue)

        return sorted(issues, key=lambda x: x['impressions'], reverse=True)

    def analyze_low_ctr_pages(self, data):
        """صفحات با CTR پایین و position بالا"""
        low_performers = []

        for record in data:
            position = record.get('position', 0)
            ctr = record.get('ctr', 0)

            # Position 8+ معمولاً position 2 نتایج است
            if position > 7 and ctr < 0.05:
                page = record.get('page', 'N/A')
                query = record.get('query', 'N/A')

                low_performers.append({
                    "page": page,
                    "query": query,
                    "position": position,
                    "ctr": ctr * 100,
                    "impressions": record.get('impressions', 0),
                    "priority": "TOP" if record.get('impressions', 0) > 500 else "MEDIUM"
                })

        return sorted(low_performers, key=lambda x: x['impressions'], reverse=True)

    def generate_fixes(self, issues):
        """تولید توصیه‌های اصلاح"""
        fixes = {
            "timestamp": datetime.now().isoformat(),
            "fixes": []
        }

        for issue in issues[:5]:  # Top 5 issues
            query = issue['query']
            estimated_gain = issue['potential_clicks']

            fix = {
                "query": query,
                "current_status": f"Position {issue['position']:.1f} | {issue['impressions']} impressions",
                "problem": "صفر کلیک - title و meta description نامرتبط",
                "recommended_title": self._generate_title(query),
                "recommended_meta": self._generate_meta(query),
                "expected_gain": f"+{estimated_gain} clicks",
                "action_priority": issue['severity'],
                "steps": [
                    "1. به WordPress پنل برو",
                    f"2. صفحه‌ای برای query '{query}' پیدا کن",
                    "3. Title رو به عنوان پیشنهاد‌شده تغییر بده",
                    "4. Meta description رو آپدیت کن",
                    "5. کش سایت رو پاک کن"
                ]
            }
            fixes['fixes'].append(fix)

        return fixes

    def _generate_title(self, query):
        """تولید title بهتر برای query"""
        # Best practices: keyword near start, compelling, 50-60 chars
        return f"{query} | خرید از شوفاژ.کام"

    def _generate_meta(self, query):
        """تولید meta description"""
        return f"{query} - قیمت رقابتی و ارسال سریع 📦 سفارش دهید"

    def create_wordpress_update(self, issue):
        """ایجاد فایل آپدیت برای WordPress REST API"""
        return {
            "content": f"""
<!-- WordPress Post Update for: {issue['query']} -->
<h1>{issue['query']}</h1>
<p>قیمت {issue['query']} در شوفاژ.کام با بهترین شرایط و ارسال سریع.</p>

<!-- SEO -->
<meta name="description" content="{self._generate_meta(issue['query'])}">
<meta name="keywords" content="{issue['query']}, خرید, قیمت, شوفاژ">
            """,
            "yoast_seo": {
                "title": self._generate_title(issue['query']),
                "metaDescription": self._generate_meta(issue['query']),
                "keyphrase": issue['query']
            }
        }


def main():
    print("🔍 Google Search Console Optimizer")
    print("=" * 50)

    # نمونه‌داده
    sample_gsc_data = [
        {
            "query": "قیمت پکیج بوتان",
            "page": "https://shofazh.com/product-category/garmayesh/packages/",
            "clicks": 0,
            "impressions": 2283,
            "ctr": 0,
            "position": 8.5
        },
        {
            "query": "پکیج بیتا",
            "page": "https://shofazh.com/product-category/garmayesh/packages/",
            "clicks": 0,
            "impressions": 826,
            "ctr": 0,
            "position": 6.9
        },
        {
            "query": "خرید رادیاتور",
            "page": "https://shofazh.com/",
            "clicks": 0,
            "impressions": 348,
            "ctr": 0,
            "position": 11.5
        }
    ]

    integration = WindsorGSCIntegration()

    # تحلیل
    issues = integration.analyze_zero_click_queries(sample_gsc_data)
    fixes = integration.generate_fixes(issues)

    # خروجی
    print(f"\n📊 یافت‌شده: {len(issues)} issue\n")

    for fix in fixes['fixes']:
        print(f"🔴 Query: {fix['query']}")
        print(f"   Recommended Title: {fix['recommended_title']}")
        print(f"   Recommended Meta: {fix['recommended_meta']}")
        print(f"   Expected Gain: {fix['expected_gain']}\n")

    # ذخیره توصیه‌ها
    with open('gsc-fixes.json', 'w', encoding='utf-8') as f:
        json.dump(fixes, f, ensure_ascii=False, indent=2)

    print(f"✅ توصیه‌ها ذخیره‌شدند: gsc-fixes.json")


if __name__ == "__main__":
    main()
