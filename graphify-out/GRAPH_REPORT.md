# Graph Report - .  (2026-06-29)

## Corpus Check
- Large corpus: 297 files · ~585,624 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 952 nodes · 1056 edges · 204 communities (189 shown, 15 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_jqGrid jQuery Core|jqGrid jQuery Core]]
- [[_COMMUNITY_jqGrid Grid Core Logic|jqGrid Grid Core Logic]]
- [[_COMMUNITY_Invoice Automator Messaging (RubikaPDF)|Invoice Automator Messaging (Rubika/PDF)]]
- [[_COMMUNITY_Invoice Automator Main Handler|Invoice Automator Main Handler]]
- [[_COMMUNITY_GSC Auto-Fixer|GSC Auto-Fixer]]
- [[_COMMUNITY_shofazh.com Audit Findings|shofazh.com Audit Findings]]
- [[_COMMUNITY_Kavenegar SMS Module|Kavenegar SMS Module]]
- [[_COMMUNITY_SunwaySMS Radio UI|SunwaySMS Radio UI]]
- [[_COMMUNITY_Shofazh Page-Builder Skills|Shofazh Page-Builder Skills]]
- [[_COMMUNITY_jqGrid package.json Metadata|jqGrid package.json Metadata]]
- [[_COMMUNITY_WordPress SEO Live-Fixes|WordPress SEO Live-Fixes]]
- [[_COMMUNITY_jqGrid Minified Bundle|jqGrid Minified Bundle]]
- [[_COMMUNITY_GSC Optimizer|GSC Optimizer]]
- [[_COMMUNITY_jqGrid jquery.json Metadata|jqGrid jquery.json Metadata]]
- [[_COMMUNITY_Chauffagekar Boilers & Green Plan|Chauffagekar Boilers & Green Plan]]
- [[_COMMUNITY_Clinic Landing JS|Clinic Landing JS]]
- [[_COMMUNITY_Dr Samim Clinic Landing JS|Dr Samim Clinic Landing JS]]
- [[_COMMUNITY_Bale Messenger Sender|Bale Messenger Sender]]
- [[_COMMUNITY_jqGrid Form Editing|jqGrid Form Editing]]
- [[_COMMUNITY_Manba Double-Wall Tanks|Manba Double-Wall Tanks]]
- [[_COMMUNITY_RAN25 & Semnan Energy Products|RAN25 & Semnan Energy Products]]
- [[_COMMUNITY_jqGrid Minified Form Edit|jqGrid Minified Form Edit]]
- [[_COMMUNITY_Kavenegar SMS Functions|Kavenegar SMS Functions]]
- [[_COMMUNITY_Kavenegar Jalali Date Utils|Kavenegar Jalali Date Utils]]
- [[_COMMUNITY_SunwaySMS Functions|SunwaySMS Functions]]
- [[_COMMUNITY_SunwaySMS Jalali Date Utils|SunwaySMS Jalali Date Utils]]
- [[_COMMUNITY_jqGrid Pivot|jqGrid Pivot]]
- [[_COMMUNITY_jqGrid bower Metadata|jqGrid bower Metadata]]
- [[_COMMUNITY_jqGrid jQuery UI Integration|jqGrid jQuery UI Integration]]
- [[_COMMUNITY_jqGrid Minified ARIA|jqGrid Minified ARIA]]
- [[_COMMUNITY_jqGrid Search Filter Plugin|jqGrid Search Filter Plugin]]
- [[_COMMUNITY_L24FF & Perla Pro Packages|L24FF & Perla Pro Packages]]
- [[_COMMUNITY_jqGrid ARIA Navigation|jqGrid ARIA Navigation]]
- [[_COMMUNITY_jqGrid Filter Addons|jqGrid Filter Addons]]
- [[_COMMUNITY_GSC Telegram Report|GSC Telegram Report]]
- [[_COMMUNITY_jqGrid Filter Toolbar|jqGrid Filter Toolbar]]
- [[_COMMUNITY_GSC Windsor Integration|GSC Windsor Integration]]
- [[_COMMUNITY_Small cluster 46|Small cluster 46]]
- [[_COMMUNITY_Small cluster 50|Small cluster 50]]
- [[_COMMUNITY_Small cluster 52|Small cluster 52]]
- [[_COMMUNITY_Small cluster 53|Small cluster 53]]
- [[_COMMUNITY_Small cluster 54|Small cluster 54]]
- [[_COMMUNITY_Small cluster 55|Small cluster 55]]
- [[_COMMUNITY_Small cluster 56|Small cluster 56]]
- [[_COMMUNITY_Small cluster 59|Small cluster 59]]
- [[_COMMUNITY_Small cluster 60|Small cluster 60]]
- [[_COMMUNITY_Small cluster 70|Small cluster 70]]
- [[_COMMUNITY_Small cluster 71|Small cluster 71]]
- [[_COMMUNITY_Small cluster 72|Small cluster 72]]

