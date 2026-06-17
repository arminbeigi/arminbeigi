---
name: shofazh-category-page
description: Build a complete SEO + GEO (AI-search optimized) product-category landing page in Persian for shofazh.com (heating & cooling / تاسیسات حرارتی و برودتی). Use when the user wants long-form category content (1000–2000+ words) with keyword research, comparison tables, animations, a heat-capacity-calculator promo block, schema markup, and WordPress-ready HTML. Asks the category variables interactively every time before building.
---

# Shofazh.com Product-Category Page Builder

You build a complete, WordPress-ready Persian **product-category landing page** for shofazh.com — a heating & cooling equipment store (تاسیسات حرارتی و برودتی). This is NOT a single-product page; it is the descriptive content that sits on a category/sub-category archive (e.g. «دیگ چدنی», «پکیج دیواری», «چیلر و فن‌کویل», or the broad «تاسیسات حرارتی و برودتی»).

Goal: content that ranks in classic search **and** gets cited by AI answer engines (Google AI Overviews, ChatGPT, Perplexity, Gemini) — i.e. SEO + GEO. The output is hyper-designed: animated, mobile-first, with a tuned color palette, comparison tables, and the mandatory heat-capacity-calculator promo.

## Interactive Intake (MANDATORY — ask every time)

When this skill is invoked you MUST collect inputs through `AskUserQuestion`, **one question at a time, in Persian**. Do NOT ask all at once and do NOT start the workflow until every required answer is in. For free-text answers, provide 2 realistic placeholder options so the user can pick "سایر/Other" and type.

Ask in this exact order:

**Q1 — عنوان دسته‌بندی**
- header: "دسته‌بندی"
- question: "عنوان دقیق دسته‌بندی محصولات چیه؟ (مثلاً: تاسیسات حرارتی و برودتی / دیگ چدنی / پکیج دیواری / چیلر و فن‌کویل)"
- placeholders: "تاسیسات حرارتی و برودتی" / "دیگ چدنی" → Other to type

**Q2 — لینک صفحه دسته‌بندی**
- header: "لینک دسته"
- question: "لینک صفحه‌ی این دسته‌بندی در shofazh.com چیه؟"
- placeholders: "https://shofazh.com/product-category/..." → Other to type

**Q3 — حوزه‌ی دما (برای پالت رنگی و لحن)**
- header: "حوزه دما"
- question: "این دسته بیشتر حرارتیه، برودتیه یا هر دو؟"
- options:
  - "حرارتی (گرمایشی)" → پالت گرم: قرمز/نارنجی #C62828 / #FF6F00
  - "برودتی (سرمایشی)" → پالت سرد: آبی/فیروزه‌ای #0277BD / #00ACC1
  - "هر دو (حرارتی و برودتی)" → پالت دوگانه: آبی + نارنجی، گرادیان split
  - "سایر" → Other

**Q4 — زیرشاخه‌ها / محصولات شاخص این دسته**
- header: "زیرشاخه‌ها"
- question: "مهم‌ترین محصولات یا زیرشاخه‌های این دسته رو بنویس (با کاما جدا کن) تا داخل محتوا و جدول‌ها به‌شون لینک و اشاره بشه."
- placeholders: "دیگ چدنی، پکیج، رادیاتور، مشعل" / "چیلر، فن‌کویل، کولر گازی، برج خنک‌کننده" → Other to type

**Q5 — برندها / محورهای جدول مقایسه**
- header: "جدول مقایسه"
- question: "جدول مقایسه روی چی بسته بشه؟ برندها (مثل ایران‌رادیاتور، بوتان، شوفاژکار) یا انواع محصول؟"
- placeholders: "ایران‌رادیاتور، بوتان، لورچ" / "مقایسه انواع دیگ: چدنی، فولادی، زمینی" → Other to type

**Q6 — مخاطب و لحن**
- header: "مخاطب"
- question: "لحن محتوا برای کیه؟"
- options:
  - "خریدار عمومی (ساده و قابل‌فهم)"
  - "مهندس/نصاب حرفه‌ای (فنی و تخصصی)"
  - "ترکیبی (شروع ساده + بخش‌های تخصصی)"
  - "سایر" → Other

**Q7 — طول محتوا و تاکید ویژه (اختیاری)**
- header: "طول/تاکید"
- question: "طول محتوا و تاکید خاصی مدنظرته؟"
- options:
  - "۱۰۰۰ تا ۱۵۰۰ کلمه"
  - "۱۵۰۰ تا ۲۰۰۰ کلمه (پیشنهادی)"
  - "بیشتر از ۲۰۰۰ کلمه"
  - "سایر" → Other (مثلاً تاکید روی موتورخانه، صنعتی، خانگی، قیمت، خرید اینترنتی)

After all answers are collected, summarize them in one short Persian message, then run the workflow end-to-end **without pausing for approval**. There is no image-handoff gate in this skill — category pages use inline SVG/CSS graphics, not user-supplied product photos. If the user later wants hero/section images, offer to add them, but never block the build waiting for them.

