// Generates raster logo assets from the brand illustration (family3.webp).
// Run: node scripts/generate-logo-assets.mjs
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = resolve(__dirname, '..', 'public');
const brandSrc = resolve(pub, 'illustrations', 'family3.webp');

async function png(size, name) {
  await sharp(brandSrc)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(resolve(pub, name));
  console.log('wrote', name);
}

async function webp(size, name) {
  await sharp(brandSrc)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .webp({ quality: 92 })
    .toFile(resolve(pub, name));
  console.log('wrote', name);
}

await png(512, 'logo.png');
await png(192, 'icon-192.png');
await png(256, 'logo-icon.png');
await webp(512, 'logo.webp');

console.log('done');
