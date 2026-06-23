<?php
/** فرم ورود/ثبت‌نام با کد پیامکی یارا (جایگزین فرم پیش‌فرض ووکامرس) */
if (!defined('ABSPATH')) exit;
$vars = function_exists('yara_acc_js_vars') ? yara_acc_js_vars() : ['ajax' => admin_url('admin-ajax.php'), 'nonce' => wp_create_nonce('yara_otp')];
$redirect = isset($_GET['redirect_to']) ? esc_url($_GET['redirect_to']) : '';
?>
<div class="yara-auth" dir="rtl">
  <div class="yara-auth-card">
    <div class="yara-auth-head">
      <div class="yara-auth-mark">
        <svg viewBox="0 0 100 100" width="56" height="56">
          <rect width="100" height="100" rx="23.5" fill="#7C4DFF"/>
          <rect x="26" y="23.9" width="48" height="49" rx="14.4" fill="#fff"/>
          <polygon points="37.5,70.9 48.1,70.9 37.5,83" fill="#fff"/>
          <polygon points="52.6,34.8 57.5,44.3 67,49.2 57.5,54.1 52.6,63.6 47.7,54.1 38.2,49.2 47.7,44.3" fill="#22D3B4"/>
        </svg>
      </div>
      <h3>ورود / ثبت‌نام</h3>
      <p class="yara-auth-sub">با شماره موبایل و کد پیامکی وارد شوید</p>
    </div>

    <!-- مرحله ۱: شماره -->
    <div id="yara-step-phone">
      <label>شماره موبایل</label>
      <input type="tel" id="yara-phone" inputmode="numeric" placeholder="09xxxxxxxxx" dir="ltr" maxlength="11">
      <button type="button" id="yara-send" class="yara-btn">ارسال کد</button>
    </div>

    <!-- مرحله ۲: کد -->
    <div id="yara-step-code" style="display:none">
      <label>کد ۵ رقمی پیامک‌شده</label>
      <input type="tel" id="yara-code" inputmode="numeric" placeholder="- - - - -" dir="ltr" maxlength="5">
      <button type="button" id="yara-verify" class="yara-btn">ورود</button>
      <div class="yara-auth-foot">
        <span id="yara-timer"></span>
        <a href="#" id="yara-resend" style="display:none">ارسال دوباره‌ی کد</a>
        <a href="#" id="yara-edit">تغییر شماره</a>
      </div>
    </div>

    <div id="yara-msg" class="yara-msg"></div>
  </div>
</div>

