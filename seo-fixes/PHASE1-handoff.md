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
