<?php
/**
 * Plugin Name: Yara Landing Page
 * Description: نمایش صفحه‌ی فروش یارا روی صفحه‌ی اصلی سایت (دور زدن قالب پیش‌فرض).
 * Version: 1.1.0
 * Author: Yara
 */
if (!defined('ABSPATH')) exit;

add_action('template_redirect', function () {
    if (is_admin() || is_feed() || is_search()) return;
    if (!(is_front_page() || is_home())) return;
    if (isset($_GET['wp'])) return;
    $html = yara_landing_html();
    $map = [
        '{{YARA_BASIC_URL}}' => yara_cart_url('YARA-BASIC'),
        '{{YARA_PRO_URL}}'   => yara_cart_url('YARA-PRO'),
        '{{YARA_BIZ_URL}}'   => yara_cart_url('YARA-BIZ'),
    ];
    $html = strtr($html, $map);
    status_header(200);
    header('Content-Type: text/html; charset=utf-8');
    echo $html;
    exit;
});

function yara_cart_url($sku) {
    if (function_exists('wc_get_product_id_by_sku')) {
        $id = wc_get_product_id_by_sku($sku);
        if ($id) return esc_url(home_url('/?add-to-cart=' . $id));
    }
    return esc_url(home_url('/?post_type=product'));
}

function yara_landing_html() {
    return <<<'YARA_LANDING_HTML'
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>یارا | دستیار هوشمند کسب‌وکار — ارسال خودکار پیش‌فاکتور</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='23.5' fill='%237C4DFF'/%3E%3Crect x='26' y='23.9' width='48' height='49' rx='14.4' fill='%23fff'/%3E%3Cpolygon points='37.5,70.9 48.1,70.9 37.5,83' fill='%23fff'/%3E%3Cpolygon points='52.6,34.8 57.5,44.3 67,49.2 57.5,54.1 52.6,63.6 47.7,54.1 38.2,49.2 47.7,44.3' fill='%2322D3B4'/%3E%3C/svg%3E">
<meta name="description" content="یارا پیش‌فاکتورها و پیام‌های کسب‌وکارت را خودکار و چندکاناله (پیامک، واتساپ، بله، روبیکا) برای مشتری می‌فرستد. بدون کار دستی، بدون فراموشی.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
:root{
  --indigo:#5B6CFF; --violet:#7C4DFF; --teal:#22D3B4;
  --dark:#0F1117; --card:#161922; --line:#252a3a;
  --text:#E6E8EF; --dim:#9AA0B4; --grad:linear-gradient(135deg,#5B6CFF,#7C4DFF);
  --grad-teal:linear-gradient(135deg,#22D3B4,#0EA5E9);
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:'Vazirmatn',Tahoma,sans-serif;background:var(--dark);color:var(--text);line-height:1.9;overflow-x:hidden;
  /* قطع انتخاب در پس‌زمینه‌های دکوری ولی نگه‌داشتن آن در متن واقعی */
}
a{color:inherit;text-decoration:none;-webkit-touch-callout:none}
img,svg{max-width:100%;height:auto;display:block}
.wrap{max-width:1160px;margin:0 auto;padding:0 22px}
@media(max-width:560px){.wrap{padding:0 16px}}

/* دکمه‌ها — micro-interaction روی press و hover */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;cursor:pointer;
  font-family:inherit;font-weight:700;border-radius:14px;padding:14px 30px;font-size:1rem;
  transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s,background .25s;
  background:var(--grad);color:#fff;position:relative;overflow:hidden;min-height:48px}
.btn::before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.25),transparent 70%);
  transform:translateX(-100%);transition:transform .6s}
.btn:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(91,108,255,.4)}
.btn:hover::before{transform:translateX(100%)}
.btn:active{transform:translateY(0) scale(.98)}
.btn.ghost{background:transparent;border:1.5px solid var(--line);color:var(--text)}
.btn.ghost:hover{border-color:var(--indigo);box-shadow:0 0 0 4px rgba(91,108,255,.1)}
.btn.ghost::before{display:none}
.tag{display:inline-block;background:rgba(91,108,255,.14);color:#aeb8ff;border:1px solid rgba(91,108,255,.3);
  padding:6px 16px;border-radius:30px;font-size:.85rem;font-weight:500;
  animation:tagPulse 2.4s ease-in-out infinite}
