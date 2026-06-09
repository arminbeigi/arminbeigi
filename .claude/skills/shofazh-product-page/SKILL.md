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

After all 6 answers are collected, summarize them in one short Persian message and start executing Steps 1-7 below without further confirmation.

## Workflow (Execute All Steps Without Pausing for Approval)

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

### Step 3.5: Mid-Content Image Prompts & Collection (MANDATORY — before building HTML)

After generating the content outline but BEFORE building the final HTML, you MUST:

1. **Generate image prompts**: Based on the content sections, create 3-5 image generation prompts for contextual images to be placed between content sections. Each prompt must:
   - Be a detailed, professional image-generation prompt in English
   - Describe a realistic, relevant visual for the product's context (e.g., installation scene, comparison diagram, usage environment, technical close-up)
   - Specify style: "Professional industrial photography, clean, high-quality, no text or watermarks"
   - Include the exact placement location (which section it goes after)

2. **Present prompts to user**: Use `AskUserQuestion` to show ALL image prompts in a single message in Persian, formatted like:

   ```
   header: "تصاویر محتوا"
   question: |
     برای قرار دادن تصاویر مرتبط در بین محتوا، پرامپت‌های زیر رو آماده کردم.
     لطفاً تصاویر رو تولید کنید و لینک یا فایلشون رو بدید:

     🖼 تصویر ۱ — بعد از بخش «معرفی محصول»:
     [prompt in English]

     🖼 تصویر ۲ — بعد از بخش «کاربردها و موارد استفاده»:
     [prompt in English]

     🖼 تصویر ۳ — بعد از بخش «مقایسه با ...»:
     [prompt in English]

     (و الی آخر)

     لینک یا مسیر تصاویر رو به ترتیب بدید (هر خط یک تصویر).
   ```
   - Provide two placeholder options like "تصاویر آماده‌ست" / "تصاویر رو بعداً اضافه می‌کنم" so user can type via Other.

3. **Collect image URLs/paths**: Parse the user's response to extract image URLs or file paths. Map each image to its designated content section.

4. **If user chooses "بعداً اضافه می‌کنم"**: Skip image insertion and proceed with HTML generation without mid-content images (leave commented HTML placeholders like `<!-- IMAGE PLACEHOLDER: [section name] -->` so user can add later).

5. **If user provides images**: Store the URLs/paths and use them in Step 6 (Build HTML) to insert `<img>` tags with proper `alt` text, `loading="lazy"`, and responsive styling within the `.ran25-wrap` framework at the designated positions.

### Step 4: Schema JSON-LD
Embed inside `<script type="application/ld+json">` blocks:
- `Product` (with offers, aggregateRating, brand)
- `FAQPage` (mirror all FAQs from accordion)
- `BreadcrumbList` (Home > Category > Subcategory > Product)

### Step 5: Photo Cleanup with Higgsfield
Use `mcp__higgsfield__generate_image` with model `flux_kontext`:
- Reference: user-provided image URL
- Prompt: "Remove all logos, text, watermarks, and branding from this product. Keep only the product itself on a clean white background. Industrial product photography."
- Wait for job completion via `job_display`
- Use the returned CloudFront URL in the HTML

### Step 6: Build HTML
- Copy `.ran25-wrap` CSS framework exactly as-is from RAN25 template
- Only modify:
  - Product content
  - Photo URL (cleaned version from Step 5)
  - Hotspot positions on photo (4-5 callouts on actual product parts)
  - Ticker bar items (product-specific features)
  - Schema JSON-LD values
  - Accent color if category requires it
  - **Mid-content images** (from Step 3.5): Insert collected images at their designated positions between sections. Each image must:
    - Use `<figure>` with `<img>` inside, styled consistently with `.ran25-wrap`
    - Include descriptive Persian `alt` text for SEO
    - Use `loading="lazy"` and `width="100%"` for performance
    - Have a subtle `<figcaption>` in Persian if appropriate
    - If no images were provided, insert `<!-- IMAGE PLACEHOLDER: [section name] -->` comments instead
- Keep ALL animations, industrial bars, gear SVGs, counter system unchanged
- Include the WordPress override block (`!important` rules) at the end

### Step 7: Save, Commit, Push
- File path: `[product-slug]-product-content.html` (e.g. `pgn0-product-content.html`)
- Slug: lowercase Latin transliteration of product model
- Commit message format:
  ```
  Add product page: [Product Name]

  https://claude.ai/code/session_<session_id>
  ```
- Push to current working branch (do NOT switch branches)

## Output to User

After push, reply with:
1. Filename and repo path
2. Three-line summary of what was generated (word count, schema types, photo cleanup status)
3. Note about hotspot positions needing visual verification in browser

Do NOT paste the full HTML in chat — the file in the repo IS the deliverable.

## Constraints

- Never modify `ran25-product-content.html` itself — it is the canonical template
- Never change the `.ran25-wrap` CSS structure or animation keyframes
- Never add new external dependencies (fonts, CDN scripts)
- All graphics must remain inline SVG or CSS
- File must be self-contained and paste-ready into WordPress Text/Code editor
- Persian text only in content; English allowed in schema, CSS, and code comments
