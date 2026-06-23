<?php
/**
 * Plugin Name: Yara Buy Flow (قیف خرید یکپارچه)
 * Description: قیف خرید چندمرحله‌ای یارا — ورود با کد پیامکی، نام، پرداخت و هدایت به دانلودها.
 * Version: 1.0.1
 * Author: Yara
 *
 * پیش‌نیاز: افزونه‌های «Yara Account» (برای OTP) و WooCommerce فعال باشند.
 * استفاده: دکمه‌های پلن در لندینگ به /buy/?plan=basic|pro|biz|lifetime اشاره می‌کنند.
 */

if (!defined('ABSPATH')) exit;

define('YARA_BUY_PLANS', [
    'basic'    => 'YARA-BASIC',
    'pro'      => 'YARA-PRO',
    'biz'      => 'YARA-BIZ',
    'lifetime' => 'YARA-LIFETIME',
]);

// ساخت خودکار صفحه‌ی /buy/ هنگام فعال‌سازی
register_activation_hook(__FILE__, function () {
    if (!get_page_by_path('buy')) {
        wp_insert_post([
            'post_title'   => 'خرید',
            'post_name'    => 'buy',
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_content' => '[yara_buy]',
        ]);
    }
});

// محصولات مجازی پس از پرداخت موفق، خودکار «تکمیل» شوند (تحویل آنی لایسنس/دانلود)
add_filter('woocommerce_payment_complete_order_status', function ($status, $order_id, $order) {
    if (!$order) $order = wc_get_order($order_id);
    if (!$order) return $status;
    foreach ($order->get_items() as $it) {
        $p = $it->get_product();
        if (!$p || !$p->is_virtual()) return $status;
    }
    return 'completed';
}, 10, 3);