<style>
.yara-auth{display:flex;justify-content:center;padding:20px 0}
.yara-auth-card{width:100%;max-width:400px;background:#fff;border:1px solid #e7e9f0;border-radius:18px;
  padding:32px 28px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
.yara-auth-head{text-align:center;margin-bottom:22px}
.yara-auth-mark{display:flex;justify-content:center;margin-bottom:12px}
.yara-auth-head h3{margin:0 0 4px;font-weight:900;font-size:1.4rem;color:#1A1C23}
.yara-auth-sub{color:#6b7280;font-size:.92rem;margin:0}
.yara-auth label{display:block;font-weight:700;font-size:.9rem;color:#374151;margin:14px 0 6px}
.yara-auth input{width:100%;height:50px;border:1.5px solid #e7e9f0;border-radius:12px;padding:0 14px;
  font-size:1.15rem;text-align:center;font-family:inherit;transition:border-color .2s;letter-spacing:2px}
.yara-auth input:focus{outline:none;border-color:#5B6CFF;box-shadow:0 0 0 4px rgba(91,108,255,.12)}
.yara-btn{width:100%;height:50px;margin-top:16px;border:none;border-radius:12px;cursor:pointer;
  background:linear-gradient(135deg,#5B6CFF,#7C4DFF);color:#fff;font-weight:700;font-size:1.05rem;
  font-family:inherit;box-shadow:0 8px 20px rgba(91,108,255,.3);transition:transform .2s,box-shadow .2s}
.yara-btn:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(91,108,255,.45)}
.yara-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
.yara-auth-foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:.85rem}
.yara-auth-foot a{color:#5B6CFF;text-decoration:none}
.yara-msg{margin-top:14px;text-align:center;font-size:.9rem;min-height:20px}
.yara-msg.ok{color:#16a34a}.yara-msg.err{color:#dc2626}
/* مخفی‌کردن فرم پیش‌فرض ووکامرس اگر جایی باقی ماند */
.woocommerce-account .u-columns.col2-set.woocommerce-form-register,
.yara-auth ~ .woocommerce-form-register{display:none}
</style>

<script>
(function(){
  var V = <?php echo wp_json_encode($vars); ?>;
  var REDIRECT = <?php echo wp_json_encode($redirect); ?>;
  var $ = function(id){return document.getElementById(id);};
  var phoneEl=$('yara-phone'), codeEl=$('yara-code'), msg=$('yara-msg');
  var sendBtn=$('yara-send'), verifyBtn=$('yara-verify');
  var stepPhone=$('yara-step-phone'), stepCode=$('yara-step-code');
  var timerEl=$('yara-timer'), resendEl=$('yara-resend'), editEl=$('yara-edit');
  var timer=null;

  function setMsg(t,ok){ msg.textContent=t||''; msg.className='yara-msg '+(ok?'ok':(t?'err':'')); }
  function post(action,data,cb){
    data.action=action; data.nonce=V.nonce;
    var body=Object.keys(data).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(data[k]);}).join('&');
    fetch(V.ajax,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body})
      .then(function(r){return r.json();}).then(cb).catch(function(){cb({success:false,data:{msg:'خطای ارتباط با سرور.'}});});
  }
  function startTimer(s){
    resendEl.style.display='none'; var left=s;
    timerEl.textContent='ارسال دوباره تا '+left+' ثانیه';
    clearInterval(timer);
    timer=setInterval(function(){
      left--; if(left<=0){clearInterval(timer);timerEl.textContent='';resendEl.style.display='inline';}
      else timerEl.textContent='ارسال دوباره تا '+left+' ثانیه';
    },1000);
  }
  function doSend(){
    var phone=phoneEl.value.replace(/\D/g,'');
    if(!/^09\d{9}$/.test(phone)){setMsg('شماره موبایل را درست وارد کنید (09...).');phoneEl.focus();return;}
    sendBtn.disabled=true; setMsg('در حال ارسال کد...',true);
    post('yara_otp_send',{phone:phone},function(res){
      sendBtn.disabled=false;
      if(res.success){
        stepPhone.style.display='none'; stepCode.style.display='block';
        setMsg(res.data.msg,true); codeEl.focus(); startTimer(60);
      } else setMsg(res.data.msg||'خطا');
    });
  }
  function doVerify(){
    var phone=phoneEl.value.replace(/\D/g,''), code=codeEl.value.replace(/\D/g,'');
    if(code.length<5){setMsg('کد ۵ رقمی را وارد کنید.');return;}
    verifyBtn.disabled=true; setMsg('در حال بررسی...',true);
    post('yara_otp_verify',{phone:phone,code:code,redirect:REDIRECT},function(res){
      if(res.success){setMsg('ورود موفق! در حال انتقال...',true);location.href=res.data.redirect;}
      else{verifyBtn.disabled=false;setMsg(res.data.msg||'کد اشتباه است.');}
    });
  }
  sendBtn.addEventListener('click',doSend);
  verifyBtn.addEventListener('click',doVerify);
  resendEl.addEventListener('click',function(e){e.preventDefault();doSend();});
  editEl.addEventListener('click',function(e){e.preventDefault();stepCode.style.display='none';stepPhone.style.display='block';setMsg('');clearInterval(timer);});
  codeEl.addEventListener('keyup',function(e){if(e.key==='Enter')doVerify();});
  phoneEl.addEventListener('keyup',function(e){if(e.key==='Enter')doSend();});
})();
</script>
