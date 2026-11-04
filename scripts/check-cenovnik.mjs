#!/usr/bin/env node
// Provera posle build:cenovnik. Pada (exit 1) ako:
//  - JSON-LD blokovi u index.html ne mogu da se parsiraju,
//  - broj ponuda u OfferCatalog-u ne odgovara broju stavki u CENOVNIK (ukupno i po kategoriji),
//  - neka ponuda nema ispravnu cenu (price / minPrice+maxPrice, RSD),
//  - broj redova cenovnika u HTML-u (po kategoriji) ne odgovara CENOVNIK-u,
//  - cene u HTML-u ili JSON-LD-u se razlikuju od CENOVNIK-a.
// Bez zavisnosti. Pokretanje: node scripts/check-cenovnik.mjs
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const CENOVNIK = vm.runInNewContext(`${readFileSync(resolve(root, 'assets/js/cenovnik.js'), 'utf8')}\n;CENOVNIK`, {});

const errors = [];
const fail = (msg) => errors.push(msg);
const count = (k) => k.grupe.reduce((n, g) => n + g.stavke.length, 0);
const total = CENOVNIK.reduce((n, k) => n + count(k), 0);

/* ---- JSON-LD ---- */
const blocks = [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)].map((m) => m[1]);
const docs = [];
blocks.forEach((b, i) => {
  try { docs.push(JSON.parse(b)); } catch (e) { fail(`JSON-LD blok #${i + 1} se ne parsira: ${e.message}`); }
});
const catalog = docs.find((d) => d.hasOfferCatalog)?.hasOfferCatalog;
if (!catalog) fail('JSON-LD nema hasOfferCatalog');
else {
  const cats = catalog.itemListElement || [];
  if (cats.length !== CENOVNIK.length) fail(`OfferCatalog ima ${cats.length} kategorija, CENOVNIK ${CENOVNIK.length}`);
  let offers = 0;
  CENOVNIK.forEach((k, i) => {
    const c = cats[i];
    if (!c || c.name !== k.naziv) return fail(`Kategorija ${i + 1}: očekivano "${k.naziv}", u JSON-LD-u "${c?.name}"`);
    const list = c.itemListElement || [];
    offers += list.length;
    if (list.length !== count(k)) fail(`"${k.naziv}": ${list.length} ponuda u JSON-LD-u, ${count(k)} stavki u CENOVNIK`);
    list.forEach((o, j) => {
      const specs = [].concat(o.priceSpecification || []);
      const okSimple = typeof o.price === 'number' && o.priceCurrency === 'RSD';
      const okSpecs = specs.length > 0 && specs.every((s) => s.priceCurrency === 'RSD' && (typeof s.price === 'number' || (typeof s.minPrice === 'number' && typeof s.maxPrice === 'number' && s.minPrice <= s.maxPrice)));
      if (!okSimple && !okSpecs) fail(`"${k.naziv}" ponuda #${j + 1} (${o.name}) nema ispravnu cenu`);
    });
  });
  if (offers !== total) fail(`Ukupno ${offers} ponuda u JSON-LD-u, ${total} stavki u CENOVNIK`);
}

/* ---- HTML ---- */
const decode = (t) => t.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
CENOVNIK.forEach((k) => {
  const m = new RegExp(`<section class="cena-panel" id="cenovnik-panel-${k.id}"[\\s\\S]*?</section>`).exec(html);
  if (!m) return fail(`HTML nema panel za "${k.naziv}"`);
  const rows = [...m[0].matchAll(/<li class="cena-row"><span class="cena-name">(.*?)<\/span><span class="cena-dots"><\/span><span class="cena-price">(.*?)<\/span><\/li>/g)];
  if (rows.length !== count(k)) fail(`"${k.naziv}": ${rows.length} redova u HTML-u, ${count(k)} stavki u CENOVNIK`);
  const expected = k.grupe.flatMap((g) => g.stavke);
  rows.forEach((r, i) => {
    const e = expected[i];
    if (!e) return;
    const price = [...r[2].matchAll(/<span>(.*?)<\/span>/g)].map((x) => decode(x[1])).join(' / ');
    if (decode(r[1]) !== e.naziv || price !== e.cena) fail(`"${k.naziv}" red ${i + 1}: HTML "${decode(r[1])} — ${price}" ≠ CENOVNIK "${e.naziv} — ${e.cena}"`);
  });
});

if (errors.length) {
  console.error(`check-cenovnik: NEUSPEH (${errors.length})\n - ${errors.join('\n - ')}`);
  process.exit(1);
}
console.log(`check-cenovnik: OK — ${CENOVNIK.length} kategorije, ${total} stavki; JSON-LD i HTML se poklapaju sa CENOVNIK`);