@keyframes tagPulse{
  0%,100%{box-shadow:0 0 0 0 rgba(91,108,255,.35)}
  50%{box-shadow:0 0 0 10px rgba(91,108,255,0)}
}

/* Header — منوی موبایل */
header{position:sticky;top:0;z-index:50;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  background:rgba(15,17,23,.72);border-bottom:1px solid var(--line);transition:background .3s}
header.scrolled{background:rgba(15,17,23,.92);box-shadow:0 4px 20px rgba(0,0,0,.3)}
.nav{display:flex;align-items:center;justify-content:space-between;height:70px;gap:12px}
.logo{display:flex;align-items:center;gap:12px;font-weight:900;font-size:1.45rem}
.logo .mark{width:42px;height:42px;transition:transform .4s cubic-bezier(.2,.7,.2,1)}
.logo:hover .mark{transform:rotate(-8deg) scale(1.08)}
nav.links{display:flex;gap:28px}
nav.links a{color:var(--dim);font-size:.95rem;transition:color .2s;position:relative;padding:6px 0}
nav.links a::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;
  background:var(--grad);transform:scaleX(0);transform-origin:center;transition:transform .3s}
nav.links a:hover{color:var(--text)}
nav.links a:hover::after{transform:scaleX(1)}
.menu-btn{display:none;background:transparent;border:0;color:var(--text);cursor:pointer;padding:10px;
  border-radius:10px;transition:background .2s}
.menu-btn:hover{background:rgba(255,255,255,.06)}
.menu-btn svg{width:26px;height:26px}
.header-cta{padding:10px 22px;font-size:.95rem}
.header-actions{display:flex;align-items:center;gap:10px}
.header-login{padding:10px 18px}
@media(max-width:820px){
  nav.links{position:fixed;top:70px;right:0;left:0;flex-direction:column;background:rgba(15,17,23,.98);
    backdrop-filter:blur(14px);padding:14px 22px 22px;gap:0;border-bottom:1px solid var(--line);
    transform:translateY(-110%);transition:transform .35s cubic-bezier(.2,.7,.2,1);
    box-shadow:0 16px 40px rgba(0,0,0,.5)}
  nav.links.open{transform:translateY(0)}
  nav.links a{padding:16px 4px;border-bottom:1px solid var(--line);font-size:1.05rem}
  nav.links a:last-child{border-bottom:0}
  nav.links .btn{display:inline-flex !important;margin:14px 0 4px;border-bottom:0}
  .menu-btn{display:flex;align-items:center}
}
@media(max-width:480px){
  .header-cta{display:none}
  .logo{font-size:1.25rem}
  .logo .mark{width:36px;height:36px}
}

/* Hero */
.hero{position:relative;padding:90px 0 70px;text-align:center;overflow:hidden}
.hero::before,.hero::after{content:"";position:absolute;width:600px;height:600px;border-radius:50%;
  filter:blur(20px);will-change:transform;pointer-events:none}
.hero::before{top:-200px;right:-150px;background:radial-gradient(circle,rgba(124,77,255,.28),transparent 60%);
  animation:floatA 14s ease-in-out infinite}
.hero::after{bottom:-250px;left:-150px;background:radial-gradient(circle,rgba(34,211,180,.18),transparent 60%);
  animation:floatB 16s ease-in-out infinite}
@keyframes floatA{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,30px)}}
@keyframes floatB{0%,100%{transform:translate(0,0)}50%{transform:translate(50px,-30px)}}
.hero h1{font-size:clamp(2rem,5.5vw,3.1rem);font-weight:900;line-height:1.4;margin:20px auto;max-width:820px;position:relative}
.hero h1 .hl{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;
  background-size:200% 100%;animation:gradShift 4s ease-in-out infinite}
@keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.hero p.sub{font-size:clamp(1.05rem,2.5vw,1.25rem);color:var(--dim);max-width:640px;margin:0 auto 32px;position:relative}
.hero .cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;position:relative}
.hero .note{margin-top:16px;color:var(--dim);font-size:.9rem;position:relative}
@media(max-width:560px){
  .hero{padding:60px 0 50px}
  .hero .cta .btn{flex:1 1 100%;max-width:340px}
}

/* App mockup — pseudo-screenshot زنده */
.mock{margin:54px auto 0;max-width:760px;position:relative;border-radius:20px;overflow:hidden;
  border:1px solid var(--line);box-shadow:0 30px 80px rgba(0,0,0,.5);will-change:transform}
