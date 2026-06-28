# ✅ Technical SEO Checklist — shofazh.com

> Status legend: ✅ OK · 🟠 Needs work · 🔴 Critical · ⚠️ Verify (WAF blocked direct scan) · ➖ N/A

## 1. Indexation & Crawl
- [ ] 🔴 `noindex` or `410` the indexed `/product/__trashed/` URL; empty WooCommerce trash regularly.
- [ ] 🔴 Block & de‑index `?login=true` and all session/param URLs (`Disallow: /*?login=`, `Disallow: /*?add-to-cart=`, etc.).
- [ ] ⚠️ Confirm XML sitemap includes products + categories + brands, **excludes** trashed/noindex URLs, and is submitted in Search Console.
- [ ] ⚠️ Confirm `robots.txt` allows CSS/JS, blocks `/cart/`, `/checkout/`, `/my-account/`, `/*?orderby=`, `/*?filter_*`.
- [ ] 🟠 Allowlist verified Googlebot/Bingbot IPs at the WAF so indexing is never throttled.
- [ ] ⚠️ Check crawl depth: ensure top products are ≤3 clicks from home.
- [ ] 🟠 `noindex, follow` thin `product-tag` archives; keep only commercially distinct tags.

## 2. URLs
- [ ] 🟠 Standardise on transliterated English slugs for **new** URLs (e.g. `iranradiator-l24ff`).
- [ ] 🟠 Build a 301 redirect map before changing any existing ranking URL.
- [ ] 🟡 Consolidate junk slug `/shofazh-...1/` to one canonical hub.
- [ ] ✅ Keep trailing‑slash + lowercase consistency.

## 3. Titles & Meta
- [ ] 🔴 Fix duplicated `%sitename%` in the SEO‑plugin title template ("…دات کام دات کام").
- [ ] 🟠 Cap titles to ~60 visible chars; front‑load model name; max 1 primary + 1 secondary keyword.
- [ ] 🟡 Author unique 150–160‑char meta descriptions for top 50 revenue pages.
- [ ] ⚠️ Ensure exactly one `<title>` and no duplicate titles across paginated pages.

## 4. Headings & Semantics
- [ ] ⚠️ Exactly one `<h1>` per page (WooCommerce title only).
- [ ] ✅ Keep H2→H3 spec/FAQ hierarchy (already good).
- [ ] 🟠 Use semantic `<table>/<th>` for spec tables, real headings for FAQ (not styled divs).

## 5. Structured Data
- [ ] 🔴 Only emit `AggregateRating`/`Review` when genuine reviews exist.
- [ ] 🟠 Add to every `Offer`: `priceCurrency`, `price`, `availability`, `priceValidUntil`, `shippingDetails`, `merchantReturnPolicy`, `url`.
- [ ] 🟠 Add `Organization.sameAs` (Instagram/Telegram/Aparat), `logo`, `telephone`, `address`.
- [ ] ✅ Keep `Product`, `Brand`, `BreadcrumbList`, `FAQPage` (valid shape today).
- [ ] 🟡 Validate every template in Rich Results Test + Schema.org validator after each change.

## 6. Images
- [ ] 🔴 Add descriptive Persian `alt` to all content/product images.
- [ ] 🔴 Add explicit `width`/`height`.
- [ ] 🟠 `loading="lazy"` below the fold; `fetchpriority="high"` on the LCP image.
- [ ] 🟠 Serve WebP/AVIF; descriptive filenames (`iranradiator-l24ff.webp` not `IMG_1234.jpg`).

## 7. Performance‑for‑SEO (CWV)
- [ ] 🔴 Self‑host + subset fonts (`font-display:swap`).
- [ ] 🔴 Consolidate per‑page inline CSS into one cached stylesheet.
- [ ] 🟠 Enable full‑page + object caching.
- [ ] 🟠 Defer non‑critical JS; respect `prefers-reduced-motion`.

## 8. Internal Linking & Authority
- [ ] 🟠 Contextual links: guides → category → top products (capacity‑based).
- [ ] 🟡 Add related‑products + "frequently bought with installation kit".
- [ ] 🟡 Surface calculator from category & product pages.

## 9. Content Freshness & E‑E‑A‑T
- [ ] 🟠 Visible "آخرین به‌روزرسانی" date; automate price freshness.
- [ ] ✅ Keep dealer/warranty/about/contact authority signals.
- [ ] 🟠 Add author/expert bylines to guides.

## 10. Measurement
- [ ] 🔴 Provide IP allowlist/staging so Lighthouse/CrUX/header scans can run.
- [ ] ⚠️ Verify GA4 + Search Console + (Bing) connected; track product/CTA events.
- [ ] 🟡 Monitor index coverage weekly post‑cleanup.
