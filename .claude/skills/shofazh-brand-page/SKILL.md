---
name: shofazh-brand-page
description: Build a complete SEO + GEO brand page (Persian, 1000–2000 words) for shofazh.com brands using the RAN25 visual framework. Use when the user wants a brand/manufacturer landing page (NOT a single product page) — e.g. "صفحه برند بساز", "محتوای صفحه برند X". Collects brand name, URL, category, competitor and logo/photo, hands the user an image-generation prompt and pauses for them to supply the image, then produces WordPress-ready HTML with animations, Brand/Organization + FAQ + Breadcrumb schema, and a separate SEO metadata file.
---

# Shofazh.com Brand Page Builder

You are building a complete, WordPress-ready Persian **brand (manufacturer) landing page** for shofazh.com (heating & cooling equipment e-commerce — تاسیسات حرارتی و برودتی) following the exact visual standard established in `ran25-product-content.html`.

> This skill is for **BRAND** pages (a hub page that introduces a manufacturer and all its product lines). It is NOT the single-product skill (`shofazh-product-page`). Do not edit or reuse that skill's output rules — brand pages have their own structure, word count (1000–2000), and schema (Brand/Organization).

## Interactive Intake (MANDATORY)

When this skill is invoked, you MUST collect inputs from the user through `AskUserQuestion` calls — one question at a time, in Persian. Do NOT ask all at once, and do NOT proceed to Step 1 until all required answers are collected. If the user already supplied an answer earlier in the conversation, skip that question.

Ask in this exact order:

**Question 1 — نام برند**
- header: "نام برند"
- question: "نام کامل برند چیه؟ (فارسی + انگلیسی — مثلاً «بوش / Bosch»)"
- Free text via "Other" — provide 2 placeholder options (e.g. یک برند رایج مثل "ایران رادیاتور" و "بوش / Bosch") so user can pick Other to type.

**Question 2 — لینک صفحه برند**
- header: "لینک برند"
- question: "لینک صفحه برند در shofazh.com چیه؟ (اگه ساخته نشده بنویس «نساختم» تا اسلاگ پیشنهاد بدم)"
- Same pattern — user types via Other.

**Question 3 — دسته‌بندی اصلی برند**
- header: "دسته‌بندی"
- question: "این برند بیشتر در چه دسته‌ای فعالیت داره؟"
- options:
  - "پکیج و دیگ گرمایشی" (accent: blue)
  - "رادیاتور و شوفاژ" (accent: orange)
  - "کولر گازی و برودتی" (accent: green)
  - "سایر تاسیسات" (user types via Other)

**Question 4 — برند رقیب برای مقایسه**
- header: "برند رقیب"
- question: "با کدوم برند مقایسه بشه؟"
- options:
  - "ایران رادیاتور"
  - "بوتان"
  - "بوش / Bosch"
  - "بدون مقایسه برند خاص"

**Question 5 — لینک لوگو/تصویر برند (مرجع برای پرامپت)**
- header: "تصویر برند"
- question: "لینک لوگو یا تصویر شاخص برند رو بده (به‌عنوان مرجع برای پرامپت تصویر هیرو)"
- User types URL via Other.
- NOTE: This URL is ONLY a reference for writing the image prompt in Step 2b. It is NOT the final image. Never treat it as the finished hero image, and never skip the Step 2b pause just because this URL exists — the final image always comes from the user after Step 2b.

**Question 6 — تاکید ویژه (اختیاری)**
- header: "تاکید ویژه"
- question: "نکتهٔ خاصی هست که در محتوا برجسته بشه؟ (مثلاً کشور سازنده، گارانتی، خدمات پس از فروش)"
- options:
  - "کیفیت و گارانتی"
  - "قیمت رقابتی"
  - "خدمات پس از فروش گسترده"
  - "بدون تاکید خاص"

After all answers are collected, summarize them in one short Persian message, then begin the workflow. Run Steps 1–2 automatically, then **STOP at Step 2b**: present the image prompt(s) as the final message of that turn and end the turn. Do NOT generate content, build the file, or call any further tools until the user replies with the finished image. After the image arrives, run the remaining steps without further confirmation.

## Workflow (Execute Without Pausing — except the Step 2b image handoff)

> ⛔ **HARD GATE — Step 2b is a mandatory stop.** This skill has exactly one pause. After Steps 1–2 you MUST present the image prompt(s) and **end your turn**, then wait for the user to send back the finished image. You must NEVER:
> - auto-generate or auto-clean the hero/logo image yourself;
> - treat the Question 5 reference URL as the final image;
> - generate content, build the HTML, or run any of Steps 3–7 before the user has delivered the image.
> The hero image always comes from the user, after Step 2b.

### Step 1: Read Template
Read `ran25-product-content.html` from the repo root to load the exact CSS framework, structure, and animation standards. The `.ran25-wrap` CSS is the immutable shell — only content, image, ticker items, and accent color change. For a brand page the hero stage shows the brand logo/hero image (no product hotspots required, but you MAY add 3–4 callouts highlighting brand strengths if a strong hero image is provided).

