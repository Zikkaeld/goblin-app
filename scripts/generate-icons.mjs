import sharp from 'sharp';

const MOSS = '#6b8f47';
const MOSS_DARK = '#4f6b2c';

function svgFor(size, safeZonePercent) {
  const emojiSize = Math.round(size * safeZonePercent);
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${MOSS}" />
      <stop offset="100%" stop-color="${MOSS_DARK}" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="url(#bg)" />
  <text
    x="50%"
    y="53%"
    font-size="${emojiSize}"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="#fdf6e8"
  >🎲</text>
</svg>`;
}

const targets = [
  { size: 192, safeZone: 0.6, file: 'public/pwa-192.png' },
  { size: 512, safeZone: 0.6, file: 'public/pwa-512.png' },
  { size: 180, safeZone: 0.65, file: 'public/apple-touch-icon.png' },
];

for (const t of targets) {
  await sharp(Buffer.from(svgFor(t.size, t.safeZone)))
    .png()
    .toFile(t.file);
  console.log('generated', t.file);
}
