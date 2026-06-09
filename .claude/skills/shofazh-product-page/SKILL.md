---
name: shofazh-product-page
description: Build a complete SEO + GEO product page (Persian) for shofazh.com products using the established RAN25 template. Use when user provides product name, URL, competitor brand, image, and category. Produces WordPress-ready HTML with animations, schema markup, and cleaned product photo.
---

# Shofazh.com Product Page Builder

You are building a complete, WordPress-ready Persian product page for shofazh.com (heating equipment e-commerce) following the exact standard established in `ran25-product-content.html`.

## Interactive Intake (MANDATORY)

When this skill is invoked, you MUST collect inputs from the user through a series of `AskUserQuestion` calls — one question at a time, in Persian. Do NOT ask all at once, and do NOT proceed to Step 1 of the workflow until all required answers are collected.

Ask in this exact order:

**Question 1 — نام محصول**
- header: "نام محصول"
- question: "نام کامل محصول چیه؟ (مثلاً: مشعل گازوئیلی ایران رادیاتور PGN0)"
- Free text via "Other" option only — provide 2 placeholder options like "مشعل گازسوز" / "مشعل گازوئیلی" so user can pick Other to type.

**Question 2 — لینک صفحه محصول**
- header: "لینک محصول"
- question: "لینک صفحه محصول در shofazh.com چیه؟"
- Same pattern — user types via Other.

**Question 3 — دسته‌بندی محصول**
- header: "دسته‌بندی"
- question: "محصول در کدوم دسته‌بندی قرار می‌گیره؟"
- options:
  - "مشعل گازسوز" (accent: blue)
  - "مشعل گازوئیلی" (accent: red)
  - "مشعل دوگانه‌سوز" (accent: orange)
  - "سایر" (user types via Other)

**Question 4 — برند رقیب برای مقایسه**
- header: "برند رقیب"
- question: "با کدوم برند مقایسه بشه؟"
- options:
  - "شوفاژکار"
  - "گرم ایران"
  - "ایران رادیاتور" (اگه محصول از برند دیگه‌ست)
  - "بدون مقایسه برند خاص"

**Question 5 — لینک عکس محصول**
- header: "عکس محصول"
- question: "لینک عکس محصول رو بده (برای پاکسازی با AI)"
- User types URL via Other.

**Question 6 — تاکید ویژه (اختیاری)**
- header: "تاکید ویژه"
- question: "ویژگی خاص یا مخاطب هدف ویژه‌ای داری که در محتوا تاکید بشه؟"
- options:
  - "موتورخانه خانگی"
  - "موتورخانه تجاری و اداری"
  - "صنعتی و کارخانه"
  - "بدون تاکید خاص"

After all 6 answers are collected, summarize them in one short Persian message, then begin the workflow: run Steps 1–2 automatically, then PAUSE at Step 2b to hand the image prompt(s) to the user. After the user delivers the images, run the remaining steps without further confirmation.

## Workflow (Execute Without Pausing for Approval — except the Step 2b image handoff)

### Step 1: Read Template
Read `ran25-product-content.html` from the repo root to load the exact CSS framework, structure, and animation standards. The `.ran25-wrap` CSS is the immutable shell — only content, image, and hotspot positions change per product.

