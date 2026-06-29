# Google Search Console Optimizer

خودکار شناسایی و اصلاح صفحات بد‌اجرا در Google Search Console

## 🎯 مسئله

"قیمت پکیج بوتان" و هزاران query دیگر ما را ببینند (impressions) اما کلیک نمی‌کنند:
- **2,283 impressions** ❌ **0 کلیک** ❌
- Position 8.5 (صفحه ۲ گوگل)
- Title/Meta Description نامرتبط

## ✅ راه‌حل

### 1. **شناسایی Zero-Click Queries**
```bash
python3 gsc-windsor-integration.py
```

نتیجه: فهرست query هایی که impression بالا اما کلیک صفر دارند

### 2. **تولید توصیه‌های SEO**
```
Query: "قیمت پکیج بوتان"
├─ Current: Position 8.5 | 2,283 impressions | 0 clicks
├─ Fix: Update title to "قیمت پکیج بوتان | خرید از شوفاژ.کام"
└─ Expected Gain: +45 clicks
```

### 3. **خودکار بروزرسانی WordPress** (آینده)
```python
# GitHub Actions یا API
wp_update_post.py --query "قیمت پکیج بوتان" --auto-fix
```

---

## 📊 نتایج انتظاری

| Query | Current | Fixed | Potential Gain |
|-------|---------|-------|-----------------|
| قیمت پکیج بوتان | 0 کلیک | +2-3% CTR | +45 کلیک |
| پکیج بیتا | 0 کلیک | +2% CTR | +16 کلیک |
| خرید رادیاتور | 0 کلیک | +2% CTR | +6 کلیک |
| **جمع** | | | **+65+ کلیک** |

## 🔧 فایل‌ها

```
├── gsc-optimizer.py                 # Core analysis engine
├── gsc-windsor-integration.py      # Windsor.ai integration
├── gsc-fixes.json                  # Generated recommendations
└── GSC-OPTIMIZER-README.md         # This file
```

## 🚀 استفاده

### آنی (دستی)
```bash
python3 gsc-windsor-integration.py
```

### خودکار (GitHub Actions - آینده)
1. Schedule: هر هفته
2. خواندن Search Console via Windsor.ai
3. تولید توصیه‌ها
4. ارسال notification به Slack

## 🔗 Integration Points

### Windsor.ai
- ✅ متصل
- Query: Top 100 zero-click queries
- Period: Last 30 days
- Fields: query, impressions, position, page

### WordPress API (آینده)
- بروزرسانی Title (Yoast/Rank Math)
- بروزرسانی Meta Description
- Schema Markup optimization

### Slack (آینده)
- تنبیه‌های Daily
- Weekly reports

---

## 📈 نمونه Output

```json
{
  "timestamp": "2026-06-29T12:00:00",
  "fixes": [
    {
      "query": "قیمت پکیج بوتان",
      "current_status": "Position 8.5 | 2283 impressions",
      "problem": "صفر کلیک - title و meta description نامرتبط",
      "recommended_title": "قیمت پکیج بوتان | خرید از شوفاژ.کام",
      "recommended_meta": "قیمت پکیج بوتان - قیمت رقابتی و ارسال سریع 📦",
      "expected_gain": "+45 clicks",
      "action_priority": "HIGH"
    }
  ]
}
```

---

## 🎓 Best Practices

1. **Title**: شامل کلمه اصلی در 50 کاراکتر اول
2. **Meta**: جذاب، CTA واضح، 155 کاراکتر
3. **H1**: تطابق دقیق با query یا intent شبیه
4. **Content**: بالاترین جواب برای سوال کاربر

---

## 📞 سوالات متداول

**سوال: چرا position 8.5 اما CTR=0؟**
- Title نامرتبط است
- Meta description جذاب نیست
- User intent match کم است

**سوال: میتونم دستی fix کنم؟**
- بله! فهرست توصیه‌ها را ببین و WordPress پنل > محصولات > ویرایش کن

**سوال: چقدر زمان لازم است؟**
- Title/Meta: 2-3 روز effect
- Rank تغییر: 1-2 هفته

---

**Generated: 2026-06-29 | Branch: claude/google-search-console-ila5wg**
