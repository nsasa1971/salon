'use strict';

/* ---------- Sticky header ---------- */
const header = document.getElementById('site-header');
const onScrollHeader = () => {
  header.classList.toggle('bg-dark', window.scrollY > 40);
  header.classList.toggle('shadow-lg', window.scrollY > 40);
};
document.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

/* ---------- Header panel: nav menu (mobile) vs. blog preview (desktop) ----------
   Both share the same trigger button. Below the xl: breakpoint the header nav is
   hidden, so the grid-icon button opens the navigation menu; at xl: and up the nav
   is already visible, so the same button instead opens a quick blog-post preview. */
const menuOpenBtn = document.getElementById('menu-open');
const menuCloseBtn = document.getElementById('menu-close');
const mobileMenu = document.getElementById('mobile-menu');
const mobileBackdrop = document.getElementById('mobile-menu-backdrop');
const blogPanel = document.getElementById('blog-panel');
const blogPanelBackdrop = document.getElementById('blog-panel-backdrop');
const blogPanelClose = document.getElementById('blog-panel-close');

const isDesktopNav = () => window.matchMedia('(min-width: 1280px)').matches;

const openPanel = (panel, backdrop) => {
  panel.classList.add('is-open');
  backdrop.classList.add('is-open');
  menuOpenBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('overflow-hidden');
};

const closePanel = (panel, backdrop) => {
  panel.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  menuOpenBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('overflow-hidden');
};

const closeMenu = () => closePanel(mobileMenu, mobileBackdrop);
const closeBlogPanel = () => closePanel(blogPanel, blogPanelBackdrop);

menuOpenBtn?.addEventListener('click', () => {
  if (isDesktopNav()) openPanel(blogPanel, blogPanelBackdrop);
  else openPanel(mobileMenu, mobileBackdrop);
});

menuCloseBtn?.addEventListener('click', closeMenu);
mobileBackdrop?.addEventListener('click', closeMenu);
mobileMenu?.querySelectorAll('a, button').forEach((el) => el.addEventListener('click', closeMenu));

blogPanelClose?.addEventListener('click', closeBlogPanel);
blogPanelBackdrop?.addEventListener('click', closeBlogPanel);
blogPanel?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeBlogPanel));

/* ---------- Booking modal ---------- */
const bookingModal = document.getElementById('booking-modal');
const bookingModalBackdrop = document.getElementById('booking-modal-backdrop');
const bookingModalClose = document.getElementById('booking-modal-close');

const openBookingModal = () => {
  closeMenu();
  closeBlogPanel();
  bookingModal?.show();
  bookingModalBackdrop?.classList.add('is-open');
  document.body.classList.add('overflow-hidden');
};

const closeBookingModal = () => {
  bookingModal?.close();
  bookingModalBackdrop?.classList.remove('is-open');
  document.body.classList.remove('overflow-hidden');
};

document.querySelectorAll('[data-open-booking]').forEach((btn) => {
  btn.addEventListener('click', openBookingModal);
});

bookingModalClose?.addEventListener('click', closeBookingModal);
bookingModalBackdrop?.addEventListener('click', closeBookingModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && bookingModal?.open) closeBookingModal();
});

/* ---------- Hero slider with live water-ripple background ---------- */
const heroSection = document.getElementById('home');
const heroCanvas = document.getElementById('hero-ripple');
const heroFallback = document.getElementById('hero-bg-fallback');
const heroDots = Array.from(document.querySelectorAll('[data-hero-dot]'));

const heroSlides = [
  { src: 'assets/images/hero-1.webp', focusY: 0.32 },
  { src: 'assets/images/hero-2.webp', focusY: 0.3 },
  { src: 'assets/images/hero-3.webp', focusY: 0.3 },
];

const ripple =
  heroCanvas && window.RippleCanvas ? new window.RippleCanvas(heroCanvas, { resolution: 300 }) : null;
const rippleSupported = !!ripple && ripple.supported;

if (heroCanvas) heroCanvas.style.display = rippleSupported ? '' : 'none';
if (heroFallback) heroFallback.classList.toggle('hidden', rippleSupported);

const slideCanvas = document.createElement('canvas');
slideCanvas.width = 1600;
slideCanvas.height = 900;
const slideCtx = slideCanvas.getContext('2d');

const heroImages = heroSlides.map((slide) => {
  const img = new Image();
  img.src = slide.src;
  return img;
});

