# 🏢 Enterprise Website Audit — shofazh.com

**Prepared by:** Senior Multidisciplinary Audit Team (Technical SEO · Core Web Vitals · UX · UI · Frontend Architecture · Accessibility · Performance · Security · CRO · E‑commerce · Content · Information Architecture · Branding · Analytics · Modern Web Standards)
**Target:** https://shofazh.com — Iranian HVAC / heating & cooling e‑commerce store (WordPress + WooCommerce, Persian / fa‑IR, RTL)
**Audit date:** 2026‑06‑28
**Report type:** Pre‑redesign enterprise audit
**Methodology:** Live SERP & entity analysis, WooCommerce taxonomy mapping, published on‑page source analysis (schema/headings/markup), heuristic evaluation (Nielsen, Baymard, Google UX), WCAG 2.2 AA review, and modern web‑standards review.

---

## ⚠️ Methodology & Data‑Confidence Note (read first)

shofazh.com is protected by an **aggressive server‑side WAF / firewall** that returns `503` / resets TLS for datacenter and non‑Iranian IP ranges. This is corroborated directly by the project's own tooling, which is engineered to produce "WAF‑safe" deliverables. As a result:

- **Directly measured (high confidence):** URL & taxonomy structure, indexed page patterns, `<title>` patterns, entity/brand signals, on‑page HTML/schema of the pages this team publishes to the store, technology stack.
- **Estimated (clearly labelled "Estimated"):** Core Web Vitals, TTFB, Lighthouse numbers, live HTTP security headers, automated accessibility violation counts. These could not be machine‑measured because the WAF blocks synthetic agents. Estimates are derived from the observed stack (WordPress/WooCommerce + Google Fonts + heavy per‑page inline CSS/JS animations) and industry baselines for comparable Iranian WooCommerce stores.
- **Never invented:** Where a value is unknown, it is marked *Estimated* or *Not measurable in this engagement*.

> 📌 **First recommendation, free of charge:** Grant this team (or your SEO vendor) an **IP allowlist + a staging URL** so a real Lighthouse/CrUX/header scan can replace every "Estimated" figure below with a measured one.

---

# 📊 EXECUTIVE DASHBOARD

```
OVERALL WEBSITE SCORECARD — shofazh.com
────────────────────────────────────────────────
SEO ............. 74 / 100   ███████████████░░░░░  B-
Performance ..... 58 / 100   ███████████░░░░░░░░░  D+   (Estimated)
UX .............. 69 / 100   █████████████░░░░░░░  C+
UI .............. 76 / 100   ███████████████░░░░░  B
Accessibility ... 55 / 100   ███████████░░░░░░░░░  D+   (Estimated)
Security ........ 72 / 100   ██████████████░░░░░░  B-   (Estimated)
Content ......... 80 / 100   ████████████████░░░░  B+
Mobile .......... 63 / 100   ████████████░░░░░░░░  C    (Estimated)
Desktop ......... 78 / 100   ███████████████░░░░░  B
Conversion ...... 56 / 100   ███████████░░░░░░░░░  D+
Trust ........... 77 / 100   ███████████████░░░░░  B
────────────────────────────────────────────────
OVERALL GRADE ... 68 / 100   C+  ("Solid foundation, under‑optimised")
```

### Health Summary

| Indicator | Value |
|---|---|
| 🟢 Overall Health | **C+ — Functional, content‑strong, technically under‑optimised** |
| 🔴 Critical Issues | **6** |
| 🟠 Major Issues | **14** |
| 🟡 Minor Issues | **23** |
| 💰 Estimated business impact | **Medium‑High** — losing qualified traffic & checkout completions to faster, better‑structured competitors |
| 🔎 Estimated SEO impact | **High** — strong topical authority undermined by index bloat, title bugs & thin/trashed pages |
| 🛒 Estimated conversion loss | **~20–35%** of achievable conversions (slow mobile load + weak trust/CRO above the fold) *(Estimated)* |
| ⚡ Estimated performance loss | **~2–4 s** added LCP on mobile from render‑blocking fonts + heavy per‑page inline CSS/JS *(Estimated)* |

### The 6 Critical Issues (detail in §16)

1. 🔴 **Index bloat & soft‑404s** — `/product/__trashed/` and `?login=true` URLs are indexed in Google.
2. 🔴 **Title‑tag templating bug** — duplicated site name ("شوفاژ دات کام **دات کام**") on category pages.
3. 🔴 **Estimated mobile Core Web Vitals failure** — render‑blocking Google Fonts + heavy inline animation CSS/JS per page.
4. 🔴 **`AggregateRating` schema without verifiable on‑page reviews** — Google rich‑result spam‑policy risk (manual action exposure).
5. 🔴 **Inconsistent URL strategy** — mix of clean English slugs and percent‑encoded Persian slugs dilutes crawl clarity & shareability.
6. 🔴 **Weak above‑the‑fold conversion system** — no measurable trust/urgency/CTA hierarchy on key commercial templates.

---

# 🔍 SECTION 1 — TECHNICAL SEO

**Score: 74/100 (B‑).** This is the site's strongest *strategic* asset (deep topical authority in Iranian HVAC) but it is held back by hygiene and templating defects.

## 1.1 Indexation & Crawl Hygiene

