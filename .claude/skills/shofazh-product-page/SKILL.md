---
name: shofazh-product-page
description: Build a complete SEO + GEO product page (Persian) for shofazh.com products using the established RAN25 template. Use when user provides product name, URL, competitor brand, image, and category. Hands the user an image-generation prompt and pauses for them to supply the photo, then produces WordPress-ready HTML with animations and schema markup. After delivery, presents SEO metadata as an inline table in chat (no separate file).
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

**Question 5 — لینک عکس محصول (مرجع برای پرامپت)**
- header: "عکس محصول"
- question: "لینک عکس محصول رو بده (به‌عنوان مرجع برای پرامپت تصویر)"
- User types URL via Other.
- NOTE: This URL is ONLY a reference for writing the image prompt in Step 2b. It is NOT the final image. Never treat it as the finished product photo, and never skip the Step 2b pause just because this URL exists — the final image always comes from the user after Step 2b.

**Question 6 — تاکید ویژه (اختیاری)**
- header: "تاکید ویژه"
- question: "ویژگی خاص یا مخاطب هدف ویژه‌ای داری که در محتوا تاکید بشه؟"
- options:
  - "موتورخانه خانگی"
  - "موتورخانه تجاری و اداری"
  - "صنعتی و کارخانه"
  - "بدون تاکید خاص"

After all 6 answers are collected, summarize them in one short Persian message, then begin the workflow. Run Steps 1–2 automatically, then **STOP at Step 2b**: present the image prompt(s) as the final message of that turn and end the turn. Do NOT generate content, build the file, or call any further tools until the user replies with the finished images. After the images arrive, run the remaining steps without further confirmation.

## Workflow (Execute Without Pausing for Approval — except the Step 2b image handoff)

> ⛔ **HARD GATE — Step 2b is a mandatory stop.** This skill has exactly one pause. After Steps 1–2 you MUST present the image prompt(s) and **end your turn**, then wait for the user to send back the finished images. You must NEVER:
> - auto-generate or auto-clean the product photo yourself — there is no automatic image step;
> - treat the Question 5 reference URL as the final image;
> - generate content, build the HTML, or run any of Steps 3–7 before the user has delivered the images.
> The product photo always comes from the user, after Step 2b. If you find yourself building the page without it, you skipped the gate.

### Step 1: Read Template
Read `ran25-product-content.html` from the repo root to load the exact CSS framework, structure, and animation standards. The `.ran25-wrap` CSS is the immutable shell — only content, image, and hotspot positions change per product.

### Step 2: Product Analysis
- Try to fetch the product page URL (WebFetch) to extract real specs, price, model details
- **If WebFetch returns 403**: shofazh.com blocks automated requests (WAF/Cloudflare). In this case, use `AskUserQuestion` to ask the user to paste the product specs manually (header: "مشخصات محصول", question: "دسترسی مستقیم به سایت ممکن نیست. لطفاً مشخصات فنی محصول (مدل، ظرفیت، قیمت، ابعاد و ...) رو اینجا پیست کنید."). Then continue with the provided data.
- Identify the product category-specific **design palette** (minimal, modern, high-readability — not just an accent swap). Each palette defines: primary accent, secondary accent, soft background tint, text-on-light, text-on-dark, and a subtle gradient for hero/calculator blocks. Pick crisp, magazine-grade combinations; avoid muddy or low-contrast pairs. Body text must always sit on a near-white surface for AA-readability; accents are reserved for headings, dividers, hotspots, buttons, and the ticker bar.

  - **گازسوز (Gas burner) — Cool Industrial Blue**
    - Primary: `#0D47A1` · Secondary: `#1976D2` · Soft tint bg: `#E8F1FB`
    - Hero gradient: `linear-gradient(135deg,#0D47A1 0%,#1976D2 100%)`
    - Mood: clean, technical, trustworthy
  - **گازوئیلی (Oil burner) — Warm Ember**
    - Primary: `#B71C1C` · Secondary: `#E65100` · Soft tint bg: `#FFF1EC`
    - Hero gradient: `linear-gradient(135deg,#7F1D1D 0%,#B71C1C 55%,#E65100 100%)`
    - Mood: powerful, high-heat, robust
  - **دوگانه‌سوز (Dual-fuel) — Amber Graphite**
    - Primary: `#E65100` · Secondary: `#37474F` · Soft tint bg: `#FFF6E8`
    - Hero gradient: `linear-gradient(135deg,#263238 0%,#455A64 50%,#E65100 100%)`
    - Mood: versatile, premium, balanced
  - **سایر (Other) — DERIVE a custom palette, no fixed default**
    - When the user picked "سایر" and typed a custom category, you MUST design a bespoke palette derived from three signals, in priority order:
      1. **The typed category's nature** — e.g. پمپ/آبرسانی → aqua-blues; دیگ بخار → steel/graphite + hot accent; منبع انبساط → copper/bronze tones; رادیاتور/حوله‌خشک‌کن → warm neutrals; تجهیزات استخر → cyan/turquoise; کنترل و ابزار دقیق → violet/indigo tech tones.
      2. **The product itself** — its dominant body color in the reference photo (Question 5) can inform the secondary accent so page and photo feel cohesive.
      3. **The brand identity** — if the brand has a recognizable color (e.g. ایران رادیاتور red, بوتان blue), echo it subtly in the accent.
    - Build the same token set as the fixed palettes: Primary, Secondary, Soft tint bg, Hero gradient — minimal, modern, AA-readable.
    - In the final reply, briefly state (one Persian sentence) which palette you derived and why.

  Apply the palette consistently across: H2 numbered counters, table header rows, blockquotes/callout borders, hotspot dots, CTA buttons, ticker bar background, calculator-promo gradient, and the `--accent` CSS custom property of `.ran25-wrap`. Body copy stays `#111` on `#FFFFFF`/`#FAFAFA` for maximum readability — never colorize paragraph text.

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
3. **STOP — end your turn here.** Send the prompt(s) as your final message and do NOT call any more tools, do NOT generate content, and do NOT build the file in this turn. This is a hard gate, not a soft suggestion: even though Question 5 already gave you a reference URL, you must still pause and wait. Only after the user's NEXT message delivers the finished image(s) do you map each image to its slot and continue the workflow without further confirmation.

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

