# 🎨 UI/UX Improvement Plan — shofazh.com

**UI: 76/100 (B) · UX: 69/100 (C+).** Modern, distinctive design language ("fire & ice" = heating/cooling) with strong IA; friction concentrated in the product‑page conversion path, mobile menu, trust placement, and a **gap between premium marketing pages and the standard store theme**.

## A. Design Foundation (keep & systematise)
- ✅ Palette: `--fire #F97316`, `--ice #06B6D4`, `--brand #E11D48`, dark `#070A12` — ownable & on‑strategy.
- ✅ Type: Vazirmatn (fa) + Outfit (latin), fluid `clamp()` scale.
- ✅ Tokens: radius 12px, `--maxw:1320px`, layered shadows, glassmorphism.
- ⚠️ **Risk:** two visual worlds (Three.js marketing vs WooCommerce store). **Unify.**

## B. UX Issues & Redesigns
| # | Area | Problem | Redesign | Priority |
|---|---|---|---|---|
| 1 | Product above‑fold | Scattered price/stock/CTA | Sticky buy‑box (see cro-strategy.md) | 🔴 |
| 2 | Mobile mega‑menu | Deep brand×category hard to thumb | Two‑tier accordion + sticky search + popular shortcuts | 🟠 |
| 3 | Search | Verify model‑number + typo tolerance | Autosuggest, synonyms (L24FF/28FX2), instant results | 🟠 |
| 4 | Trust placement | Dealer/warranty not at CTA | Badges in buy‑box & cart | 🟠 |
| 5 | Filters/sorting | Capacity is #1 buyer spec | Add ظرفیت/متراژ range + brand + price filters | 🟡 |
| 6 | Motion cost | Animations delay perception on mobile | `prefers-reduced-motion`; lighten on mobile | 🟡 |
| 7 | Empty/loading/error states | Verify helpful states | Skeletons, helpful 404 (search + popular categories) | 🟡 |
| 8 | Calculator integration | Underused conversion asset | Surface on category/product; "not sure? calculate" | 🟠 |

## C. UI Component Polish
| Component | Action |
|---|---|
| Buttons | Keep variants; add visible `:focus-visible` + ≥44px touch |
| Inputs | Ensure dark‑theme contrast, labels, error states |
| Cards | Consistent spec/price/CTA layout; capacity badge |
| Tables | Semantic spec tables, zebra rows, sticky header on mobile |
| Badges | Standardise warranty/dealer/stock badge set |
| Text | Raise muted‑text contrast for AA |

## D. Information Architecture
- ✅ Keep dual‑axis (system × brand) taxonomy + breadcrumbs.
- 🟠 `noindex` thin tags; add "browse by capacity/متراژ" entry path.
- 🟡 Persistent "ماشین‌حساب ظرفیت" entry in nav.

## E. Mobile‑First Priorities
1. Sticky bottom bar: price · add‑to‑cart · 📞 call · 💬 WhatsApp.
2. Enlarge all tap targets ≥44px.
3. Faster LCP (font/CSS fixes) → perceived quality.
4. Simplified menu + sticky search.

## F. Unify into ONE Design System
- Extract tokens (color/space/type/radius/shadow) to a shared JSON + single CSS.
- Build documented components (buy‑box, card, badge, table, button, input).
- Make the WooCommerce theme consume the same system as the marketing pages.
- Outcome: store feels as premium as the campaigns; perf + consistency improve together.

## Sprint Sequencing
- **Sprint 1 (2 wk):** Buy‑box + click‑to‑call + contrast/focus/targets + image fixes.
- **Sprint 2 (2 wk):** Mobile menu/search, filters, reviews display, calculator surfacing.
- **Sprint 3 (4 wk):** Design‑system unification + tokens + component library.
