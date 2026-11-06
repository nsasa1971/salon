'use strict';

// Broj na koji stižu WhatsApp/SMS zahtevi posle slanja forme za zakazivanje.
const BROJ_ZA_ZAHTEVE = '381692121966'; // broj salona za WhatsApp/SMS posle slanja forme

/* ---------- Sticky header ---------- */
const header = document.getElementById('site-header');
const onScrollHeader = () => {
  header.classList.toggle('bg-dark', window.scrollY > 40);
  header.classList.toggle('shadow-lg', window.scrollY > 40);
};
document.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

/* ---------- Header height -> --header-h (used by scroll-margin-top on sections) ---------- */
const syncHeaderHeight = () =>
  document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
syncHeaderHeight();
window.addEventListener('resize', syncHeaderHeight);

/* ---------- Anchor links (/#booking, /#cenovnik, ?tab=kosa#cenovnik) ----------
   Backup only: web fonts and lazy images can still change section heights after
   the browser has scrolled to the hash. Once the page has loaded (and again when
   fonts are ready) jump to the target once more, without animation — unless the
   user has already started scrolling. */
(() => {
  if (!location.hash || location.hash.length < 2) return;
  let target = null;
  try { target = document.querySelector(location.hash); } catch { return; }
  if (!target) return;
  let touched = false;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) =>
    window.addEventListener(ev, () => { touched = true; }, { once: true, passive: true })
  );
  const align = () => {
    if (touched) return;
    syncHeaderHeight();
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
  };
  const onLoad = () => {
    align();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(align);
  };
  if (document.readyState === 'complete') onLoad();
  else window.addEventListener('load', onLoad, { once: true });
})();

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