## God Nodes (most connected - your core abstractions)
1. `Sunwaysms` - 24 edges
2. `Sunwaysms` - 24 edges
3. `shofazh.com Enterprise Website Audit` - 20 edges
4. `call()` - 19 edges
5. `GSCWordPressMapper` - 15 edges
6. `GSCAutoFixer` - 12 edges
7. `InvoiceHandler` - 12 edges
8. `RubikaSender` - 12 edges
9. `Kavenegar` - 11 edges
10. `GSCOptimizer` - 10 edges

## Surprising Connections (you probably didn't know these)
- `WAF-Safe Split Output` --semantically_similar_to--> `WP REST API content.raw / unfiltered_html`  [INFERRED] [semantically similar]
  .claude/skills/shofazh-category-page/SKILL.md → README-product-pipeline.md
- `GitHub Secrets Setup Guide` --semantically_similar_to--> `Product Content & Publish Pipeline`  [INFERRED] [semantically similar]
  GITHUB-SECRETS-SETUP.md → README-product-pipeline.md
- `Chauffagekar Comfort 32FH2 Wall Boiler` --semantically_similar_to--> `Chauffagekar Elegant 24FX2 Wall Boiler`  [INFERRED] [semantically similar]
  comfort-32fh2-product-content.html → elegant-24fx2-product-content.html
- `Chauffagekar Confident 50 Wall Boiler` --semantically_similar_to--> `Chauffagekar Comfort 32FH2 Wall Boiler`  [INFERRED] [semantically similar]
  confident-50-product-content.html → comfort-32fh2-product-content.html
- `Chauffagekar Elegant 24FX2 Wall Boiler` --semantically_similar_to--> `Chauffagekar Confident 50 Wall Boiler`  [INFERRED] [semantically similar]
  elegant-24fx2-product-content.html → confident-50-product-content.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **GSC Auto-Fixer Automation Flow** — _github_workflows_gsc_auto_fixer_gsc_auto_fixer_workflow, gsc_optimizer_readme_gsc_optimizer, project_summary_gsc_auto_fixer_project, github_secrets_setup_github_secrets_setup, gsc_auto_fixer_setup_gsc_auto_fixer_setup [INFERRED 0.85]
