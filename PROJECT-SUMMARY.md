# GSC Auto-Fixer — Project Summary

## 📋 خلاصه پروژه

**هدف:** خودکار تعمیر کوئری‌های صفر کلیک در Google Search Console

---

## 🎯 مشکل

3 query داری که 3,500+ نفر جستجو می‌کنند اما **صفر کلیک** می‌گیرند:

- "قیمت پکیج بوتان" → 2,283 impression | 0 click
- "پکیج بیتا" → 826 impression | 0 click
- "خرید رادیاتور" → 348 impression | 0 click

**علت:** Title و Meta Description غلط

---

## ✅ حل

### 4 اسکریپت Python:

1. **gsc-optimizer.py** - تحلیل GSC data
2. **gsc-windsor-integration.py** - دریافت data از Windsor.ai
3. **gsc_wp_mapper.py** - پیدا کردن صفحات WordPress
4. **gsc-auto-fixer.py** - اعمال تغییرات با approval

### GitHub Actions Automation:

- اجرا شود: **هر جمعه ساعت 9 صبح UTC**
- فایل: `.github/workflows/gsc-auto-fixer.yml`

---

## 🔧 تنظیم (یک‌بار)

GitHub → Settings → Secrets → Add 3 Secret:

```
WP_URL = https://shofazh.com
WP_USER = admin
WP_APP_PASS = <YOUR_WP_APP_PASSWORD>
```

---

## 🚀 چی اتفاق می‌افتد

### جمعه:
```
Workflow شروع → GSC data خواندن → صفحات یافت
→ Yoast SEO تغییر → Log ذخیره
```

### 3 صفحه تغییر می‌کند:
- /product-category/garmayesh/packages/
- (و 2 صفحه دیگر)

### تغییرات:
- ✅ Yoast Title
- ✅ Yoast Meta Description
- ✅ Yoast Focus Keyword
- ❌ محتوا نه
- ❌ قیمت نه

---

## 📊 نتایج انتظاری (7-14 روز)

```
"قیمت پکیج بوتان":
  Position: 8.5 → 4-6
  CTR: 0% → 2-3%
  Clicks: 0 → +45 ✅

جمع: +67 کلیک رایگان!
```

---

## 📍 نتایج را کجا ببینی

1. **GitHub Actions** - workflow logs
2. **gsc-fixes-applied.log** - تفصیلات تغییرات
3. **WordPress Panel** - verify title/meta
4. **Google Search Console** - CTR/Position بهتر

---

## 🛡️ Safety

- ✅ فقط 3 صفحه تغییر می‌کند
- ✅ Preview قبل از تغییر (dry-run)
- ✅ User approval لازم
- ✅ تمام تغییرات logged
- ✅ Reversible

---

## 📝 فایل‌های ایجاد شده

```
gsc-optimizer.py                    (Core analysis)
gsc-windsor-integration.py          (GSC data fetch)
gsc_wp_mapper.py                    (WordPress mapping)
gsc-auto-fixer.py                   (Main workflow)
.github/workflows/gsc-auto-fixer.yml (GitHub Actions)
GSC-OPTIMIZER-README.md             (Documentation)
GITHUB-SECRETS-SETUP.md             (Setup guide)
setup-github-secrets.sh             (Helper script)
setup-secrets-auto.py               (Helper script)
```

---

## ⏭️ مرحله بعد

1. GitHub Secrets را setup کن (3 secret)
2. منتظر جمعه یا manual trigger
3. نتایج را GitHub Actions میں ببین
4. 7-14 روز بعد GSC میں بهبود ببین

---

## 📞 Questions?

- Logs: GitHub → Actions
- Changes: gsc-fixes-applied.log
- Manual: `python3 gsc-auto-fixer.py --dry-run`

---

**Status:** ✅ READY - فقط Secrets منتظر

Generated: 2026-06-29
