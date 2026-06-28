# 🗺️ Prioritized Roadmap — shofazh.com

Priority badges: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Nice‑to‑have
Owner key: **Dev** · **Designer** · **SEO** · **Content** · **CRO**

## 🔴 CRITICAL — Fix Immediately (Week 1–2)
| # | Problem | Impact | Difficulty | Time | Biz | SEO | Perf | Conv | Owner |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `AggregateRating` schema without real reviews (penalty risk) | Very High | Low | 0.5d | High | High | – | Med | SEO/Dev |
| 2 | Duplicated‑sitename `<title>` bug | High | Low | 0.5d | Med | High | – | Low | SEO |
| 3 | Indexed `/__trashed/` & `?login=` URLs | High | Low | 1d | Med | High | – | – | Dev/SEO |
| 4 | Render‑blocking fonts (self‑host+subset) | High | Med | 1–2d | High | Med | High | Med | Dev |
| 5 | Images: alt + dimensions + lazy + WebP | High | Med | 2–3d | Med | High | High | – | Dev |
| 6 | Sticky buy‑box + click‑to‑call/WhatsApp | High | Med | 3–5d | High | – | – | High | Dev/Designer |

## 🟠 HIGH — This Month (Week 3–4)
| # | Problem | Impact | Difficulty | Time | Owner |
|---|---|---|---|---|---|
| 7 | Consolidate per‑page inline CSS → one cached stylesheet | High | Med | 3–4d | Dev |
| 8 | Launch + display genuine reviews (also fixes #1) | High | Med | 5–10d | Dev/Content |
| 9 | Security headers (HSTS/CSP/XFO/nosniff/Referrer/Permissions) | Med | Med | 1–2d | Dev |
| 10 | `noindex` thin product‑tag archives | Med | Low | 1d | SEO |
| 11 | URL strategy standardisation + 301 redirect map | Med | Med | ongoing | SEO/Dev |
| 12 | Accessibility pass: contrast + focus + target size | Med | Med | 2–3d | Designer/Dev |
| 13 | Enrich Offer schema (shipping/returns/priceValidUntil) | Med | Low | 1–2d | SEO/Dev |
| 14 | Mobile mega‑menu simplification + sticky search | Med | Med | 3–5d | Designer/Dev |
| 15 | WP hardening (fingerprint/login/XML‑RPC/REST least‑priv) | Med | Med | 2d | Dev |
| 16 | Confirm no committed secrets + rotate WP app password | High | Low | 0.5d | Dev |

## 🟡 MEDIUM — Next Quarter (Month 2–3)
| # | Problem | Impact | Difficulty | Time | Owner |
|---|---|---|---|---|---|
| 17 | Full‑page + object cache + WebP + CDN | High | Med | 3–5d | Dev |
| 18 | Capacity/متراژ filters + model‑number search | Med | Med | 5–7d | Dev |
| 19 | "Last updated"/price‑freshness automation | Med | Med | 3d | Dev/Content |
| 20 | Calculator lead capture | Med | Med | 3d | Dev/CRO |
| 21 | Checkout streamlining (guest, fewer fields) | High | Med | 3–5d | Dev/CRO |
| 22 | Internal‑linking (guides→category→products by capacity) | Med | Low | ongoing | SEO/Content |
| 23 | Reduced‑motion + microinteraction polish | Low | Low | 2d | Designer |

## 🟢 NICE‑TO‑HAVE
| # | Problem | Owner |
|---|---|---|
| 24 | Unify marketing + store into one design system/tokens | Designer/Dev |
| 25 | Wishlist / product compare | Dev |
| 26 | Seasonal landing hubs (pre‑winter heating, pre‑summer cooling) | Content/SEO |
| 27 | Expert author bylines + E‑E‑A‑T enrichment | Content |
| 28 | Bing/other search‑engine + analytics expansion | SEO |

## Milestones
- **Day 30:** No schema‑policy risk · zero indexed junk URLs · mobile LCP <3s (Est.) · buy‑box live.
- **Day 60:** Lighthouse mobile ≥80 (Est.) · reviews on top 50 products · security headers · WCAG AA ≥90%.
- **Day 90:** Unified design system · clean URLs/tags · capacity filters · +20–30% conversion (Est.).
