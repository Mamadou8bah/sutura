/* Deterministic launcher exports from the existing Sutura mark, not a new logo.
 * Run: node ui/shared/generate-launcher-icons.cjs (requires installed UI deps).
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const ui = path.resolve(__dirname, '..');
const sharp = require(require.resolve('sharp', { paths: [path.join(ui, 'web'), path.join(ui, 'sutura-app')] }));

async function recolorWhite(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255;
  return sharp(data, { raw: info }).png().toBuffer();
}

async function generate() {
  const source = path.join(ui, 'sutura-app/assets/sutura-logo.png');
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Isolate the orange symbol above the dark wordmark; preserve its original pixels.
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] > 32 && data[i] > 180 && data[i + 1] > 35 && data[i + 1] < 195 && data[i + 2] < 120 && data[i] > data[i + 1] * 1.3) {
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (right <= left || bottom <= top) throw new Error('Cannot locate the original orange Sutura symbol.');
  left = Math.max(0, left - 2); top = Math.max(0, top - 2);
  const mark = await sharp(source).extract({ left, top, width: Math.min(info.width - left, right - left + 3), height: Math.min(info.height - top, bottom - top + 3) }).png().toBuffer();
  const variants = [
    { app: 'sutura-app', background: '#ffffff', white: false },
    { app: 'sutura-agent', background: '#f97316', white: true },
    { app: 'merchant-app', background: '#181a20', white: false },
  ];
  for (const variant of variants) {
    const assets = path.join(ui, variant.app, 'assets');
    const symbol = variant.white ? await recolorWhite(mark) : mark;
    const foregroundMark = await sharp(symbol).resize({ width: 520, height: 520, fit: 'inside' }).png().toBuffer();
    const foreground = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: foregroundMark, gravity: 'centre' }]).png().toBuffer();
    const legacyMark = await sharp(symbol).resize({ width: 680, height: 680, fit: 'inside' }).png().toBuffer();
    const legacy = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: variant.background } })
      .composite([{ input: legacyMark, gravity: 'centre' }]).png().toBuffer();
    // Composite introduces an alpha channel, even over a solid base. Strip it in
    // a second pass so iOS/store artwork is explicitly RGB, not merely opaque RGBA.
    await sharp(legacy).removeAlpha().png().toFile(path.join(assets, 'app-icon.png'));
    await fs.writeFile(path.join(assets, 'adaptive-icon.png'), foreground);
    await fs.writeFile(path.join(assets, 'monochrome-icon.png'), await recolorWhite(foreground));
    console.log(`${variant.app}: opaque icon, transparent safe-area foreground, monochrome layer`);
  }
}

generate().catch(error => { console.error(error.message); process.exitCode = 1; });