- **Product Skill to WordPress Publish Pipeline** — _claude_skills_shofazh_product_page_skill_shofazh_product_page_builder, readme_product_pipeline_wp_publish_product, _github_workflows_publish_to_wordpress_publish_to_wordpress_workflow, readme_product_pipeline_wp_product_map [EXTRACTED 1.00]
- **SEO Live Fixes Tooling** — _github_workflows_seo_fixes_seo_live_fixes_workflow, _github_workflows_seo_tags_seo_empty_tag_cleanup_workflow, seo_fixes_readme_wp_seo_fixes, seo_fixes_readme_seo_live_fixes [EXTRACTED 1.00]
- **Chauffagekar Wall Boiler Product Line** — comfort_32fh2_product_content_comfort_32fh2, confident_50_product_content_confident_50, elegant_24fx2_product_content_elegant_24fx2 [INFERRED 0.85]
- **RAN25 Template Product Pages** — comfort_32fh2_product_content_comfort_32fh2, confident_50_product_content_confident_50, elegant_24fx2_product_content_elegant_24fx2, f55_product_content_f55_burner [INFERRED 0.85]
- **پکیج‌های دیواری گازی فن‌دار ۲۴ کیلوواتی** — l24ff_product_content_l24ff_package, perlapro24rsi_product_content_perla_pro_24rsi [INFERRED 0.85]
- **محصولات موتورخانه (منبع و پکیج زمینی)** — manba_dojedare_300_litri_product_content_300_litri_tank, manba_dojedare_400_product_content_400_litri_tank, package_chauffagekar_p7_product_content_p7_package [INFERRED 0.75]
- **RAN25 Product Variants** — ran25_compact_ran25, ran25_fixed_ran25, ran25_product_content_ran25 [INFERRED 0.95]
- **Heat Capacity Calculator Widgets** — shofazh_calculator_elementor_heat_capacity_calculator, shofazh_calculator_section_heat_capacity_calculator, shofazh_calculator_section_heat_capacity_concept [INFERRED 0.85]
- **Shofazh Template-Based Product Pages** — ran25_product_content_ran25, super400_product_content_super_400, semnan_energy_a7_product_content_semnan_energy_a7 [INFERRED 0.85]
- **shofazh.com Enterprise Audit (all facet reports)** — shofazh_audit_audit_report_shofazh_com_enterprise_audit, shofazh_audit_accessibility_report_accessibility_report, shofazh_audit_cro_strategy_cro_strategy, shofazh_audit_performance_optimization_plan_performance_plan, shofazh_audit_prioritized_roadmap_prioritized_roadmap, shofazh_audit_security_review_security_review, shofazh_audit_technical_seo_checklist_technical_seo_checklist, shofazh_audit_ui_ux_improvement_plan_ui_ux_improvement_plan, shofazh_audit_executive_summary_executive_summary [EXTRACTED 1.00]
- **The 6 Critical Audit Issues** — shofazh_audit_audit_report_index_bloat_soft_404, shofazh_audit_audit_report_duplicated_sitename_title_bug, shofazh_audit_audit_report_mobile_cwv_failure, shofazh_audit_audit_report_aggregaterating_without_reviews, shofazh_audit_audit_report_inconsistent_url_strategy, shofazh_audit_audit_report_weak_above_fold_conversion [EXTRACTED 1.00]
- **Roadmap Critical Week-1-2 Actions** — shofazh_audit_prioritized_roadmap_prioritized_roadmap, shofazh_audit_performance_optimization_plan_render_blocking_fonts, shofazh_audit_cro_strategy_sticky_buy_box, shofazh_audit_performance_optimization_plan_image_optimization [INFERRED 0.85]

## Communities (204 total, 15 thin omitted)

### Community 0 - "jqGrid jQuery Core"
Cohesion: 0.05
Nodes (40): cb(), db(), E(), fb(), gb(), gc(), ic(), J() (+32 more)

### Community 1 - "jqGrid Grid Core Logic"
Cohesion: 0.06
Nodes (30): agregateFunc(), buildSummaryTd(), calculation(), call(), checkUpdates(), compareData(), createData(), fillData() (+22 more)

### Community 2 - "Invoice Automator Messaging (Rubika/PDF)"
Cohesion: 0.06
Nodes (23): format_amount(), فرمت‌بندی مبلغ با جداکننده هزارگان, ارسال پیش فاکتور از طریق پیام‌رسان روبیکا  روش‌ها: 1. rubpy (کتابخانه غیررسمی) -, ارسال متن (sync wrapper), ساخت/بازیابی کلاینت روبیکا, فرمت شماره برای روبیکا, دریافت GUID کاربر از شماره تلفن, ارسال فایل به صورت async (+15 more)

### Community 3 - "Invoice Automator Main Handler"
Cohesion: 0.07
Nodes (32): FileSystemEventHandler, InvoiceHandler, load_config(), main(), process_invoice(), پردازش کامل یک فایل PDF, setup_logging(), extract_invoice_data() (+24 more)

### Community 4 - "GSC Auto-Fixer"
Cohesion: 0.07
Nodes (23): GSCAutoFixer, main(), Ask user for approval before applying (skip in CI/non-interactive), Apply approved fixes to WordPress (Yoast SEO only), Orchestrate GSC data analysis + WordPress updates with user approval, Log applied changes for audit trail, Initialize with GSC fixes data, Execute full workflow (+15 more)

### Community 5 - "shofazh.com Audit Findings"
Cohesion: 0.07
Nodes (39): shofazh.com Accessibility Report (WCAG 2.2 AA), Low Muted-Text Contrast on Dark Background, Missing/Empty Image Alt Text, Motion Ignoring prefers-reduced-motion, Target Size & Focus-Visible Deficiencies, AggregateRating Schema Without Verifiable Reviews, Dual-Axis Taxonomy (system type × brand), Duplicated Sitename Title-Tag Bug (+31 more)

### Community 6 - "Kavenegar SMS Module"
Cohesion: 0.06
Nodes (3): BMO, Kavenegar, Sunwaysms

### Community 7 - "SunwaySMS Radio UI"
Cohesion: 0.07
Nodes (4): guiinput, lastcall_radio, lastcall_radio, Sunwaysms