// Mimics CSS `background-size: cover` with a per-image vertical focus point,
// since a WebGL texture is sampled 0..1 across the canvas and would otherwise
// stretch non-uniformly if drawn at the source photo's own aspect ratio.
const drawImageCover = (img, focusY) => {
  const cw = slideCanvas.width;
  const ch = slideCanvas.height;
  const scale = Math.max(cw / img.width, ch / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const dx = (cw - drawW) / 2;
  const dy = (ch - drawH) * focusY;
  slideCtx.clearRect(0, 0, cw, ch);
  slideCtx.drawImage(img, dx, dy, drawW, drawH);
};

const paintHeroSlide = (index) => {
  const slide = heroSlides[index];
  const img = heroImages[index];

  const apply = () => {
    drawImageCover(img, slide.focusY);
    if (rippleSupported) {
      ripple.setBackground(slideCanvas);
    } else if (heroFallback) {
      heroFallback.style.backgroundImage = `url(${slideCanvas.toDataURL()})`;
    }
  };

  if (img.complete && img.naturalWidth) {
    apply();
  } else {
    img.addEventListener('load', apply, { once: true });
  }
};

let heroIndex = 0;
let heroTimer;
let heroTransitioning = false;

const updateHeroDots = () => {
  heroDots.forEach((dot, i) => dot.classList.toggle('is-active', i === heroIndex));
};

const goToHeroSlide = (index) => {
  if (heroTransitioning || index === heroIndex) return;
  heroTransitioning = true;

  if (rippleSupported) {
    ripple.drop(0.5, 0.5, 0.55, 0.9);
    ripple.drop(0.22, 0.62, 0.35, 0.6);
    ripple.drop(0.78, 0.4, 0.35, 0.6);
  }

  window.setTimeout(() => {
    paintHeroSlide(index);
    heroIndex = index;
    updateHeroDots();
    if (rippleSupported) ripple.drop(0.5, 0.5, 0.6, 0.65);
    heroTransitioning = false;
  }, 260);
};

const nextHeroSlide = () => goToHeroSlide((heroIndex + 1) % heroSlides.length);

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

if (heroSection) {
  const throttle = (fn, wait) => {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn(...args);
      }
    };
  };

  const dropAtEvent = (clientX, clientY, radius, strength) => {
    if (!rippleSupported) return;
    const rect = heroCanvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;
    ripple.drop(x, y, radius, strength);
  };

  heroSection.addEventListener(
    'mousemove',
    throttle((e) => dropAtEvent(e.clientX, e.clientY, 0.05, 0.22), 55)
  );

  window.setInterval(() => {
    if (!rippleSupported || !document.hasFocus()) return;
    ripple.drop(0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7, 0.07 + Math.random() * 0.05, 0.3 + Math.random() * 0.2);
  }, 2600);

  window.addEventListener('resize', () => {
    if (rippleSupported) ripple.resize();
  });
}

if (heroDots.length) {
  paintHeroSlide(0);
  updateHeroDots();
  startHeroAutoplay();
  if (rippleSupported) ripple.start();
}

/* ---------- Services slider ---------- */
const servicesTrack = document.getElementById('services-track');
const servicesPrev = document.getElementById('services-prev');
const servicesNext = document.getElementById('services-next');

const scrollServicesBy = (direction) => {
  if (!servicesTrack) return;
  const card = servicesTrack.querySelector('.services-card');
  const step = card ? card.getBoundingClientRect().width + 24 : 300;
  servicesTrack.scrollBy({ left: step * direction, behavior: 'smooth' });
};

servicesPrev?.addEventListener('click', () => scrollServicesBy(-1));
servicesNext?.addEventListener('click', () => scrollServicesBy(1));

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

/* ---------- Newsletter / booking form (placeholder handling) ---------- */
document.querySelectorAll('[data-form]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const feedback = form.querySelector('[data-form-feedback]');
    if (feedback) {
      feedback.textContent = 'Hvala! Zamenite ovo pravom obradom forme.';
      feedback.classList.remove('hidden');
    }
    form.reset();

    if (form.closest('dialog')) {
      window.setTimeout(() => {
        closeBookingModal();
        feedback?.classList.add('hidden');
      }, 1600);
    }
  });
});

/* ---------- Custom cursor: ring + dot, text-color reveal, nav hand-pointer ---------- */
if (window.matchMedia('(pointer: fine)').matches) {
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  const cursorHand = document.getElementById('cursor-hand');
  const revealTargets = Array.from(document.querySelectorAll('[data-cursor-text]'));

  const DOT_RADIUS = 4;
  const RING_RADIUS = 16;
  const RING_RADIUS_HOVER = 58;
  const RING_EASE = 0.18;

  let mouseX = -100;
  let mouseY = -100;
  let ringX = mouseX;
  let ringY = mouseY;
  let isHovering = false;
  let isNavHovering = false;
  let hasMoved = false;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!hasMoved) {
      hasMoved = true;
      cursorDot.classList.add('is-active');
      cursorRing.classList.add('is-active');
    }
  });

  document.addEventListener('mouseover', (e) => {
    isNavHovering = !!e.target.closest('[data-cursor-nav]');
    isHovering = !isNavHovering && !!e.target.closest('[data-cursor-text]');
    cursorRing.classList.toggle('is-hover', isHovering);
    cursorDot.classList.toggle('is-nav-hover', isNavHovering);
    cursorRing.classList.toggle('is-nav-hover', isNavHovering);
    cursorHand.classList.toggle('is-visible', isNavHovering);
  });

  document.addEventListener('mouseleave', () => {
    cursorDot.classList.remove('is-active');
    cursorRing.classList.remove('is-active');
    cursorHand.classList.remove('is-visible');
  });

  const tick = () => {
    cursorDot.style.transform = `translate3d(${mouseX - DOT_RADIUS}px, ${mouseY - DOT_RADIUS}px, 0)`;
    cursorHand.style.transform = `translate3d(${mouseX - 3}px, ${mouseY - 4}px, 0) scale(${isNavHovering ? 1 : 0.6})`;

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
