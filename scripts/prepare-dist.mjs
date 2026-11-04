#!/usr/bin/env node
// Kopira samo javne fajlove u dist/ (Netlify objavljuje dist/, pa u deploy ne ulaze
// node_modules, scripts, package.json i sl.). Bez zavisnosti.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const entry of ['index.html', 'robots.txt', 'sitemap.xml', 'assets', 'blog']) {
  const from = resolve(root, entry);
  if (existsSync(from)) cpSync(from, resolve(dist, entry), { recursive: true });
}
console.log('dist/ spreman');
