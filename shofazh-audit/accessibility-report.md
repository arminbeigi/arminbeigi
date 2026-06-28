# ♿ Accessibility Report — shofazh.com (WCAG 2.2 AA)

> **Estimated** review: based on observed design tokens (dark‑first, muted grays), heavy motion, RTL, and custom controls. The WAF blocked an automated axe/Lighthouse a11y scan — provide allowlist/staging for a measured audit.

**Estimated compliance: ~55–62% of WCAG 2.2 AA success criteria.**

## Violation Table
| ID | SC | Level | Severity | Issue | Fix | Priority |
|---|---|---|---|---|---|---|
| A1 | 1.4.3 Contrast (Minimum) | AA | 🔴 | Muted text `#94A3B8`/`#CBD5E1` on `#070A12`/`#0A0F1C` likely <4.5:1 at small sizes | Raise muted text luminance (≥`#A9B4C2`); verify every pair ≥4.5:1 (≥3:1 for ≥24px/bold) | High |
| A2 | 1.1.1 Non‑text Content | A | 🔴 | Content/product images missing or empty `alt` | Descriptive Persian alt for every meaningful image; `alt=""` for decorative | High |
| A3 | 2.3.3 Animation from Interactions / 2.2.2 | AAA/A | 🟠 | Reveal/parallax/3D motion ignores `prefers-reduced-motion` | Wrap all motion in `@media (prefers-reduced-motion: reduce)` | High |
| A4 | 2.4.7 Focus Visible | AA | 🟠 | Custom dark buttons/links may lack a visible focus ring | High‑contrast `:focus-visible` outline (≥3:1, ≥2px) | High |
| A5 | 2.5.8 Target Size (Minimum) | AA (2.2) | 🟠 | Chapter dots / icon rails (24×2 px) and small icons <24×24 px | Min 24×24 (aim 44×44) hit area | High |
| A6 | 1.3.1 Info & Relationships | A | 🟠 | Spec tables / FAQ may be styled divs not semantic elements | Real `<table>/<th scope>`, real headings, `<dl>` where apt | Medium |
| A7 | 4.1.2 Name, Role, Value | A | 🟠 | Custom menu/accordion/buy‑box controls lack ARIA states | `role`, `aria-expanded`, `aria-controls`, `aria-label` | Medium |
| A8 | 3.3.1/3.3.2 Labels & Errors | A | 🟠 | Contact/checkout fields need programmatic labels + inline errors | `<label for>`, `aria-describedby`, `aria-invalid` | High |
| A9 | 2.1.1 Keyboard | A | 🟠 | JS/animated controls must be fully keyboard operable + skip link | Keyboard path, visible focus, `Skip to content` | High |
| A10 | 1.4.10 Reflow / 1.4.4 Resize | AA | 🟡 | Verify 320px reflow & 200% zoom with no loss/clipping | Test & fix overflow | Medium |
| A11 | 1.4.11 Non‑text Contrast | AA | 🟡 | Button/input borders & icon contrast ≥3:1 | Adjust subtle borders on dark bg | Medium |
| A12 | 2.4.4 Link Purpose | A | 🟡 | "بیشتر/اینجا" generic link text | Descriptive RTL link text | Low |
| A13 | 1.3.5 Identify Input Purpose | AA | 🟡 | Add `autocomplete`/`inputmode` to phone/name/email fields | Set attributes | Low |
| A14 | 3.2.x Consistent nav/RTL | A/AA | 🟡 | Verify RTL `dir`/logical properties, consistent component behaviour | Use CSS logical props | Low |

## Remediation Order
1. **Contrast (A1)** + **Alt text (A2)** — highest impact, lowest effort.
2. **Focus visible (A4)** + **Target size (A5)** + **Keyboard (A9)** — operability.
3. **Reduced motion (A3)** — comfort & vestibular safety.
4. **Forms (A8)** + **Semantics (A6/A7)** — for screen‑reader users.
5. Reflow/zoom/contrast‑of‑UI polish.

## Testing Protocol
- [ ] axe DevTools + Lighthouse a11y (after WAF allowlist)
- [ ] Manual keyboard‑only pass (Tab/Shift+Tab/Enter/Esc)
- [ ] Screen reader: NVDA + a Persian/RTL‑capable reader
- [ ] Contrast checker on every token pair
- [ ] 200% zoom + 320px reflow
- [ ] `prefers-reduced-motion` verification