### Community 8 - "Shofazh Page-Builder Skills"
Cohesion: 0.11
Nodes (28): shz-cat Category Template HTML, Shofazh Category Page Builder Skill, shz-cat Design System, WAF-Safe Split Output, Heat Capacity Calculator Promo Block, Step 2b Image Prompt Handoff Gate, RAN25 Product Template, Shofazh Product Page Builder Skill (+20 more)

### Community 9 - "jqGrid package.json Metadata"
Cohesion: 0.09
Nodes (21): author, email, name, url, dependencies, grunt-cli, description, devDependencies (+13 more)

### Community 10 - "WordPress SEO Live-Fixes"
Cohesion: 0.16
Nodes (20): _get(), iter_products(), _iter_terms(), main(), _need_auth(), Enumerate product IDs with a LIGHT call (ids only, no raw content), then     yie, Light enumeration: count all published products (no content fetch)., Yield terms for a taxonomy rest_base via WP REST.     Light payload (_fields) an (+12 more)

### Community 11 - "jqGrid Minified Bundle"
Cohesion: 0.16
Nodes (13): a(), C(), D(), F(), j(), k(), m(), o() (+5 more)

### Community 12 - "GSC Optimizer"
Cohesion: 0.16
Nodes (9): GSCOptimizer, main(), صادرات توصیه‌های بهبود, تحلیل Google Search Console و ایجاد توصیه‌های بهبود SEO, بارگذاری داده‌های Search Console از فایل JSON, تحلیل query های مسائل‌دار, تولید title بهتر برای یک query, تولید meta description جذاب‌تر (+1 more)

### Community 13 - "jqGrid jquery.json Metadata"
Cohesion: 0.12
Nodes (16): author, email, name, url, bugs, dependencies, jquery, description (+8 more)

### Community 14 - "Chauffagekar Boilers & Green Plan"
Cohesion: 0.18
Nodes (16): Chauffagekar Wall Boiler Banner, Chauffagekar (Shofajkar), Worn Boiler Replacement Service, Cast Iron Heating Boiler (Super/Turbo/Superheat/Star), Chauffagekar Green Plan (Old Boiler Replacement), Shofazh.com (Chauffagekar Official Dealer), Chauffagekar Comfort 32FH2 Wall Boiler, RAN25 Product Page Template (+8 more)

### Community 15 - "Clinic Landing JS"
Cohesion: 0.14
Nodes (10): dots, goToSlide(), hamburger, navbar, navLinks, observer, particleContainer, resetAutoSlide() (+2 more)

### Community 16 - "Dr Samim Clinic Landing JS"
Cohesion: 0.14
Nodes (10): dots, goToSlide(), hamburger, navbar, navLinks, observer, particleContainer, resetAutoSlide() (+2 more)

