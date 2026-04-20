// One-shot logo asset generator. Takes the re-tinted SVGs in /public
// and emits the raster assets that the app, PWA manifest, and favicon need.
//
// Run: node scripts/generate-logo-assets.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = resolve(__dirname, '..', 'public');

const iconSvg = readFileSync(resolve(pub, 'logo-icon.svg'));

async function png(size, name) {
  await sharp(iconSvg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(resolve(pub, name));
  console.log('wrote', name);
}

async function webp(size, name) {
  await sharp(iconSvg, { density: 384 })
    .resize(size, size)
    .webp({ quality: 92 })
    .toFile(resolve(pub, name));
  console.log('wrote', name);
}

await png(512, 'logo.png');
await png(192, 'icon-192.png');
await png(256, 'logo-icon.png');
await webp(512, 'logo.webp');

// Favicon (multi-size ICO requires png-to-ico; fall back to 32x32 PNG renamed,
// most browsers accept a PNG-encoded .ico. Keep existing favicon.ico if present.)
console.log('done');
