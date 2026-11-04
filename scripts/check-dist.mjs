#!/usr/bin/env node
// Provera dist/ posle build:dist. Pada (exit 1) ako:
//  - fali neki obavezan fajl (index.html, favicon fajlovi, manifest, robots, sitemap),
//  - neka blog stranica iz blog/ nije u dist/ ili u sitemap.xml,
//  - neki relativni/korenski link, slika (src/srcset/og:image), putanja iz JS-a, CSS-a,
//    web manifesta ili sitemap-a ne vodi na postojeći fajl u dist/,
//  - sidro (#id) ne postoji u ciljnoj HTML stranici.
// Neiskorišćene slike se samo prijavljuju. Bez zavisnosti.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const SITE = 'https://loungevelickovski.com';
const HOST_RE = new URL(SITE).host.replace(/\./g, '\\.'); // za RegExp
if (!existsSync(dist)) { console.error('check-dist: dist/ ne postoji (pokreni npm run build:dist)'); process.exit(1); }

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const files = new Set(walk(dist).map((f) => relative(dist, f).split('\\').join('/')));
const read = (f) => readFileSync(join(dist, f), 'utf8');
const errors = [];
const fail = (m) => errors.push(m);

const REQUIRED = ['index.html', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', 'assets/css/style.css'];
REQUIRED.forEach((f) => { if (!files.has(f)) fail(`Obavezan fajl fali u dist/: ${f}`); });
if (files.has('assets/css/input.css')) fail('assets/css/input.css ne sme da bude u dist/');

// Primarni domen je https://loungevelickovski.com (bez www): nijedna tekstualna datoteka
// u dist/ ne sme da sadrži netlify.app ni www.loungevelickovski.com.
const FORBIDDEN = [
  { re: /netlify\.app/i, what: 'netlify.app' },
  { re: /www\.loungevelickovski\.com/i, what: 'www.loungevelickovski.com' },
];
for (const f of [...files].filter((x) => /\.(html|xml|txt|json|webmanifest)$/.test(x))) {
  const text = read(f);
  for (const { re, what } of FORBIDDEN) {
    const m = re.exec(text);
    if (m) fail(`${f}: sadrži ${what} (…${text.slice(Math.max(0, m.index - 30), m.index + 45).replace(/\s+/g, ' ')}…)`);
  }
}

const pages = [...files].filter((f) => f.endsWith('.html'));
const srcBlog = existsSync(resolve(root, 'blog')) ? readdirSync(resolve(root, 'blog')).filter((f) => f.endsWith('.html')) : [];
const sitemap = files.has('sitemap.xml') ? read('sitemap.xml') : '';
srcBlog.forEach((f) => {
  if (!files.has(`blog/${f}`)) fail(`blog/${f} nije u dist/`);
  if (!sitemap.includes(`${SITE}/blog/${f}`)) fail(`blog/${f} nije u sitemap.xml`);
});

const idCache = {};
const idsOf = (f) => (idCache[f] ??= new Set([...read(f).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
let checked = 0;
const check = (from, ref, kind) => {
  ref = ref.trim();
  if (!ref || new RegExp(`^(mailto:|tel:|viber:|data:|javascript:|https?://(?!${HOST_RE}))`).test(ref)) return;
  const u = ref.replace(SITE, '');
  const [p, hash] = u.split('#');
  const q = p.split('?')[0];
  let target;
  if (q === '') target = from;
  else if (q.startsWith('/')) target = q.slice(1) || 'index.html';
  else target = posix.normalize(posix.join(posix.dirname(from), q));
  if (target === '' || target.endsWith('/')) target += 'index.html';
  checked++;
  if (!files.has(target)) return fail(`${from}: ${kind} "${ref}" → ${target} ne postoji`);
  if (hash && target.endsWith('.html') && !idsOf(target).has(hash)) fail(`${from}: sidro "#${hash}" ne postoji u ${target} (${ref})`);
};

for (const f of pages) {
  const s = read(f);
  for (const m of s.matchAll(/\s(?:href|src)="([^"]*)"/g)) check(f, m[1], 'link/src');
  for (const m of s.matchAll(/\ssrcset="([^"]*)"/g)) m[1].split(',').forEach((part) => check(f, part.trim().split(/\s+/)[0], 'srcset'));
  for (const m of s.matchAll(/<meta[^>]+property="og:image"[^>]+content="([^"]*)"/g)) check(f, m[1], 'og:image');
  for (const m of s.matchAll(new RegExp(`"(?:image|url|mainEntityOfPage)":"(https://${HOST_RE}[^"]*)"`, 'g'))) check(f, m[1], 'JSON-LD');
  for (const m of s.matchAll(/<(?:link rel="canonical" href|meta property="og:url" content)="([^"]*)"/g)) check(f, m[1], 'canonical/og:url');
}
for (const f of [...files].filter((x) => x.endsWith('.js'))) {
  for (const m of read(f).matchAll(/['"`](assets\/[A-Za-z0-9_\-./]+\.(?:webp|png|jpg|jpeg|svg|css|js))['"`]/g)) check('index.html', m[1], `JS (${f})`);
}
for (const f of [...files].filter((x) => x.endsWith('.css'))) {
  for (const m of read(f).matchAll(/url\(([^)]+)\)/g)) {
    const r = m[1].replace(/['"]/g, '');
    if (!/^(data:|https?:|#)/.test(r)) check(f, r, 'css url()');
  }
}
if (files.has('site.webmanifest')) {
  try {
    const man = JSON.parse(read('site.webmanifest'));
    (man.icons || []).forEach((i) => check('site.webmanifest', i.src, 'manifest icon'));
    if (man.start_url) check('site.webmanifest', man.start_url, 'manifest start_url');
  } catch (e) { fail(`site.webmanifest nije validan JSON: ${e.message}`); }
}
for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) check('sitemap.xml', m[1], 'sitemap');

// neiskorišćene slike (samo upozorenje)
const text = [...files].filter((f) => /\.(html|js|css|webmanifest)$/.test(f)).map(read).join('\n');
const unused = [...files].filter((f) => f.startsWith('assets/images/') && !text.includes(f));

if (errors.length) {
  console.error(`check-dist: NEUSPEH (${errors.length})\n - ${errors.join('\n - ')}`);
  process.exit(1);
}
console.log(`check-dist: OK — ${files.size} fajlova, ${pages.length} HTML stranica, ${checked} referenci provereno`);
if (unused.length) console.log(`  upozorenje: slike koje se nigde ne koriste: ${unused.join(', ')}`);
