# Phase 1 — items that need the WordPress dashboard / server

These cannot be applied via the WP REST API, so they are delivered as ready-to-use
snippets. Diagnostic facts (read-only run, 2026-06-28):

- **SEO plugin:** Yoast SEO (`yoast/v1` REST namespace present).
- **Site title:** `شوفاژ دات کام | shofazh.com` (clean — not the source of the duplication).
- **Trashed products:** none — nothing to delete.

---

## 1) Duplicated site name in titles — "… شوفاژ دات کام دات کام"

The doubling lives in **Yoast's title template for category/taxonomy archives**, not in
the site title. Two ways to fix:

### Option A — Dashboard (recommended, 2 min, fixes the root cause)
Yoast SEO → **Search Appearance → Taxonomies → Categories** → look at the **SEO title**
template. Remove the redundant site-name piece so it reads e.g.:
`Title` `Separator` `Site title` — i.e. a single `%%sitename%%` (or a single literal
"شوفاژ دات کام"), not both. Do the same for any other taxonomy/archive whose preview
shows the doubled name. Save.

### Option B — mu-plugin (no dashboard; safety net)
Upload `seo-fixes/mu-plugins/shofazh-title-fix.php` to `wp-content/mu-plugins/`
(create the folder if needed). It auto-collapses any repeated "دات کام" in titles.
Harmless to keep even after Option A.

> After fixing, in Google Search Console use **URL Inspection → Live Test** on a couple
> of category URLs to confirm the corrected title, then **Request Indexing**.

## 2) Indexed `/product/__trashed/` soft-404
No trashed products remain; the URL now returns 404. In GSC → **Removals** you can
submit a temporary removal to speed its drop from the index. No code change needed.

## 3) Remaining (see audit docs for full detail)
- **Self-host fonts** (theme) — `performance-optimization-plan.md` §Phase 1.
- **Security headers** (`.htaccess`/nginx) — `security-review.md` §1.
- **robots.txt** param/login disallows — `technical-seo-checklist.md` §1.

---

## 4) robots.txt — block junk param/session URLs (added 2026-06-28)

**Why:** `?login=true` and faceted-filter/session params create crawlable duplicate URLs
that waste crawl budget (the audit flagged an indexed `?login=true` URL). These rules are
WooCommerce-safe — they never block product or category pages.

### Option A — paste (recommended, transparent)
Yoast SEO → **Tools → File editor → robots.txt** → paste the contents of
`seo-fixes/robots.txt.recommended` (merge with any custom rules you already have) → Save.
If a physical `/robots.txt` exists at the web root, edit that file instead.

### Option B — mu-plugin
Upload `seo-fixes/mu-plugins/shofazh-robots.php` to `wp-content/mu-plugins/`. It appends
the same Disallow rules to the virtual robots.txt automatically.

> ⚠️ **Deindex note:** robots.txt `Disallow` blocks *crawling*, not indexing. For the
> already-indexed `?login=true` URL, also either (a) submit it in **GSC → Removals**, or
> (b) make sure those param URLs carry `noindex`/canonical (Yoast usually adds a
> self-canonical). Disallowing a URL that is *already* indexed can keep it stuck in the
> index because Google can no longer see a noindex on it — so for existing offenders,
> prefer GSC Removals; use robots.txt to prevent *new* param URLs from being crawled.

### Verify
After deploying, open `https://shofazh.com/robots.txt` and confirm the new lines, then in
GSC use **robots.txt Tester** / **URL Inspection** on a sample `?orderby=` URL to confirm
it is "Blocked by robots.txt".