.mock .bar{height:42px;background:#11141d;display:flex;align-items:center;gap:8px;padding:0 16px}
.mock .bar i{width:12px;height:12px;border-radius:50%;display:inline-block}
.mock .body{background:linear-gradient(180deg,#1c2030,#11141d);padding:34px;display:grid;gap:14px}
.mock .row{height:14px;border-radius:8px;background:#2a3147;position:relative;overflow:hidden}
.mock .row::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);
  transform:translateX(-100%);animation:shimmer 2.8s infinite}
.mock .row.s{width:50%}.mock .row.m{width:75%}
.mock .row:nth-child(2)::after{animation-delay:.4s}
.mock .row:nth-child(3)::after{animation-delay:.8s}
@keyframes shimmer{100%{transform:translateX(100%)}}
.mock .send{height:48px;border-radius:12px;background:linear-gradient(90deg,#22c55e,#16a34a);
  display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;margin-top:8px;
  box-shadow:0 0 0 0 rgba(34,197,94,.5);animation:sendPulse 2.4s ease-out infinite}
@keyframes sendPulse{
  0%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}
  70%{box-shadow:0 0 0 20px rgba(34,197,94,0)}
  100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}
}
@media(max-width:560px){.mock .body{padding:22px 18px}}

/* Trust — اسلایدر افقی روی موبایل */
.trust{padding:34px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#11141d}
.chips{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.chip{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);
  padding:10px 18px;border-radius:14px;color:var(--dim);font-size:.95rem;transition:transform .25s,border-color .25s;
  white-space:nowrap}
.chip:hover{transform:translateY(-3px);border-color:var(--indigo);color:var(--text)}
@media(max-width:560px){
  .chips{flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;padding:0 16px;
    scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .chips::-webkit-scrollbar{display:none}
  .chip{scroll-snap-align:start;flex-shrink:0}
}

/* Sections */
section.block{padding:80px 0}
@media(max-width:640px){section.block{padding:54px 0}}
.center{text-align:center;max-width:680px;margin:0 auto 50px}
.center h2{font-size:clamp(1.55rem,4.5vw,2.2rem);font-weight:900;margin-bottom:12px;line-height:1.4}
.center p{color:var(--dim);font-size:clamp(1rem,2.4vw,1.1rem)}

/* Features */
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media(max-width:880px){.grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.grid{grid-template-columns:1fr;gap:14px}}
.feat{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:28px;
  transition:transform .35s cubic-bezier(.2,.7,.2,1),border-color .35s,box-shadow .35s;
  position:relative;overflow:hidden}
.feat::before{content:"";position:absolute;inset:0;background:radial-gradient(400px circle at var(--mx,50%) var(--my,0%),
  rgba(91,108,255,.12),transparent 50%);opacity:0;transition:opacity .4s;pointer-events:none}
.feat:hover{transform:translateY(-6px);border-color:var(--indigo);box-shadow:0 18px 40px rgba(0,0,0,.4)}
.feat:hover::before{opacity:1}
.feat .ico{width:54px;height:54px;border-radius:14px;background:rgba(91,108,255,.14);
  display:flex;align-items:center;justify-content:center;font-size:1.6rem;margin-bottom:16px;
  transition:transform .35s}
.feat:hover .ico{transform:scale(1.1) rotate(-6deg)}
.feat h3{font-size:1.2rem;margin-bottom:8px}
.feat p{color:var(--dim);font-size:.97rem}
@media(max-width:560px){.feat{padding:22px}}

/* Steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;counter-reset:s}
@media(max-width:760px){.steps{grid-template-columns:1fr;gap:16px}}
.step{position:relative;background:var(--card);border:1px solid var(--line);border-radius:18px;
  padding:30px 26px;transition:transform .3s,border-color .3s}
.step:hover{transform:translateY(-4px);border-color:var(--indigo)}
.step .n{counter-increment:s;width:44px;height:44px;border-radius:50%;background:var(--grad);color:#fff;
  display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.2rem;margin-bottom:14px;
  box-shadow:0 8px 22px rgba(91,108,255,.4)}
.step .n::before{content:counter(s)}
@media(max-width:560px){.step{padding:24px 20px}}

/* Pricing */
.plans{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-items:stretch}
@media(max-width:880px){.plans{grid-template-columns:1fr;max-width:420px;margin:0 auto;gap:16px}}
.plan{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:34px 28px;
  display:flex;flex-direction:column;transition:transform .3s,border-color .3s,box-shadow .3s}
.plan:hover{transform:translateY(-5px);border-color:var(--indigo);box-shadow:0 18px 50px rgba(0,0,0,.4)}
.plan.pop{border:2px solid var(--indigo);position:relative;box-shadow:0 20px 50px rgba(91,108,255,.25);
  background:linear-gradient(180deg,rgba(91,108,255,.06),transparent),var(--card)}
@media(min-width:881px){.plan.pop{transform:scale(1.04)}}
.plan.pop .badge{position:absolute;top:-14px;right:24px;background:var(--grad);color:#fff;
  padding:6px 18px;border-radius:20px;font-size:.8rem;font-weight:700;
  box-shadow:0 8px 20px rgba(91,108,255,.45)}
.plan h3{font-size:1.3rem}
.plan .price{font-size:2.1rem;font-weight:900;margin:14px 0 2px}
.plan .price span{font-size:1rem;color:var(--dim);font-weight:400}
.plan ul{list-style:none;margin:20px 0;display:grid;gap:12px;flex:1}
.plan li{display:flex;gap:10px;color:var(--dim);align-items:flex-start}
.plan li::before{content:"✓";color:var(--teal);font-weight:900;flex-shrink:0}
.plan .btn{justify-content:center;margin-top:auto}
@media(max-width:560px){.plan{padding:28px 22px}}

/* FAQ */
.faq{max-width:760px;margin:0 auto}
.q{background:var(--card);border:1px solid var(--line);border-radius:14px;margin-bottom:12px;overflow:hidden;
  transition:border-color .25s}
.q:hover{border-color:rgba(91,108,255,.5)}
.q summary{cursor:pointer;padding:20px 24px;font-weight:700;list-style:none;display:flex;
  justify-content:space-between;align-items:center;gap:12px;user-select:none}
.q summary::-webkit-details-marker{display:none}
.q summary::after{content:"+";color:var(--indigo);font-size:1.6rem;font-weight:400;line-height:1;
  transition:transform .3s;flex-shrink:0;width:24px;text-align:center}
.q[open] summary::after{content:"−";transform:rotate(180deg)}
.q .a{padding:0 24px 20px;color:var(--dim);animation:fadeDown .35s ease-out}
@keyframes fadeDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@media(max-width:560px){.q summary{padding:16px 18px;font-size:.97rem}.q .a{padding:0 18px 16px}}

/* CTA */
.final{margin:30px auto 0;background:var(--grad);border-radius:26px;padding:60px 30px;text-align:center;
  position:relative;overflow:hidden}
.final::before{content:"";position:absolute;top:-50%;right:-20%;width:60%;height:200%;
  background:radial-gradient(ellipse,rgba(255,255,255,.18),transparent 60%);animation:floatA 12s ease-in-out infinite}
.final h2{font-size:clamp(1.55rem,4.5vw,2.2rem);font-weight:900;margin-bottom:12px;position:relative}
.final p{opacity:.92;margin-bottom:26px;font-size:clamp(1rem,2.4vw,1.1rem);position:relative}
.final .btn{background:#fff;color:var(--violet);position:relative}
.final .btn:hover{box-shadow:0 14px 30px rgba(0,0,0,.3)}
@media(max-width:560px){.final{padding:48px 24px;border-radius:20px}}

footer{padding:40px 0;border-top:1px solid var(--line);color:var(--dim);text-align:center;font-size:.9rem;margin-top:70px}
@media(max-width:560px){footer{padding:28px 0;margin-top:40px;font-size:.85rem}}

/* انیمیشن ظاهرشدن هنگام اسکرول — با تأخیر زنجیره‌ای */
.reveal{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
.reveal.in{opacity:1;transform:none}
.reveal-left{transform:translateX(-30px)}
.reveal-left.in{transform:none}
.reveal-right{transform:translateX(30px)}
.reveal-right.in{transform:none}

/* احترام به prefers-reduced-motion */
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;
    transition-duration:.01ms !important;scroll-behavior:auto !important}
  .reveal,.reveal-left,.reveal-right{opacity:1 !important;transform:none !important}
}
</style>
</head>
<body>

<!-- لوگوی SVG (نشانه) به‌صورت inline -->
<svg width="0" height="0" style="position:absolute"><defs>
  <linearGradient id="kg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#5B6CFF"/><stop offset="1" stop-color="#7C4DFF"/>
  </linearGradient></defs></svg>

<header>
  <div class="wrap nav">
    <div class="logo">
      <svg class="mark" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="23.5" fill="url(#kg)"/>
        <!-- حباب گفتگو + دنباله -->
        <rect x="26" y="23.9" width="48" height="49" rx="14.4" fill="#fff"/>
        <polygon points="37.5,70.9 48.1,70.9 37.5,83" fill="#fff"/>
        <!-- جرقه‌ی اصلی فیروزه‌ای -->
        <polygon points="52.6,34.8 57.5,44.3 67,49.2 57.5,54.1 52.6,63.6 47.7,54.1 38.2,49.2 47.7,44.3" fill="#22D3B4"/>
        <!-- جرقه‌ی کوچک indigo -->
        <polygon points="41.1,33.5 43.1,37.5 47.1,39.5 43.1,41.6 41.1,45.6 39,41.6 35,39.5 39,37.5" fill="#5B6CFF"/>
      </svg>
      <span>یارا</span>
    </div>
    <nav class="links" id="navLinks">
      <a href="#features">امکانات</a>
      <a href="#how">چطور کار می‌کند</a>
      <a href="#pricing">قیمت‌ها</a>
      <a href="#faq">سؤالات</a>
      <a href="/my-account/">ورود / ثبت‌نام</a>
      <a href="#pricing" class="btn" style="margin-top:10px;display:none">شروع رایگان</a>
    </nav>
    <div class="header-actions">
      <a href="/my-account/" class="btn ghost header-cta header-login">ورود</a>
      <a href="#pricing" class="btn header-cta">شروع رایگان</a>
    </div>
    <button class="menu-btn" id="menuBtn" aria-label="منوی ناوبری" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M4 7h16M4 12h16M4 17h16" id="menuIcon"/>
      </svg>
    </button>
  </div>
</header>

<!-- HERO -->
<section class="hero">
  <div class="wrap">
    <span class="tag">دستیار هوشمند کسب‌وکار شما</span>
    <h1>پیش‌فاکتورهایت را در <span class="hl">یک کلیک</span>،<br>همه‌جا بفرست.</h1>
    <p class="sub">یارا فاکتور و پیام مشتری را خودکار و چندکاناله — پیامک، واتساپ، بله و روبیکا — می‌فرستد. بدون کار دستی، بدون فراموشی.</p>
    <div class="cta">
      <a href="#pricing" class="btn">شروع تست رایگان ۷ روزه</a>
      <a href="#how" class="btn ghost">▶ تماشای دمو</a>
    </div>
    <div class="note">بدون نیاز به کارت بانکی برای تست · نصب در کمتر از ۲ دقیقه</div>

    <div class="mock reveal">
      <div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
      <div class="body">
        <div class="row m"></div><div class="row s"></div>
        <div class="row"></div><div class="row m"></div>
        <div class="send">🚀 شروع ارسال</div>
      </div>
    </div>
  </div>
</section>

<!-- TRUST -->
<div class="trust"><div class="wrap chips">
  <div class="chip">📱 پیامک</div><div class="chip">🟢 واتساپ</div>
  <div class="chip">🔵 بله</div><div class="chip">🟣 روبیکا</div>
  <div class="chip">🌐 وردپرس</div><div class="chip">🔒 امن و آفلاین</div>
</div></div>

<!-- PROBLEM -->
<section class="block">
  <div class="wrap center reveal">
    <h2>هنوز دستی فاکتور می‌فرستی؟</h2>
    <p>هر روز وقتت صرف کپی‌کردن شماره، باز کردن چند پیام‌رسان و فرستادن تک‌تک فایل‌ها می‌شود — با خطا و فراموشی. یارا همه‌ی این‌ها را یک‌جا و خودکار انجام می‌دهد.</p>
  </div>
</section>

<!-- FEATURES -->
<section class="block" id="features" style="padding-top:0">
  <div class="wrap">
    <div class="center reveal"><h2>چرا یارا؟</h2><p>همه‌ی ابزارهایی که برای ارسال سریع و حرفه‌ای لازم داری.</p></div>
    <div class="grid">
      <div class="feat reveal"><div class="ico">📤</div><h3>ارسال چندکاناله</h3><p>یک فایل، هم‌زمان به پیامک، واتساپ، بله و روبیکا. خودت انتخاب کن از کدام برود.</p></div>
      <div class="feat reveal"><div class="ico">🧠</div><h3>متن هوشمند با متغیر</h3><p>نام مشتری، شماره فاکتور و لینک به‌صورت خودکار در متن قرار می‌گیرند.</p></div>
      <div class="feat reveal"><div class="ico">💬</div><h3>چت دوطرفه‌ی واقعی</h3><p>در بله و روبیکا پیام از شماره‌ی خودت می‌رود؛ مشتری می‌تواند جواب بدهد.</p></div>
      <div class="feat reveal"><div class="ico">🔗</div><h3>لینک کوتاه وردپرس</h3><p>PDF را در سایت آپلود و یک لینک کوتاه برای مشتری می‌سازد.</p></div>
      <div class="feat reveal"><div class="ico">🖱️</div><h3>کشیدن و رها کردن</h3><p>فایل را بکش و رها کن؛ شماره از نام فایل خودکار تشخیص داده می‌شود.</p></div>
      <div class="feat reveal"><div class="ico">🔒</div><h3>امن و روی سیستم خودت</h3><p>اطلاعات ورود رمزنگاری‌شده و فقط روی کامپیوتر تو ذخیره می‌شود.</p></div>
    </div>
  </div>
</section>

<!-- HOW -->
<section class="block" id="how" style="padding-top:0">
  <div class="wrap">
    <div class="center reveal"><h2>در ۳ مرحله</h2><p>به این سادگی.</p></div>
    <div class="steps">
      <div class="step reveal"><div class="n"></div><h3>فایل را انتخاب کن</h3><p>PDF یا عکس پیش‌فاکتور را بکش و رها کن یا انتخاب کن.</p></div>
      <div class="step reveal"><div class="n"></div><h3>کانال‌ها را بزن</h3><p>تیک بزن از کدام پیام‌رسان‌ها ارسال شود.</p></div>
      <div class="step reveal"><div class="n"></div><h3>شروع ارسال</h3><p>یارا هم‌زمان همه را می‌فرستد و گزارش زنده می‌دهد.</p></div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="block" id="pricing" style="padding-top:0">
  <div class="wrap">
    <div class="center reveal"><h2>قیمت‌گذاری شفاف</h2><p>یک‌بار انتخاب کن، همیشه در وقت و انرژی صرفه‌جویی کن.</p></div>
    <div class="plans">
      <div class="plan reveal">
        <h3>پایه</h3>
        <div class="price">۹۹۰<span> هزار / سال</span></div>
        <ul><li>یک کانال دلخواه</li><li>ارسال نامحدود</li><li>متن با متغیر</li><li>پشتیبانی ایمیلی</li></ul>
        <a href="{{YARA_BASIC_URL}}" class="btn ghost">انتخاب پایه</a>
      </div>
      <div class="plan pop reveal">
        <span class="badge">پیشنهادی</span>
        <h3>حرفه‌ای</h3>
        <div class="price">۱٬۹۹۰<span> هزار / سال</span></div>
        <ul><li>همه‌ی کانال‌ها (۴ پیام‌رسان)</li><li>چت دوطرفه بله و روبیکا</li><li>لینک کوتاه وردپرس</li><li>تشخیص خودکار شماره</li><li>پشتیبانی اولویت‌دار</li></ul>
        <a href="{{YARA_PRO_URL}}" class="btn">شروع حرفه‌ای</a>
      </div>
      <div class="plan reveal">
        <h3>کسب‌وکار</h3>
        <div class="price">۳٬۹۹۰<span> هزار / سال</span></div>
        <ul><li>تمام امکانات حرفه‌ای</li><li>چند کاربر</li><li>ماژول‌های آینده (دستیار هوشمند)</li><li>پشتیبانی اختصاصی</li></ul>
        <a href="{{YARA_BIZ_URL}}" class="btn ghost">انتخاب کسب‌وکار</a>
      </div>
    </div>
    <p style="text-align:center;color:var(--dim);margin-top:24px">✅ گارانتی بازگشت وجه ۱۴ روزه · ۷ روز تست رایگان</p>
  </div>
</section>

<!-- TESTIMONIAL -->
<section class="block" style="padding-top:0">
  <div class="wrap">
    <div class="feat reveal" style="max-width:760px;margin:0 auto;text-align:center;padding:40px">
      <p style="font-size:1.3rem;color:var(--text);line-height:2">«قبلاً هر روز نیم ساعت صرف فرستادن فاکتورها می‌شد. الان با یارا چند ثانیه‌ست و دیگه هیچ مشتری‌ای جا نمی‌مونه.»</p>
      <p style="color:var(--dim);margin-top:14px">— مدیر فروشگاه لوازم خانگی</p>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="block" id="faq" style="padding-top:0">
  <div class="wrap">
    <div class="center reveal"><h2>سؤالات متداول</h2></div>
    <div class="faq">
      <details class="q reveal"><summary>برای استفاده به دانش فنی نیاز دارم؟</summary><div class="a">نه. یارا را نصب می‌کنی، یک‌بار پیام‌رسان‌ها را وصل می‌کنی و تمام. محیط کاملاً فارسی و ساده است.</div></details>
      <details class="q reveal"><summary>اطلاعاتم امن است؟</summary><div class="a">بله. تمام اطلاعات ورود به‌صورت رمزنگاری‌شده و فقط روی کامپیوتر خودت ذخیره می‌شود؛ روی هیچ سروری نمی‌رود.</div></details>
      <details class="q reveal"><summary>بله و روبیکا چطور کار می‌کنند؟</summary><div class="a">با اکانت شخصی خودت (با شماره و کد تأیید) وارد می‌شوی و پیام از شماره‌ی خودت برای مشتری می‌رود — مثل یک چت واقعی.</div></details>
      <details class="q reveal"><summary>روی چند سیستم می‌توانم نصب کنم؟</summary><div class="a">هر لایسنس برای تعداد مشخصی دستگاه فعال می‌شود. برای دستگاه بیشتر، پلن بالاتر یا لایسنس اضافه تهیه کن.</div></details>
      <details class="q reveal"><summary>اگر راضی نبودم؟</summary><div class="a">۱۴ روز گارانتی بازگشت وجه داری. بدون دردسر مبلغ را برمی‌گردانیم.</div></details>
    </div>
  </div>
</section>

<!-- FINAL CTA -->
<section class="block" style="padding-top:0">
  <div class="wrap">
    <div class="final reveal">
      <h2>همین امروز ارسال فاکتورهایت را خودکار کن</h2>
      <p>۷ روز رایگان امتحان کن. اگر دوست داشتی، بمان.</p>
      <a href="#pricing" class="btn">شروع رایگان یارا</a>
    </div>
  </div>
</section>

<footer><div class="wrap">© یارا — دستیار هوشمند کسب‌وکار · ساخته‌شده با ❤️</div></footer>

<script>
// ── انیمیشن ظاهرشدن هنگام اسکرول با تأخیر زنجیره‌ای داخل گرید/فلکس ──
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    // اگر در یک ظرف grid/flex هستیم، فرزندان را با تأخیر staggered نمایش بده
    const siblings = el.parentElement
      ? [...el.parentElement.children].filter(c => c.classList.contains('reveal'))
      : [];
    const idx = siblings.indexOf(el);
    el.style.transitionDelay = (idx > 0 ? Math.min(idx * 80, 400) : 0) + 'ms';
    el.classList.add('in');
    io.unobserve(el);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ── منوی موبایل ──
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
const menuIcon = document.getElementById('menuIcon');
const ICON_MENU = 'M4 7h16M4 12h16M4 17h16';
const ICON_CLOSE = 'M6 6l12 12M6 18L18 6';
function setMenu(open) {
  navLinks.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuIcon.setAttribute('d', open ? ICON_CLOSE : ICON_MENU);
}
menuBtn.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
// بسته‌شدن خودکار هنگام کلیک روی هر لینک یا کلیک بیرون از منو
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('click', e => {
  if (!navLinks.classList.contains('open')) return;
  if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
});

// ── هدر هنگام اسکرول، پررنگ‌تر می‌شود ──
const header = document.querySelector('header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 30);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ── رفلکس نوری روی کارت‌های ویژگی (mouse spotlight) ──
document.querySelectorAll('.feat').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });
});

// ── parallax ملایم برای موکاپ اپ در hero (فقط روی دسکتاپ) ──
const mock = document.querySelector('.mock');
if (mock && window.matchMedia('(hover:hover) and (min-width:768px)').matches) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < 800) mock.style.transform = `translateY(${y * 0.06}px)`;
  }, { passive: true });
}
</script>
</body>
</html>

YARA_LANDING_HTML;
}
