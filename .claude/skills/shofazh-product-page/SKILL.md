---
name: shofazh-product-page
description: Build a complete SEO + GEO product page (Persian) for shofazh.com products using the established RAN25 template. Requires product name, WordPress post-id, URL, competitor brand, image, and category. Hands the user an image-generation prompt and pauses for them to supply the photo, then produces WordPress-ready HTML with animations, schema markup, and a separate SEO metadata file. Auto-publishes to shofazh.com via GitHub Actions when post-id is provided.
---

# Shofazh.com Product Page Builder

You are building a complete, WordPress-ready Persian product page for shofazh.com (heating equipment e-commerce) following the exact standard established in `shofazh-product-template.html`.

## Interactive Intake (MANDATORY)

⛔ **CRITICAL ORDER — The FIRST `AskUserQuestion` call MUST be for the WordPress post-id. The product name is Q2. Do NOT reverse this order or skip Q1 for any reason — not even if the user already mentioned the product name in their message.**

When this skill is invoked, call `AskUserQuestion` for each question below, one at a time, in Persian. Do NOT combine questions, do NOT infer answers from the user's initial message, and do NOT proceed to Step 1 until all 7 answers are collected and recorded.

Ask in this exact order:

**Question 1 — شناسه وردپرس (post-id) — ALWAYS THE FIRST QUESTION**
- header: "Post ID"
- question: "سلام! برای شروع، شناسه عددی صفحه محصول در وردپرس رو بده.\n\nبدون post-id محتوا روی سایت منتشر نمی‌شه.\n\nبرای پیدا کردنش: پنل وردپرس → محصولات → روی محصول کلیک کن → در URL بالای مرورگر عدد بعد از ?post= رو ببین (مثلاً: post=4525)"
- options:
  - "بعداً اضافه می‌کنم (بدون انتشار خودکار)"
- User types the number directly via "Other"
- Record the answer as `post_id` (integer or null). If user chose "بعداً": set post_id = null and note that auto-publish will be skipped.
- ⛔ DO NOT call AskUserQuestion for Q2 until Q1 is answered and post_id is recorded.

**Question 2 — نام محصول**
- header: "نام محصول"
- question: "نام کامل محصول چیه؟ (مثلاً: مشعل گازوئیلی ایران رادیاتور PGN0)"
- Free text via "Other" option only — provide 2 placeholder options like "مشعل گازسوز" / "مشعل گازوئیلی" so user can pick Other to type.

**Question 3 — لینک صفحه محصول**
- header: "لینک محصول"
- question: "لینک صفحه محصول در shofazh.com چیه؟"
- Same pattern — user types via Other.

**Question 4 — دسته‌بندی محصول**
- header: "دسته‌بندی"
- question: "محصول در کدوم دسته‌بندی قرار می‌گیره؟"
- Before asking: infer the most likely category from the product name provided in Q2 (e.g. if name contains "گازسوز" → مشعل گازسوز, "گازوئیل" → مشعل گازوئیلی, "دوگانه" → مشعل دوگانه‌سوز, "پکیج" → پکیج دیواری, "دیگ" → دیگ چدنی, etc.)
- options:
  - "[حدس دسته‌بندی از روی نام محصول]" — e.g. "مشعل گازسوز (پیشنهاد)" (accent color per type: گازسوز→blue, گازوئیلی→red, دوگانه‌سوز→orange, others→blue)
  - "سایر" (user types via Other)

**Question 5 — برند رقیب برای مقایسه**
- header: "برند رقیب"
- question: "با کدوم برند مقایسه بشه؟"
- options:
  - "شوفاژکار"
  - "گرم ایران"
  - "ایران رادیاتور" (اگه محصول از برند دیگه‌ست)
  - "بدون مقایسه برند خاص"

**Question 6 — لینک عکس محصول (مرجع برای پرامپت)**
- header: "عکس محصول"
- question: "لینک عکس محصول رو بده (به‌عنوان مرجع برای پرامپت تصویر)"
- User types URL via Other.
- NOTE: This URL is ONLY a reference for writing the image prompt in Step 2b. It is NOT the final image. Never treat it as the finished product photo, and never skip the Step 2b pause just because this URL exists — the final image always comes from the user after Step 2b.

**Question 7 — تاکید ویژه (اختیاری)**
- header: "تاکید ویژه"
- question: "ویژگی خاص یا مخاطب هدف ویژه‌ای داری که در محتوا تاکید بشه؟"
- options:
  - "خانگی"
  - "تجاری و اداری"
  - "صنعتی و کارخانه"
  - "بدون تاکید خاص"

After all 7 answers are collected, summarize them in one short Persian message, then begin the workflow. Run Steps 1–2 automatically, then **STOP at Step 2b**: present the image prompt(s) as the final message of that turn and end the turn. Do NOT generate content, build the file, or call any further tools until the user replies with the finished images. After the images arrive, run the remaining steps without further confirmation.

