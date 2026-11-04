#!/usr/bin/env node
// Kopira samo javne fajlove u dist/ (Netlify objavljuje dist/, pa u deploy ne ulaze
// node_modules, scripts, package.json i sl.). Bez zavisnosti.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
// Izvorni fajlovi koji se ne objavljuju (relativno od korena repoa).
const EXCLUDE = new Set(['assets/css/input.css']);
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
const ENTRIES = [
  'index.html', 'robots.txt', 'sitemap.xml', 'assets', 'blog',
  // favicon + PWA manifest u korenu sajta
  'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest',
];
for (const entry of ENTRIES) {
  const from = resolve(root, entry);
  if (!existsSync(from)) continue;
  cpSync(from, resolve(dist, entry), {
    recursive: true,
    filter: (src) => !EXCLUDE.has(relative(root, src).split('\\').join('/')),
  });
}
console.log('dist/ spreman');
