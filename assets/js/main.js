'use strict';

/* ---------- Sticky header ---------- */
const header = document.getElementById('site-header');
const onScrollHeader = () => {
  header.classList.toggle('bg-dark', window.scrollY > 40);
  header.classList.toggle('shadow-lg', window.scrollY > 40);
};
document.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

/* ---------- Mobile offcanvas menu ---------- */
const menuOpenBtn = document.getElementById('menu-open');
const menuCloseBtn = document.getElementById('menu-close');
const mobileMenu = document.getElementById('mobile-menu');
const mobileBackdrop = document.getElementById('mobile-menu-backdrop');

const openMenu = () => {
  mobileMenu.classList.add('is-open');
  mobileBackdrop.classList.add('is-open');
  menuOpenBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('overflow-hidden');
};

const closeMenu = () => {
  mobileMenu.classList.remove('is-open');
  mobileBackdrop.classList.remove('is-open');
  menuOpenBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('overflow-hidden');
};

menuOpenBtn?.addEventListener('click', openMenu);
menuCloseBtn?.addEventListener('click', closeMenu);
mobileBackdrop?.addEventListener('click', closeMenu);
mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

/* ---------- Hero slider ---------- */
const heroSlides = Array.from(document.querySelectorAll('.hero-slide'));
const heroDots = Array.from(document.querySelectorAll('[data-hero-dot]'));
let heroIndex = 0;
let heroTimer;

const showHeroSlide = (index) => {
  heroSlides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
  heroDots.forEach((dot, i) => {
    dot.classList.toggle('bg-primary', i === index);
    dot.classList.toggle('bg-white/40', i !== index);
  });
  heroIndex = index;
};

const nextHeroSlide = () => showHeroSlide((heroIndex + 1) % heroSlides.length);

const startHeroAutoplay = () => {
  clearInterval(heroTimer);
  heroTimer = setInterval(nextHeroSlide, 6000);
};

heroDots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    showHeroSlide(i);
    startHeroAutoplay();
  });
});

if (heroSlides.length) {
  showHeroSlide(0);
  startHeroAutoplay();
}

/* ---------- Interactive services switcher ---------- */
const serviceItems = Array.from(document.querySelectorAll('[data-service]'));
const serviceCard = document.getElementById('service-card');
const serviceImage = document.getElementById('service-image');

const serviceData = {
  '01': {
    title: 'Service One',
    desc: 'Short placeholder description of this service — swap in your own copy.',
    icon: 'M12 2a5 5 0 015 5c0 3-2 4-2 7h-6c0-3-2-4-2-7a5 5 0 015-5z',
    gradient: 'from-primary/60 via-dark to-dark',
  },
  '02': {
    title: 'Service Two',
    desc: 'Short placeholder description of this service — swap in your own copy.',
    icon: 'M12 21c-4.4-3-8-6.5-8-11a5 5 0 019-3 5 5 0 019 3c0 4.5-3.6 8-8 11z',
    gradient: 'from-wine via-dark to-dark',
  },
  '03': {
    title: 'Service Three',
    desc: 'Short placeholder description of this service — swap in your own copy.',
    icon: 'M4 4h16v4H4zM4 10h16v10H4z',
    gradient: 'from-primary/40 via-wine to-dark',
  },
  '04': {
    title: 'Service Four',
    desc: 'Short placeholder description of this service — swap in your own copy.',
    icon: 'M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.4 5.7 20.8 8 13.6l-6-4.4h7.6z',
    gradient: 'from-dark via-wine to-primary/40',
  },
};

const setActiveService = (key) => {
  const data = serviceData[key];
  if (!data) return;

  serviceItems.forEach((item) => {
    const isActive = item.dataset.service === key;
    item.classList.toggle('opacity-100', isActive);
    item.classList.toggle('opacity-60', !isActive);
    item.querySelector('[data-service-title]')?.classList.toggle('text-primary', isActive);
  });

  if (serviceCard) {
    serviceCard.querySelector('[data-card-title]').textContent = data.title;
    serviceCard.querySelector('[data-card-desc]').textContent = data.desc;
    serviceCard.querySelector('[data-card-icon]').setAttribute('d', data.icon);
  }

  if (serviceImage) {
    serviceImage.className = `absolute inset-0 h-full w-full bg-gradient-to-br ${data.gradient} transition-colors duration-700`;
  }
};

serviceItems.forEach((item) => {
  item.addEventListener('mouseenter', () => setActiveService(item.dataset.service));
  item.addEventListener('focus', () => setActiveService(item.dataset.service));
});

if (serviceItems.length) setActiveService(serviceItems[0].dataset.service);

/* ---------- Scroll-reveal animation ---------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

/* ---------- Back-to-top button ---------- */
const backToTop = document.getElementById('back-to-top');

const onScrollBackToTop = () => {
  backToTop.classList.toggle('opacity-0', window.scrollY < 400);
  backToTop.classList.toggle('pointer-events-none', window.scrollY < 400);
};

backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.addEventListener('scroll', onScrollBackToTop, { passive: true });
onScrollBackToTop();

/* ---------- Newsletter / contact form (placeholder handling) ---------- */
document.querySelectorAll('[data-form]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const feedback = form.querySelector('[data-form-feedback]');
    if (feedback) {
      feedback.textContent = 'Thanks! Replace this with real form handling.';
      feedback.classList.remove('hidden');
    }
    form.reset();
  });
});