## Workflow (Execute Without Pausing for Approval — except the Step 2b image handoff)

> ⛔ **HARD GATE — Step 2b is a mandatory stop.** This skill has exactly one pause. After Steps 1–2 you MUST present the image prompt(s) and **end your turn**, then wait for the user to send back the finished images. You must NEVER:
> - auto-generate or auto-clean the product photo yourself — there is no automatic image step;
> - treat the Question 5 reference URL as the final image;
> - generate content, build the HTML, or run any of Steps 3–7 before the user has delivered the images.
> The product photo always comes from the user, after Step 2b. If you find yourself building the page without it, you skipped the gate.

### Step 1: Read Template
Read `shofazh-product-template.html` from the repo root. If that file doesn't exist, read `ran25-product-content.html` instead. Load the exact CSS framework, structure, and animation standards. The `.ran25-wrap` CSS is the immutable shell — only content, image, and hotspot positions change per product.

### Step 2: Product Analysis (جمع‌آوری اطلاعات از برند + کاتالوگ + تأیید کاربر)

**2a — جستجو در سایت رسمی برند:**
- از اسم محصول (Q2)، برند را شناسایی کن (مثلاً «ایران رادیاتور»، «شوفاژکار»، «گرم ایران»، «آذرنار»، ...).
- سایت رسمی برند را پیدا کن و با WebFetch صفحه محصول مربوطه را واکشی کن تا مشخصات فنی واقعی را استخراج کنی:
  - ظرفیت حرارتی، توان الکتریکی، ابعاد، وزن، فشار کار، نوع سوخت، استانداردها، گواهینامه‌ها
  - هر داده فنی موجود روی سایت برند را استخراج کن
- اگه سایت برند هم block بود یا اطلاعاتی پیدا نشد، این مرحله را skip کن و به 2b برو.
- **هرگز از shofazh.com برای جمع‌آوری مشخصات فنی استفاده نکن.**

**2b — درخواست کاتالوگ از کاربر (MANDATORY):**
- با `AskUserQuestion` از کاربر بخواه کاتالوگ یا datasheet محصول را ارائه دهد:
  - header: "کاتالوگ محصول"
  - question: "لطفاً کاتالوگ یا datasheet محصول رو بده — می‌تونی لینک PDF، متن پیست‌شده، یا اطلاعات فنی که داری رو بنویسی. هر چیزی که داری کمک می‌کنه محتوا دقیق‌تر بشه."
  - options: ["لینک یا فایل PDF کاتالوگ دارم", "اطلاعات فنی رو تایپ می‌کنم", "کاتالوگی ندارم — همون سایت برند کافیه"]
- اگه کاربر لینک PDF داد: WebFetch بزن و داده استخراج کن.
- اگه متن داد: مستقیم استفاده کن.
- اگه «کاتالوگی ندارم» انتخاب کرد: با همان اطلاعات سایت برند ادامه بده.

**2c — تأیید اطلاعات توسط کاربر (MANDATORY GATE):**
- پس از جمع‌آوری اطلاعات از هر دو منبع، یک خلاصه فارسی از مشخصات کلیدی به کاربر نشان بده:
  ```
  اطلاعاتی که جمع‌آوری کردم:
  • مدل: ...
  • ظرفیت حرارتی: ...
  • توان الکتریکی: ...
  • ابعاد: ...
  • وزن: ...
  • سوخت: ...
  • استانداردها: ...
  [سایر موارد مهم]

  آیا این اطلاعات درسته یا چیزی رو اصلاح/اضافه کنم؟
  ```
- با `AskUserQuestion` منتظر تأیید بمان:
  - header: "تأیید مشخصات"
  - options: ["تأیید می‌کنم، ادامه بده", "اصلاح دارم"]
  - اگه «اصلاح دارم»: کاربر تایپ می‌کند، اطلاعات را آپدیت کن و خلاصه را دوباره نشان بده.
- **تا تأیید کاربر، به Step 2d نرو.**

**2d — انتخاب accent color (با تأیید کاربر):**

بر اساس نوع محصول، دسته‌بندی و حس بصری مناسب، ۳ پیشنهاد رنگ‌بندی ارائه بده. هیچ رنگ ثابتی وجود ندارد — هر محصولی می‌تواند رنگ متفاوتی داشته باشد.

معیارهای انتخاب رنگ پیشنهادی:
- تناسب با محصول (گرما، صنعت، فناوری، اطمینان، قدرت)
- **خوانایی بالا**: رنگ انتخابی باید روی پس‌زمینه سفید/روشن متن تیره، و روی پس‌زمینه تیره متن سفید را به‌خوبی نمایش دهد — از رنگ‌های خیلی روشن (زرد، سبزآبی کم‌رنگ) و رنگ‌های بسیار تیره‌ای که با مشکی اشتباه گرفته می‌شوند پرهیز کن
- تناسب با هویت بصری سایت شوفاژ (صنعتی، جدی، حرفه‌ای)

