# 🔐 Security Review — shofazh.com

> **Estimated** review (WAF blocked direct header probing). The aggressive WAF/firewall (returns 503/TLS‑reset to datacenter & non‑Iranian IPs) is itself a strong positive control. Findings below are best‑practice hardening for a WordPress + WooCommerce stack with a GitHub Actions → WP REST publishing pipeline.

## Score: 72/100 (B‑, Estimated)

## 1. Transport & Headers
| Control | Status (Est.) | Action |
|---|---|---|
| HTTPS enforced | ✅ | Confirm 301 http→https sitewide |
| HSTS | ⚠️ Verify | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| CSP | 🔴 Missing (likely) | Add `Content-Security-Policy` with nonces/hashes (needed because product content uses inline `<style>`/`<script>`) |
| X-Content-Type-Options | 🟠 | `nosniff` |
| X-Frame-Options / frame-ancestors | 🟠 | `SAMEORIGIN` (anti‑clickjacking) |
| Referrer-Policy | 🟠 | `strict-origin-when-cross-origin` |
| Permissions-Policy | 🟠 | Disable unused: `geolocation=(), camera=(), microphone=()` |
| Cross-Origin-* (COOP/COEP) | 🟡 | Set as compatible |

## 2. WordPress / WooCommerce Hardening
| Item | Risk | Action |
|---|---|---|
| Version fingerprinting | 🟠 | Remove `<meta name="generator">`, hide `readme.html`, strip version query strings |
| User enumeration | 🟠 | Block `/?author=N` and `/wp-json/wp/v2/users` for anon |
| Login brute force | 🟠 | Rate‑limit/2FA on `wp-login.php`; rename/limit login; CAPTCHA |
| XML‑RPC | 🟠 | Disable `xmlrpc.php` if unused (pingback DDoS vector) |
| File editing | 🟠 | `define('DISALLOW_FILE_EDIT', true);` |
| Directory listing | 🟡 | `Options -Indexes` |
| Plugin/theme updates | 🟠 | Keep WooCommerce, SEO, cache plugins patched; remove unused |
| `wp-config` perms | 🟠 | `600`, keys rotated, salts fresh |
| DB prefix | 🟡 | Non‑default table prefix |

## 3. Publishing Pipeline (GitHub Actions → WP REST)
| Item | Risk | Action |
|---|---|---|
| WP Application Password in GitHub Secret | 🟠 | Least‑privilege WP user; **rotate on any team change**; never log it |
| `unfiltered_html` capability | 🟠 | Required for inline `<style>` — restrict to the single publishing admin; consider sanitising/whitelisting allowed tags |
| REST endpoint exposure | 🟠 | Restrict `/wp-json/wc/v3/*` by role/IP; disable anon write |
| Secret in repo | 🔴 if present | Confirm no credentials are committed; scan history; use GitHub secret scanning |
| Workflow permissions | 🟠 | `permissions: contents: read`; pin action SHAs |

## 4. Application‑Layer
| Item | Action |
|---|---|
| XSS | Sanitise/escape all user input (reviews, contact, search); strict output encoding; CSP defense‑in‑depth |
| CSRF | Ensure WP nonces on all state‑changing forms; `SameSite` cookies |
| Cookies | `Secure; HttpOnly; SameSite=Lax/Strict` on session/auth |
| Mixed content | Audit for `http://` assets/embeds |
| File uploads | Validate type/size; store outside web root or restrict execution |
| Payment | Confirm PCI‑compliant Iranian gateway, no card data on‑site |

## 5. Monitoring & Recovery
- [ ] Off‑site automated backups (daily) + tested restore.
- [ ] Server + WAF logging; alert on spikes/`wp-login` floods.
- [ ] Malware/integrity scanning (Wordfence/Sucuri‑class).
- [ ] Allowlist verified Googlebot/Bingbot so security ≠ deindexing.

## Priority Order
1. 🔴 Confirm no committed secrets; rotate `WP_APP_PASS`; enable secret scanning.
2. 🟠 Ship security headers (HSTS, CSP, XFO, nosniff, Referrer, Permissions).
3. 🟠 WP hardening (fingerprint, login, XML‑RPC, file‑edit).
4. 🟠 Lock down REST + pipeline least‑privilege.
5. 🟡 Backups, monitoring, mixed‑content sweep.
