# ⚡ Performance Optimization Plan — shofazh.com

> All current metrics are **Estimated** — the WAF blocks synthetic Lighthouse/CrUX measurement. Provide an IP allowlist or staging URL to replace these with measured values.

## Estimated Baseline (mobile, 4G)
| Metric | Estimated Now | Target | Status |
|---|---|---|---|
| LCP | 3.8–5.5 s | ≤2.5 s | 🔴 |
| INP | 250–450 ms | ≤200 ms | 🟠 |
| CLS | 0.10–0.25 | ≤0.1 | 🟠 |
| FCP | 2.2–3.2 s | ≤1.8 s | 🟠 |
| TTFB | 0.6–1.4 s | ≤0.8 s | 🟡 |
| Lighthouse (mobile) | 45–60 | ≥90 | 🔴 |

## Root Causes (observed in source)
1. **Render‑blocking Google Fonts** — Vazirmatn (7 weights) + Outfit (7 weights) loaded from `fonts.googleapis.com`.
2. **Heavy per‑page inline `<style>`** — animation/gradient CSS shipped inside every product's `content.raw` (uncacheable, repeated).
3. **Per‑page reveal JS** (IntersectionObserver, parallax, 3D experiments) — main‑thread cost → INP.
4. **Images** — no `loading="lazy"`, no guaranteed modern format, missing dimensions → bytes + CLS.
5. **No evident edge/page cache or image CDN.**

## Action Plan (ordered by ROI)

### 🔴 Phase 1 — Critical (Week 1–2)
| # | Action | How | Est. Gain |
|---|---|---|---|
| 1 | Self‑host & subset fonts | Download Vazirmatn/Outfit `.woff2`, subset to fa+latin, keep 2–3 weights, `font-display:swap`, `<link rel=preload>` the primary weight | −0.8 to −1.5 s LCP, removes 3rd‑party origin |
| 2 | Image dimensions + lazy + format | Add `width/height`, `loading="lazy"` below fold, `fetchpriority="high"` on hero, convert to WebP | −0.1 CLS, −0.5 s LCP |
| 3 | Extract inline CSS | Move shared `.anim/.d1…`, gradients, buttons into ONE enqueued, versioned, cached stylesheet | −0.5 to −1 s, cache reuse across pages |

### 🟠 Phase 2 — High (Week 3–4)
| # | Action | How |
|---|---|---|
| 4 | Full‑page + object cache | LiteSpeed Cache / W3TC + Redis/object cache |
| 5 | Defer non‑critical JS | `defer`/`async`, lazy‑init below‑fold animations, `content-visibility:auto` on long sections |
| 6 | Reduce motion cost | Gate animations behind `prefers-reduced-motion`; lighten on mobile |
| 7 | Image CDN / optimization | CDN + automatic WebP/AVIF + responsive `srcset` |

### 🟡 Phase 3 — Medium (Month 2–3)
| # | Action |
|---|---|
| 8 | Critical‑CSS inlining (only above‑fold), rest async |
| 9 | Preload key requests; `dns-prefetch`/`preconnect` only what remains |
| 10 | Trim DOM size on rich product pages (fewer animation wrappers) |
| 11 | HTTP/2+ , Brotli/gzip compression, long‑cache static assets (`Cache-Control: max-age=31536000, immutable`) |

## Estimated End‑State
| Metric | After |
|---|---|
| LCP (mobile) | ~2.3 s (🟢) |
| INP | <200 ms (🟢) |
| CLS | <0.1 (🟢) |
| Lighthouse (mobile) | ~80–88 (🟢) |

## Verification Checklist
- [ ] PageSpeed Insights / CrUX field data (after WAF allowlist)
- [ ] WebPageТest filmstrip (LCP element)
- [ ] Coverage tab: unused CSS/JS < 30%
- [ ] No third‑party render‑blocking requests
- [ ] All images WebP + sized + lazy