## Workflow (Execute Without Pausing)

### Step 1: Keyword & SERP Research (SEO + GEO foundation)
Use the **Semrush MCP** tools to ground the content in real search demand. Do not invent keywords from memory when data can be fetched.
1. Discovery: call the Semrush `keyword_research` tool for the category seed (Q1) and the sub-products (Q4). Then `get_report_schema` → `execute_report` for related/broad-match keywords and questions.
   - database: try `"ir"` if available, otherwise omit/`"us"` and treat volumes as directional. Persian keyword volumes in Semrush are sparse — use them as signal, not gospel.
2. If Semrush returns little/nothing for Persian terms, supplement with a `WebSearch` for the Persian seed (e.g. «قیمت دیگ چدنی», «بهترین پکیج دیواری») and extract the People-Also-Ask style questions.
3. Build a keyword map:
   - **عبارت کانونی (focus keyphrase)** — 1 primary (usually the category name + a buyer intent word like قیمت/خرید).
   - **عبارات ثانویه/LSI** — 8–15 (brands, sub-products, specs, «بهترین»، «قیمت»، «خرید»، «نصب»، «مقایسه»).
   - **سوالات (question keywords)** — 6–10 for the FAQ + GEO extraction.
4. Keep this map; every keyword must appear naturally in the body, headings, tables, alt text, or FAQ.

### Step 2: Content Plan (GEO-aware)
Design the page so AI answer engines can extract clean, citable facts:
- Open with a **40–60 word definitional answer** to «[دسته‌بندی] چیست؟» in the first paragraph (the "AI snippet" sentence) — direct, factual, entity-rich.
- Use clear H2/H3 question-style headings that mirror real queries.
- Prefer short paragraphs, bullet lists, and **comparison tables** (AI engines love structured tables).
- Name real **entities**: brands, standards (ISIRI/استاندارد ملی), units (BTU, kW, کیلوکالری), components.

### Step 3: Content Generation (Persian, length per Q7 — default 1500–2000 words)
Sections (H2, numbered via CSS counter). Adapt titles to the category:
1. **[دسته‌بندی] چیست و چه کاربردی دارد؟** — definitional GEO paragraph + key benefits.
2. **انواع [دسته‌بندی] و زیرشاخه‌ها** — describe each sub-product from Q4, with internal links.
3. **راهنمای انتخاب و خرید** — buyer's guide (متراژ، ظرفیت، نوع سوخت/برق، عایق‌بندی، بودجه).
4. **جدول مقایسه** — full comparison table built on Q5 (brands or types) with columns like ظرفیت، راندمان، گارانتی، قیمت تقریبی، مناسب برای.
5. **مزایا و معایب / نکات فنی** — pros/cons list or table; include standards & efficiency.
6. **🔥 بلوک محاسبه‌گر ظرفیت حرارتی (MANDATORY — see Step 4)** — placed right here, mid-content.
7. **نصب، نگهداری و سرویس** — practical guidance.
8. **سوالات متداول (FAQ)** — CSS-only `<details>` accordion, 6–10 Q/A built from Step 1 question keywords. Each answer must be self-contained and quotable (GEO).
9. **جمع‌بندی و راهنمای خرید از شوفاژ** — summary + CTA.

Rules:
- **Tone**: per Q6, professional, EEAT-compliant, human — no robotic filler, no ⚠️ markers, no placeholder text, no "lorem".
- **Internal linking**: 4–6 contextual links to the sub-product/related category URLs (use Q2/Q4; if exact URLs unknown, link to plausible shofazh.com category slugs and tell the user to verify).
- **Keyword usage**: weave the full Step 1 map in naturally; never keyword-stuff.

### Step 4: Heat-Capacity Calculator Promo Block (MANDATORY in every category page)
Insert a visually striking, animated promo block as **section 6** (mid-content). It must feel like a premium magazine-ad insert, distinct from body sections.

**Message**: shofazh.com offers a FREE online heat-capacity calculator so users pick the right capacity before buying. Emphasize:
- محاسبه دقیق ظرفیت حرارتی/برودتی مورد نیاز بر اساس متراژ، عایق‌بندی و شرایط آب‌وهوایی
- انتخاب درست دستگاه بدون اتلاف انرژی و هزینه اضافی
- کاملاً رایگان و آنلاین، بدون نصب
- جلوگیری از خرید دستگاه با ظرفیت نامناسب (کم یا زیاد)

**Links**:
- Calculator page: `https://shofazh.com/shofazh-calculator.html`
- Video (optional, embed if it fits): `https://shofazh.com/wp-content/uploads/2026/05/cleaned_محاسبه_گر_ظرفیت_حرارتی.mp4`

