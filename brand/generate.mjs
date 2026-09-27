import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// Regenerate the whole kit: npm run icons
const OUT = process.argv[2] ?? new URL(".", import.meta.url).pathname;
const NAVY = "#1F3A5F", TEAL = "#2A7F9E", AMBER = "#F2A65A", BG = "#E8F3F7", WHITE = "#FFFFFF";

// Artwork in a 120-unit frame, optically centred. `ring` = colour of the gap around the badge.
const art = (ring = BG) => `
<g transform="translate(-4 -3.5)">
  <path d="M28 22a4 4 0 0 1 4-4H64L80 34V92a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4Z" fill="${NAVY}"/>
  <path d="M64 18V34H80Z" fill="${TEAL}"/>
  <circle cx="45" cy="54" r="4.5" fill="${WHITE}"/>
  <circle cx="63" cy="54" r="4.5" fill="${WHITE}"/>
  <path d="M43 67Q54 77 65 67" fill="none" stroke="${WHITE}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="82" cy="90" r="19" fill="${AMBER}" stroke="${ring}" stroke-width="4"/>
  <path d="M82 77.5a6.5 6.5 0 0 1 6.5 6.5v5l3.3 3.7a1.5 1.5 0 0 1-1.1 2.5H73.3a1.5 1.5 0 0 1-1.1-2.5L75.5 89v-5a6.5 6.5 0 0 1 6.5-6.5Z" fill="${WHITE}"/>
  <circle cx="82" cy="98.6" r="2.4" fill="${WHITE}"/>
</g>`;

// Single-colour silhouette (Android 13 themed icons): face, bell and gap are cut out.
const monoArt = `
<defs><mask id="m" maskUnits="userSpaceOnUse" x="-50" y="-50" width="220" height="220">
  <g transform="translate(-4 -3.5)">
    <path d="M28 22a4 4 0 0 1 4-4H64L80 34V92a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4Z" fill="#fff"/>
    <circle cx="45" cy="54" r="4.5" fill="#000"/>
    <circle cx="63" cy="54" r="4.5" fill="#000"/>
    <path d="M43 67Q54 77 65 67" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/>
    <circle cx="82" cy="90" r="21" fill="#000"/>
    <circle cx="82" cy="90" r="17" fill="#fff"/>
    <path d="M82 77.5a6.5 6.5 0 0 1 6.5 6.5v5l3.3 3.7a1.5 1.5 0 0 1-1.1 2.5H73.3a1.5 1.5 0 0 1-1.1-2.5L75.5 89v-5a6.5 6.5 0 0 1 6.5-6.5Z" fill="#000"/>
    <circle cx="82" cy="98.6" r="2.4" fill="#000"/>
  </g>
</mask></defs>
<rect x="-50" y="-50" width="220" height="220" fill="#000" mask="url(#m)"/>`;

