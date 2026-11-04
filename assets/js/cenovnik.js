'use strict';

/* =====================================================================
   CENOVNIK — jedino mesto gde se menjaju cene i usluge.
   Struktura:
     kategorija: { id, naziv, grupe: [...], napomene: [...] }
     grupa:      { naslov (opciono), opis (opciono), pojedinacno (opciono), stavke: [...] }
     stavka:     { naziv, cena }   // cena je tekst; " / " lomi cenu u dva reda
   `pojedinacno: true` — u formi za zakazivanje se nude pojedinačne stavke
   grupe (a ne naziv grupe).
   HTML cenovnika generiše `scripts/build-cenovnik.mjs` (npm run build:cenovnik)
   i upisuje ga u index.html između CENOVNIK:START i CENOVNIK:END.
   Ovaj fajl u browseru samo uključuje tabove i gradi listu usluga u formi.
   ===================================================================== */
const CENOVNIK = [
  {
    id: 'kosa',
    naziv: 'Kosa',
    grupe: [
      {
        naslov: 'Feniranje – ravno',
        stavke: [
          { naziv: 'Kratka kosa', cena: '1.300 RSD' },
          { naziv: 'Srednja kosa', cena: '1.500 RSD' },
          { naziv: 'Duga kosa', cena: '1.700 RSD' },
          { naziv: 'Ekstra duga kosa', cena: '1.900 RSD' },
        ],
      },
      {
        naslov: 'Feniranje na četke – talasi',
        stavke: [
          { naziv: 'Srednja kosa', cena: '1.900 RSD' },
          { naziv: 'Duga kosa', cena: '2.100 RSD' },
        ],
      },
      {
        naslov: 'Uvijanje presom – talasi',
        stavke: [
          { naziv: 'Srednja kosa', cena: '2.000 RSD' },
          { naziv: 'Duga kosa', cena: '2.200 RSD' },
        ],
      },
      {
        naslov: 'Blowout stilizovanje',
        stavke: [
          { naziv: 'Srednja kosa', cena: '2.000 RSD' },
          { naziv: 'Duga kosa', cena: '2.200 RSD' },
        ],
      },
      {
        naslov: 'Triple presa',
        stavke: [
          { naziv: 'Srednja kosa', cena: '2.200 RSD' },
          { naziv: 'Duga kosa', cena: '2.500 RSD' },
        ],
      },
      {
        naslov: 'Uvijanje ili triple presa bez pranja',
        stavke: [
          { naziv: 'Srednja kosa', cena: '1.500 RSD' },
          { naziv: 'Duga kosa', cena: '2.000 RSD' },
        ],
      },
      {
        naslov: 'Ostalo',
        pojedinacno: true,
        stavke: [
          { naziv: 'Pranje kose', cena: '1.200 RSD' },
          { naziv: 'Svečane frizure (punđe)', cena: '3.000–5.000 RSD' },
          { naziv: 'Rep', cena: '1.000–1.500 RSD' },
          { naziv: 'Riblja kost', cena: 'jedna 600 RSD / dve 1.200 RSD' },
        ],
      },
      {
        naslov: 'Farbanje – izrastak',
        stavke: [
          { naziv: 'Standardni izrastak', cena: '5.800 RSD' },
          { naziv: 'Dublji izrastak', cena: '6.200 RSD' },
        ],
      },
      {
        naslov: 'Farbanje cele dužine',
        stavke: [
          { naziv: 'Srednja kosa', cena: '7.500 RSD' },
          { naziv: 'Duga kosa', cena: '9.000 RSD' },
        ],
      },
      {
        naslov: 'Dia preliv',
        stavke: [
          { naziv: 'Koren', cena: '3.000 RSD' },
          { naziv: 'Srednja kosa', cena: '3.700 RSD' },
          { naziv: 'Duga kosa', cena: '4.200 RSD' },
        ],
      },
      {
        naslov: 'Tehnike posvetljivanja',
        stavke: [
          { naziv: 'Balayage', cena: '8.500–10.000 RSD' },
          { naziv: 'Površinski pramenovi', cena: 'srednja 5.000 RSD / duga 6.000 RSD' },
          { naziv: 'Pramenovi, cela kosa', cena: 'srednja 10.000 RSD / duga 12.000 RSD' },
          { naziv: 'AirTouch', cena: 'srednja 12.000 RSD / duga 14.000 RSD' },
          { naziv: 'Skidanje boje', cena: 'srednja 9.000 RSD / duga 15.000 RSD' },
          { naziv: 'Blanš pranje', cena: 'srednja 4.000 RSD / duga 6.000 RSD' },
        ],
      },
      {
        naslov: 'Šišanje',
        stavke: [
          { naziv: 'Krajevi / Medical Cut', cena: '2.200 RSD' },
          { naziv: 'Šišanje, srednja kosa', cena: '3.000 RSD' },
          { naziv: 'Šišanje, duga kosa', cena: '4.000 RSD' },
          { naziv: 'Muško šišanje', cena: '2.000 RSD' },
          { naziv: 'Dečje šišanje, dečaci', cena: '1.000 RSD' },
          { naziv: 'Dečje šišanje, devojčice', cena: '1.500 RSD' },
        ],
      },
      {
        naslov: 'Tretmani i nega kose',
        stavke: [
          { naziv: 'Maska za kosu', cena: '500 RSD' },
          { naziv: 'Detox piling i masaža', cena: '1.700 RSD' },
          { naziv: 'Metal Detox tretman', cena: '2.400 RSD' },
          { naziv: 'Vitamino Color tretman', cena: '3.500 RSD' },
          { naziv: 'Molekularni tretman Lux (sa feniranjem)', cena: '6.500–7.500 RSD' },
          { naziv: 'Classic Combo tretman', cena: '5.500–6.500 RSD' },
        ],
      },
    ],
    napomene: [
      'Konačna cena pojedinih usluga zavisi od dužine, gustine i stanja kose, kao i od količine utrošenog materijala.',
    ],
  },
  {
    id: 'nokti',
    naziv: 'Nokti',
    grupe: [
      {
        naslov: 'Manikir',
        stavke: [
          { naziv: 'Gel lak', cena: '2.700 RSD' },
          { naziv: 'Ojačavanje prirodnih noktiju', cena: '3.000 RSD' },
          { naziv: 'Frenč, fejd, hrom i ukrašavanje', cena: 'doplata 500 RSD' },
        ],
      },
      {
        naslov: 'Izlivanje na šablonu',
        stavke: [
          { naziv: 'Do keca', cena: '3.500 RSD / korekcija 3.000 RSD' },
          { naziv: 'Do dvojke', cena: '4.000 RSD / korekcija 3.500 RSD' },
          { naziv: 'Do trojke', cena: '5.000 RSD / korekcija 4.300 RSD' },
          { naziv: 'Do četvorke', cena: '6.000 RSD / korekcija 5.500 RSD' },
        ],
      },
      {
        naslov: 'Pedikir',
        stavke: [
          { naziv: 'Gel lak na nogama', cena: '2.500 RSD / korekcija 2.000 RSD' },
          { naziv: 'Ruski pedikir sa podo diskovima i gel lakom', cena: '4.500 RSD' },
          { naziv: 'Gel lak i protetika', cena: '3.000 RSD' },
          { naziv: 'Skidanje materijala sa zanokticama', cena: '2.000 RSD' },
          { naziv: 'Medicinski pedikir', cena: '4.500 RSD' },
        ],
      },
    ],
    napomene: [
      'Cena korekcije važi za najviše 2 polomljena nokta. Preko toga se naplaćuje 500 RSD po noktu ili po regularnoj ceni izlivanja.',
      'Korekcija nakon 4 nedelje doplaćuje se 700 RSD.',
    ],
  },
  {
    id: 'trepavice-obrve',
    naziv: 'Trepavice i obrve',
    grupe: [
      {
        stavke: [
          { naziv: 'Lash lift i brow lift (sa farbanjem)', cena: '5.500 RSD' },
          { naziv: 'Lash lift i brow lift (sa farbanjem) + botoks za regeneraciju', cena: '6.000 RSD' },
          { naziv: 'Brow lift', cena: '3.000 RSD' },
          { naziv: 'Lash lift', cena: '3.600 RSD' },
        ],
      },
    ],
    napomene: [],
  },
  {
    id: 'maderoterapija',
    naziv: 'Maderoterapija',
    grupe: [
      {
        naslov: 'Maderoterapija',
        stavke: [
          { naziv: 'Single tretman, 30–35 min', cena: '2.500 RSD' },
          { naziv: 'Full Body maderoterapija, 45 min', cena: '3.200 RSD' },
        ],
      },
      {
        naslov: 'Paketi – samo maderoterapija',
        stavke: [
          { naziv: '10 × 30–35 min', cena: '22.000 RSD' },
          { naziv: '10 × 45 min, Full Body', cena: '28.000 RSD' },
        ],
      },
      {
        naslov: 'Madero Termo Body Wrap',
        opis: 'Maderoterapija drvenim oklagijama, termo gel na stomak i bokove i profesionalno body wrapping umotavanje',
        stavke: [
          { naziv: 'Single tretman', cena: '3.500 RSD' },
          { naziv: 'Paket od 5 tretmana', cena: '16.000 RSD' },
          { naziv: 'Paket od 10 tretmana', cena: '30.000 RSD' },
        ],
      },
    ],
    napomene: [],
  },
];