**HTML/CSS requirements** (self-contained, scoped under the page wrapper class):
- Wrapper `<div class="shz-calc-promo">` with a gradient background adapted to the Q3 palette (warm gradient for حرارتی, cool for برودتی, split for both).
- White text for contrast; inline SVG of a calculator/thermometer (geometric, industrial).
- Animated entry via `@keyframes slideInUp` + CSS-only reveal (or `IntersectionObserver`).
- CTA pill button "محاسبه ظرفیت حرارتی رایگان" → calculator URL, with a `@keyframes pulse` glow.
- If embedding the video: `<video controls muted loop playsinline preload="metadata">`, rounded corners, box-shadow, `max-width:100%`, responsive (stacks under text on mobile).
- List 4–6 calculator features as animated chips/bullets.
- Tone: friendly, persuasive — "قبل از خرید، مطمئن شو ظرفیت درست رو انتخاب می‌کنی!"

### Step 5: Schema JSON-LD (SEO + GEO)
Embed inside `<script type="application/ld+json">` blocks:
- `CollectionPage` (name, description, url = Q2) — OR `WebPage` with `about` entity.
- `ItemList` of the sub-products from Q4 (each as a `ListItem`).
- `FAQPage` — mirror EVERY FAQ from the accordion (critical for AI extraction & rich results).
- `BreadcrumbList` (خانه > [دسته والد] > [دسته‌بندی]).
- `Organization`/`Store` reference for shofazh.com if not already global.

### Step 6: Build HTML (hyper-designed, mobile-first)
Produce ONE self-contained HTML file, paste-ready into a WordPress Custom HTML / Code block.
- All CSS scoped under a unique wrapper class (e.g. `.shz-cat`) so it never collides with the theme. Prefix every class with `shz-`.
- **Color palette** driven by Q3 (warm / cool / split). Use CSS custom properties (`--shz-accent`, `--shz-accent-2`) at the top so the palette is one-line tunable.
- **Readability**: line-height ≥ 1.8, `text-align: justify` off for mobile, generous spacing, RTL (`direction: rtl`), Persian-friendly font stack (Vazirmatn/IRANSans fallback to system — do NOT add external CDN fonts; use `font-family` fallbacks only).
- **Mobile-first & responsive**: tables scroll horizontally on small screens (`overflow-x:auto`), promo stacks, hero collapses. Test breakpoints at 480/768px.
- **Animations** (CSS-only or tiny inline JS, NO external libs):
  - Scroll-reveal on sections (`IntersectionObserver` adding an `.in` class, or pure CSS).
  - Animated number counters for stat highlights (انواع محصول، برندها، سال تجربه) — small inline script.
  - Hover lift on cards, animated gradient ticker/marquee of key features at the top.
  - Respect `@media (prefers-reduced-motion: reduce)` — disable motion.
- **Components**: hero with definitional answer, sub-product cards grid, comparison table(s), pros/cons, calculator promo, FAQ accordion, CTA.
- All graphics = inline SVG or CSS. No external dependencies (no CDN scripts/fonts/images).
- End with a small WordPress override block (`!important` resets) so the theme doesn't clobber the layout.

### Step 7: SEO Metadata File (generate + send to user)
Create a standalone Persian SEO file, save it, and send it with `SendUserFile` (status: `normal`).
- Path: `[category-slug]-category-seo.md`
- Fields (Persian labels):
  - **عنوان سئو** — ≤ 60 chars, leads with focus keyphrase.
  - **توضیحات متا** — 150–160 chars, focus keyphrase + CTA.
  - **کلمه کلیدی کانونی** — the primary.
  - **کلمات کلیدی ثانویه** — 8–15 from Step 1 (list).
  - **سوالات هدف (برای جستجوی هوش مصنوعی)** — the question keywords.
  - **نامک URL** — lowercase Latin transliteration.
  - **متن جایگزین تصاویر** — alt suggestions.
  - **Open Graph / Twitter title + description**.
  - **عنوان نان‌مایه (Breadcrumb)**.

### Step 8: Save, Commit, Push
- HTML path: `[category-slug]-category-content.html` (slug = lowercase Latin transliteration, e.g. `tasisat-harkati-baroodati-category-content.html`).
- Also commit the `[category-slug]-category-seo.md` file.
- Commit message:
  ```
  Add category page: [Category Name]

  https://claude.ai/code/session_<session_id>
  ```
- Push to the CURRENT working branch with `git push -u origin <branch>` (do NOT switch branches). Retry on network errors with backoff.

## Output to User (after push)
1. Filenames + repo paths (HTML + SEO `.md`).
2. Three-line summary: word count, sections, schema types, table count.
3. Confirm the SEO file was already sent via `SendUserFile`.
4. Show the full Schema JSON-LD blocks in chat for review (do NOT paste the full HTML — the file IS the deliverable).
5. Note any internal links the user must verify (slugs you guessed).

## Constraints
- Persian content only; English allowed in CSS, schema, code comments, slugs.
- No external dependencies (fonts/CDN/scripts/images) — everything inline.
- Every class prefixed `shz-`; all CSS scoped under the wrapper so it's safe to paste into any WordPress theme.
- Honor `prefers-reduced-motion`.
- Never fabricate exact prices/specs — mark approximate figures as «تقریبی» and tell the user to confirm.
- The calculator promo block and the FAQ→FAQPage schema are non-negotiable in every page.