### Step 2: Brand Analysis
- Try to fetch the brand page URL (WebFetch) to extract real info (product lines, slogans, country).
- **If WebFetch returns 403**: shofazh.com blocks automated requests (WAF/Cloudflare). Use `AskUserQuestion` to ask the user to paste key brand facts manually (header: "اطلاعات برند", question: "دسترسی مستقیم به سایت ممکن نیست. لطفاً اطلاعات برند (کشور سازنده، سال تأسیس، محصولات شاخص، گارانتی) رو اینجا پیست کن."). Then continue with provided data.
- Pick the accent color by category:
  - پکیج و دیگ گرمایشی → blue (#1565C0) — RAN25 default
  - رادیاتور و شوفاژ → orange (#FF6F00)
  - کولر گازی و برودتی → green (#2E7D32)
  - سایر → keep blue
- Identify the brand's main product lines and positioning.

### Step 2b: Image Prompt Handoff (MANDATORY PAUSE)
After brand analysis — and BEFORE generating content or building the file — hand the image-generation prompt(s) to the user and **wait for them to deliver the finished image**.

1. Write a prompt for **every image the page needs**:
   - The hero brand image is REQUIRED — it fills `.ran25-photo-stage img`. For a brand page this is best as a clean, premium brand banner / flagship product lineup of the brand, on a clean white or subtle gradient background.
   - Add a prompt for an extra image only if the layout genuinely needs one.
2. Present the prompt(s) in a copy-paste-friendly block. For each image include:
   - **Purpose / placement** (e.g. "hero brand banner")
   - **Prompt text in English** (image models perform best in English)
   - **Reference image**: the URL from Question 5
   - **Recommended orientation / aspect ratio** (hero works best square-to-landscape, subject centered with clear empty margins)
   - A reminder: **clean white or transparent background**, **remove all third-party logos, text, watermarks** except the brand itself if intentional, premium industrial product photography.
3. **STOP — end your turn here.** Send the prompt(s) as your final message and do NOT call any more tools, do NOT generate content, and do NOT build the file this turn. Only after the user's NEXT message delivers the finished image do you map it to its slot and continue without further confirmation.

### Step 3: Content Generation (1000–2000 Persian words)
Sections (numbered with CSS counter via h2):
1. معرفی برند [نام برند] (intro + جایگاه برند در بازار)
2. تاریخچه و کشور سازنده
3. محصولات شاخص [نام برند] (product lines — با لینک داخلی به دسته‌ها)
4. چرا [نام برند] را انتخاب کنیم؟ (مزایای کلیدی)
5. مقایسه [نام برند] با [برند رقیب] (table)
6. گارانتی و خدمات پس از فروش
7. راهنمای خرید محصولات [نام برند] از شوفاژ
8. سوالات متداول (CSS-only `<details>` accordion, 6–8 FAQs)
9. جمع‌بندی + CTA

**Special Section — محاسبه‌گر ظرفیت حرارتی شوفاژ (MANDATORY)**:
Insert a visually striking, animated promotional block **after section 4 (چرا این برند) and before section 5 (مقایسه)**. This is NOT a regular paragraph — it must be an eye-catching CTA block.

**Content**: Explain that shofazh.com offers a free online heat-capacity calculator to determine the right heating capacity before buying. Emphasize: محاسبه دقیق ظرفیت بر اساس متراژ و عایق‌بندی؛ انتخاب صحیح محصول بدون اتلاف انرژی؛ کاملاً رایگان و آنلاین؛ جلوگیری از خرید با ظرفیت نامناسب.

**Links**:
- Calculator page: `https://shofazh.com/shofazh-calculator.html`
- Video: `https://shofazh.com/wp-content/uploads/2026/05/cleaned_محاسبه_گر_ظرفیت_حرارتی.mp4`

**HTML/CSS requirements** (self-contained within `.ran25-wrap`):
- Wrap in `<div class="ran25-calculator-promo">`
- Background gradient adapted to the accent color (e.g. `linear-gradient(135deg,#0d47a1,#1565c0,#1976d2)`)
- White text; animated entry via `@keyframes slideInUp` (`animation: slideInUp 0.8s ease-out`)
- Inline SVG calculator/thermometer icon (geometric, industrial)
- `<video controls autoplay muted loop playsinline>` with `poster`, `border-radius:12px`, box-shadow, `max-width:100%`
- CTA pill button "محاسبه ظرفیت حرارتی رایگان" → calculator page, with hover glow + `@keyframes pulse`
- Premium, magazine-ad feel; mobile responsive (stack vertically)

**Tone**: Professional, EEAT-compliant, no ⚠️ markers, no placeholder text. Friendly persuasive tone for the calculator block.
**Internal linking**: 3–5 contextual links to related shofazh.com categories/products.
**Entity SEO + GEO**: Use named entities (manufacturer, country, standards, certifications, product model families) so LLM answer engines can cite the page confidently.

### Step 3.5: Mid-Content Image Prompts & Collection (MANDATORY — before building HTML)
1. **Generate 2–4 image prompts** (English, professional, no text/watermarks) for contextual images between sections (e.g. flagship product lineup, factory/quality scene, installation/usage environment, warranty/service scene). Specify exact placement (which section each goes after).
2. **Present prompts** via `AskUserQuestion` in a single Persian message (header "تصاویر محتوا"), listing each numbered prompt with its placement, and ask the user to send links/paths in order. Provide placeholder options "تصاویر آماده‌ست" / "تصاویر رو بعداً اضافه می‌کنم" (Other to type).
3. **Collect URLs/paths** and map each to its section.
4. **If "بعداً اضافه می‌کنم"**: skip insertion, leave `<!-- IMAGE PLACEHOLDER: [section name] -->` comments.
5. **If provided**: use in Step 5 with proper Persian `alt`, `loading="lazy"`, `width="100%"`.

### Step 3c: SEO Metadata File (generate and send immediately)
As soon as the content is written — and BEFORE building the HTML — produce a standalone SEO metadata file, save to disk, and **send it to the user right away** with `SendUserFile` (status: `normal`).

- File path: `[brand-slug]-brand-seo.md` (same slug as Step 6)
- Written in Persian — feeds Rank Math / Yoast.

Required fields (Persian labels):
- **عنوان سئو (SEO Title)** — ≤ 60 chars, leads with primary keyword + brand
- **توضیحات متا (Meta Description)** — 150–160 chars, focus keyphrase + clear CTA
- **کلمه کلیدی کانونی (Focus Keyphrase)** — single primary keyword (combination buy + intro, e.g. "خرید محصولات [برند]")
- **کلمات کلیدی ثانویه (Secondary Keywords)** — 4–6 LSI keywords as a list
- **نامک پیشنهادی URL (URL Slug)** — lowercase Latin transliteration of brand
- **متن جایگزین تصویر (Image Alt Text)** — descriptive alt for hero, includes brand
- **عنوان شبکه‌های اجتماعی (Open Graph / Twitter Title)**
- **توضیحات شبکه‌های اجتماعی (Open Graph / Twitter Description)**
- **عنوان نان‌مایه (Breadcrumb Title)** — short label

### Step 4: Schema JSON-LD
Embed inside `<script type="application/ld+json">` blocks:
- `Brand` (or `Organization` with `brand`) — name, logo, url, description, sameAs if available
- `FAQPage` (mirror all FAQs from the accordion)
- `BreadcrumbList` (Home > برندها > [Brand])

### Step 5: Build HTML
- Copy `.ran25-wrap` CSS framework exactly as-is from RAN25 template.
- Only modify: brand content; hero image URL (user-supplied from Step 2b); optional 3–4 callouts on the hero; ticker bar items (brand strengths); Schema JSON-LD values; accent color if category requires; mid-content images (from Step 3.5).
- Each mid-content image: `<figure>` with `<img>` (Persian `alt`, `loading="lazy"`, `width="100%"`), optional Persian `<figcaption>`. If none provided, insert `<!-- IMAGE PLACEHOLDER: [section name] -->`.
- Keep ALL animations, industrial bars, gear SVGs, counter system unchanged.
- Include the WordPress override block (`!important` rules) at the end.

### Step 6: Save, Commit, Push
- HTML file path: `[brand-slug]-brand-content.html` (e.g. `bosch-brand-content.html`)
- Also commit the SEO file from Step 3c: `[brand-slug]-brand-seo.md`
- Slug: lowercase Latin transliteration of brand name.
- Commit message format:
  ```
  Add brand page: [Brand Name]

  https://claude.ai/code/session_<session_id>
  ```
- Push to current working branch (do NOT switch branches).

## Output to User
After push, reply with:
1. Filenames and repo paths (both the HTML page and the `[brand-slug]-brand-seo.md` file)
2. Three-line summary (word count, schema types, image count)
3. Confirmation that the SEO metadata file was already sent in Step 3c
4. Note about hotspot/callout positions needing visual verification in browser (if used)
5. **Schema JSON-LD preview**: display the full generated Brand/Organization, FAQPage, BreadcrumbList code blocks in chat for review.

Do NOT paste the full HTML in chat — the file in the repo IS the deliverable. But DO show the Schema JSON-LD separately.

## Constraints
- Never modify `ran25-product-content.html` itself — it is the canonical template.
- Never change the `.ran25-wrap` CSS structure or animation keyframes.
- Never add new external dependencies (fonts, CDN scripts).
- All graphics must remain inline SVG or CSS.
- File must be self-contained and paste-ready into the WordPress Text/Code editor.
- Persian text only in content; English allowed in schema, CSS, and code comments.
- Keep total body content within 1000–2000 Persian words (brand pages are leaner than product pages).
