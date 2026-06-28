#!/usr/bin/env python3
"""
SEO live-site fixes for shofazh.com via WP/WC REST API.

Phase 0 (autonomous) fixes from the enterprise audit:
  - strip-rating   : remove fabricated AggregateRating JSON-LD from product content
                     (Google review-snippet policy / manual-action risk)
  - delete-trashed : permanently delete WooCommerce trashed products
                     (removes indexed /product/__trashed/ soft-404s)
  - fix-alt        : fill missing alt text on media library images
  - probe-titles   : READ-ONLY feasibility probe for fixing the duplicated-sitename
                     title bug via REST (reports what the SEO plugin exposes)

SAFETY: dry-run is the DEFAULT. Nothing is written unless you pass --apply.
Always test first:   --task strip-rating --limit 3        (dry-run preview)
Then apply:          --task strip-rating --limit 3 --apply (writes 3 products)
Then full run:       --task strip-rating --apply

Auth: reuses WP_USER / WP_APP_PASS env vars (GitHub Secrets), same as
wp_publish_product.py.
"""

import argparse
import json
import os
import re
import sys
import time

import requests

WP_URL      = "https://shofazh.com"
WP_USER     = os.environ.get("WP_USER", "admin")
WP_APP_PASS = os.environ.get("WP_APP_PASS", "")

WP_API  = f"{WP_URL}/wp-json/wp/v2"
WC_API  = f"{WP_URL}/wp-json/wc/v3"
AUTH    = (WP_USER, WP_APP_PASS)
HEADERS = {"User-Agent": "ShofazhSeoFixBot/1.0"}

LD = re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)', re.DOTALL)


def _need_auth():
    if not WP_APP_PASS:
        print("ERROR: WP_APP_PASS env var is not set.", file=sys.stderr)
        sys.exit(1)


def _safe_json(r):
    try:
        return r.json()
    except (ValueError, requests.exceptions.JSONDecodeError):
        return {}


# ----------------------------------------------------------------------------
# strip-rating
# ----------------------------------------------------------------------------
def _scrub_rating(obj):
    """Recursively remove aggregateRating keys; return count removed."""
    removed = 0
    if isinstance(obj, dict):
        if "aggregateRating" in obj:
            obj.pop("aggregateRating")
            removed += 1
        for v in obj.values():
            removed += _scrub_rating(v)
    elif isinstance(obj, list):
        for v in obj:
            removed += _scrub_rating(v)
    return removed


def _strip_rating_from_html(html):
    """Return (new_html, total_removed)."""
    total = [0]

    def repl(m):
        try:
            data = json.loads(m.group(2))
        except Exception:
            return m.group(0)
        n = _scrub_rating(data)
        if n == 0:
            return m.group(0)
        total[0] += n
        return m.group(1) + "\n" + json.dumps(data, ensure_ascii=False, indent=2) + "\n" + m.group(3)

    new_html = LD.sub(repl, html)
    return new_html, total[0]


def iter_products(per_page=100, status="publish"):
    """Yield product objects (edit context → includes content.raw)."""
    page = 1
    while True:
        r = requests.get(
            f"{WP_API}/product",
            params={"per_page": per_page, "page": page, "status": status, "context": "edit"},
            auth=AUTH, headers=HEADERS, timeout=30,
        )
        if r.status_code != 200:
            print(f"   list products page {page} → {r.status_code}: {r.text[:120]}")
            break
        batch = _safe_json(r)
        if not batch:
            break
        for p in batch:
            yield p
        total_pages = int(r.headers.get("X-WP-TotalPages", page))
        if page >= total_pages:
            break
        page += 1


def task_strip_rating(apply, limit, ids):
    print("== strip-rating: remove fabricated AggregateRating from product content ==")
    targeted = 0
    fixed = 0
    products = ([{"id": i} for i in ids] if ids else iter_products())
    for p in products:
        pid = p["id"]
        # If we only had an id (from --ids), fetch full edit content
        if "content" not in p:
            r = requests.get(f"{WP_API}/product/{pid}", params={"context": "edit"},
                             auth=AUTH, headers=HEADERS, timeout=30)
            if r.status_code != 200:
                print(f"  #{pid}: fetch failed ({r.status_code})")
                continue
            p = _safe_json(r)
        raw = (p.get("content") or {}).get("raw", "")
        if '"aggregateRating"' not in raw:
            continue
        targeted += 1
        new_raw, removed = _strip_rating_from_html(raw)
        name = (p.get("title") or {}).get("rendered") or pid
        print(f"  #{pid} {name}: {removed} aggregateRating block(s)")
        if apply:
            up = requests.post(f"{WP_API}/product/{pid}",
                               json={"content": {"raw": new_raw}},
                               auth=AUTH, headers=HEADERS, timeout=60)
            ok = up.status_code in (200, 201)
            print(f"     {'✓ updated' if ok else '✗ FAILED ' + str(up.status_code)}")
            if ok:
                fixed += 1
            time.sleep(0.4)
        if limit and targeted >= limit:
            break
    print(f"\nProducts with fabricated rating: {targeted} | "
          f"{'updated: ' + str(fixed) if apply else 'DRY-RUN (no writes)'}")


