(function(){
  var root=document.querySelector('.shz-cat'); if(!root) return;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals=root.querySelectorAll('.shz-reveal');
  if(reduce||!('IntersectionObserver'in window)){
    reveals.forEach(function(el){el.classList.add('in');}); animateAll();
    return;
  }
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in');
      var c=e.target.querySelector('[data-count]'); if(c) countUp(c); io.unobserve(e.target);} });
  },{threshold:.18});
  reveals.forEach(function(el){io.observe(el);});
  function animateAll(){root.querySelectorAll('[data-count]').forEach(countUp);}
  function toFa(n){return String(n).replace(/[0-9]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'[d];});}
  function countUp(el){
    if(el.dataset.done) return; el.dataset.done=1;
    var target=parseInt(el.getAttribute('data-count'),10)||0, cur=0,
        step=Math.max(1,Math.round(target/40));
    var t=setInterval(function(){ cur+=step; if(cur>=target){cur=target; clearInterval(t);}
      el.textContent=toFa(cur);},26);
  }
})();