const svg = (vb, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

// Variants ---------------------------------------------------------------
const V = {
  // Rounded tile: web logo, favicon, Windows, Android legacy.
  tile: svg("0 0 120 120", `<rect width="120" height="120" rx="26" fill="${BG}"/>${art()}`),
  // Full-bleed square: iOS / App Store / Play Store / Google OAuth (platform applies the mask).
  square: svg("0 0 120 120", `<rect width="120" height="120" fill="${BG}"/>${art()}`),
  // PWA maskable: art shrunk into the 80% safe circle.
  maskable: svg("0 0 120 120", `<rect width="120" height="120" fill="${BG}"/><g transform="translate(60 60) scale(.8) translate(-60 -60)">${art()}</g>`),
  // Android adaptive foreground, 108dp layer, art inside the 66dp safe circle.
  adaptiveFg: svg("0 0 108 108", `<g transform="translate(54 54) scale(.56) translate(-60 -60)">${art()}</g>`),
  adaptiveMono: svg("0 0 108 108", `<g transform="translate(54 54) scale(.56) translate(-60 -60)">${monoArt}</g>`),
  // flutter_launcher_icons foreground (it adds a 16% inset itself).
  flutterFg: svg("0 0 120 120", `<g transform="translate(60 60) scale(.86) translate(-60 -60)">${art()}</g>`),
  // Android legacy round icon.
  round: svg("0 0 120 120", `<circle cx="60" cy="60" r="60" fill="${BG}"/><g transform="translate(60 60) scale(.9) translate(-60 -60)">${art()}</g>`),
  // macOS Big Sur grid: 824pt tile on a 1024 canvas with a soft shadow.
  macos: svg("0 0 1024 1024", `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".28"/></filter></defs>
    <rect x="100" y="100" width="824" height="824" rx="185" fill="${BG}" filter="url(#s)"/>
    <g transform="translate(100 100) scale(${824 / 120})">${art()}</g>`),
};

const render = (key, size) =>
  new Resvg(V[key], { fitTo: { mode: "width", value: size } }).render().asPng();

// Opaque RGB PNG (no alpha channel) — required by Apple for iOS / App Store icons.
import zlib from "node:zlib";
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let x = 0xffffffff;
  for (const b of buf) x = CRC[(x ^ b) & 0xff] ^ (x >>> 8);
  return (x ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const renderRGB = (key, size) => {
  const { width: w, height: h, pixels } = new Resvg(V[key], { fitTo: { mode: "width", value: size } }).render();
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, o = y * (w * 3 + 1) + 1 + x * 3;
    raw[o] = pixels[i]; raw[o + 1] = pixels[i + 1]; raw[o + 2] = pixels[i + 2];
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};

const write = (rel, data) => {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
};
const png = (rel, key, size) => write(rel, render(key, size));

// ICO container holding PNG frames.
const ico = (rel, key, sizes) => {
  const frames = sizes.map((s) => render(key, s));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s >= 256 ? 0 : s, e); head.writeUInt8(s >= 256 ? 0 : s, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(frames[i].length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += frames[i].length;
  });
  write(rel, Buffer.concat([head, ...frames]));
};

// Master ------------------------------------------------------------------
write("master/docsbuddy-icon.svg", V.tile);
write("master/docsbuddy-icon-square.svg", V.square);
write("master/docsbuddy-icon-monochrome.svg", svg("0 0 120 120", monoArt));
png("master/docsbuddy-icon-1024.png", "tile", 1024);

// Stores & Google ---------------------------------------------------------
png("stores/google-oauth-consent-120.png", "square", 120);
png("stores/play-store-icon-512.png", "square", 512);
write("stores/app-store-icon-1024.png", renderRGB("square", 1024));

// Web ---------------------------------------------------------------------
write("web/favicon.svg", V.tile);
ico("web/favicon.ico", "tile", [16, 32, 48]);
png("web/favicon-96x96.png", "tile", 96);
png("web/apple-touch-icon.png", "square", 180);
png("web/icon-192.png", "tile", 192);
png("web/icon-512.png", "tile", 512);
png("web/icon-maskable-512.png", "maskable", 512);
png("web/logo.png", "tile", 432);
write("web/site.webmanifest", JSON.stringify({
  name: "DocsBuddy", short_name: "DocsBuddy", start_url: "/", display: "standalone",
  background_color: "#F4F6FA", theme_color: "#0D1A2B",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2) + "\n");

// Android (native res/ drop-in) -------------------------------------------
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
  png(`android/res/mipmap-${d}/ic_launcher.png`, "tile", 48 * k);
  png(`android/res/mipmap-${d}/ic_launcher_round.png`, "round", 48 * k);
  png(`android/res/mipmap-${d}/ic_launcher_foreground.png`, "adaptiveFg", 108 * k);
  png(`android/res/mipmap-${d}/ic_launcher_monochrome.png`, "adaptiveMono", 108 * k);
}
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
  <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`;
write("android/res/mipmap-anydpi-v26/ic_launcher.xml", adaptiveXml);
write("android/res/mipmap-anydpi-v26/ic_launcher_round.xml", adaptiveXml);
write("android/res/values/ic_launcher_background.xml", `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">${BG}</color>
</resources>
`);

// Flutter (flutter_launcher_icons inputs) ----------------------------------
png("flutter/assets/icon/app_icon.png", "square", 1024);
png("flutter/assets/icon/adaptive_foreground.png", "flutterFg", 1024);
png("flutter/assets/icon/adaptive_monochrome.png", "adaptiveMono", 1024);

// iOS (single-size app icon, Xcode 14+) -----------------------------------
write("ios/AppIcon.appiconset/AppIcon-1024.png", renderRGB("square", 1024));
write("ios/AppIcon.appiconset/Contents.json", JSON.stringify({
  images: [{ filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" }],
  info: { author: "xcode", version: 1 },
}, null, 2) + "\n");

// macOS (Flutter's file names) + .icns ------------------------------------
const macImages = [];
for (const pt of [16, 32, 128, 256, 512]) {
  for (const scale of [1, 2]) {
    const px = pt * scale;
    macImages.push({ size: `${pt}x${pt}`, idiom: "mac", filename: `app_icon_${px}.png`, scale: `${scale}x` });
  }
}
for (const px of [16, 32, 64, 128, 256, 512, 1024]) png(`macos/AppIcon.appiconset/app_icon_${px}.png`, "macos", px);
write("macos/AppIcon.appiconset/Contents.json", JSON.stringify({ images: macImages, info: { version: 1, author: "xcode" } }, null, 2) + "\n");
const iconset = path.join(OUT, "macos/DocsBuddy.iconset");
for (const pt of [16, 32, 128, 256, 512]) {
  png(`macos/DocsBuddy.iconset/icon_${pt}x${pt}.png`, "macos", pt);
  png(`macos/DocsBuddy.iconset/icon_${pt}x${pt}@2x.png`, "macos", pt * 2);
}
execSync(`iconutil -c icns "${iconset}" -o "${path.join(OUT, "macos/AppIcon.icns")}"`);
fs.rmSync(iconset, { recursive: true });

// Windows -----------------------------------------------------------------
ico("windows/app_icon.ico", "tile", [16, 24, 32, 48, 64, 128, 256]);
png("windows/Square44x44Logo.png", "tile", 44);
png("windows/Square150x150Logo.png", "tile", 150);
png("windows/StoreLogo.png", "tile", 50);

console.log("done");
