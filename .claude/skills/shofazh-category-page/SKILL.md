---
name: shofazh-category-page
description: Build a complete SEO + GEO product-category page (Persian) for shofazh.com using the SHZ category template. Use when the user wants content for a WooCommerce product category / دسته‌بندی محصول (not a single product). Produces a WAF-safe split deliverable — Additional CSS + plain HTML + a separate schema snippet + an SEO metadata file — ready to paste into WordPress without being blocked by the server firewall.
---

# Shofazh.com Product-Category Page Builder

You are building a complete, WordPress-ready Persian **product-category** page for shofazh.com (heating equipment e-commerce) using the SHZ category template (`.shz-cat`). This is for a WooCommerce **category** (دسته‌بندی محصول), NOT a single product — for single products use the separate `shofazh-product-page` skill.

The two canonical reference files live next to this skill:
- `category-template.css` — the `.shz-cat` design system (gradients, hero, stat cards, numbered sections, comparison table, pros/cons, calculator promo, FAQ accordion, ticker, responsive rules).
- `category-template.html` — the plain-HTML structure that pairs with that CSS.

## ⚠️ CRITICAL — WAF-Safe Split Output (non-negotiable)

shofazh.com runs a server-level firewall (mod_security/WAF) that **silently blocks and reverts** any WordPress term/category save whose body contains large `<style>`, `<script>`, `<svg>`, or `<video>` blocks, or large JSON-LD. Encoding tricks (base64, hex) and chunked AJAX did NOT reliably get past it. A single self-contained HTML block pasted into the category description is rejected on save and the previous content silently returns.

**Therefore the deliverable is ALWAYS split:**

1. **`[slug]-additional-css.txt`** → user pastes into **نمایش → سفارشی‌سازی → CSS اضافی** (Appearance → Customize → Additional CSS). This save path bypasses the WAF.
2. **`[slug]-category.html`** → plain HTML markup only, pasted into the category **توضیح** field (Text/Code tab). Must contain **NO** `<style>`, **NO** `<script>`, **NO** `<svg>`, **NO** `<video>`, and **NO** JSON-LD.
3. **`[slug]-schema.txt`** → JSON-LD (CollectionPage + ItemList + FAQPage + BreadcrumbList) delivered separately for the SEO plugin (Rank Math / Yoast) or a head snippet — never inlined.
4. **`[slug]-seo.md`** → SEO metadata file.

To keep the design intact without inline JS/SVG:
- **Counters / `data-count`** → hardcode the final Persian numbers (e.g. `<b>۱۰</b>`); there is no JS.
- **Scroll-reveal animations** → elements visible by default; entrance effects are CSS-only `@keyframes` in the CSS file.
- **Inline SVG icons** → drop them or replace with CSS shapes / emoji.
- **`<video>`** → replace with a poster `<img>` linking to the calculator page.

## Interactive Intake (MANDATORY)

When this skill is invoked, collect inputs via `AskUserQuestion` — one question at a time, in Persian. Do NOT proceed to the workflow until all answers are collected.

**Question 1 — نام دسته‌بندی**
- header: "نام دسته"
- question: "نام کامل دسته‌بندی چیه؟ (مثلاً: دیگ چدنی شوفاژکار)"
- Provide 2 placeholder options so the user types via Other.

**Question 2 — لینک صفحه دسته‌بندی**
- header: "لینک دسته"
- question: "لینک صفحه دسته‌بندی در shofazh.com چیه؟"
- User types via Other.

**Question 3 — نوع/برند محصولات این دسته**
- header: "برند/نوع"
- question: "محصولات این دسته از چه برند یا نوعی هستن؟ (مثلاً شوفاژکار، ایران رادیاتور، گرم ایران)"
- options: "شوفاژکار" / "ایران رادیاتور" / "گرم ایران" / "سایر" (Other)

**Question 4 — رنگ لهجه (Accent)**
- header: "رنگ"
- question: "رنگ اصلی صفحه چی باشه؟"
- options:
  - "قرمز گرمایشی (پیش‌فرض دیگ/مشعل گازوئیلی)"
  - "آبی (گازسوز)"
  - "نارنجی (دوگانه‌سوز)"
  - "سایر" (Other)

**Question 5 — زیرمدل‌ها / سری‌های مهم**
- header: "سری‌ها"
- question: "مهم‌ترین سری‌ها یا زیرمدل‌های این دسته رو بگو (برای کارت‌ها و جدول مقایسه). اگه نمی‌دونی بگو خودم استخراج کنم."
- User types via Other.

**Question 6 — تاکید ویژه (اختیاری)**
- header: "تاکید ویژه"
- question: "مخاطب هدف یا ویژگی خاصی که تاکید بشه؟"
- options: "موتورخانه خانگی" / "تجاری و اداری" / "صنعتی" / "بدون تاکید خاص"