فرمت پیشنهاد به کاربر:
```
برای این محصول ۳ رنگ‌بندی پیشنهاد می‌کنم:

🎨 گزینه ۱ — [نام رنگ]: #XXXXXX
   دلیل: [یک جمله توضیح]

🎨 گزینه ۲ — [نام رنگ]: #XXXXXX
   دلیل: [یک جمله توضیح]

🎨 گزینه ۳ — [نام رنگ]: #XXXXXX
   دلیل: [یک جمله توضیح]
```

با `AskUserQuestion` تأیید بگیر:
- header: "رنگ‌بندی صفحه"
- options: ["گزینه ۱", "گزینه ۲", "گزینه ۳"]
- کاربر می‌تواند از «Other» رنگ دلخواه خود را hex code وارد کند
- پس از انتخاب، آن رنگ را به‌عنوان `--accent` در تمام CSS صفحه اعمال کن

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

### Step 3: Content Generation

**3a — پرسیدن تعداد کلمات (قبل از شروع نوشتن):**

با `AskUserQuestion` بپرس:
- header: "حجم محتوا"
- question: "محتوای صفحه چقدر باشه؟"
- options:
  - "کوتاه — حدود ۱۵۰۰ کلمه (سریع، فقط اطلاعات کلیدی)"
  - "متوسط — حدود ۲۵۰۰ کلمه (پیشنهاد)"
  - "کامل — حدود ۳۵۰۰ کلمه (SEO قوی‌تر، همه بخش‌ها)"
  - "سفارشی — تعداد دقیق رو تایپ می‌کنم"

تعداد کلمات انتخابی را در تمام بخش‌ها رعایت کن و متناسب با آن، عمق هر بخش را تنظیم کن.
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

#### Step 3c: SEO Metadata File (generate and send to the user immediately)
As soon as the content above is written — and BEFORE building the HTML — produce a standalone SEO metadata file, save it to disk, and **send it to the user right away** with `SendUserFile` (status: `normal`).

- File path: `[product-slug]-seo.md` (same slug as Step 6, e.g. `pgn0-seo.md`)
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

### Step 4: Schema JSON-LD
Embed inside `<script type="application/ld+json">` blocks:
- `Product` (with offers, brand) — **do NOT add `aggregateRating`/`Review` unless the product has real, verifiable WooCommerce reviews.** Fabricated ratings violate Google's review-snippet policy and risk a manual action. Only emit a rating block when genuine reviews exist (prefer letting WooCommerce/Rank Math generate it from real review data).
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
  - Accent color if category requires it
  - **Mid-content images** (from Step 3.5): Insert collected images at their designated positions between sections. Each image must:
    - Use `<figure>` with `<img>` inside, styled consistently with `.ran25-wrap`
    - Include descriptive Persian `alt` text for SEO
    - Use `loading="lazy"` and `width="100%"` for performance
    - Have a subtle `<figcaption>` in Persian if appropriate
    - If no images were provided, insert `<!-- IMAGE PLACEHOLDER: [section name] -->` comments instead
- Keep ALL animations, industrial bars, gear SVGs, counter system unchanged
- Include the WordPress override block (`!important` rules) at the end

### Step 6: Save, Commit, Push

⛔ **HARD REQUIREMENT**: `wp-product-map.json` MUST be updated before committing. Do NOT push without completing this step.

1. **Update `wp-product-map.json`** (FIRST — before anything else):
   - Read the current `wp-product-map.json` from disk
   - Add or update the entry: `"[slug]": [post_id]` (use `null` if user chose "بعداً")
   - Write the file back to disk
   - Verify the entry is in the file before proceeding

2. **Stage all files**:
   - `[product-slug]-product-content.html`
   - `[product-slug]-seo.md`
   - `wp-product-map.json`

3. **Commit** with message:
   ```
   Add product page: [Product Name]

   https://claude.ai/code/session_<session_id>
   ```

4. **Push** to current working branch (do NOT switch branches)

5. **Inform user**:
   - If post_id was provided: "GitHub Action شروع به انتشار روی shofazh.com کرد — چند ثانیه صبر کنید و تب Actions در گیت‌هاب رو چک کنید."
   - If post_id is null: "⚠️ post-id ثبت نشد — صفحه روی سایت منتشر نمی‌شه. برای انتشار، post-id رو بده تا wp-product-map.json رو آپدیت کنم."

## Output to User

After push, reply with only:
- `[product-slug]-product-content.html`
- `[product-slug]-seo.md`

Nothing else.

## Constraints

- Never modify `shofazh-product-template.html` — it is the canonical template; ran25-product-content.html is a real product page, not the template
- Never change the `.ran25-wrap` CSS structure or animation keyframes
- Never add new external dependencies (fonts, CDN scripts)
- All graphics must remain inline SVG or CSS
- File must be self-contained and paste-ready into WordPress Text/Code editor
- Persian text only in content; English allowed in schema, CSS, and code comments