/* ---------- "Zakažite termin" buttons scroll to the on-page booking form ---------- */
document.querySelectorAll('[data-open-booking]').forEach((btn) => {
  btn.addEventListener('click', () => {
    closeMenu();
    closeBlogPanel();
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ---------- Hero slider: live water-ripple on desktop, plain crossfade on touch ---------- */
const heroSection = document.getElementById('home');
let heroCanvas = document.getElementById('hero-ripple');
const heroFallbackImgs = Array.from(document.querySelectorAll('[data-hero-fallback-slide]'));
const heroDots = Array.from(document.querySelectorAll('[data-hero-dot]'));

// Same choice as the <picture> sources in the HTML: portrait photos below 768px,
// the wide panorama + two interior shots (cropped wide) from 768px up.
const narrowHero = window.matchMedia('(max-width: 767px)').matches;
const HERO_DIR = 'assets/images/salon/';
const heroSlides = narrowHero
  ? [
      { src: `${HERO_DIR}enterijer-recepcija.webp`, focusY: 0.45 },
      { src: `${HERO_DIR}enterijer-logo-zid.webp`, focusY: 0.4 },
      { src: `${HERO_DIR}frizura-talasi.webp`, focusY: 0.35 },
    ]
  : [
      { src: `${HERO_DIR}spolja-panorama-2.webp`, focusY: 0.5 },
      { src: `${HERO_DIR}enterijer-logo-zid.webp`, focusY: 0.45 },
      { src: `${HERO_DIR}enterijer-recepcija.webp`, focusY: 0.5 },
    ];

// The ripple needs a mouse to react to and is pure visual flourish, so it's
// desktop-only: skipped on touch devices for battery/performance, and it also
// sidesteps having to force every photo through a fixed-aspect canvas crop —
// the plain <img> fallback instead adapts to each device's own aspect ratio
// (portrait phones included).
const isDesktopHero = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
let ripple = null;

// A WebGL context can be lost at any time (GPU reclaims it while the canvas is
// off-screen, driver reset, memory pressure) and browsers don't always restore
// it. Once lost, a canvas can never get a working context back, so recovery
// means swapping in a brand-new <canvas> and a new RippleCanvas instance.
const buildRipple = () => {
  if (ripple) {
    ripple.stop();
    const fresh = heroCanvas.cloneNode(false);
    heroCanvas.replaceWith(fresh);
    heroCanvas = fresh;
  }
  ripple = new window.RippleCanvas(heroCanvas, { resolution: 300 });
  // Hidden canvas lets the static fallback <img> underneath show instead of a blank frame.
  heroCanvas.style.display = ripple.supported ? '' : 'none';
};

if (isDesktopHero && heroCanvas && window.RippleCanvas) buildRipple();
const rippleSupported = !!ripple && ripple.supported;

let slideCanvas;
let slideCtx;
const heroImages = [];

// Photos are requested on demand (the first one at once, the others shortly after the
// page has loaded), so the first paint only pays for the first slide.
const getHeroImage = (i) => {
  if (!heroImages[i]) {
    const img = new Image();
    img.src = heroSlides[i].src;
    heroImages[i] = img;
  }
  return heroImages[i];
};

if (rippleSupported) {
  slideCanvas = document.createElement('canvas');
  slideCtx = slideCanvas.getContext('2d');
  getHeroImage(0);
}

// Mimics CSS `background-size: cover` with a per-image vertical focus point,
// since a WebGL texture is sampled 0..1 across the canvas and would otherwise
// stretch non-uniformly if drawn at the source photo's own aspect ratio.
const drawImageCover = (img, focusY) => {
  // The texture has the aspect ratio of the real canvas (so it is never stretched) and
  // is never larger than the photo itself (so the photo is never upscaled).
  ripple.resize();
  const cw0 = Math.max(2, heroCanvas.width || 1600);
  const ch0 = Math.max(2, heroCanvas.height || 900);
  const fit = Math.min(1, 1 / Math.max(cw0 / img.naturalWidth, ch0 / img.naturalHeight));
  const cw = Math.max(2, Math.round(cw0 * fit));
  const ch = Math.max(2, Math.round(ch0 * fit));
  if (slideCanvas.width !== cw || slideCanvas.height !== ch) {
    slideCanvas.width = cw;
    slideCanvas.height = ch;
  }
  const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  slideCtx.clearRect(0, 0, cw, ch);
  slideCtx.drawImage(img, (cw - drawW) / 2, (ch - drawH) * focusY, drawW, drawH);
};

const paintHeroSlide = (index) => {
  if (rippleSupported && ripple.supported) {
    const slide = heroSlides[index];
    const img = getHeroImage(index);
    const apply = () => {
      drawImageCover(img, slide.focusY);
      ripple.setBackground(slideCanvas);
    };
    if (img.complete && img.naturalWidth) apply();
    else img.addEventListener('load', apply, { once: true });
  }
  heroFallbackImgs.forEach((el, i) => {
    if (i === index) el.loading = 'eager';
    el.classList.toggle('is-active', i === index);
  });
};

// Requests a slide's photo ahead of time: the canvas photo in ripple mode, otherwise
// the (until then display:none) fallback <img>.
const warmHeroSlide = (i) => {
  const idx = i % heroSlides.length;
  if (rippleSupported && ripple.supported) getHeroImage(idx);
  else if (heroFallbackImgs[idx]) {
    heroFallbackImgs[idx].loading = 'eager';
    heroFallbackImgs[idx].classList.add('is-ready');
  }
};

let heroIndex = 0;
let heroTimer;
let heroTransitioning = false;

let heroWarmEnabled = false; // set shortly after the page has loaded
const updateHeroDots = () => {
  if (heroWarmEnabled) warmHeroSlide(heroIndex + 1);
  heroDots.forEach((dot, i) => dot.classList.toggle('is-active', i === heroIndex));
};

const goToHeroSlide = (index) => {
  if (heroTransitioning || index === heroIndex) return;
  heroTransitioning = true;

  if (rippleSupported) {
    ripple.drop(0.5, 0.5, 0.55, 0.9);
    ripple.drop(0.22, 0.62, 0.35, 0.6);
    ripple.drop(0.78, 0.4, 0.35, 0.6);

    window.setTimeout(() => {
      paintHeroSlide(index);
      heroIndex = index;
      updateHeroDots();
      ripple.drop(0.5, 0.5, 0.6, 0.65);
      heroTransitioning = false;
    }, 260);
  } else {
    paintHeroSlide(index);
    heroIndex = index;
    updateHeroDots();
    heroTransitioning = false;
  }
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

if (rippleSupported && heroSection) {
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
    if (!document.hasFocus()) return;
    ripple.drop(0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7, 0.07 + Math.random() * 0.05, 0.3 + Math.random() * 0.2);
  }, 2600);

  let heroResizeTimer;
  window.addEventListener('resize', () => {
    ripple.resize();
    clearTimeout(heroResizeTimer);
    heroResizeTimer = setTimeout(() => paintHeroSlide(heroIndex), 200); // redraw the texture for the new aspect ratio
  });

  // A canvas left off-screen for a while (e.g. the user reading all the way
  // down a long page) is a classic trigger for the GPU silently reclaiming
  // its WebGL context — and some browsers only finish restoring it once the
  // canvas is actually composited again, which can stall forever if nothing
  // nudges it. Treat "scrolled back into view" as a cue to double-check the
  // ripple is alive: refresh its backing size, repaint the current slide's
  // texture, and restart the render loop if it somehow isn't running.
  let heroInView = true;
  let rebuildAttempts = 0;
  const rippleBroken = () => !ripple.supported || ripple.gl.isContextLost();

  const rebuildRipple = () => {
    buildRipple();
    if (ripple.supported) {
      paintHeroSlide(heroIndex);
      ripple.start();
    }
  };

  const heroVisibilityObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        heroInView = entry.isIntersecting;
        if (!entry.isIntersecting) return;
        if (rippleBroken()) {
          rebuildAttempts = 0;
          rebuildRipple();
          return;
        }
        ripple.resize();
        paintHeroSlide(heroIndex);
        if (!ripple._running) ripple.start();
      });
    },
    { threshold: 0.1 }
  );
  heroVisibilityObserver.observe(heroSection);

  // Watchdog: if the context is lost while the hero is on screen (or a rebuild
  // didn't take), keep retrying with a fresh canvas — a few times, then stop
  // and leave the static image showing.
  window.setInterval(() => {
    if (!rippleBroken()) {
      rebuildAttempts = 0;
      return;
    }
    if (!heroInView || rebuildAttempts >= 8) return;
    rebuildAttempts++;
    rebuildRipple();
  }, 1200);
}