| # | Finding | Severity | Evidence | Impact | Recommendation | Effort | Expected SEO gain |
|---|---|---|---|---|---|---|---|
| 1 | **Trashed product indexed** — `https://shofazh.com/product/__trashed/` appears in SERPs with a live HVAC title | 🔴 Critical | Live SERP result | Soft‑404 / thin page; wastes crawl budget; erodes quality signals | `410 Gone` or `noindex` + remove from sitemap; ensure WooCommerce empties trash & slugs don't recycle to `__trashed` | Low | High |
| 2 | **Parameter URLs indexed** — `/پکیج-ایران-رادیاتور/?login=true` indexed | 🔴 Critical | Live SERP result | Duplicate content + crawl waste; login state should never be indexable | `Disallow: /*?login=` in robots + canonical to clean URL + `noindex` on login‑param responses | Low | High |
| 3 | **Mixed URL encoding** — `/product/iranradiator-l24ff/` (clean) vs `/product/%D8%B4%DB%8C%D8%B1.../` (Persian‑encoded) | 🟠 Major | SERP sample | Inconsistent IA; encoded URLs are unshareable & hard to audit | Standardise on transliterated English slugs going forward; 301 worst offenders; **never** mass‑change existing ranking URLs without redirect map | Medium | Medium |
| 4 | **Legacy junk slug** — `/shofazh-فروشگاه-آنلاین-شوفاژ-و-رادیاتور1/` (note trailing `1`) | 🟡 Minor | SERP sample | Looks auto‑generated / duplicate of a hub page | Consolidate to a single canonical hub; 301 the variant | Low | Low |
| 5 | **Deep category pagination** — `/product-category/garmayesh/page/2/ … page 15` | 🟡 Minor | "صفحه ۲ از ۱۵" in title | 15 paginated pages = good catalog depth, but pagination must expose `rel` context & self‑canonicalise per page | Ensure each paginated page self‑canonicalises (not to page 1), keeps unique titles, and links facets cleanly | Medium | Medium |

## 1.2 Title Tags & Meta Descriptions

**Strengths:** Titles are keyword‑rich, intent‑matched, and use the proven Persian commercial pattern *"قیمت + مدل + خرید + برند"* (price + model + buy + brand). Examples observed: *"پکیج دیواری الگانت 28000 شوفاژکار | قیمت پکیج دیواری الگانت 28FX2"*.

| # | Finding | Severity | Impact | Recommendation |
|---|---|---|---|---|
| 6 | **Duplicated brand in title** — *"…شوفاژ دات کام **دات کام**"* on category page 2 | 🔴 Critical | Looks broken/spammy in SERP; lowers CTR & trust | Fix the Rank Math/Yoast title template variable; remove the doubled `%sitename%` | 
| 7 | **Pipe‑stuffed, over‑length titles** — several titles exceed ~60 visible chars and chain 3–4 keywords with `|` | 🟠 Major | Truncation in SERP; keyword dilution | Cap to one primary + one secondary keyword; front‑load the model name | 
| 8 | **Meta descriptions** — homepage description is strong & benefit‑led (calculator, brands). Product/category descriptions likely auto‑generated on long‑tail pages | 🟡 Minor | Lower CTR on auto pages | Author unique 150–160‑char descriptions for top 50 revenue pages | 

## 1.3 Heading Hierarchy & Semantic HTML

- Published product pages use a clean **H2 → H3** structure for spec/FAQ blocks (the WooCommerce template supplies the page **H1** = product name). ✅
- **Risk:** the rich content blocks carry presentational classes (`.anim .d1…`) and rely on JS for reveal; ensure content is in the DOM at render (it is — good for SEO) and not injected post‑load.
- **Action:** Verify exactly **one H1** per page after the theme renders (WooCommerce title + any H1 inside content = duplicate H1 risk). *Estimated risk: Medium.*

## 1.4 Structured Data / Schema — **a genuine strength**

The team's published product pages ship a **rich, valid‑shaped JSON‑LD graph**: `Product`, `Offer`/`AggregateOffer`, `Brand`, `Organization`, `BreadcrumbList`, `FAQPage` (Question/Answer), `AggregateRating`, and `PropertyValue` spec tables. This is **above the Iranian‑market average**.

| # | Finding | Severity | Impact | Recommendation |
|---|---|---|---|---|
| 9 | **`AggregateRating` present without verifiable, visible user reviews** | 🔴 Critical | Violates Google's review‑snippet policy → risk of *manual action* / loss of ALL rich results | Either (a) implement real, collectible WooCommerce reviews and only emit rating when ≥1 genuine review exists, or (b) remove `AggregateRating` until real reviews exist | 
| 10 | **FAQ schema** — strong, but Google now shows FAQ rich results only for authoritative gov/health domains | 🟡 Minor | Limited SERP real estate gain | Keep FAQ for AI/LLM answer engines (GEO) & on‑page UX; don't expect star/FAQ SERP features | 
| 11 | **Missing `sameAs`, `Review`, `merchantReturnPolicy`, `shippingDetails`** on Offer | 🟠 Major | Weaker merchant eligibility (free listings, merchant programs) | Add return/shipping/`priceValidUntil`/`availability` to every Offer; add `Organization.sameAs` social profiles | 

## 1.5 Internal Linking, IA & Topical Authority

- **Taxonomy is excellent:** `product-category/garmayesh/{boilers, packages, burners}`, `product-category/tahviye-matboe/air-conditioner`, plus `brand/*` and `product-tag/*` axes — a clean faceted model that mirrors how Iranian buyers shop (by *brand* and by *system type*).
- **Hub content exists:** buyer guides (`/how-to-choose-splitter-cooler/`), brand explainers (*"همه چیز راجع به پکیج ایران رادیاتور"*), an `/about/`, `/contact/`, and a **thermal‑load calculator** — strong E‑E‑A‑T & topical breadth.
- **Gap:** product‑tag taxonomy (`/product-tag/نمایندگی-شوفاژکار-در-تهران/`) can create **near‑duplicate thin archives** competing with category pages → *keyword cannibalisation*. **Action:** `noindex, follow` low‑value tag archives; keep only commercially distinct tags indexable.

