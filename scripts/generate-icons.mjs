/**
 * Generates the PWA icons declared in the web app manifest.
 *
 * Written with Node's built-in zlib only. An image-processing dependency would be
 * a heavier answer to a problem that is a few dozen lines of arithmetic (LEAN-005),
 * and committing opaque binaries with no way to regenerate them is worse than
 * committing the recipe.
 *
 * Motif: a four-pointed star on the Luminous Dark canvas — the North Star, which is
 * the product's own term for enduring direction. Colours are the approved starting
 * tokens (docs/design/VISUAL_DIRECTION.md).
 *
 * Regenerate with:  node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const CANVAS = [0x07, 0x11, 0x1f];
const CYAN = [0x28, 0xd7, 0xe5];
const SAMPLES = 4; // supersampling factor per axis

/** CRC-32, as required by the PNG chunk format. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with filter type 0 (None).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Coverage of the four-pointed star at a point, in [0, 1].
 * sqrt(|u|) + sqrt(|v|) <= 1 traces an astroid — concave sides, four sharp points.
 */
function starCoverage(px, py, size, reach) {
  const centre = size / 2;
  const radius = centre * reach;
  let hits = 0;

  for (let sy = 0; sy < SAMPLES; sy += 1) {
    for (let sx = 0; sx < SAMPLES; sx += 1) {
      const x = px + (sx + 0.5) / SAMPLES - centre;
      const y = py + (sy + 0.5) / SAMPLES - centre;
      const u = Math.abs(x) / radius;
      const v = Math.abs(y) / radius;
      if (Math.sqrt(u) + Math.sqrt(v) <= 1) hits += 1;
    }
  }

  return hits / (SAMPLES * SAMPLES);
}

function render(size, reach) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const coverage = starCoverage(x, y, size, reach);
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        pixels[offset + c] = Math.round(CANVAS[c] + (CYAN[c] - CANVAS[c]) * coverage);
      }
      pixels[offset + 3] = 255;
    }
  }

  return encodePng(size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const icons = [
  // reach = star radius as a fraction of half the canvas.
  ['icon-192.png', 192, 0.82],
  ['icon-512.png', 512, 0.82],
  // Maskable icons are cropped to a safe zone, so the motif sits smaller.
  ['icon-maskable-512.png', 512, 0.56],
];

for (const [name, size, reach] of icons) {
  const png = render(size, reach);
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`wrote ${name} (${String(size)}x${String(size)}, ${String(png.length)} bytes)`);
}