/* ---------------------------------------------------------------------
   Runtime (samo u browseru): tabovi + lista usluga u formi.
   HTML cenovnika je već u index.html; bez JS-a su svi paneli vidljivi.
   --------------------------------------------------------------------- */
(() => {
  if (typeof document === 'undefined') return; // build skripta učitava samo podatke

  const tablist = document.getElementById('cenovnik-tabs');
  const tabs = tablist ? Array.from(tablist.querySelectorAll('[data-tab]')) : [];
  const panels = tabs.map((tab) => document.getElementById(`cenovnik-panel-${tab.dataset.tab}`));

  if (tabs.length && panels.every(Boolean)) {
    // Uključi režim sa tabovima.
    document.documentElement.classList.add('js');
    tablist.setAttribute('role', 'tablist');
    tabs.forEach((tab, i) => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panels[i].id);
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].setAttribute('aria-labelledby', tab.id);
      panels[i].tabIndex = 0;
    });

    const selectTab = (index, { focus = false } = {}) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].classList.toggle('is-active', on);
      });
      if (focus) tabs[index].focus();
      // Horizontalno centriraj aktivni tab u traci (bez skrolovanja cele stranice).
      const t = tabs[index];
      tablist.scrollTo({ left: t.offsetLeft - (tablist.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => selectTab(i));
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        selectTab(next, { focus: true });
      });
    });

    // <a href="#cenovnik" data-open-tab="kosa"> otvara odgovarajući tab.
    document.querySelectorAll('[data-open-tab]').forEach((link) => {
      link.addEventListener('click', () => {
        const idx = tabs.findIndex((t) => t.dataset.tab === link.dataset.openTab);
        if (idx >= 0) selectTab(idx);
      });
    });

    selectTab(0);
  }

  /* -------------------------------------------------------------------
     Izbor usluga u formi za zakazivanje — gradi se iz CENOVNIK-a.
     ------------------------------------------------------------------- */
  const picker = document.getElementById('service-panel');
  if (!picker) return;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const option = (value, label) => {
    const wrap = el('label', 'flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-[13px] leading-snug hover:bg-white/5 sm:text-sm');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'usluga';
    input.value = value;
    input.className = 'peer sr-only';
    const box = el('span', 'chk mt-0.5');
    box.setAttribute('aria-hidden', 'true');
    wrap.append(input, box, el('span', 'min-w-0 flex-1 text-white/80 peer-checked:text-white', label));
    return wrap;
  };
  const heading = (text) =>
    el('p', 'sticky top-0 z-10 bg-dark-soft px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-light', text);

  CENOVNIK.forEach((kat) => {
    picker.append(heading(kat.naziv));
    kat.grupe.forEach((g) => {
      if (g.naslov && !g.pojedinacno) {
        picker.append(option(`${kat.naziv} — ${g.naslov}`, g.naslov));
      } else {
        g.stavke.forEach((s) => picker.append(option(`${kat.naziv} — ${s.naziv}`, s.naziv)));
      }
    });
  });
  picker.append(heading('Ostalo'));
  picker.append(option('Nisam sigurna/an — treba mi savet', 'Nisam sigurna/an — treba mi savet'));
})();