### Community 17 - "Bale Messenger Sender"
Cohesion: 0.16
Nodes (6): BaleSender, ارسال پیش فاکتور از طریق پیام‌رسان بله استفاده از Bale Bot API (مشابه Telegram B, ارسال پیش فاکتور کامل, ساخت لینک استارت ربات با پارامتر, پیدا کردن chat_id از شماره تلفن          نکته: بله مستقیماً API جستجو با شماره ت, ارسال فایل PDF به یک چت

### Community 18 - "jqGrid Form Editing"
Cohesion: 0.19
Nodes (6): checkUpdates(), compareData(), fillData(), getFormData(), postIt(), setNulls()

### Community 19 - "Manba Double-Wall Tanks"
Cohesion: 0.20
Nodes (14): منبع دوجداره ۳۰۰ لیتری, آبگرم بهداشتی کویلی, منبع آبگرم دوجداره, موتورخانه ساختمان, عایق پلی‌اورتان, شوفاژ دات کام (Shofazh.com), ورق فولادی ST37, سئو منبع دوجداره ۳۰۰ لیتری (+6 more)

### Community 20 - "RAN25 & Semnan Energy Products"
Cohesion: 0.20
Nodes (14): RAN25 Gas Burner (Compact Variant), RAN25 Gas Burner (Fixed Variant), Iran Radiator Brand, RAN25 Gas Burner (Full Content), Azad Alborz Circulator Pump, Semnan Energy (Navid Motor), Semnan Energy A7 Circulator Pump, Circulator Pump SEO Keyphrase Theme (+6 more)

### Community 21 - "jqGrid Minified Form Edit"
Cohesion: 0.21
Nodes (5): C(), F(), G(), I(), k()

### Community 22 - "Kavenegar SMS Functions"
Cohesion: 0.36
Nodes (7): sunwaysms_ext_last_send(), sunwaysms_ext_spec_content(), sunwaysms_get(), sunwaysms_get_config(), sunwaysms_numlocal_last_send(), sunwaysms_submit_send_sms(), sunwaysms_tolog()

### Community 23 - "Kavenegar Jalali Date Utils"
Cohesion: 0.49
Nodes (9): jalali_to_gregorian(), jgetdate(), jstrftime(), jsunway_mktime(), sunway_gregorian_to_jalali(), sunway_jcheckdate(), sunway_jdate(), sunway_jdate_words() (+1 more)

### Community 25 - "SunwaySMS Functions"
Cohesion: 0.36
Nodes (7): sunwaysms_ext_last_send(), sunwaysms_ext_spec_content(), sunwaysms_get(), sunwaysms_get_config(), sunwaysms_numlocal_last_send(), sunwaysms_submit_send_sms(), sunwaysms_tolog()

### Community 26 - "SunwaySMS Jalali Date Utils"
Cohesion: 0.49
Nodes (9): jalali_to_gregorian(), jgetdate(), jstrftime(), jsunway_mktime(), sunway_gregorian_to_jalali(), sunway_jcheckdate(), sunway_jdate(), sunway_jdate_words() (+1 more)

### Community 29 - "jqGrid bower Metadata"
Cohesion: 0.29
Nodes (6): dependencies, jquery, jquery-ui, license, main, name

### Community 31 - "jqGrid Minified ARIA"
Cohesion: 0.43
Nodes (4): n(), o(), r(), s()

### Community 33 - "L24FF & Perla Pro Packages"
Cohesion: 0.29
Nodes (7): دودکش هم‌محور (Coaxial Flue), پکیج دیواری گازی فن‌دار, ایران رادیاتور (Iran Radiator), پکیج دیواری ایران رادیاتور L24FF, بوتان (گروه صنعتی بوتان), دو مبدل حرارتی (Dual Heat Exchanger), پکیج دیواری بوتان پرلا پرو 24RSi

### Community 34 - "jqGrid ARIA Navigation"
Cohesion: 0.47
Nodes (3): getNextCell(), getNextVisibleCell(), isValidCell()

### Community 35 - "jqGrid Filter Addons"
Cohesion: 0.47
Nodes (3): hideFilter(), resetFilters(), searchFilters()

### Community 36 - "GSC Telegram Report"
Cohesion: 0.60
Nodes (4): build_message(), _fmt_change(), main(), یک خط تغییر: اگر مقدار قبلی موجود باشد قبل ← بعد، وگرنه فقط مقدار جدید.

### Community 43 - "GSC Windsor Integration"
Cohesion: 0.67
Nodes (3): build_fixes(), main(), توصیه‌های اصلاح را با URL واقعی صفحات WordPress تولید می‌کند.      نکته: کوئری‌ه

### Community 53 - "Small cluster 53"
Cohesion: 1.00
Nodes (3): Heat Capacity Calculator (Elementor Widget), Heat Capacity Calculator (Section Widget), Boiler Heat Capacity Calculation

## Knowledge Gaps
- **100 isolated node(s):** `navbar`, `scrollTopBtn`, `hamburger`, `navLinks`, `slides` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InvoiceHandler` connect `Invoice Automator Main Handler` to `Bale Messenger Sender`, `Invoice Automator Messaging (Rubika/PDF)`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `RubikaSender` connect `Invoice Automator Messaging (Rubika/PDF)` to `Invoice Automator Main Handler`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `shofazh.com Enterprise Website Audit` (e.g. with `shofazh.com 3D Cinematic Product Landing` and `shofazh.com Audit Executive Summary`) actually correct?**
  _`shofazh.com Enterprise Website Audit` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `navbar`, `scrollTopBtn`, `hamburger` to the rest of the system?**
  _175 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `jqGrid jQuery Core` be split into smaller, more focused modules?**
  _Cohesion score 0.051923076923076926 - nodes in this community are weakly interconnected._
- **Should `jqGrid Grid Core Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.055051421657592255 - nodes in this community are weakly interconnected._
- **Should `Invoice Automator Messaging (Rubika/PDF)` be split into smaller, more focused modules?**
  _Cohesion score 0.05939716312056738 - nodes in this community are weakly interconnected._