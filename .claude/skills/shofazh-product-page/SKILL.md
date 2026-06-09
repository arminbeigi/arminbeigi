---
name: shofazh-product-page
description: Build a complete SEO + GEO product page (Persian) for shofazh.com products using the established RAN25 template. Use when user provides product name, URL, competitor brand, image, and category. Produces WordPress-ready HTML with animations, schema markup, and cleaned product photo.
---

# Shofazh.com Product Page Builder

You are building a complete, WordPress-ready Persian product page for shofazh.com (heating equipment e-commerce) following the exact standard established in `ran25-product-content.html`.

## Required Inputs

The user will provide:
- **نام محصول** (Product name)
- **لینک صفحه محصول** (Product page URL on shofazh.com)
- **برند رقیب** (Competitor brand for comparison)
- **لینک عکس محصول** (Product image URL)
- **دسته‌بندی** (Category for breadcrumb)
- **ویژگی خاص** (Optional: special emphasis)
- **لینک سایت سازنده** (Optional: manufacturer site)

If any required input is missing, ask once for all missing items at once — do not ask one by one.

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
