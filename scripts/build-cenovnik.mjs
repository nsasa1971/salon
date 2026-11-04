#!/usr/bin/env node
// Generiše HTML cenovnika i JSON-LD OfferCatalog iz CENOVNIK (assets/js/cenovnik.js)
// i upisuje ih u index.html između markera:
//   <!-- CENOVNIK:START --> ... <!-- CENOVNIK:END -->
//   <!-- CENOVNIK-LD:START --> ... <!-- CENOVNIK-LD:END -->
// Bez zavisnosti. Pokretanje: node scripts/build-cenovnik.mjs  (ili npm run build:cenovnik)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataFile = resolve(root, 'assets/js/cenovnik.js');
const htmlFile = resolve(root, 'index.html');
const SITE = 'https://loungevelickovski.com';

const CENOVNIK = vm.runInNewContext(`${readFileSync(dataFile, 'utf8')}\n;CENOVNIK`, {});

const esc = (t) =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- HTML ---------- */
const row = (s) => {
  const price = s.cena.split(' / ').map((p) => `<span>${esc(p)}</span>`).join('');
  return `<li class="cena-row"><span class="cena-name">${esc(s.naziv)}</span><span class="cena-dots"></span><span class="cena-price">${price}</span></li>`;
};

const group = (g) => {
  const parts = ['<div class="cena-group">'];
  if (g.naslov) parts.push(`<h4 class="cena-group__title">${esc(g.naslov)}</h4>`);
  if (g.opis) parts.push(`<p class="cena-group__desc">${esc(g.opis)}</p>`);
  parts.push(`<ul class="cena-list">${g.stavke.map(row).join('')}</ul></div>`);
  return parts.join('');
};

const tab = (k) =>
  `<button type="button" id="cenovnik-tab-${k.id}" class="cena-tab" data-tab="${k.id}" data-cursor-nav aria-selected="false" tabindex="-1">${esc(k.naziv)}</button>`;

const panel = (k) => {
  const cols = k.grupe.length > 1 ? 'cena-groups cena-groups--cols' : 'cena-groups';
  const notes = k.napomene.length
    ? `<ul class="cena-notes">${k.napomene.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
    : '';
  return `<section class="cena-panel" id="cenovnik-panel-${k.id}" aria-labelledby="cenovnik-title-${k.id}">
        <h3 id="cenovnik-title-${k.id}" class="cena-panel__title">${esc(k.naziv)}</h3>
        <div class="${cols}">${k.grupe.map(group).join('')}</div>
        ${notes}
      </section>`;
};

const html = `<!-- CENOVNIK:START (generisano: node scripts/build-cenovnik.mjs — ne menjati ručno) -->
      <div class="cena-tabs-wrap">
        <div id="cenovnik-tabs" class="cena-tabs" aria-label="Kategorije cenovnika">${CENOVNIK.map(tab).join('')}</div>
      </div>
      <div id="cenovnik-panels" class="cena-panels">
      ${CENOVNIK.map(panel).join('\n      ')}
      </div>
      <!-- CENOVNIK:END -->`;

/* ---------- JSON-LD ---------- */
const toNum = (t) => Number(t.replace(/\./g, ''));
const VARIANT = /^(?:(\D+?)\s+)?(\d[\d.]*)(?:–(\d[\d.]*))?\s*RSD$/;

const parseVariant = (text) => {
  const m = VARIANT.exec(text.trim());
  if (!m) throw new Error(`Ne mogu da parsiram cenu: "${text}"`);
  const [, label, a, b] = m;
  return { label: label || null, min: toNum(a), max: b ? toNum(b) : null };
};

const offer = (name, cena) => {
  const variants = cena.split(' / ').map(parseVariant);
  const o = { '@type': 'Offer', name };
  const spec = (v) => {
    const s = { '@type': 'PriceSpecification', priceCurrency: 'RSD' };
    if (v.label) s.name = v.label;
    if (v.max !== null) { s.minPrice = v.min; s.maxPrice = v.max; } else s.price = v.min;
    return s;
  };
  if (variants.length === 1 && !variants[0].label) {
    const v = variants[0];
    if (v.max === null) { o.price = v.min; o.priceCurrency = 'RSD'; } else o.priceSpecification = spec(v);
  } else {
    o.priceSpecification = variants.map(spec);
  }
  return o;
};

const catalog = {
  '@context': 'https://schema.org',
  '@type': 'BeautySalon',
  '@id': `${SITE}/#salon`,
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Cenovnik',
    itemListElement: CENOVNIK.map((k) => ({
      '@type': 'OfferCatalog',
      name: k.naziv,
      itemListElement: k.grupe.flatMap((g) =>
        g.stavke.map((s) => offer(g.naslov ? `${g.naslov} — ${s.naziv}` : s.naziv, s.cena))
      ),
    })),
  },
};
// "</" u JSON-u unutar <script> bi zatvorio tag
const ld = `<!-- CENOVNIK-LD:START (generisano: node scripts/build-cenovnik.mjs) -->
<script type="application/ld+json">
${JSON.stringify(catalog).replace(/</g, '\\u003c')}
</script>
<!-- CENOVNIK-LD:END -->`;

/* ---------- upis ---------- */
const replaceBetween = (src, start, end, block) => {
  const a = src.indexOf(start);
  const b = src.indexOf(end);
  if (a < 0 || b < 0 || b < a) throw new Error(`Nedostaju markeri ${start} / ${end} u index.html`);
  return src.slice(0, a) + block + src.slice(b + end.length);
};

let page = readFileSync(htmlFile, 'utf8');
page = replaceBetween(page, '<!-- CENOVNIK:START', '<!-- CENOVNIK:END -->', html);
page = replaceBetween(page, '<!-- CENOVNIK-LD:START', '<!-- CENOVNIK-LD:END -->', ld);
writeFileSync(htmlFile, page);

const total = CENOVNIK.reduce((n, k) => n + k.grupe.reduce((m, g) => m + g.stavke.length, 0), 0);
console.log(`cenovnik: ${CENOVNIK.length} kategorije, ${total} stavki upisano u index.html`);
