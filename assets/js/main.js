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

/* ---------- Hero slider (water-surface wipe transition) ---------- */
const heroBg = document.getElementById('hero-bg');
const waveTransition = document.getElementById('wave-transition');
const heroDots = Array.from(document.querySelectorAll('[data-hero-dot]'));

const heroSlideBackgrounds = [
  'bg-gradient-to-br from-wine via-[#2a171c] to-dark',
  'bg-gradient-to-tr from-primary-dark/70 via-wine to-dark',
  'bg-gradient-to-bl from-dark via-wine to-primary-dark/50',
];

let heroIndex = 0;
let heroTimer;
let heroTransitioning = false;
const HERO_WAVE_DURATION = 750;

const updateHeroDots = () => {
  heroDots.forEach((dot, i) => dot.classList.toggle('is-active', i === heroIndex));
};

const setHeroBackground = (index) => {
  heroBg.className = `absolute inset-0 transition-[background] duration-700 ${heroSlideBackgrounds[index]}`;
};

const goToHeroSlide = (index) => {
  if (heroTransitioning || index === heroIndex || !waveTransition) return;
  heroTransitioning = true;

  waveTransition.classList.add('is-flooding');

  window.setTimeout(() => {
    setHeroBackground(index);
    heroIndex = index;
    updateHeroDots();

    waveTransition.classList.remove('is-flooding');
    waveTransition.classList.add('is-receding');

    window.setTimeout(() => {
      waveTransition.classList.add('no-anim');
      waveTransition.classList.remove('is-receding');
      requestAnimationFrame(() => waveTransition.classList.remove('no-anim'));
      heroTransitioning = false;
    }, HERO_WAVE_DURATION);
  }, HERO_WAVE_DURATION);
};

const nextHeroSlide = () => goToHeroSlide((heroIndex + 1) % heroSlideBackgrounds.length);

const startHeroAutoplay = () => {
  clearInterval(heroTimer);
  heroTimer = setInterval(nextHeroSlide, 6000);
};

heroDots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    goToHeroSlide(i);
    startHeroAutoplay();
  });
});

if (heroDots.length) {
  setHeroBackground(0);
  updateHeroDots();
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

/* ---------- Custom cursor: ring + dot, with text-color reveal ---------- */
if (window.matchMedia('(pointer: fine)').matches) {
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  const revealTargets = Array.from(document.querySelectorAll('[data-cursor-text]'));

  const DOT_RADIUS = 4;
  const RING_RADIUS = 22;
  const RING_RADIUS_HOVER = 52;
  const RING_EASE = 0.18;

  let mouseX = -100;
  let mouseY = -100;
  let ringX = mouseX;
  let ringY = mouseY;
  let isHovering = false;
  let hasMoved = false;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!hasMoved) {
      hasMoved = true;
      cursorDot.style.opacity = '1';
      cursorRing.style.opacity = '1';
    }
  });

  document.addEventListener('mouseover', (e) => {
    isHovering = !!e.target.closest('[data-cursor-hover], [data-cursor-text], a, button');
    cursorRing.classList.toggle('is-hover', isHovering);
  });

  document.addEventListener('mouseleave', () => {
    cursorDot.style.opacity = '0';
    cursorRing.style.opacity = '0';
  });

  const tick = () => {
    cursorDot.style.transform = `translate3d(${mouseX - DOT_RADIUS}px, ${mouseY - DOT_RADIUS}px, 0)`;

    ringX += (mouseX - ringX) * RING_EASE;
    ringY += (mouseY - ringY) * RING_EASE;
    const ringRadius = isHovering ? RING_RADIUS_HOVER : RING_RADIUS;
    cursorRing.style.width = `${ringRadius * 2}px`;
    cursorRing.style.height = `${ringRadius * 2}px`;
    cursorRing.style.transform = `translate3d(${ringX - ringRadius}px, ${ringY - ringRadius}px, 0)`;

    revealTargets.forEach((el) => {
      const reveal = el.querySelector('.cursor-text__reveal');
      if (!reveal) return;
      const rect = el.getBoundingClientRect();
      const inside =
        mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
      const radius = inside ? RING_RADIUS_HOVER : 0;
      reveal.style.clipPath = `circle(${radius}px at ${mouseX - rect.left}px ${mouseY - rect.top}px)`;
    });

    requestAnimationFrame(tick);
  };

  document.documentElement.classList.add('has-custom-cursor');
  requestAnimationFrame(tick);
}
