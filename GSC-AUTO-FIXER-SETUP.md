# GSC Auto-Fixer — Setup & Automation

خودکار تعمیر کوئری‌های صفر کلیک در Google Search Console

---

## 🚀 **تنظیم Automation (یک‌بار)**

### **Step 1: GitHub Secrets اضافه کن**

GitHub → Settings → Secrets and variables → Actions → New repository secret

```
نام: WP_URL
مقدار: https://shofazh.com
```

```
نام: WP_USER
مقدار: admin
```

```
نام: WP_APP_PASS
مقدار: <YOUR_WP_APP_PASSWORD>
```

```
نام: SLACK_WEBHOOK
مقدار: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```
(اختیاری - برای اعلانات Slack)

### **Step 2: Git Push کن**

```bash
git add .github/workflows/gsc-auto-fixer.yml
git commit -m "Add GSC Auto-Fixer GitHub Actions workflow"
git push
```

---

## ⏰ **اجرا شود کی؟**

### **خودکار:**
- **هر جمعه** ساعت 9 صبح (UTC)
- Yoast SEO metadata تغییر می‌کند
- نتایج logged و committed می‌شوند
- Slack notification فرستاده می‌شود

### **دستی:**
```
GitHub → Actions → GSC Auto-Fixer → Run workflow
```

---

## 📋 **چی اتفاق می‌افتد؟**

```
1️⃣ GSC data از gsc-fixes.json خوانده می‌شود
2️⃣ صفحات WordPress پیدا می‌شوند
3️⃣ Titles و Descriptions update می‌شوند
4️⃣ Logs و results ذخیره می‌شوند
5️⃣ Slack notification فرستاده می‌شود
6️⃣ Changes commit و push می‌شوند
```

---

## 🛡️ **Safety**

- ✅ فقط Yoast SEO metadata تغییر می‌کند
- ✅ فقط 3 query مشخص تغییر می‌کند
- ✅ تمام changes logged می‌شوند
- ✅ Rollback امکان‌پذیر است

---

## 📊 **نتایج را ببین**

```
GitHub → Actions → GSC Auto-Fixer → [Latest Run]
```

**Logs:**
- Dry-run preview
- Applied changes
- WordPress REST API responses

**Artifacts:**
- `gsc-dry-run.log`
- `gsc-fixes-applied.log`

---

## ⚠️ **اگر مشکل شد**

```bash
# Local test:
export WP_URL="https://shofazh.com"
export WP_USER="admin"
export WP_APP_PASS="<YOUR_WP_APP_PASSWORD>"

python3 gsc-auto-fixer.py --dry-run
```

---

**حالا هر جمعه خودکار اجرا می‌شود!** 🎉