**Special Section — محاسبه‌گر ظرفیت حرارتی شوفاژ (MANDATORY in every product page)**:

Insert a visually striking, hyper-designed promotional paragraph **after section 5 (مزایا و معایب) and before section 6 (نصب و راه‌اندازی)** — right in the middle of the content. This is NOT a regular paragraph — it must be an eye-catching, animated call-to-action block.

**Content**: Explain that shofazh.com offers a free online heat capacity calculator tool that helps users precisely determine the right heating capacity for their space before purchasing a burner/boiler. Emphasize:
- محاسبه دقیق ظرفیت حرارتی مورد نیاز بر اساس متراژ، عایق‌بندی، و شرایط آب و هوایی
- انتخاب صحیح مشعل/دیگ بدون اتلاف انرژی و هزینه اضافی
- کاملاً رایگان و آنلاین — بدون نیاز به نصب
- کمک به جلوگیری از خرید مشعل با ظرفیت نامناسب (کم یا زیاد)

**Links**:
- Calculator page: `https://shofazh.com/shofazh-calculator.html`
- Video: `https://shofazh.com/wp-content/uploads/2026/05/cleaned_محاسبه_گر_ظرفیت_حرارتی.mp4`

**HTML/CSS requirements for this block** (must be self-contained within `.ran25-wrap`):
- Wrap in a dedicated `<div class="ran25-calculator-promo">` with unique styling
- Background: subtle gradient (e.g., `linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #1976d2 100%)`) — adapt to product accent color
- White text on dark background for contrast
- Animated entry: use `@keyframes slideInUp` with `animation: slideInUp 0.8s ease-out` (trigger via `IntersectionObserver` or CSS-only approach)
- Include an inline SVG icon of a calculator or thermometer (simple, geometric, matching the industrial style)
- Embed the video using `<video>` tag with:
  - `controls autoplay muted loop playsinline`
  - `poster` attribute (first frame or product image)
  - Rounded corners (`border-radius: 12px`), subtle box-shadow
  - `max-width: 100%` responsive
  - Wrapper with padding and slight background tint
- CTA button: "محاسبه ظرفیت حرارتی رایگان" linking to the calculator page
  - Button style: pill shape, white background, dark text, hover glow animation (`box-shadow` pulse)
- Add a pulsing dot or subtle `@keyframes pulse` animation on the CTA button to draw attention
- The entire block should feel premium and distinct from regular content sections — like a magazine ad insert
- Mobile responsive: stack video and text vertically on small screens

**Tone for this paragraph**: Friendly, helpful, slightly persuasive — "قبل از خرید، مطمئن بشید که ظرفیت مناسب رو انتخاب می‌کنید!"

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

5. **If user provides images**: Store the URLs/paths and use them in Step 5 (Build HTML) to insert `<img>` tags with proper `alt` text, `loading="lazy"`, and responsive styling within the `.ran25-wrap` framework at the designated positions.

#### Step 3c: SEO Metadata (prepared for the final chat table — NO separate file)
Prepare the SEO metadata in memory now so it's ready for the post-delivery chat table in the "Output to User" step. **Do NOT create, save, or send a `.md` file.** The metadata is delivered exclusively as a Persian Markdown table in chat AFTER the HTML is pushed.