### Step 2: Product Analysis
- Fetch the product page URL (WebFetch) to extract real specs, price, model details
- Identify the product category-specific accent color:
  - گازسوز → blue (#1565C0) — RAN25 default
  - گازوئیلی → red (#C62828)
  - دوگانه‌سوز → orange (#FF6F00)
  - سایر → keep blue
- Identify target audience (موتورخانه خانگی / تجاری / صنعتی)

### Step 2b: Image Prompt Handoff (MANDATORY PAUSE)
After the product analysis — and BEFORE generating content or building the file — hand the image-generation prompt(s) to the user and **wait for them to deliver the finished images**. The user prepares the images in their own tool and sends the URLs/files back; you then place them in the correct positions during the build. This is the one approved pause in the workflow.

1. Using the product analysis (Step 2) and the template's image slots (Step 1), write a prompt for **every image the page needs**:
   - The main hero product photo is REQUIRED — it fills `.ran25-photo-stage img` and is the single most important image, since all hotspots and callouts are positioned on top of it.
   - Add a prompt for an extra image only if the layout you plan genuinely needs one; otherwise the main photo is enough.
2. Present the prompt(s) to the user in a copy-paste-friendly block. For each image include:
   - **Purpose / placement** (e.g. "main product photo with hotspots")
   - **Prompt text in English** (image models perform best in English)
   - **Reference image**: the product image URL from Question 5
   - **Recommended orientation / aspect ratio** (the main photo works best square-to-landscape, product centered with clear empty margins so the callouts have room)
   - A reminder: **clean white or transparent background**, **remove all logos, text, watermarks and branding**, keep only the product — industrial product photography
3. **STOP and wait.** Do NOT proceed to Step 3 until the user replies with the prepared image(s). When they arrive, map each image to its slot, then continue the workflow without further confirmation.

### Step 3: Content Generation (~3500 Persian words)
Sections (numbered with CSS counter via h2):
1. معرفی محصول (intro + key benefits)
2. مشخصات فنی (table)
3. کاربردها و موارد استفاده
4. مقایسه با [برند رقیب] (table)
5. مزایا و معایب
6. نصب و راه‌اندازی
7. سوالات متداول (CSS-only `<details>` accordion, 6-8 FAQs)
8. خلاصه و جمع‌بندی
9. CTA section

**Tone**: Professional, EEAT-compliant, no ⚠️ markers, no placeholder text.
**Internal linking**: 3-5 contextual links to related shofazh.com categories.
**Entity SEO**: Use named entities (manufacturer, standards, certifications).

#### Step 3b: SEO Metadata File (generate and send to the user immediately)
As soon as the content above is written — and BEFORE building the HTML — produce a standalone SEO metadata file, save it to disk, and **send it to the user right away** with `SendUserFile` (status: `normal`). This lets the user review and approve the SEO fields while the rest of the page is being built.

- File path: `[product-slug]-seo.md` (same slug as Step 7, e.g. `pgn0-seo.md`)
- Written in Persian — it feeds WordPress SEO plugins (Rank Math / Yoast)

The file MUST contain these fields (Persian labels):
- **عنوان سئو (SEO Title)** — ≤ 60 characters, leads with the primary keyword, includes brand + model
- **توضیحات متا (Meta Description)** — 150–160 characters, contains the focus keyphrase and a clear CTA
- **کلمه کلیدی کانونی (Focus Keyphrase)** — the single primary keyword
- **کلمات کلیدی ثانویه (Secondary Keywords)** — 4–6 related / LSI keywords as a list
- **نامک پیشنهادی URL (URL Slug)** — lowercase Latin transliteration, matches the product slug
- **متن جایگزین تصویر (Image Alt Text)** — descriptive alt for the product photo, includes brand + model
- **عنوان شبکه‌های اجتماعی (Open Graph / Twitter Title)** — social-optimized title
- **توضیحات شبکه‌های اجتماعی (Open Graph / Twitter Description)** — social-optimized description
- **عنوان نان‌مایه (Breadcrumb Title)** — short breadcrumb label

Keep titles and descriptions within their character limits, write them to read naturally in Persian, and avoid keyword stuffing.

### Step 4: Schema JSON-LD
Embed inside `<script type="application/ld+json">` blocks:
- `Product` (with offers, aggregateRating, brand)
- `FAQPage` (mirror all FAQs from accordion)
- `BreadcrumbList` (Home > Category > Subcategory > Product)

### Step 5: Place the User-Supplied Images
The user already prepared and delivered the image(s) in Step 2b — do NOT auto-generate images here.
- Use the exact image URL(s) the user provided (main product photo, plus any extra images).
- Only if the user explicitly asks you to generate or clean an image instead: fall back to `mcp__higgsfield__generate_image` (model `flux_kontext`, reference = their image URL, prompt: "Remove all logos, text, watermarks, and branding from this product. Keep only the product itself on a clean white background. Industrial product photography."), wait for completion via `job_display`, then use the returned CloudFront URL.

### Step 6: Build HTML
- Copy `.ran25-wrap` CSS framework exactly as-is from RAN25 template
- Only modify:
  - Product content
  - Photo URL(s) — the user-supplied image(s) from Step 2b
  - Hotspot positions on photo (4–6 callouts on the product parts actually visible in the supplied photo)
  - Ticker bar items (product-specific features)
  - Schema JSON-LD values
  - Accent color if category requires it
- Keep ALL animations, industrial bars, gear SVGs, counter system unchanged
- Include the WordPress override block (`!important` rules) at the end

### Step 7: Save, Commit, Push
- File path: `[product-slug]-product-content.html` (e.g. `pgn0-product-content.html`)
- Also commit the SEO metadata file created in Step 3b: `[product-slug]-seo.md`
- Slug: lowercase Latin transliteration of product model
- Commit message format:
  ```
  Add product page: [Product Name]

  https://claude.ai/code/session_<session_id>
  ```
- Push to current working branch (do NOT switch branches)

## Output to User

After push, reply with:
1. Filename and repo path (both the HTML page and the `[product-slug]-seo.md` SEO file)
2. Three-line summary of what was generated (word count, schema types, image source)
3. Confirmation that the SEO metadata file was already sent to the user in Step 3b
4. Note about hotspot positions needing visual verification in browser

Do NOT paste the full HTML in chat — the file in the repo IS the deliverable.

## Constraints

- Never modify `ran25-product-content.html` itself — it is the canonical template
- Never change the `.ran25-wrap` CSS structure or animation keyframes
- Never add new external dependencies (fonts, CDN scripts)
- All graphics must remain inline SVG or CSS
- File must be self-contained and paste-ready into WordPress Text/Code editor
- Persian text only in content; English allowed in schema, CSS, and code comments
