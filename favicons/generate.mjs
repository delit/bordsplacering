import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svg = fs.readFileSync(path.join(__dirname, 'icon.svg'));

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('Install sharp: npm install sharp --prefix ..');
  process.exit(1);
}

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(path.join(__dirname, name));
  console.log('Wrote', name);
}

const ico16 = await sharp(svg).resize(16, 16).png().toBuffer();
const ico32 = await sharp(svg).resize(32, 32).png().toBuffer();
const ico48 = await sharp(svg).resize(48, 48).png().toBuffer();

// Build minimal ICO (PNG embedded)
function pngToIco(buffers) {
  const count = buffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = 6 + count * 16;
  const entries = [];
  const parts = [header];
  const dims = [16, 32, 48];
  for (let i = 0; i < count; i++) {
    const e = Buffer.alloc(16);
    e.writeUInt8(dims[i] === 256 ? 0 : dims[i], 0);
    e.writeUInt8(dims[i] === 256 ? 0 : dims[i], 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buffers[i].length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    parts.push(e);
    offset += buffers[i].length;
  }
  for (const b of buffers) parts.push(b);
  return Buffer.concat(parts);
}

fs.writeFileSync(path.join(__dirname, 'favicon.ico'), pngToIco([ico16, ico32, ico48]));
console.log('Wrote favicon.ico');
