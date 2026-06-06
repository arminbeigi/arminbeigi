"""
اسکریپت ساخت بنر شوفاژکار
--------------------------------
۱. این فایل رو روی Desktop کپی کن (کنار boiler.webp)
۲. Python رو اجرا کن: python build_banner.py
۳. فایل banner-boiler-final.html روی Desktop ساخته می‌شه
"""

import base64, os, sys

# مسیر عکس — همون پوشه اسکریپت
script_dir = os.path.dirname(os.path.abspath(__file__))
img_path   = os.path.join(script_dir, "boiler.webp")

if not os.path.exists(img_path):
    sys.exit(f"❌  فایل boiler.webp پیدا نشد.\n   مسیر جستجو: {img_path}")

with open(img_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

img_data_uri = f"data:image/webp;base64,{b64}"

html = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>بنر پکیج دیواری شوفاژکار</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap');
  * {{ margin:0; padding:0; box-sizing:border-box }}

  .banner-boiler {{
    font-family: 'Vazirmatn', Tahoma, sans-serif;
    position: relative;
    width: 100%;
    max-width: 760px;
    height: 260px;
    background: linear-gradient(135deg, #f5a97f 0%, #ed7f5a 35%, #d95f3b 65%, #c44a28 100%);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 16px 50px rgba(190,70,30,0.35);
    cursor: pointer;
    display: block;
  }}
  .banner-boiler::before {{
    content:''; position:absolute; inset:0;
    background-image:
      linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 32px 32px; z-index:0;
  }}
  .b-glow {{
    position:absolute; top:-40px; right:-40px;
    width:260px; height:260px; border-radius:50%;
    background:radial-gradient(circle,rgba(255,210,140,0.35) 0%,transparent 65%);
    animation:bGlowPulse 4s ease-in-out infinite alternate; z-index:0;
  }}
  @keyframes bGlowPulse {{ from{{opacity:0.6}} to{{opacity:1}} }}

  .b-shimmer {{
    position:absolute; inset:0;
    background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.16) 50%,transparent 70%);
    background-size:200% 100%; animation:bShimmer 3s linear infinite; z-index:1;
  }}
  @keyframes bShimmer {{ 0%{{background-position:200% 0}} 100%{{background-position:-200% 0}} }}

  .b-heat {{
    position:absolute;
    border-radius:50% 50% 50% 50%/60% 60% 40% 40%;
    filter:blur(1.5px); animation:bHeat linear infinite; z-index:1;
  }}
  .b-heat:nth-child(1){{width:10px;height:14px;left:8%; bottom:0;background:rgba(255,150,60,0.55);animation-duration:3.0s;animation-delay:0.0s}}
  .b-heat:nth-child(2){{width:7px; height:10px;left:18%;bottom:0;background:rgba(255,110,40,0.45);animation-duration:2.5s;animation-delay:0.7s}}
  .b-heat:nth-child(3){{width:13px;height:18px;left:29%;bottom:0;background:rgba(255,180,80,0.50);animation-duration:3.8s;animation-delay:0.2s}}
  .b-heat:nth-child(4){{width:8px; height:11px;left:42%;bottom:0;background:rgba(255,100,30,0.40);animation-duration:2.3s;animation-delay:1.4s}}
  .b-heat:nth-child(5){{width:11px;height:15px;left:54%;bottom:0;background:rgba(255,160,60,0.45);animation-duration:3.3s;animation-delay:0.5s}}
  .b-heat:nth-child(6){{width:9px; height:13px;left:65%;bottom:0;background:rgba(255,190,90,0.50);animation-duration:2.8s;animation-delay:1.0s}}
  .b-heat:nth-child(7){{width:14px;height:19px;left:75%;bottom:0;background:rgba(255,140,50,0.45);animation-duration:3.5s;animation-delay:0.3s}}
  .b-heat:nth-child(8){{width:7px; height:10px;left:86%;bottom:0;background:rgba(255,120,40,0.40);animation-duration:2.6s;animation-delay:1.8s}}
  @keyframes bHeat {{
    0%  {{transform:translateY(0) scaleX(1);opacity:0}}
    12% {{opacity:0.85}}
    55% {{transform:translateY(-130px) scaleX(0.65) rotate(6deg);opacity:0.45}}
    88% {{opacity:0.15}}
    100%{{transform:translateY(-265px) scaleX(0.25) rotate(-4deg);opacity:0}}
  }}

  .b-ring {{
    position:absolute; border-radius:50%;
    border:1.5px solid rgba(255,255,255,0.13);
    animation:bRing ease-out infinite; z-index:0;
  }}
  .b-ring:nth-child(1){{width:150px;height:150px;bottom:-55px;left:-35px;animation-duration:4s;animation-delay:0.0s}}
  .b-ring:nth-child(2){{width:210px;height:210px;bottom:-80px;left:-60px;animation-duration:4s;animation-delay:0.9s}}
  .b-ring:nth-child(3){{width:270px;height:270px;bottom:-110px;left:-85px;animation-duration:4s;animation-delay:1.8s}}
  @keyframes bRing {{
    0%  {{opacity:0.45;transform:scale(0.93)}}
    50% {{opacity:0.18;transform:scale(1.00)}}
    100%{{opacity:0.00;transform:scale(1.12)}}
  }}

  .b-inner {{
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:space-between;
    padding:0 36px; z-index:10;
  }}

  /* ── image column ── */
  .b-img-col {{
    position:relative; width:170px; height:240px;
    flex-shrink:0; display:flex;
    align-items:flex-end; justify-content:center;
  }}
  .b-product {{
    width:148px; height:216px; object-fit:contain;
    animation:bFloat 3.6s ease-in-out infinite;
    filter:
      drop-shadow(-6px 18px 22px rgba(80,20,0,0.50))
      drop-shadow(0 4px 8px rgba(0,0,0,0.18));
    position:relative; z-index:2;
  }}
  @keyframes bFloat {{
    0%,100%{{transform:translateY(0)     rotate(-0.5deg)}}
    50%    {{transform:translateY(-13px)  rotate( 0.5deg)}}
  }}
  .b-halo {{
    position:absolute; bottom:8px; left:50%; transform:translateX(-50%);
    width:130px; height:130px; border-radius:50%;
    background:radial-gradient(circle,rgba(255,180,80,0.32) 0%,rgba(255,100,30,0.12) 45%,transparent 70%);
    filter:blur(12px); animation:bHaloPulse 2.2s ease-in-out infinite alternate; z-index:1;
  }}
  @keyframes bHaloPulse {{
    from{{transform:translateX(-50%) scale(0.88);opacity:0.55}}
    to  {{transform:translateX(-50%) scale(1.12);opacity:1.00}}
  }}
  .b-logo-badge {{
    position:absolute; top:12px; left:50%; transform:translateX(-50%);
    background:rgba(255,255,255,0.93); border-radius:9px; padding:4px 11px;
    font-size:10px; font-weight:900; color:#be1e11; white-space:nowrap;
    box-shadow:0 3px 12px rgba(0,0,0,0.18); z-index:3;
    animation:bLogoPop 0.7s 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
  }}
  @keyframes bLogoPop {{
    from{{opacity:0;transform:translateX(-50%) scale(0.4)}}
    to  {{opacity:1;transform:translateX(-50%) scale(1)}}
  }}
  .b-sp {{
    position:absolute; border-radius:50%;
    background:rgba(255,240,160,0.95);
    box-shadow:0 0 7px 3px rgba(255,180,60,0.6);
    animation:bSp ease-in-out infinite; z-index:3;
  }}
  .b-sp:nth-child(1){{width:7px; height:7px; top:22%;left:5%;  animation-duration:2.0s;animation-delay:0.0s}}
  .b-sp:nth-child(2){{width:5px; height:5px; top:60%;right:6%; animation-duration:2.5s;animation-delay:0.8s}}
  .b-sp:nth-child(3){{width:9px; height:9px; top:80%;left:20%; animation-duration:1.7s;animation-delay:1.3s}}
  @keyframes bSp {{
    0%,100%{{transform:scale(0) rotate(0deg);  opacity:0}}
    40%    {{transform:scale(1) rotate(45deg);  opacity:1}}
    70%    {{transform:scale(0.6) rotate(90deg);opacity:0.5}}
  }}

  /* ── text column ── */
  .b-text-col {{
    display:flex; flex-direction:column; gap:11px; max-width:310px;
    animation:bTextIn 0.9s cubic-bezier(0.22,1,0.36,1) both;
  }}
  @keyframes bTextIn {{from{{opacity:0;transform:translateX(-35px)}}to{{opacity:1;transform:translateX(0)}}}}

  .b-chip {{
    display:inline-flex; align-items:center; gap:7px;
    background:rgba(255,255,255,0.17); backdrop-filter:blur(8px);
    border:1px solid rgba(255,255,255,0.35); border-radius:50px;
    padding:5px 15px; width:fit-content;
    animation:bChipPop 0.7s 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
  }}
  @keyframes bChipPop {{from{{opacity:0;transform:scale(0.4)}}to{{opacity:1;transform:scale(1)}}}}
  .b-chip span {{font-size:11px;color:#fff;font-weight:700}}
  .b-fire {{font-size:13px;animation:bFire 0.9s ease-in-out infinite alternate}}
  @keyframes bFire {{from{{transform:scale(1) rotate(-5deg)}}to{{transform:scale(1.25) rotate(5deg)}}}}

  .b-title {{
    font-size:27px; font-weight:900; color:#fff; line-height:1.45;
    text-shadow:0 2px 14px rgba(90,20,0,0.3);
    animation:bTextIn 0.9s 0.1s cubic-bezier(0.22,1,0.36,1) both;
  }}
  .b-features {{
    display:flex; flex-direction:column; gap:6px;
    animation:bTextIn 0.9s 0.2s cubic-bezier(0.22,1,0.36,1) both;
  }}
  .b-feat {{
    display:flex; align-items:center; gap:8px;
    color:rgba(255,255,255,0.93); font-size:13.5px; font-weight:600;
  }}
  .b-feat-icon {{
    width:23px; height:23px; background:rgba(255,255,255,0.2);
    border:1px solid rgba(255,255,255,0.32); border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:11px; flex-shrink:0;
  }}
  .b-feat:nth-child(1){{animation:bFeatIn 0.6s 0.30s both}}
  .b-feat:nth-child(2){{animation:bFeatIn 0.6s 0.45s both}}
  @keyframes bFeatIn{{from{{opacity:0;transform:translateX(-18px)}}to{{opacity:1;transform:translateX(0)}}}}

  .b-guarantee {{
    display:inline-flex; align-items:center; gap:10px;
    background:rgba(255,255,255,0.14); backdrop-filter:blur(10px);
    border:1.5px solid rgba(255,255,255,0.42); border-radius:13px;
    padding:8px 16px; width:fit-content;
    animation:bTextIn 0.9s 0.3s cubic-bezier(0.22,1,0.36,1) both;
  }}
  .b-gnum {{
    font-size:30px; font-weight:900; color:#fff; line-height:1;
    animation:bGlow 2s ease-in-out infinite alternate;
  }}
  @keyframes bGlow {{
    from{{text-shadow:0 0 8px rgba(255,220,100,0.25)}}
    to  {{text-shadow:0 0 22px rgba(255,220,100,0.85)}}
  }}
  .b-gtxt {{display:flex;flex-direction:column}}
  .b-gtxt span:first-child{{font-size:12.5px;color:rgba(255,255,255,0.92);font-weight:700}}
  .b-gtxt span:last-child {{font-size:10.5px;color:rgba(255,255,255,0.68)}}

  .b-btn {{
    display:inline-flex; align-items:center; gap:8px;
    background:rgba(255,255,255,0.95); color:#be1e11;
    border:none; border-radius:50px; padding:10px 24px;
    font-size:14.5px; font-weight:800;
    font-family:'Vazirmatn',Tahoma,sans-serif;
    cursor:pointer; width:fit-content;
    box-shadow:0 7px 22px rgba(0,0,0,0.2); transition:all 0.25s ease;
    animation:bTextIn 0.9s 0.4s cubic-bezier(0.22,1,0.36,1) both;
  }}
  .b-btn:hover{{transform:translateY(-3px) scale(1.05);box-shadow:0 14px 32px rgba(0,0,0,0.28)}}
  .b-arrow {{
    width:21px; height:21px;
    background:linear-gradient(135deg,#e83a1f,#be1e11);
    border-radius:50%; display:flex; align-items:center;
    justify-content:center; color:#fff; font-size:11px;
    animation:bArrow 1.6s ease-in-out infinite;
  }}
  @keyframes bArrow {{0%,100%{{transform:translateX(0)}}50%{{transform:translateX(-4px)}}}}
</style>
</head>
<body style="margin:0;padding:24px;background:#f0f0f0;">

<div class="banner-boiler">
  <div class="b-glow"></div>
  <div class="b-shimmer"></div>
  <div class="b-heat"></div><div class="b-heat"></div>
  <div class="b-heat"></div><div class="b-heat"></div>
  <div class="b-heat"></div><div class="b-heat"></div>
  <div class="b-heat"></div><div class="b-heat"></div>
  <div class="b-ring"></div><div class="b-ring"></div><div class="b-ring"></div>

  <div class="b-inner">

    <div class="b-img-col">
      <div class="b-logo-badge">شوفاژکار</div>
      <div class="b-halo"></div>
      <div class="b-sp"></div><div class="b-sp"></div><div class="b-sp"></div>
      <img class="b-product"
           src="{img_data_uri}"
           alt="پکیج دیواری کامفورت شوفاژکار">
    </div>

    <div class="b-text-col">
      <div class="b-chip">
        <div class="b-fire">🔥</div>
        <span>محصول برتر ایران</span>
      </div>
      <h2 class="b-title">پکیج دیواری<br>شوفاژکار</h2>
      <div class="b-features">
        <div class="b-feat"><div class="b-feat-icon">🎛️</div><span>کنترل هوشمند</span></div>
        <div class="b-feat"><div class="b-feat-icon">⚡</div><span>راندمان بالا — کم‌مصرف</span></div>
      </div>
      <div class="b-guarantee">
        <div class="b-gnum">۲۴</div>
        <div class="b-gtxt">
          <span>ماه گارانتی</span>
          <span>خدمات پس از فروش</span>
        </div>
      </div>
      <button class="b-btn">
        <div class="b-arrow">←</div>
        خرید کنید
      </button>
    </div>

  </div>
</div>

</body>
</html>"""

out_path = os.path.join(script_dir, "banner-boiler-final.html")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"✅  فایل ساخته شد:\n   {out_path}")