// ───────────────────────── شورت‌کد ویزارد ─────────────────────────
add_shortcode('yara_buy', function () {
    if (!function_exists('WC')) return '<p>WooCommerce فعال نیست.</p>';

    $plan = isset($_GET['plan']) ? sanitize_text_field($_GET['plan']) : 'pro';
    if (!isset(YARA_BUY_PLANS[$plan])) $plan = 'pro';
    $pid = wc_get_product_id_by_sku(YARA_BUY_PLANS[$plan]);
    $product = $pid ? wc_get_product($pid) : null;
    if (!$product) return '<p>محصول یافت نشد.</p>';

    $user = wp_get_current_user();
    $logged = is_user_logged_in();
    $gateways = WC()->payment_gateways()->get_available_payment_gateways();
    $gw = [];
    foreach ($gateways as $id => $g) $gw[] = ['id' => $id, 'title' => $g->get_title(), 'desc' => wp_strip_all_tags($g->get_description())];

    $vars = [
        'ajax'      => admin_url('admin-ajax.php'),
        'buyNonce'  => wp_create_nonce('yara_buy'),
        'otpNonce'  => wp_create_nonce('yara_otp'),
        'loggedIn'  => $logged,
        'plan'      => $plan,
        'first'     => $logged ? get_user_meta($user->ID, 'billing_first_name', true) : '',
        'last'      => $logged ? get_user_meta($user->ID, 'billing_last_name', true) : '',
        'gateways'  => $gw,
    ];

    ob_start();
    ?>
    <div class="yara-wiz" dir="rtl" data-vars='<?php echo esc_attr(wp_json_encode($vars)); ?>'>
      <!-- خلاصه‌ی محصول -->
      <div class="yw-summary">
        <div class="yw-sum-icon">
          <svg viewBox="0 0 100 100" width="44" height="44"><rect width="100" height="100" rx="23.5" fill="#7C4DFF"/><rect x="26" y="23.9" width="48" height="49" rx="14.4" fill="#fff"/><polygon points="37.5,70.9 48.1,70.9 37.5,83" fill="#fff"/><polygon points="52.6,34.8 57.5,44.3 67,49.2 57.5,54.1 52.6,63.6 47.7,54.1 38.2,49.2 47.7,44.3" fill="#22D3B4"/></svg>
        </div>
        <div>
          <div class="yw-sum-name"><?php echo esc_html($product->get_name()); ?></div>
          <div class="yw-sum-price"><?php echo $product->get_price_html(); ?></div>
        </div>
      </div>

      <!-- نوار مرحله -->
      <div class="yw-steps">
        <span class="yw-dot active" data-s="1">۱ ورود</span>
        <span class="yw-dot" data-s="2">۲ مشخصات</span>
        <span class="yw-dot" data-s="3">۳ پرداخت</span>
      </div>

      <div class="yw-body">
        <!-- مرحله ۱: ورود -->
        <div class="yw-step yw-s1 active">
          <div class="yw-phone-box">
            <label>شماره موبایل</label>
            <input type="tel" id="yw-phone" inputmode="numeric" autocomplete="tel" placeholder="09xxxxxxxxx" dir="ltr" maxlength="11">
            <button type="button" id="yw-send" class="yw-btn">ارسال کد</button>
          </div>
          <div class="yw-code-box" style="display:none">
            <label>کد ۵ رقمی پیامک‌شده</label>
            <input type="tel" id="yw-code" inputmode="numeric" autocomplete="one-time-code" placeholder="- - - - -" dir="ltr" maxlength="5">
            <button type="button" id="yw-verify" class="yw-btn">تأیید و ادامه</button>
            <div class="yw-foot"><span id="yw-timer"></span><a href="#" id="yw-resend" style="display:none">ارسال دوباره</a><a href="#" id="yw-edit">تغییر شماره</a></div>
          </div>
        </div>

        <!-- مرحله ۲: نام -->
        <div class="yw-step yw-s2">
          <label>نام</label>
          <input type="text" id="yw-first" placeholder="مثلاً آرمین">
          <label>نام خانوادگی</label>
          <input type="text" id="yw-last" placeholder="مثلاً محمدی">
          <button type="button" id="yw-name-next" class="yw-btn">ادامه</button>
        </div>

        <!-- مرحله ۳: پرداخت -->
        <div class="yw-step yw-s3">
          <label>روش پرداخت را انتخاب کنید</label>
          <div id="yw-gateways"></div>
          <button type="button" id="yw-pay" class="yw-btn">پرداخت و تکمیل خرید</button>
        </div>
      </div>

      <div id="yw-msg" class="yw-msg"></div>
    </div>

    <style>
    .yara-wiz{max-width:440px;margin:24px auto;background:#fff;border:1px solid #e7e9f0;border-radius:20px;
      padding:26px 24px;box-shadow:0 12px 44px rgba(0,0,0,.07);font-family:'Vazirmatn',Tahoma,sans-serif}
    .yw-summary{display:flex;align-items:center;gap:12px;background:#f7f8fc;border-radius:14px;padding:12px 14px;margin-bottom:18px}
    .yw-sum-name{font-weight:700;color:#1A1C23}
    .yw-sum-price{color:#7C4DFF;font-weight:900;font-size:1.1rem}
    .yw-steps{display:flex;justify-content:space-between;margin-bottom:20px;font-size:.82rem}
    .yw-dot{flex:1;text-align:center;color:#9aa0b4;padding:6px 0;border-bottom:2px solid #e7e9f0;font-weight:600}
    .yw-dot.active{color:#5B6CFF;border-color:#5B6CFF}
    .yw-dot.done{color:#22D3B4;border-color:#22D3B4}
    .yw-step{display:none;animation:ywslide .35s cubic-bezier(.2,.7,.2,1)}
    .yw-step.active{display:block}
    @keyframes ywslide{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
    .yara-wiz label{display:block;font-weight:700;font-size:.9rem;color:#374151;margin:12px 0 6px}
    .yara-wiz input[type=text],.yara-wiz input[type=tel]{width:100%;height:50px;border:1.5px solid #e7e9f0;
      border-radius:12px;padding:0 14px;font-size:1.1rem;font-family:inherit;transition:border-color .2s}
    .yara-wiz input:focus{outline:none;border-color:#5B6CFF;box-shadow:0 0 0 4px rgba(91,108,255,.12)}
    #yw-code{text-align:center;letter-spacing:8px;font-size:1.4rem}
    .yw-btn{width:100%;height:50px;margin-top:16px;border:none;border-radius:12px;cursor:pointer;
      background:linear-gradient(135deg,#5B6CFF,#7C4DFF);color:#fff;font-weight:700;font-size:1.05rem;
      font-family:inherit;box-shadow:0 8px 20px rgba(91,108,255,.3);transition:transform .2s,box-shadow .2s}
    .yw-btn:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(91,108,255,.45)}
    .yw-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
    .yw-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:.85rem}
    .yw-foot a{color:#5B6CFF;text-decoration:none}
    .yw-gw{display:block;border:1.5px solid #e7e9f0;border-radius:12px;padding:14px;margin-top:10px;cursor:pointer;transition:.2s}
    .yw-gw:hover{border-color:#5B6CFF}
    .yw-gw.sel{border-color:#5B6CFF;background:rgba(91,108,255,.05)}
    .yw-gw input{margin-left:8px}
    .yw-gw .t{font-weight:700;color:#1A1C23}
    .yw-gw .d{font-size:.82rem;color:#6b7280;margin-top:4px}
    .yw-msg{margin-top:14px;text-align:center;font-size:.9rem;min-height:20px}
    .yw-msg.ok{color:#16a34a}.yw-msg.err{color:#dc2626}
    </style>

    <script>
    (function(){
      var root=document.querySelector('.yara-wiz'); if(!root) return;
      var V=JSON.parse(root.getAttribute('data-vars'));
      var $=function(s){return root.querySelector(s);};
      var msg=$('#yw-msg');
      function setMsg(t,ok){msg.textContent=t||'';msg.className='yw-msg '+(ok?'ok':(t?'err':''));}
      function post(action,nonce,data,cb){
        data.action=action;data.nonce=nonce;
        var b=Object.keys(data).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(data[k]);}).join('&');
        fetch(V.ajax,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:b})
          .then(function(r){return r.json();}).then(cb).catch(function(){cb({success:false,data:{msg:'خطای ارتباط.'}});});
      }
      function go(step){
        root.querySelectorAll('.yw-step').forEach(function(e){e.classList.remove('active');});
        $('.yw-s'+step).classList.add('active');
        root.querySelectorAll('.yw-dot').forEach(function(d){
          var s=+d.getAttribute('data-s');
          d.classList.toggle('active',s===step); d.classList.toggle('done',s<step);
        });
        setMsg('');
      }

      // ── مرحله ۱: ورود ──
      var phoneEl=$('#yw-phone'),codeEl=$('#yw-code'),timer=null;
      function startTimer(s){var l=s;$('#yw-resend').style.display='none';
        $('#yw-timer').textContent='ارسال دوباره تا '+l+' ثانیه';clearInterval(timer);
        timer=setInterval(function(){l--;if(l<=0){clearInterval(timer);$('#yw-timer').textContent='';$('#yw-resend').style.display='inline';}
        else $('#yw-timer').textContent='ارسال دوباره تا '+l+' ثانیه';},1000);}
      function sendCode(){
        var p=phoneEl.value.replace(/\D/g,'');
        if(!/^09\d{9}$/.test(p)){setMsg('شماره موبایل را درست وارد کنید.');return;}
        $('#yw-send').disabled=true;setMsg('در حال ارسال کد...',true);
        post('yara_otp_send',V.otpNonce,{phone:p},function(r){
          $('#yw-send').disabled=false;
          if(r.success){$('.yw-phone-box').style.display='none';$('.yw-code-box').style.display='block';
            setMsg(r.data.msg,true);codeEl.focus();startTimer(60);}
          else setMsg(r.data.msg);
        });
      }
      function verifyCode(){
        var p=phoneEl.value.replace(/\D/g,''),c=codeEl.value.replace(/\D/g,'');
        if(c.length<5){setMsg('کد ۵ رقمی را وارد کنید.');return;}
        $('#yw-verify').disabled=true;setMsg('در حال بررسی...',true);
        post('yara_otp_verify',V.otpNonce,{phone:p,code:c},function(r){
          $('#yw-verify').disabled=false;
          if(r.success){ go(2); if($('#yw-first').value && $('#yw-last').value){/*داده هست*/} }
          else setMsg(r.data.msg);
        });
      }
      if($('#yw-send')) $('#yw-send').addEventListener('click',sendCode);
      if($('#yw-verify')) $('#yw-verify').addEventListener('click',verifyCode);
      if($('#yw-resend')) $('#yw-resend').addEventListener('click',function(e){e.preventDefault();sendCode();});
      if($('#yw-edit')) $('#yw-edit').addEventListener('click',function(e){e.preventDefault();$('.yw-code-box').style.display='none';$('.yw-phone-box').style.display='block';clearInterval(timer);setMsg('');});

      // ── مرحله ۲: نام ──
      $('#yw-first').value=V.first||''; $('#yw-last').value=V.last||'';
      $('#yw-name-next').addEventListener('click',function(){
        if(!$('#yw-first').value.trim()||!$('#yw-last').value.trim()){setMsg('نام و نام‌خانوادگی را وارد کنید.');return;}
        go(3);
      });

      // ── مرحله ۳: پرداخت ──
      var gwBox=$('#yw-gateways'),selGw='';
      (V.gateways||[]).forEach(function(g,i){
        var el=document.createElement('label');el.className='yw-gw'+(i===0?' sel':'');
        el.innerHTML='<input type="radio" name="yw-gw" value="'+g.id+'"'+(i===0?' checked':'')+'><span class="t">'+g.title+'</span>'+(g.desc?'<div class="d">'+g.desc+'</div>':'');
        gwBox.appendChild(el);el.addEventListener('click',function(){gwBox.querySelectorAll('.yw-gw').forEach(function(x){x.classList.remove('sel');});el.classList.add('sel');el.querySelector('input').checked=true;selGw=g.id;});
        if(i===0)selGw=g.id;
      });
      if(!(V.gateways||[]).length){gwBox.innerHTML='<p style="color:#dc2626">هیچ روش پرداختی فعال نیست. از پنل ووکامرس فعال کنید.</p>';}
      $('#yw-pay').addEventListener('click',function(){
        var sel=gwBox.querySelector('input[name=yw-gw]:checked');
        if(!sel){setMsg('یک روش پرداخت انتخاب کنید.');return;}
        $('#yw-pay').disabled=true;setMsg('در حال ایجاد سفارش...',true);
        post('yara_buy_place_order',V.buyNonce,{plan:V.plan,first:$('#yw-first').value.trim(),last:$('#yw-last').value.trim(),payment_method:sel.value},function(r){
          if(r.success){setMsg('در حال انتقال به پرداخت...',true);location.href=r.data.redirect;}
          else{$('#yw-pay').disabled=false;setMsg(r.data.msg||'خطا در ایجاد سفارش.');}
        });
      });

      // اگر از قبل وارد شده، مستقیم برو مرحله ۲ (یا ۳ اگر نام دارد)
      if(V.loggedIn){ (V.first&&V.last) ? go(3) : go(2); }
    })();
    </script>
    <?php
    return ob_get_clean();
});

// ───────────────────────── AJAX: ایجاد سفارش و شروع پرداخت ─────────────────────────
add_action('wp_ajax_yara_buy_place_order', 'yara_buy_place_order');
add_action('wp_ajax_nopriv_yara_buy_place_order', 'yara_buy_place_order');
function yara_buy_place_order() {
    // توجه: پس از ورود با کد، نشست تغییر می‌کند و nonceِ زمان بارگذاری باطل می‌شود؛
    // بنابراین به‌جای nonce به «ورود کاربر + same-origin» تکیه می‌کنیم
    // (سفارش فقط برای خودِ کاربر واردشده ساخته می‌شود).
    if (!is_user_logged_in()) wp_send_json_error(['msg' => 'نشست شما منقضی شد. صفحه را تازه کنید و دوباره وارد شوید.']);
    if (!function_exists('WC')) wp_send_json_error(['msg' => 'WooCommerce فعال نیست.']);

    try {
        $uid = get_current_user_id();
        $plan = sanitize_text_field($_POST['plan'] ?? '');
        $sku = YARA_BUY_PLANS[$plan] ?? '';
        $pid = $sku ? wc_get_product_id_by_sku($sku) : 0;
        $product = $pid ? wc_get_product($pid) : null;
        if (!$product) wp_send_json_error(['msg' => 'محصول یافت نشد.']);

        $first = sanitize_text_field($_POST['first'] ?? '');
        $last  = sanitize_text_field($_POST['last'] ?? '');
        $pay   = sanitize_text_field($_POST['payment_method'] ?? '');

        if ($first) { update_user_meta($uid, 'first_name', $first); update_user_meta($uid, 'billing_first_name', $first); }
        if ($last)  { update_user_meta($uid, 'last_name', $last);  update_user_meta($uid, 'billing_last_name', $last); }

        $gateways = WC()->payment_gateways()->get_available_payment_gateways();
        if (!isset($gateways[$pay])) wp_send_json_error(['msg' => 'روش پرداخت نامعتبر است.']);

        $user  = wp_get_current_user();
        $phone = get_user_meta($uid, 'billing_phone', true);

        $order = wc_create_order(['customer_id' => $uid]);
        $order->add_product($product, 1);
        $order->set_billing_first_name($first);
        $order->set_billing_last_name($last);
        $order->set_billing_phone($phone);
        $order->set_billing_email($user->user_email);
        $order->set_payment_method($gateways[$pay]);
        $order->calculate_totals();
        $order->save();

        $result = $gateways[$pay]->process_payment($order->get_id());
        if (is_array($result) && ($result['result'] ?? '') === 'success') {
            wp_send_json_success(['redirect' => $result['redirect']]);
        }
        wp_send_json_error(['msg' => 'درگاه پرداخت پاسخ موفق نداد.']);
    } catch (\Throwable $e) {
        wp_send_json_error(['msg' => 'خطا: ' . $e->getMessage()]);
    }
}

// ───────────────────────── تشکر + هدایت به دانلودها ─────────────────────────
add_action('woocommerce_thankyou', function ($order_id) {
    $downloads = wc_get_account_endpoint_url('downloads');
    $order = wc_get_order($order_id);
    $paid = $order && $order->is_paid();
    ?>
    <div style="max-width:560px;margin:24px auto;text-align:center;background:linear-gradient(135deg,#5B6CFF,#7C4DFF);
      border-radius:20px;padding:34px 26px;color:#fff;font-family:'Vazirmatn',Tahoma,sans-serif">
      <div style="font-size:2.4rem">🎉</div>
      <h2 style="margin:8px 0;font-weight:900">از خرید شما سپاسگزاریم!</h2>
      <p style="opacity:.92;line-height:2">
        <?php if ($paid): ?>
          کلید لایسنس به‌زودی برای شما پیامک می‌شود و در پنل کاربری در دسترس است.<br>در حال انتقال به بخش دانلودها…
        <?php else: ?>
          سفارش شما ثبت شد. پس از تأیید پرداخت، کلید لایسنس پیامک و فعال می‌شود.
        <?php endif; ?>
      </p>
      <a href="<?php echo esc_url($downloads); ?>" style="display:inline-block;margin-top:10px;background:#fff;color:#7C4DFF;
        font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none">رفتن به دانلودها</a>
    </div>
    <?php if ($paid): ?>
    <script>setTimeout(function(){location.href=<?php echo wp_json_encode($downloads); ?>;},6000);</script>
    <?php endif; ?>
    <?php
}, 5);