if (heroDots.length) {
  paintHeroSlide(0);
  updateHeroDots();
  startHeroAutoplay();
  if (rippleSupported) ripple.start();

  // Fetch the next slide once the page is loaded and idle (not during the first paint).
  const enableHeroWarmup = () =>
    setTimeout(() => {
      heroWarmEnabled = true;
      warmHeroSlide(heroIndex + 1);
    }, 2500);
  if (document.readyState === 'complete') enableHeroWarmup();
  else window.addEventListener('load', enableHeroWarmup, { once: true });
}

/* ---------- Gallery filter ---------- */
const galleryFilter = document.querySelector('.gal-filter');
if (galleryFilter) {
  const filterButtons = Array.from(galleryFilter.querySelectorAll('[data-filter]'));
  const galleryItems = Array.from(document.querySelectorAll('#gallery-grid .gal-item'));
  filterButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const wanted = btn.dataset.filter;
      filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      galleryItems.forEach((item) => {
        item.hidden = wanted !== 'sve' && item.dataset.cat !== wanted;
      });
    })
  );
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

// Autoplay: advance one card every few seconds, wrap back to the start at the
// end, pause while hovered / focused / touched, and stay still for users who
// prefer reduced motion.
const SERVICES_AUTOPLAY_MS = 3500;
let servicesPaused = false;
let servicesTimer;

const advanceServices = () => {
  if (!servicesTrack || servicesPaused || document.hidden) return;
  const atEnd = servicesTrack.scrollLeft + servicesTrack.clientWidth >= servicesTrack.scrollWidth - 8;
  if (atEnd) servicesTrack.scrollTo({ left: 0, behavior: 'smooth' });
  else scrollServicesBy(1);
};

const startServicesAutoplay = () => {
  clearInterval(servicesTimer);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  servicesTimer = setInterval(advanceServices, SERVICES_AUTOPLAY_MS);
};

if (servicesTrack) {
  const pause = () => { servicesPaused = true; };
  const resume = () => { servicesPaused = false; };
  ['mouseenter', 'focusin', 'touchstart', 'pointerdown'].forEach((ev) => servicesTrack.addEventListener(ev, pause, { passive: true }));
  ['mouseleave', 'focusout', 'touchend', 'pointerup'].forEach((ev) => servicesTrack.addEventListener(ev, () => setTimeout(resume, 1500), { passive: true }));
  [servicesPrev, servicesNext].forEach((btn) => btn?.addEventListener('click', () => { servicesPaused = true; setTimeout(resume, 4000); }));
  startServicesAutoplay();
}

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