After all answers, summarize them in one short Persian message, then run the workflow without further confirmation (there is no image gate in this skill — category pages don't need a hero product photo with hotspots).

## Workflow

### Step 1: Read Templates
Read `category-template.css` and `category-template.html` from this skill's folder to load the exact `.shz-cat` design and structure.

### Step 2: Category Analysis
- Try WebFetch on the category URL for real models, capacities, prices.
- **If WebFetch returns 403** (shofazh.com blocks bots): use `AskUserQuestion` to have the user paste the category details / model list manually.
- Map the accent color choice into the CSS variables (`--shz-accent`, `--shz-accent-2`, `--shz-accent-3`).

### Step 3: Content Generation (~2500–3500 Persian words)
Fill the `.shz-cat` structure. Sections (numbered via CSS counter on `h2`):
1. [دسته] چیست و چه کاربردی دارد؟ (with `.shz-lead`)
2. انواع مدل‌ها / سری‌ها (3 `.shz-card` cards)
3. راهنمای انتخاب و خرید
4. جدول مقایسه مدل‌ها (`.shz-table`)
5. مزایا و معایب (`.shz-pc` pros/cons)
6. **بلوک محاسبه‌گر ظرفیت حرارتی شوفاژ (MANDATORY)** — `.shz-calc-promo` with chips, CTA to `https://shofazh.com/shofazh-calculator.html`, and a poster `<img>` (NOT `<video>`).
7. نصب، نگهداری و سرویس
8. سوالات متداول (`.shz-faq` CSS-only `<details>` accordion, 6–8 FAQs)
9. CTA پایانی (`.shz-final`)

Also fill: the ticker bar items, the 4 stat cards (hardcoded Persian numbers), and 3–5 contextual internal links to related shofazh.com products/categories.

**Tone**: Professional, EEAT-compliant, no ⚠️ markers, no placeholder text. Persian only.

### Step 3b: SEO Metadata File
Produce `[slug]-seo.md` (Persian) and send immediately via `SendUserFile` (status: `normal`). Fields: عنوان سئو (≤60 chars), توضیحات متا (150–160), کلمه کلیدی کانونی, کلمات کلیدی ثانویه (4–6), نامک URL, متن جایگزین تصویر, عنوان/توضیحات شبکه‌های اجتماعی, عنوان نان‌مایه.

### Step 4: Schema JSON-LD (separate file — NEVER inlined)
Generate and save `[slug]-schema.txt` with:
- `CollectionPage` (name, description, url, about → Product/Brand)
- `ItemList` (the sub-models with their product URLs)
- `FAQPage` (mirror all FAQs)
- `BreadcrumbList` (Home > گرمایش > … > [دسته])
Deliver via `SendUserFile` and show in chat. Do NOT put it in the HTML.

### Step 5: Build the Split Deliverable
**File A — `[slug]-additional-css.txt`** (for Customizer → Additional CSS):
- The `.shz-cat` CSS from `category-template.css`, as plain CSS (no `<style>` tag), accent adjusted.
- Keep gradients, ticker marquee, FAQ `<details>`, responsive `@media`, and `!important` override rules. Reveal/entrance effects CSS-only.

**File B — `[slug]-category.html`** (for the category توضیح field):
- Plain HTML only. **NO** `<style>`, `<script>`, `<svg>`, `<video>`, JSON-LD.
- Root wrapper `<div class="shz-cat" dir="rtl" lang="fa">`.
- Hardcoded Persian numbers for stats; SVG icons dropped/emoji; calculator block uses poster `<img>`.

### Step 6: Save, Commit, Push
- File paths (repo root):
  - `[slug]-additional-css.txt`
  - `[slug]-category.html`
  - `[slug]-schema.txt`
  - `[slug]-seo.md`
- Slug: lowercase Latin transliteration of the category (e.g. `chauffagekar-boiler`).
- Commit message:
  ```
  Add category page: [Category Name]

  https://claude.ai/code/session_<session_id>
  ```
- Push to the current working branch (do NOT switch branches).

## Output to User
Send the deliverable files with `SendUserFile`, then reply with:
1. Repo paths of all four files.
2. **Installation steps in Persian:**
   - فایل CSS → نمایش → سفارشی‌سازی → CSS اضافی → پیست → انتشار
   - فایل HTML → ویرایش دسته‌بندی → فیلد توضیح (تب کد) → پیست → بروزرسانی
   - فایل Schema → افزونه سئو (Rank Math / Yoast) یا اسنیپت head
3. Three-line summary (word count, schema types, sub-model count).
4. Confirmation the SEO file was already sent.
5. Show the full Schema JSON-LD blocks in chat for review.

Do NOT paste the full HTML/CSS in chat — the files ARE the deliverable.

## Constraints
- Never modify the template files (`category-template.css`, `category-template.html`) — they are canonical.
- The category description HTML must be WAF-safe: no `<style>`, `<script>`, `<svg>`, `<video>`, or JSON-LD.
- No new external dependencies (fonts, CDN scripts).
- Persian only in content; English allowed in CSS, schema, and code comments.
- This skill is for product CATEGORIES only. For single products, use `shofazh-product-page`.