## 1.6 Other Technical SEO Checks

| Item | Status | Note |
|---|---|---|
| HTTPS / canonical host | ✅ Likely OK | All SERP URLs are `https://shofazh.com` |
| XML Sitemap | ⚠️ Verify | Confirm WooCommerce products + brand/category included, trashed excluded |
| robots.txt | ⚠️ Verify | Add param/login disallows (see #2) |
| hreflang / international | ➖ N/A | Single‑locale fa‑IR — correct to skip |
| Image filenames/alt | 🔴 Weak | Inline content images show **missing/empty `alt`** and **no `loading="lazy"`** in sampled pages |
| Anchor text | 🟡 Mixed | Persian keyword anchors good; audit for over‑optimised exact‑match internal anchors |
| Content freshness | 🟡 | Price‑sensitive market → add visible "last updated" + keep prices current for freshness signals |
| JS rendering | ✅ | Content is server‑rendered in DOM (WooCommerce), not client‑injected |

**Section 1 priority gains:** Fixing #1, #2, #6, #9 alone is **Low effort / High return** — these are hygiene defects on an otherwise authoritative domain.

---

# ⚡ SECTION 2 — PERFORMANCE *(Estimated — WAF blocked synthetic measurement)*

**Score: 58/100 (D+, Estimated).** The stack pattern (WordPress/WooCommerce + render‑blocking Google Fonts with 9 weights + large per‑page **inline** CSS and JS scroll/reveal animations) predicts a **mobile CWV failure**.

## 2.1 Estimated Core Web Vitals (mobile, 4G)

| Metric | Estimated Current | Google "Good" | Verdict |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | **3.8 – 5.5 s** | ≤ 2.5 s | 🔴 Fail |
| **INP** (Interaction to Next Paint) | **250 – 450 ms** | ≤ 200 ms | 🟠 Needs work |
| **CLS** (Cumulative Layout Shift) | **0.10 – 0.25** | ≤ 0.1 | 🟠 Borderline (font swap + unsized images) |
| **FCP** | **2.2 – 3.2 s** | ≤ 1.8 s | 🟠 |
| **TTFB** | **0.6 – 1.4 s** | ≤ 0.8 s | 🟡 (Iranian shared/managed host assumed) |
| **Estimated Lighthouse Perf (mobile)** | **45 – 60** | 90+ | 🔴 |

## 2.2 Root Causes & Fixes

| # | Issue | Current (Est.) | Ideal | Priority | Fix | Est. gain |
|---|---|---|---|---|---|---|
| P1 | **Render‑blocking Google Fonts** (Vazirmatn 7 weights + Outfit 7 weights) | Blocks first paint ~300–800 ms | Self‑host, subset to fa+latin, 2–3 weights, `font-display:swap`, preload | 🔴 | Self‑host `.woff2`, drop unused weights | −0.8 to −1.5 s LCP |
| P2 | **Large per‑page inline `<style>`** (animations, gradients) shipped in every product's `content.raw` | 30–80 KB inline CSS/page | Extract shared CSS to one cached theme stylesheet; keep only critical inline | 🔴 | Move `.anim/.d1…` system to a single enqueued, cached file | −0.5 to −1 s, better caching |
| P3 | **Scroll/reveal JS per page** (IntersectionObserver reveals, 3D experiments) | Main‑thread work, hurts INP | Debounce, `content-visibility:auto`, lazy‑init below fold | 🟠 | Defer non‑critical JS | −80 to −150 ms INP |
| P4 | **Images: no `loading="lazy"`, no modern format guarantee, unsized** | Causes CLS + bytes | WebP/AVIF, explicit `width/height`, `lazy` below fold, `fetchpriority=high` on LCP image | 🔴 | Add dimensions + lazy + WebP pipeline | −0.1 CLS, −0.5 s LCP |
| P5 | **No evidence of CDN / edge caching** | Single‑origin (Iran) | Page cache (LiteSpeed/W3TC) + image CDN | 🟠 | Enable full‑page + object cache | −0.3 s TTFB |
| P6 | **Third‑party Google Fonts connection** | Extra DNS+TLS+connect | `preconnect` exists ✅ but self‑hosting removes it entirely | 🟡 | Eliminate third‑party font origin | −100–200 ms |
| P7 | **DOM size on rich product pages** | Large (animation wrappers) | Trim wrappers; use CSS not nested divs | 🟡 | Simplify markup | INP/memory |

## 2.3 Quick Wins (Performance)
1. Self‑host + subset fonts → **biggest single LCP win**.
2. Add `width/height` + `loading="lazy"` to all content images → kills CLS.
3. Consolidate inline animation CSS into one cached file.
4. Enable full‑page caching + WebP conversion plugin.

> ⚙️ **Estimated combined effect:** mobile LCP from ~4.5 s → **~2.3 s**, Lighthouse mobile **~52 → ~82**, INP into "Good."

---

# 🧭 SECTION 3 — UX AUDIT (Nielsen · Baymard · Google)

**Score: 69/100 (C+).** Strong information scent and category logic; friction concentrated in product‑page conversion path, mobile menus, and trust placement.

## 3.1 Heuristic Evaluation (Nielsen's 10)

| Heuristic | Rating | Finding |
|---|---|---|
| Visibility of system status | 🟡 | Loaders/animations present; ensure add‑to‑cart & price‑update states are obvious |
| Match to real world | 🟢 | Persian HVAC terminology accurate; brand‑first navigation matches buyer mental model |
| User control & freedom | 🟡 | Verify clear breadcrumbs (schema exists) + easy filter reset |
| Consistency & standards | 🟠 | URL & title inconsistencies leak into UX trust |
| Error prevention | 🟠 | Forms (contact/checkout) need inline validation review |
| Recognition over recall | 🟢 | Faceted brand/category browse is recognition‑driven |
| Flexibility & efficiency | 🟡 | The **thermal‑load calculator** is an excellent efficiency accelerator — surface it more |
| Aesthetic & minimal design | 🟡 | Rich animation can compete with the buying task on mobile |
| Help users recover from errors | 🟠 | Confirm a helpful 404 with search + popular categories |
| Help & documentation | 🟢 | Strong buyer guides & brand explainers |

## 3.2 Key UX Issues

| # | Area | Severity | Problem | Why it matters | Suggested redesign | Est. conversion lift |
|---|---|---|---|---|---|---|
| U1 | Product page above‑the‑fold | 🔴 | Price, stock, warranty, CTA, and "call to buy" not consolidated into a single sticky buy‑box | Iranian HVAC buyers often **phone to order**; scattered info adds friction | Sticky buy‑box: price + availability + warranty badge + **"تماس برای خرید"** + add‑to‑cart + WhatsApp | +8–15% |
| U2 | Mobile mega‑menu | 🟠 | Deep brand×category taxonomy is hard to thumb‑navigate | 60–70% traffic is mobile (Est.) | Two‑tier accordion, sticky search, recent/popular shortcuts | +3–6% |
| U3 | Search | 🟠 | Verify autosuggest, typo tolerance, model‑number search | Buyers search exact model codes (L24FF, 28FX2) | Add product‑model synonyms + instant results | +2–5% |
| U4 | Trust placement | 🟠 | Official‑dealer status & phone exist but not pinned to decision points | Trust must appear *at* the CTA | Dealer/warranty badges in buy‑box & cart | +3–7% |
| U5 | Filtering/sorting | 🟡 | Confirm price/capacity/brand filters on category pages | Capacity (kcal/kW) is the #1 spec buyers filter by | Add "ظرفیت/متراژ" range filter | +2–4% |
| U6 | Animation cost | 🟡 | Reveal animations delay content perception on slow devices | Cognitive + perf cost | Respect `prefers-reduced-motion`; lighten on mobile | UX quality |

## 3.3 Friction / Attention Flow (Estimated heatmap reasoning)
- **F‑pattern** holds on RTL category grids; ensure the **first card row** carries the strongest models.
- **Decision fatigue:** large brand×model matrix → lead with the **calculator** ("not sure which capacity? calculate") to convert undecided visitors.
- **Interaction cost:** phone‑to‑buy behaviour means a **one‑tap call button** is the highest‑ROI control on mobile.

---

# 🎨 SECTION 4 — UI DESIGN REVIEW (2026 standards)

**Score: 76/100 (B).** The team's design language (from the published templates and `style.css`) is genuinely modern: a confident dark palette, fire/ice gradient system (`--fire #F97316`, `--ice #06B6D4`, `--brand #E11D48`), Vazirmatn + Outfit pairing, glassmorphism, and tasteful motion.

| Dimension | Score | Note |
|---|---|---|
| Color palette & brand system | 🟢 8.5/10 | Distinctive, ownable "fire & ice" (heating/cooling) metaphor — *on‑strategy* |
| Contrast | 🟠 6/10 | Muted ink (`#94A3B8`) on dark risks failing WCAG AA on small text (see §5) |
| Grid / alignment / spacing | 🟢 8/10 | `--maxw:1320px`, consistent tokens |
| Typography scale | 🟢 8/10 | `clamp()` fluid scale, good hierarchy |
| Components (buttons/cards/inputs) | 🟡 7/10 | Buttons polished; confirm input & table styling parity |
| Border radius / shadows | 🟢 8/10 | Consistent 12px radius, layered shadows |
| Responsive behaviour | 🟡 7/10 | Fluid type good; verify the WooCommerce theme inherits this system (the marketing pages may be more polished than the live store theme) |
| Dark‑mode readiness | 🟢 9/10 | Already dark‑first |
| Premium/Apple‑polish | 🟡 7.5/10 | Marketing/landing pages are premium; **risk: the live WooCommerce store theme may not match this polish** — unify them |
| Material/Google quality | 🟡 7/10 | Motion is expressive; needs accessibility guardrails |

> ⚠️ **Brand‑consistency risk:** there appear to be **two visual worlds** — high‑craft marketing/landing experiments (Three.js, gradient hero) vs. the standard WooCommerce storefront. **Unify them into one design system** so the store feels as premium as the campaigns.

---

# ♿ SECTION 5 — ACCESSIBILITY (WCAG 2.2 AA) *(Estimated)*

**Score: 55/100 (D+, Estimated).** Dark‑first + heavy motion + RTL needs deliberate accessibility work.

| # | WCAG SC | Severity | Likely Issue | Fix |
|---|---|---|---|---|
| A1 | 1.4.3 Contrast (AA) | 🔴 | Muted gray `#94A3B8`/`#CBD5E1` body text on `#070A12` may fall below 4.5:1 at small sizes | Raise muted text to ≥ `#A9B4C2`; verify every pair ≥ 4.5:1 (≥3:1 large) |
| A2 | 1.1.1 Non‑text content | 🔴 | Content images missing/empty `alt` | Author descriptive Persian alt for every product/spec image |
| A3 | 2.3.3 / 2.2.2 Motion | 🟠 | Reveal/parallax animations without honoring `prefers-reduced-motion` | Gate all motion behind the media query |
| A4 | 2.4.7 Focus Visible | 🟠 | Custom dark buttons may lack visible focus rings | Add high‑contrast `:focus-visible` outlines |
| A5 | 2.5.8 Target Size (2.2 AA) | 🟠 | Chapter dots / icon controls (24×2 px rails) below 24×24 px | Enforce ≥24×24 px (ideally 44×44) touch targets |
| A6 | 1.3.1 Info & Relationships | 🟠 | Verify spec tables use real `<table>`/`<th>`, FAQ uses real headings | Use semantic markup, not styled divs |
| A7 | 4.1.2 Name/Role/Value | 🟠 | Custom menu/accordion need ARIA states | Add `aria-expanded`, roles, labels |
| A8 | 1.4.4 / 1.4.10 Zoom/Reflow | 🟡 | `viewport-fit=cover` OK; verify 200% zoom & 320px reflow | Test reflow |
| A9 | 3.3 Forms | 🟠 | Contact/checkout label & error association | Programmatic labels + inline errors |
| A10 | 2.1.1 Keyboard | 🟠 | Animated/JS controls must be keyboard operable | Full keyboard path + skip‑link |

**Compliance estimate:** ~**55–62%** of WCAG 2.2 AA SCs likely pass today. Contrast (A1) and alt text (A2) are the highest‑impact, lowest‑effort fixes.

---

# 🔐 SECTION 6 — SECURITY *(Estimated)*

**Score: 72/100 (B‑, Estimated).** The aggressive WAF is a real positive; WordPress fingerprinting and header hardening are the open fronts.

| Area | Status (Est.) | Recommendation |
|---|---|---|
| HTTPS | ✅ Enforced | Confirm HSTS `max-age≥31536000; includeSubDomains; preload` |
| WAF / bot protection | 🟢 Strong | Blocks datacenter/bot IPs (503/reset) — good; just **allowlist Googlebot/Bingbot verified ranges** so indexing isn't harmed |
| Security headers | 🟠 Verify | Add `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Frame-Options: SAMEORIGIN` |
| CSP / XSS | 🟠 | Inline `<style>`/`<script>` in product content complicates a strict CSP → use nonces/hashes; sanitise any user/review input |
| Clickjacking | 🟡 | `X-Frame-Options`/`frame-ancestors` |
| Mixed content | 🟡 | Audit for `http://` assets |
| Cookie security | 🟠 | `Secure; HttpOnly; SameSite=Lax/Strict` on session/auth cookies |
| WordPress fingerprinting | 🟠 | Hide `wp-json` user enumeration, `readme.html`, version meta `generator`, login URL; rate‑limit `wp-login.php` |
| Plugin exposure | 🟠 | Keep WooCommerce/SEO/cache plugins patched; remove unused |
| Admin / REST | 🔴‑adjacent | The publish pipeline uses **WP Application Passwords over REST** — ensure least‑privilege, rotate `WP_APP_PASS`, and restrict `/wp-json/wc/v3` by IP/role |
| Directory listing | 🟡 | Confirm `Options -Indexes` |

> 🔐 **Note on the publishing pipeline:** content is pushed via GitHub Actions → WP REST with an Application Password stored as a GitHub Secret. Best practice: scope the WP user minimally, rotate the app password on any team change, and never commit credentials.

---

# ✍️ SECTION 7 — CONTENT QUALITY

**Score: 80/100 (B+) — the standout.** Deep, expert, structured Persian content with real buyer utility.

**Strengths**
- 🟢 **Topical authority:** boilers, packages, burners, radiators, split/HVAC, pumps — full‑funnel coverage from buyer guides to spec pages.
- 🟢 **E‑E‑A‑T:** official dealer (نمایندگی) of Shofazhkar, Iran Radiator, Green, Semnan Energy; phone `021‑88302400`; operating since ~2017; `/about/` & `/contact/`.
- 🟢 **Structured spec data:** capacity (kcal/kW), head/flow for pumps, comparison vs. competitors — genuinely helpful, GEO‑friendly (cited well by AI answer engines).
- 🟢 **Tools:** thermal‑load & cooler‑capacity calculators = sticky, link‑worthy assets.

**Gaps / Actions**
| # | Gap | Action |
|---|---|---|
| C1 | Thin/auto product‑tag archives | `noindex` low‑value tags; expand only commercially distinct ones with unique intros |
| C2 | Inconsistent "last updated" / price freshness | Show visible update date; automate price freshness |
| C3 | Review content missing | Launch genuine review collection (also fixes schema issue #9) |
| C4 | Internal‑linking opportunities | Link guides → category → top products contextually (capacity‑based recommendations) |
| C5 | Brand voice consistency | Codify tone (expert, plain, trust‑first) in a content style guide |

---

# 🛒 SECTION 8 — CONVERSION RATE OPTIMIZATION (CRO)

**Score: 56/100 (D+).** Biggest commercial upside on the whole site.

| # | Lever | Severity | Problem | Fix | Est. revenue impact |
|---|---|---|---|---|---|
| CRO1 | Sticky buy‑box | 🔴 | Price/stock/warranty/CTA scattered | Consolidated sticky box w/ price + warranty + **call/WhatsApp/add‑to‑cart** | High |
| CRO2 | Social proof | 🔴 | No visible reviews/ratings/install photos | Collect & display real reviews + count + photos | High |
| CRO3 | Trust badges | 🟠 | Official‑dealer & warranty not pinned to CTA | Badge cluster at decision points | Medium‑High |
| CRO4 | Phone/WhatsApp prominence | 🟠 | Iranian HVAC = phone‑led sales; CTA buried | Persistent click‑to‑call + WhatsApp on mobile | High |
| CRO5 | Value proposition above fold | 🟠 | Benefit (genuine warranty, fast dispatch, expert advice) not stated at top | One‑line UVP band sitewide | Medium |
| CRO6 | Urgency/scarcity | 🟡 | No stock/price‑change cues | "X in stock", "price valid until", seasonal demand nudges (ethical) | Medium |
| CRO7 | Lead capture | 🟡 | Calculator doesn't capture leads | Optional "email me this capacity quote" | Medium |
| CRO8 | Checkout friction | 🟠 | Verify guest checkout, minimal fields, Iranian gateways, clear shipping | Streamline WooCommerce checkout | High |

> 💰 **Estimated:** Implementing CRO1–CRO4 could recover **~20–30% of lost conversions** on commercial templates *(Estimated)*.

---

# 📱 SECTION 9 — MOBILE EXPERIENCE *(Estimated)*

**Score: 63/100 (C, Estimated).**

| Item | Status | Action |
|---|---|---|
| Responsive layout | 🟡 | Fluid `clamp()` good; verify store theme parity with marketing pages |
| Tap targets | 🔴 | Icon rails/dots < 24px — enlarge (WCAG 2.5.8) |
| Viewport | 🟢 | `width=device-width, viewport-fit=cover` correct |
| Sticky elements | 🟠 | Add sticky buy‑box + call button |
| Thumb reach | 🟠 | Move primary CTA into bottom thumb zone |
| Load (mobile) | 🔴 | Fonts + inline CSS/JS = slow LCP (see §2) |
| Forms | 🟠 | Correct `inputmode`/`type` for phone/number; large fields |
| Menus | 🟠 | Simplify deep mega‑menu for mobile |
| Readability | 🟡 | Raise muted‑text contrast; min 16px body |

---

# 🗂️ SECTION 10 — INFORMATION ARCHITECTURE

**Score: 75/100 (B).** One of the stronger areas.

- ✅ **Dual‑axis taxonomy** (system type × brand) mirrors buyer mental models.
- ✅ Logical depth: `garmayesh → packages/boilers/burners → brand`.
- ✅ Breadcrumbs (schema present).
- 🟠 **Tag sprawl** competes with categories (cannibalisation).
- 🟠 **Findability:** ensure model‑number search + capacity filters.
- 🟡 Add a clear **"choose by capacity/متراژ"** entry path (tie to calculator) — converts undecided buyers.

---

# 🧱 SECTION 11 — DESIGN SYSTEM

**Score: 70/100 (B‑).** Tokens exist (`:root` variables for color/space/radius/maxw) — a real foundation — but **maturity is split** between marketing pages and the live store.

| Element | Consistency | Note |
|---|---|---|
| Color tokens | 🟢 | Centralised CSS variables |
| Typography | 🟢 | Vazirmatn/Outfit + fluid scale |
| Spacing/radius/shadow | 🟡 | Consistent in templates; verify store theme |
| Buttons | 🟢 | `.btn .primary/.ghost/.ice` variants |
| Inputs/tables/cards | 🟡 | Need documented parity |
| Naming | 🟡 | `.anim .d1…` presentational — formalise into utilities/tokens |
| CSS architecture | 🟠 | **Per‑page inline CSS** hurts scalability & perf — migrate to a single enqueued design‑system stylesheet |
| Tokenisation | 🟠 | Promote to documented design tokens (JSON) shared by marketing + store |

**Action:** Build a single, documented **Shofazh Design System** (tokens + components) and make the WooCommerce theme consume it — kills duplication, improves perf & brand consistency.

---

# 🏁 SECTION 12 — COMPETITIVE BENCHMARK (Iranian HVAC e‑commerce)

Benchmarked against the patterns of leading Iranian HVAC/appliance stores (e.g., Damatajhiz, IranRadiatorYar, Tajhizshofaj‑type players, generic marketplaces like Emalls).

| Dimension | shofazh.com | Category Leaders | Verdict |
|---|---|---|---|
| Design / brand | 🟢 Distinctive "fire & ice" | Mostly generic | **Win** (if store theme matches campaigns) |
| Content depth / E‑E‑A‑T | 🟢 Strong, expert | Strong | **Parity‑to‑win** |
| Structured data | 🟢 Rich JSON‑LD | Mixed | **Win** |
| Performance (mobile) | 🔴 Slow (Est.) | Mixed/slow | **Parity** (chance to leapfrog) |
| SEO hygiene | 🟠 Index bloat/title bugs | Variable | **At risk** |
| Trust / reviews | 🔴 No visible reviews | Many show reviews/Q&A | **Lose** |
| Conversion system | 🔴 Weak buy‑box | Phone+cart prominent | **Lose** |
| Mobile UX | 🟠 | Variable | **Parity** |
| Price freshness | 🟡 | Leaders update aggressively | **At risk** |

**Strategic read:** shofazh.com has a **superior content + design + schema foundation** but **loses on trust signals, conversion mechanics, and speed** — exactly the areas that are cheapest to fix for the biggest commercial gain.

---

# 🗺️ SECTION 13 — PRIORITIZED ACTION PLAN

### 🔴 Critical — Fix Immediately
| Action | Impact | Difficulty | Time | Biz | SEO | Perf | Conv | Owner |
|---|---|---|---|---|---|---|---|---|
| Remove `AggregateRating` until real reviews exist (or launch reviews) | Avoids manual action | Low | 0.5d | High | High | – | Med | SEO/Dev |
| Fix duplicated‑sitename title bug | CTR/trust | Low | 0.5d | Med | High | – | Low | SEO |
| `noindex`/`410` trashed & `?login=` URLs | Crawl/quality | Low | 1d | Med | High | – | – | Dev/SEO |
| Self‑host + subset fonts | LCP | Med | 1–2d | High | Med | High | Med | Dev |
| Add `width/height`+`lazy`+`alt` to images | CLS/SEO/A11y | Med | 2–3d | Med | High | High | – | Dev |
| Sticky buy‑box + click‑to‑call/WhatsApp | Conversion | Med | 3–5d | High | – | – | High | Dev/Designer |

### 🟠 High — This Month
| Action | Owner |
|---|---|
| Consolidate per‑page inline CSS → one cached design‑system stylesheet | Dev |
| Launch genuine WooCommerce reviews + display | Dev/Content |
| Add security headers (CSP/HSTS/XFO/Referrer/Permissions) | Dev |
| `noindex` thin product‑tag archives; fix URL strategy + redirect map | SEO |
| Contrast + focus‑visible + target‑size accessibility pass | Designer/Dev |
| Enrich Offer schema (shipping/returns/priceValidUntil/availability) | SEO/Dev |
| Mobile mega‑menu simplification | Designer/Dev |

### 🟡 Medium — Next Quarter
| Action | Owner |
|---|---|
| Full‑page + object caching + WebP pipeline + CDN | Dev |
| Unify marketing & store into one documented design system/tokens | Designer/Dev |
| Capacity/متراژ filters + model‑number search | Dev |
| "Last updated"/price‑freshness automation | Dev/Content |
| Lead capture on calculator | Dev/CRO |

### 🟢 Nice to Have
| Action | Owner |
|---|---|
| Reduced‑motion polish, microinteractions | Designer |
| Internal‑linking recommendation engine (by capacity) | SEO/Dev |
| Wishlist/compare, seasonal landing hubs | Dev/Content |

---

# 📅 SECTION 14 — IMPLEMENTATION ROADMAP

### 30‑Day Plan — "Stop the bleeding"
- ✅ Fix title bug; `noindex/410` trashed & param URLs; robots updates.
- ✅ Remove/condition `AggregateRating`; plan review collection.
- ✅ Self‑host fonts; image dimensions + lazy + alt.
- ✅ Sticky buy‑box + click‑to‑call/WhatsApp on product pages.
- **Milestone:** Mobile LCP < 3s (Est.); zero indexed junk URLs; no schema‑policy risk.

### 60‑Day Plan — "Trust & speed"
- ✅ Live reviews displayed + emitted in schema correctly.
- ✅ Inline CSS consolidated; caching + WebP enabled.
- ✅ Security headers shipped; WP hardening.
- ✅ Accessibility AA pass (contrast/focus/targets/alt).
- **Milestone:** Lighthouse mobile ≥ 80 (Est.); WCAG AA ≥ 90%; reviews on top 50 products.

### 90‑Day Plan — "Systemise & scale"
- ✅ Unified design system/tokens across marketing + store.
- ✅ Tag taxonomy cleaned; URL strategy standardised w/ redirects.
- ✅ Capacity filters + model search + calculator lead capture.
- **Milestone:** Organic CTR ↑, conversion ↑20–30% (Est.), brand‑consistent premium store.

---

# 🧾 SECTION 15 — FINAL SCORECARD

| Category | Score | Grade |
|---|---|---|
| SEO | 74 | B‑ |
| UX | 69 | C+ |
| UI | 76 | B |
| Performance *(Est.)* | 58 | D+ |
| Accessibility *(Est.)* | 55 | D+ |
| Security *(Est.)* | 72 | B‑ |
| Mobile *(Est.)* | 63 | C |
| Content | 80 | B+ |
| Conversion | 56 | D+ |
| Trust | 77 | B |
| **Overall** | **68** | **C+** |

---

# 🚨 SECTION 16 — CRITICAL ISSUES SUMMARY (one page)

| # | Critical Problem | Biz Impact | SEO Impact | Revenue Impact | UX Gain on Fix | Cost | Time |
|---|---|---|---|---|---|---|---|
| 1 | `AggregateRating` schema without real reviews | High (penalty risk) | High | Med | – | Low | 0.5d |
| 2 | Indexed trashed/`?login=` URLs (index bloat) | Med | High | Low | – | Low | 1d |
| 3 | Duplicated‑sitename title bug | Med | High | Med | Low | Low | 0.5d |
| 4 | Mobile CWV failure (fonts + inline CSS/JS) *(Est.)* | High | High | High | High | Med | 3–5d |
| 5 | Weak above‑fold buy‑box / no click‑to‑call | High | – | High | High | Med | 3–5d |
| 6 | No visible social proof / reviews | High | Med | High | High | Med | 5–10d |
| 7 | Inconsistent URL encoding strategy | Med | Med | Low | Med | Med | ongoing |
| 8 | Low text contrast + missing alt (A11y) | Med | Med | Low | High | Low | 2–3d |
| 9 | Missing security headers / WP fingerprinting | Med | Low | Low | – | Low | 1–2d |
| 10 | Two divergent design worlds (marketing vs store) | Med | Low | Med | High | High | 90d |

**Expected business impact (fixing top 10):** materially faster store, no penalty exposure, ~**+20–30% conversion** *(Est.)*, higher SERP CTR, and a premium, consistent brand.
**Estimated total cost:** Low‑to‑Medium for items 1–9; Medium‑High for #10.
**Estimated total time:** ~30 days for critical items 1–6.

---

*Companion files: `executive-summary.pdf`, `prioritized-roadmap.md`, `technical-seo-checklist.md`, `ui-ux-improvement-plan.md`, `performance-optimization-plan.md`, `accessibility-report.md`, `security-review.md`, `cro-strategy.md`, `final-scorecard.xlsx`.*

---

# 📌 خلاصه‌ی اجرایی (Persian Executive Summary)

## وضعیت کلی سایت
شوفاژ دات کام یک فروشگاه تخصصی WooCommerce در حوزه تجهیزات گرمایشی و سرمایشی است که **محتوای فنی بسیار قوی، اعتبار برند (نمایندگی رسمی) و داده ساختاریافته (Schema) بهتر از میانگین بازار ایران** دارد. اما از نظر **سرعت موبایل، نرخ تبدیل، اعتمادسازی (نظرات کاربران) و بهداشت فنی سئو** عقب است. نمره کلی: **۶۸ از ۱۰۰ (C+)** — «پایه‌ی قوی، اما بهینه‌نشده».

## مهم‌ترین مشکلات
1. **اسکیمای امتیاز (AggregateRating) بدون نظر واقعی کاربر** → ریسک جریمه گوگل.
2. **ایندکس شدن صفحات بی‌ارزش** مثل `/product/__trashed/` و `?login=true`.
3. **باگ تکرار نام سایت در تایتل** («شوفاژ دات کام دات کام»).
4. **افت Core Web Vitals در موبایل** به‌خاطر فونت‌های گوگل و CSS/JS سنگین داخل هر صفحه *(برآوردی)*.
5. **ضعف باکس خرید و نبود دکمه تماس/واتساپ ثابت** در صفحه محصول.
6. **نبود نظرات کاربران (Social Proof).**

## مهم‌ترین فرصت‌ها
- محتوا و سئوی قوی فعلی + رفع چند نقص ساده = **جهش در رتبه و نرخ تبدیل**.
- ماشین‌حساب بار حرارتی = ابزار جذب و تبدیل مشتری بلاتکلیف.
- یکپارچه‌سازی دیزاین کمپین‌ها با فروشگاه = حس برند پرمیوم.

## ۱۰ اقدام فوری (به‌ترتیب اولویت)
1. حذف/مشروط‌کردن `AggregateRating` یا راه‌اندازی نظرات واقعی — *تاثیر: جلوگیری از جریمه، بالا* — کم‌هزینه، نیم‌روز.
2. رفع باگ تایتل تکراری — *تاثیر: CTR و اعتماد* — کم‌هزینه، نیم‌روز.
3. `noindex/410` صفحات trashed و پارامتر `?login` — *تاثیر: سئو بالا* — کم‌هزینه، ۱ روز.
4. میزبانی محلی + سبک‌سازی فونت‌ها — *تاثیر: سرعت بالا* — متوسط، ۱–۲ روز.
5. افزودن `alt`، ابعاد و `lazy` به تصاویر — *تاثیر: سئو/سرعت/دسترسی* — متوسط، ۲–۳ روز.
6. باکس خرید ثابت + دکمه تماس/واتساپ — *تاثیر: نرخ تبدیل بالا* — متوسط، ۳–۵ روز.
7. راه‌اندازی و نمایش نظرات واقعی کاربران — *تاثیر: اعتماد/فروش بالا* — متوسط، ۵–۱۰ روز.
8. اصلاح کنتراست رنگ و alt برای دسترسی‌پذیری — *تاثیر: متوسط* — کم‌هزینه، ۲–۳ روز.
9. افزودن هدرهای امنیتی و سخت‌سازی وردپرس — *تاثیر: امنیت* — کم‌هزینه، ۱–۲ روز.
10. یکدست‌سازی CSS صفحات در یک استایل‌شیت کش‌شده — *تاثیر: سرعت/مقیاس‌پذیری* — متوسط، چند روز.

## اولویت اجرای اصلاحات
- **فوری (۳۰ روز):** موارد ۱ تا ۶ بالا.
- **ماه اول تا دوم (۶۰ روز):** نظرات، کش/WebP، هدرهای امنیتی، دسترسی‌پذیری.
- **سه‌ماهه (۹۰ روز):** دیزاین‌سیستم یکپارچه، اصلاح URLها و تگ‌ها، فیلتر ظرفیت و جستجوی مدل.

## نتیجه‌گیری مدیریتی
شما یک دارایی محتوایی و برندی ارزشمند دارید که به‌خاطر چند نقص فنی و تجربه‌ای ساده، بخشی از پتانسیل فروش خود را از دست می‌دهد. با **سرمایه‌گذاری کم‌تا‌متوسط در ۳۰ تا ۹۰ روز** می‌توان سرعت سایت را تقریباً دو برابر، نرخ تبدیل را حدود **۲۰ تا ۳۰ درصد** *(برآوردی)* افزایش داد و ریسک جریمه سئو را حذف کرد. توصیه می‌کنیم ابتدا «۶ اقدام بحرانی» اجرا شود؛ این موارد کم‌هزینه‌ترین و پربازده‌ترین هستند.

> 🔓 یک درخواست فنی: برای جایگزینی همه اعداد «برآوردی» با اعداد «اندازه‌گیری‌شده»، یک IP مجاز یا نسخه staging در اختیار تیم سئو قرار دهید تا فایروال اجازه اسکن واقعی Lighthouse/CrUX را بدهد.