/* ---------- Online booking form (Netlify Forms) ---------- */
const bookingForm = document.getElementById('booking-form');
if (bookingForm) {
  const feedback = document.getElementById('booking-feedback');
  // ----- Date field: dd-mm-gggg text input (the native control follows the phone's
  // locale and can show Cyrillic placeholders) with an optional calendar picker -----
  const dateInput = bookingForm.querySelector('#b-date');
  const dateNative = bookingForm.querySelector('#b-date-native');
  const datePick = bookingForm.querySelector('#b-date-pick');
  const pad = (n) => String(n).padStart(2, '0');
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  if (dateNative) dateNative.min = `${todayDate.getFullYear()}-${pad(todayDate.getMonth() + 1)}-${pad(todayDate.getDate())}`;

  const validateDate = () => {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateInput.value);
    let msg = '';
    if (!m) msg = 'Unesite datum u formatu dd-mm-gggg.';
    else {
      const d = new Date(+m[3], +m[2] - 1, +m[1]);
      if (d.getFullYear() !== +m[3] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[1]) msg = 'Taj datum ne postoji.';
      else if (d < todayDate) msg = 'Datum ne može biti u prošlosti.';
    }
    dateInput.setCustomValidity(msg);
  };

  dateInput.addEventListener('input', () => {
    const digits = dateInput.value.replace(/\D/g, '').slice(0, 8);
    dateInput.value = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('-');
    validateDate();
  });
  dateInput.addEventListener('blur', validateDate);

  datePick?.addEventListener('click', () => {
    if (dateNative.showPicker) dateNative.showPicker();
    else dateNative.focus();
  });
  dateNative?.addEventListener('change', () => {
    const [y, mo, d] = dateNative.value.split('-');
    if (y) { dateInput.value = `${d}-${mo}-${y}`; validateDate(); }
  });
  bookingForm.addEventListener('reset', () => setTimeout(() => dateInput.setCustomValidity(''), 0));

  const showFeedback = (text, ok) => {
    feedback.textContent = text;
    feedback.className = `mt-3 rounded-2xl px-4 py-3 text-center text-sm ${ok ? 'bg-primary/15 text-primary-light' : 'bg-red-500/15 text-red-200'}`;
  };

  // ----- Multi-select service picker -----
  const picker = document.getElementById('service-picker');
  const toggle = document.getElementById('service-toggle');
  const panel = document.getElementById('service-panel');
  const summary = document.getElementById('service-summary');
  const chips = document.getElementById('service-chips');
  const serviceError = document.getElementById('service-error');
  const boxes = () => Array.from(panel.querySelectorAll('input[type="checkbox"]'));

  const setPanel = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) panel.scrollTop = 0;
  };

  const renderServices = () => {
    const picked = boxes().filter((b) => b.checked);
    summary.textContent = picked.length
      ? `${picked.length} ${picked.length === 1 ? 'usluga izabrana' : picked.length < 5 ? 'usluge izabrane' : 'usluga izabrano'}`
      : 'Izaberite jednu ili više usluga…';
    summary.classList.toggle('text-white/40', !picked.length);
    chips.replaceChildren(
      ...picked.map((b) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'flex max-w-full items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-left text-xs text-primary-light';
        chip.setAttribute('aria-label', `Ukloni: ${b.value}`);
        chip.innerHTML = '<span class="truncate"></span><span aria-hidden="true">×</span>';
        chip.firstChild.textContent = b.value;
        chip.addEventListener('click', () => { b.checked = false; renderServices(); });
        return chip;
      })
    );
    if (picked.length) serviceError.classList.add('hidden');
  };

  toggle.addEventListener('click', () => setPanel(panel.hidden));
  panel.addEventListener('change', renderServices);
  document.addEventListener('click', (e) => { if (!picker.contains(e.target)) setPanel(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setPanel(false); });
  bookingForm.addEventListener('reset', () => setTimeout(renderServices, 0));

  // ----- Posle uspešnog slanja: poruka + WhatsApp/SMS dugmad (bez automatskog preusmeravanja) -----
  const result = document.getElementById('booking-result');
  let resetTimer;

  const buildRequestMessage = (form) => {
    const data = new FormData(form);
    const val = (name) => String(data.get(name) || '').trim();
    const services = data.getAll('usluga').map((v) => String(v).trim()).filter(Boolean);
    const date = val('datum').replace(/-/g, '.');
    const lines = [
      'Zdravo, želim da zakažem termin.',
      services.length ? `Usluge: ${services.join(', ')}` : '',
      date ? `Datum: ${date}.` : '',
      val('vreme') ? `Vreme: ${val('vreme')}` : '',
      val('ime') ? `Ime: ${val('ime')}` : '',
      val('telefon') ? `Telefon: ${val('telefon')}` : '',
      val('napomena') ? `Napomena: ${val('napomena')}` : '',
    ];
    return lines.filter(Boolean).join('\n');
  };

  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS se predstavlja kao Mac

  const messageLinks = (message, ios = isIOS()) => {
    const text = encodeURIComponent(message);
    return {
      wa: `https://wa.me/${BROJ_ZA_ZAHTEVE}?text=${text}`,
      sms: `sms:+${BROJ_ZA_ZAHTEVE}${ios ? '&' : '?'}body=${text}`,
    };
  };

  const make = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const resetBooking = () => {
    clearTimeout(resetTimer);
    result.replaceChildren();
    feedback.className = 'mt-3 hidden rounded-2xl px-4 py-3 text-center text-sm';
    bookingForm.reset();
    bookingForm.hidden = false;
  };

  function showSuccess(message) {
    const links = messageLinks(message);
    const btn = 'flex items-center justify-center gap-2 rounded-full border border-white/40 px-3 py-4 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-primary hover:text-primary-light';

    const title = make('h3', 'font-display text-2xl leading-snug outline-none sm:text-3xl', 'Zahtev je poslat. Javićemo vam se da potvrdimo termin.');
    title.id = 'booking-success-title';
    title.tabIndex = -1;

    const wa = make('a', btn);
    wa.href = links.wa;
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('data-cursor-nav', '');
    const icon = document.createElement('img');
    icon.src = 'assets/images/icon-whatsapp.webp';
    icon.alt = '';
    icon.width = 96;
    icon.height = 96;
    icon.className = 'h-5 w-5 shrink-0 object-contain';
    wa.append(icon, make('span', '', 'WhatsApp'));

    const sms = make('a', btn);
    sms.href = links.sms;
    sms.setAttribute('data-cursor-nav', '');
    sms.innerHTML = '<svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1121 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg>';
    sms.append(make('span', '', 'SMS'));

    const grid = make('div', 'mt-6 grid grid-cols-2 gap-3');
    grid.append(wa, sms);

    const again = make('button', 'mt-6 text-xs font-semibold uppercase tracking-wider text-primary-light underline underline-offset-4 transition hover:text-primary', 'Pošalji novi zahtev');
    again.type = 'button';
    again.id = 'booking-again';
    again.setAttribute('data-cursor-nav', '');
    again.addEventListener('click', () => {
      resetBooking();
      bookingForm.querySelector('#b-name')?.focus({ preventScroll: true });
    });

    result.replaceChildren(title, make('p', 'mt-4 text-sm text-white/70', 'Ako želite brži odgovor, pošaljite nam zahtev i porukom:'), grid, again);
    feedback.className = 'hidden';
    bookingForm.hidden = true;
    title.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Forma se ne resetuje odmah (da dugmad ostanu dostupna) — automatski posle 60 s.
    clearTimeout(resetTimer);
    resetTimer = setTimeout(resetBooking, 60000);
  }

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!boxes().some((b) => b.checked)) {
      serviceError.classList.remove('hidden');
      setPanel(true);
      picker.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    validateDate();
    if (!bookingForm.checkValidity()) {
      bookingForm.reportValidity();
      return;
    }
    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-60');
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(bookingForm)).toString(),
      });
      if (!res.ok) throw new Error(res.status);
      // Poruka se sastavlja od podataka iz forme pre bilo kakvog resetovanja.
      showSuccess(buildRequestMessage(bookingForm));
    } catch {
      showFeedback('Slanje nije uspelo. Pokušajte ponovo za nekoliko trenutaka.', false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-60');
    }
  });
}

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

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    // Unconditional (not one-time-gated): self-heals if a stray mouseleave
    // — e.g. from dragging the native scrollbar — ever hides the cursor.
    cursorDot.classList.add('is-active');
    cursorRing.classList.add('is-active');
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