Prepare these fields (Persian labels, Persian values):
- **عنوان سئو (SEO Title)** — ≤ 60 characters, leads with the primary keyword, includes brand + model
- **توضیحات متا (Meta Description)** — 150–160 characters, contains the focus keyphrase and a clear CTA
- **کلمه کلیدی کانونی (Focus Keyphrase)** — the single primary keyword
- **کلمات کلیدی ثانویه (Secondary Keywords)** — 4–6 related / LSI keywords, comma-separated
- **نامک پیشنهادی URL (URL Slug)** — lowercase Latin transliteration, matches the product slug
- **متن جایگزین تصویر (Image Alt Text)** — descriptive alt for the product photo, includes brand + model
- **عنوان شبکه‌های اجتماعی (Open Graph / Twitter Title)** — social-optimized title
- **توضیحات شبکه‌های اجتماعی (Open Graph / Twitter Description)** — social-optimized description
- **عنوان نان‌مایه (Breadcrumb Title)** — short breadcrumb label

### Step 4: Schema JSON-LD
Embed inside `<script type="application/ld+json">` blocks:
- `Product` (with offers, aggregateRating, brand)
- `FAQPage` (mirror all FAQs from accordion)
- `BreadcrumbList` (Home > Category > Subcategory > Product)

### Step 5: Build HTML
- Copy `.ran25-wrap` CSS framework exactly as-is from RAN25 template
- Only modify:
  - Product content
  - Photo URL(s) — the user-supplied image(s) from Step 2b
  - Hotspot positions on photo (4-6 callouts on actual product parts)
  - Ticker bar items (product-specific features)
  - Schema JSON-LD values
  - **Category design palette** (Step 2): set `--accent`, `--accent-2`, `--accent-soft`, and `--hero-gradient` CSS custom properties on `.ran25-wrap` and wire them into H2 counters, table headers, ticker bar, hotspot dots, CTA, and the calculator-promo gradient. Keep body text on near-white surfaces (`#111` on `#FFFFFF`/`#FAFAFA`) for AA readability — never tint paragraph text. Choose minimal, magazine-grade combinations only.
  - **Mid-content images** (from Step 3.5): Insert collected images at their designated positions between sections. Each image must:
    - Use `<figure>` with `<img>` inside, styled consistently with `.ran25-wrap`
    - Include descriptive Persian `alt` text for SEO
    - Use `loading="lazy"` and `width="100%"` for performance
    - Have a subtle `<figcaption>` in Persian if appropriate
    - If no images were provided, insert `<!-- IMAGE PLACEHOLDER: [section name] -->` comments instead
- Keep ALL animations, industrial bars, gear SVGs, counter system unchanged
- Include the WordPress override block (`!important` rules) at the end

### Step 6: Save, Commit, Push
- File path: `[product-slug]-product-content.html` (e.g. `pgn0-product-content.html`)
- Do NOT create or commit any SEO `.md` file — SEO metadata is delivered as a chat table only.
- Slug: lowercase Latin transliteration of product model
- Commit message format:
  ```
  Add product page: [Product Name]

  https://claude.ai/code/session_<session_id>
  ```
- Push to current working branch (do NOT switch branches)

## Output to User

After push, reply with — in this exact order:

1. Filename and repo path of the HTML page only (no SEO `.md` file is created).
2. Three-line summary of what was generated (word count, schema types, image count).
3. Note about hotspot positions needing visual verification in browser.
4. **SEO metadata table** — a Persian Markdown table with two columns (`فیلد` | `مقدار`) containing every field prepared in Step 3c:
   - عنوان سئو، توضیحات متا، کلمه کلیدی کانونی، کلمات کلیدی ثانویه، نامک URL، متن جایگزین تصویر، عنوان OG/Twitter، توضیحات OG/Twitter، عنوان نان‌مایه.
   - Values are ready to paste into Rank Math / Yoast — no extra prose around them.
5. **Schema JSON-LD preview**: Display the full generated Schema JSON-LD code blocks (Product, FAQPage, BreadcrumbList) in the chat so the user can review and verify them before publishing.

Do NOT paste the full HTML in chat — the file in the repo IS the deliverable. But DO show the SEO table and Schema JSON-LD inline.

## Constraints

- Never modify `ran25-product-content.html` itself — it is the canonical template
- Never change the `.ran25-wrap` CSS structure or animation keyframes
- Never add new external dependencies (fonts, CDN scripts)
- All graphics must remain inline SVG or CSS
- File must be self-contained and paste-ready into WordPress Text/Code editor
- Persian text only in content; English allowed in schema, CSS, and code comments
