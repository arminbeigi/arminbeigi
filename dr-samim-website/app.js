/* ============================================================
   DR. SAMIM AHMADI ABHARI — Main JavaScript
   ============================================================ */

// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
    scrollTopBtn.classList.add('show');
  } else {
    navbar.classList.remove('scrolled');
    scrollTopBtn.classList.remove('show');
  }
  updateActiveNav();
  revealElements();
});

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ===== ACTIVE NAV LINK =====
function updateActiveNav() {
  const sections = ['hero', 'about', 'services', 'products', 'gallery', 'contact'];
  const scrollY = window.scrollY + 120;
  sections.forEach(id => {
    const el = document.getElementById(id);
    const link = document.querySelector(`.nav-link[href="#${id}"]`);
    if (!el || !link) return;
    if (scrollY >= el.offsetTop && scrollY < el.offsetTop + el.offsetHeight) {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });
}

// ===== 3D HERO SLIDER =====
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.dot');
let autoSlideTimer = null;
let isScrollSliding = false;
let lastScrollTime = 0;

function goToSlide(n) {
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = (n + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
  resetAutoSlide();
}

function resetAutoSlide() {
  clearInterval(autoSlideTimer);
  autoSlideTimer = setInterval(() => goToSlide(currentSlide + 1), 5500);
}

dots.forEach(dot => {
  dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.dot)));
});

// Scroll to change slides while in hero
window.addEventListener('wheel', (e) => {
  const hero = document.getElementById('hero');
  const heroBottom = hero.offsetTop + hero.offsetHeight;
  const scrollY = window.scrollY;

  if (scrollY < hero.offsetTop + hero.offsetHeight * 0.5) {
    const now = Date.now();
    if (now - lastScrollTime < 900) return;
    lastScrollTime = now;

    if (currentSlide < slides.length - 1 && e.deltaY > 0) {
      e.preventDefault();
      goToSlide(currentSlide + 1);
    } else if (currentSlide > 0 && e.deltaY < 0) {
      e.preventDefault();
      goToSlide(currentSlide - 1);
    }
  }
}, { passive: false });

// Touch swipe for mobile
let touchStartX = 0, touchStartY = 0;
document.getElementById('hero').addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});
document.getElementById('hero').addEventListener('touchend', e => {
  const dx = touchStartX - e.changedTouches[0].clientX;
  const dy = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
    goToSlide(dx > 0 ? currentSlide + 1 : currentSlide - 1);
  }
});

resetAutoSlide();

// ===== PARTICLES =====
const particleContainer = document.getElementById('particles');
for (let i = 0; i < 28; i++) {
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.cssText = `
    left:${Math.random()*100}%;
    top:${Math.random()*100}%;
    --dur:${6 + Math.random()*8}s;
    --del:${-Math.random()*8}s;
    width:${2+Math.random()*5}px;
    height:${2+Math.random()*5}px;
    opacity:${.2+Math.random()*.5};
  `;
  particleContainer.appendChild(p);
}

// ===== COUNTER ANIMATION =====
function animateCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target = parseInt(el.dataset.count);
    const duration = 1800;
    const start = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = current.toLocaleString('fa-IR');
      if (progress >= 1) {
        el.textContent = target.toLocaleString('fa-IR');
        clearInterval(timer);
      }
    }, 16);
  });
}

// ===== REVEAL ON SCROLL =====
function revealElements() {
  document.querySelectorAll('.reveal').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 80) el.classList.add('visible');
  });
}

// ===== INTERSECTION OBSERVER =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      if (entry.target.classList.contains('stats-bar')) animateCounters();
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.stats-bar, .service-card, .product-card, .process-step, .gallery-item, .about-content, .about-visual, .contact-card').forEach(el => {
  el.classList.add('reveal');
  observer.observe(el);
});

// ===== STAGGERED CARDS =====
document.querySelectorAll('.service-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 80}ms`;
});
document.querySelectorAll('.product-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 60}ms`;
});

// ===== FORM SUBMIT =====
function handleSubmit(e) {
  e.preventDefault();
  const success = document.getElementById('formSuccess');
  success.classList.add('show');
  e.target.reset();
  setTimeout(() => success.classList.remove('show'), 5000);
}

// ===== SMOOTH SECTION SCROLL WITH OFFSET =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = target.id === 'hero' ? 0 : 80;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });
});

// ===== PARALLAX TILT ON HERO CONTENT =====
document.querySelector('.hero').addEventListener('mousemove', (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  const content = document.querySelector('.hero-slide.active .slide-content');
  if (content) {
    content.style.transform = `perspective(1200px) rotateY(${x * 3}deg) rotateX(${-y * 2}deg) translateZ(10px)`;
  }
});
document.querySelector('.hero').addEventListener('mouseleave', () => {
  const content = document.querySelector('.hero-slide.active .slide-content');
  if (content) content.style.transform = 'none';
});

// initial reveal
window.dispatchEvent(new Event('scroll'));
