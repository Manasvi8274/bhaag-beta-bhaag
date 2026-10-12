// Copies the shippable web files into www/ (Capacitor's webDir). Usage: node tools/build.mjs
import { cpSync, rmSync, mkdirSync } from 'node:fs';
const FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'privacy.html', 'icons', 'src', 'vendor'];
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of FILES) cpSync(f, `www/${f}`, { recursive: true });
console.log('www/ ready:', FILES.join(', '));
