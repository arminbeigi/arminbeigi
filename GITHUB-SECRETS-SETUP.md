# GitHub Secrets Setup — 3 Steps

تنظیم خودکار برای GSC Auto-Fixer

---

## 🔐 **Step 1: GitHub Secrets درست کن**

### **Method 1: GitHub Web UI (آسان‌تر)**

1. **GitHub Repository صفحه باز کن:**
   ```
   https://github.com/arminbeigi/arminbeigi
   ```

2. **Settings → Secrets and variables → Actions**

3. **"New repository secret" کلیک کن**

4. **4 Secret اضافه کن:**

#### Secret 1:
```
Name: WP_URL
Value: https://shofazh.com
```
→ Add secret

#### Secret 2:
```
Name: WP_USER
Value: admin
```
→ Add secret

#### Secret 3:
```
Name: WP_APP_PASS
Value: XGMz B2pD n1Mh zvjY GoUn 0l0E
```
→ Add secret

#### Secret 4 (اختیاری - برای Slack):
```
Name: SLACK_WEBHOOK
Value: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```
→ Add secret

---

### **Method 2: GitHub CLI**

اگر `gh` CLI دارید:

```bash
# Login
gh auth login

# Set secrets
echo "https://shofazh.com" | gh secret set WP_URL
echo "admin" | gh secret set WP_USER
echo "XGMz B2pD n1Mh zvjY GoUn 0l0E" | gh secret set WP_APP_PASS
echo "https://hooks.slack.com/..." | gh secret set SLACK_WEBHOOK  # optional
```

---

### **Method 3: Python Script (خودکار)**

```bash
export GITHUB_TOKEN="your_personal_access_token"
python3 setup-secrets-auto.py
```

**Token کجاست؟**
1. GitHub → Settings → Developer settings → Personal access tokens
2. Create new token with `repo` scope
3. Copy and use above

---

## ✅ **Step 2: Verify Secrets**

```
GitHub → Settings → Secrets and variables → Actions
```

Should see:
- ✅ WP_URL
- ✅ WP_USER
- ✅ WP_APP_PASS
- ✅ SLACK_WEBHOOK (اختیاری)

---

## 🚀 **Step 3: Test Workflow**

### **Option A: منتظر جمعه**
```
Workflow runs automatically every Friday at 9 AM UTC
```

### **Option B: دستی Run کن (فوری)**

```
GitHub → Actions → GSC Auto-Fixer → Run workflow
```

---

## 📊 **نتایج را ببین**

```
GitHub → Actions → GSC Auto-Fixer → [Latest Run]
```

**Logs:**
- Dry-run preview
- Applied changes
- WordPress responses

**Artifacts:**
- gsc-dry-run.log
- gsc-fixes-applied.log

---

## ⚙️ **Schedule تغییر کن**

`.github/workflows/gsc-auto-fixer.yml` میں تغییر دیں:

```yaml
schedule:
  - cron: '0 9 * * 5'  # ← اینجا
```

**Cron Examples:**
- `0 9 * * 5` = جمعه 9 AM UTC
- `0 0 * * *` = هر روز 12 AM UTC
- `0 18 * * 1` = دوشنبه 6 PM UTC

[Cron Guru](https://crontab.guru) استفاده کن

---

## 🛡️ **Security Notes**

- ✅ Secrets encrypted in GitHub
- ✅ Only accessible to workflows
- ✅ Not visible in logs
- ✅ Can be rotated anytime
- ⚠️ Don't share token publicly

---

**تمام!** حالا automation آماده است! 🎉
