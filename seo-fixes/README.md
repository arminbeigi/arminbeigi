# SEO Live Fixes — Phase 0 (from the enterprise audit)

Controlled tooling to apply the safe, autonomous audit fixes to the **live**
shofazh.com store via the WordPress / WooCommerce REST API — the same auth and
runner the product publisher already uses (`WP_USER` / `WP_APP_PASS` GitHub
Secrets, run from GitHub Actions so the site WAF allows it).

> 🛡️ **Dry-run is the default. Nothing is written unless `apply=true`.**
> Always preview with a small `limit` first, then apply.

## What it does

| Task | Action | Risk |
|---|---|---|
| `strip-rating` | Removes the **fabricated `AggregateRating`** JSON-LD from product content (Google review-snippet policy / manual-action risk). JSON-aware: parses each `ld+json` block, drops `aggregateRating`, re-serializes. | Low — content-only, schema stays valid |
| `delete-trashed` | **Permanently deletes** WooCommerce trashed products — removes the indexed `/product/__trashed/` soft-404. | Medium — irreversible delete; review the dry-run list first |
| `fix-alt` | Fills **missing `alt_text`** on media images from the image title. | Low |
| `probe-titles` | **Read-only.** Checks whether the duplicated-sitename title bug is fixable via REST and reports the verdict. | None |

## How to run (GitHub → Actions → "SEO Live Fixes (manual)")

1. **Test first (dry-run, 3 items):**
   `task = strip-rating`, `apply = false`, `limit = 3` → review the log.
2. **Apply to the same 3:** `apply = true`, `limit = 3` → verify on the site.
3. **Full run:** `apply = true`, `limit = 0`.

CLI equivalent (locally, with env vars set):

```bash
export WP_USER=... WP_APP_PASS=...
python seo-fixes/wp_seo_fixes.py --task strip-rating --limit 3            # preview
python seo-fixes/wp_seo_fixes.py --task strip-rating --limit 3 --apply    # apply 3
python seo-fixes/wp_seo_fixes.py --task strip-rating --apply              # all
python seo-fixes/wp_seo_fixes.py --task delete-trashed                    # preview trash
python seo-fixes/wp_seo_fixes.py --task probe-titles                      # read-only
```

## Recommended order
1. `probe-titles` (read-only — learn what REST allows).
2. `strip-rating` — dry-run 3 → apply 3 → apply all. **Highest priority** (penalty risk).
3. `delete-trashed` — dry-run → review list → apply.
4. `fix-alt` — dry-run → apply in batches.

After `strip-rating`, the repo source files (`*-product-content.html`) and the
`shofazh-product-page` skill are already cleaned, so **future** publishes won't
re-introduce fake ratings.

---

## Phase 1 — needs WordPress dashboard / server (not core-REST patchable)

`probe-titles` confirms the **duplicated-sitename title bug** ("…شوفاژ دات کام
دات کام") is a global Rank Math title template, which core REST does not expose.

**Option A — Dashboard (2 min):** Rank Math → Titles & Meta → **Categories** →
remove the doubled `%sitename%` from the title format.

**Option B — mu-plugin** (drop in `wp-content/mu-plugins/shofazh-title-fix.php`):

```php
<?php
/* Plugin Name: Shofazh Title Fix — collapse duplicated site name */
add_filter('rank_math/frontend/title', function ($title) {
    $name = get_bloginfo('name'); // "شوفاژ دات کام"
    // collapse an accidental double site-name into one
    $dup = $name . ' دات کام';
    return str_replace($dup, $name, $title);
}, 99);
```

Other Phase 1 items from the audit that need dashboard/server access (snippets
to follow on request): self-hosting fonts (theme), security headers
(`.htaccess`/nginx), `robots.txt` param/login disallows, and full-page caching.