# ----------------------------------------------------------------------------
# delete-trashed
# ----------------------------------------------------------------------------
def task_delete_trashed(apply, limit, ids):
    print("== delete-trashed: permanently delete WooCommerce trashed products ==")
    r = requests.get(f"{WC_API}/products",
                     params={"status": "trash", "per_page": 100},
                     auth=AUTH, headers=HEADERS, timeout=30)
    if r.status_code != 200:
        print(f"  list trash → {r.status_code}: {r.text[:150]}")
        return
    items = _safe_json(r)
    if ids:
        items = [p for p in items if p["id"] in ids]
    if not items:
        print("  No trashed products found.")
        return
    count = 0
    for p in items:
        print(f"  #{p['id']} {p.get('name', p.get('slug',''))}")
        if apply:
            d = requests.delete(f"{WC_API}/products/{p['id']}",
                                params={"force": "true"},
                                auth=AUTH, headers=HEADERS, timeout=30)
            print(f"     {'✓ deleted' if d.status_code in (200,201) else '✗ ' + str(d.status_code)}")
            time.sleep(0.4)
        count += 1
        if limit and count >= limit:
            break
    print(f"\nTrashed products: {count} | {'deleted' if apply else 'DRY-RUN (no writes)'}")


# ----------------------------------------------------------------------------
# fix-alt
# ----------------------------------------------------------------------------
def task_fix_alt(apply, limit, ids):
    print("== fix-alt: fill missing alt text on media images ==")
    fixed = 0
    page = 1
    while True:
        r = requests.get(f"{WP_API}/media",
                         params={"per_page": 100, "page": page, "media_type": "image"},
                         auth=AUTH, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            print(f"  list media page {page} → {r.status_code}")
            break
        batch = _safe_json(r)
        if not batch:
            break
        for m in batch:
            if ids and m["id"] not in ids:
                continue
            if (m.get("alt_text") or "").strip():
                continue
            title = (m.get("title") or {}).get("rendered", "").strip()
            if not title:
                continue
            print(f"  #{m['id']} alt → {title[:60]}")
            if apply:
                u = requests.post(f"{WP_API}/media/{m['id']}",
                                  json={"alt_text": title},
                                  auth=AUTH, headers=HEADERS, timeout=30)
                print(f"     {'✓' if u.status_code in (200,201) else '✗ ' + str(u.status_code)}")
                time.sleep(0.3)
            fixed += 1
            if limit and fixed >= limit:
                print(f"\nReached limit {limit}.")
                return
        total_pages = int(r.headers.get("X-WP-TotalPages", page))
        if page >= total_pages:
            break
        page += 1
    print(f"\nImages missing alt: {fixed} | {'updated' if apply else 'DRY-RUN (no writes)'}")


# ----------------------------------------------------------------------------
# probe-titles (READ-ONLY)
# ----------------------------------------------------------------------------
def task_probe_titles(apply, limit, ids):
    print("== probe-titles: READ-ONLY feasibility check for the duplicated-sitename "
          "title fix via REST ==\n")
    # Core settings (site title / tagline)
    r = requests.get(f"{WP_API}/settings", auth=AUTH, headers=HEADERS, timeout=20)
    if r.status_code == 200:
        s = _safe_json(r)
        print(f"  Core /settings reachable: site title = {s.get('title','?')!r}")
    else:
        print(f"  Core /settings → {r.status_code}")
    # Discover REST namespaces (is Rank Math / Yoast exposed?)
    root = requests.get(f"{WP_URL}/wp-json", auth=AUTH, headers=HEADERS, timeout=20)
    ns = _safe_json(root).get("namespaces", []) if root.status_code == 200 else []
    seo_ns = [n for n in ns if "rankmath" in n.lower() or "yoast" in n.lower()]
    print(f"  SEO REST namespaces: {seo_ns or 'none exposed'}")
    print("\n  Verdict:")
    print("  • The duplicated-sitename bug is a GLOBAL SEO-plugin title template")
    print("    (Rank Math: 'rank-math-options-titles' / category title format).")
    print("  • Core REST does NOT expose plugin title templates, so it cannot be")
    print("    patched via standard REST. Options:")
    print("     (a) Dashboard: Rank Math → Titles & Meta → Categories → remove the")
    print("         doubled %sitename% variable (2-minute fix).")
    print("     (b) Drop a tiny mu-plugin (see seo-fixes/README.md) to override the")
    print("         category title filter without touching plugin settings.")


def main():
    _need_auth()
    ap = argparse.ArgumentParser(description="shofazh.com SEO live fixes (REST)")
    ap.add_argument("--task", required=True,
                    choices=["strip-rating", "delete-trashed", "fix-alt", "probe-titles"])
    ap.add_argument("--apply", action="store_true",
                    help="actually write changes (default: dry-run, no writes)")
    ap.add_argument("--limit", type=int, default=0, help="max items to process (0 = all)")
    ap.add_argument("--ids", default="", help="comma-separated post/media IDs to target")
    args = ap.parse_args()

    ids = [int(x) for x in args.ids.split(",") if x.strip().isdigit()] if args.ids else []
    mode = "APPLY (writing)" if args.apply else "DRY-RUN (no writes)"
    print(f"Mode: {mode} | limit: {args.limit or 'all'} | ids: {ids or 'auto'}\n")

    {
        "strip-rating":   task_strip_rating,
        "delete-trashed": task_delete_trashed,
        "fix-alt":        task_fix_alt,
        "probe-titles":   task_probe_titles,
    }[args.task](args.apply, args.limit, ids)


if __name__ == "__main__":
    main()
