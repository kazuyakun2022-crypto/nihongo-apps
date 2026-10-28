import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Unduh gambar Kamus Gambar dari Microsoft Fluent Emoji 3D (MIT) ke public/images/kamus,
// diperkecil ke WebP 160px (PNG aslinya 256px, ~36 KB per gambar).
// Nama aset dibaca langsung dari kolom terakhir tiap entri di kamusGambar.ts.

const here = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(here, "../src/features/kamus/data/kamusGambar.ts");
const OUT = resolve(here, "../public/images/kamus");
const REPO = "microsoft/fluentui-emoji";
// jsDelivr kadang menolak file tertentu (403); raw.githubusercontent jadi cadangan.
const MIRRORS = [`https://cdn.jsdelivr.net/gh/${REPO}@main/`, `https://raw.githubusercontent.com/${REPO}/main/`];

const SIZE = 160;

const slug = (icon) => icon.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const source = readFileSync(DATA, "utf8");
const icons = new Set([
  ...[...source.matchAll(/^\s*\[(?:"[^"]*",\s*){4}"([^"]+)"\]/gm)].map((m) => m[1]),
  ...[...source.matchAll(/cover:\s*"([^"]+)"/g)].map((m) => m[1]),
]);

const tree = await fetch(`https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`).then((r) => {
  if (!r.ok) throw new Error(`GitHub tree: HTTP ${r.status}`);
  return r.json();
});
const pngs = tree.tree.map((n) => n.path).filter((p) => /\/3D\/[^/]+\.png$/.test(p));

// Aset berwarna kulit punya varian; ambil Default.
const pathFor = (icon) => {
  const inFolder = pngs.filter((p) => p.startsWith(`assets/${icon}/`));
  return inFolder.find((p) => p.includes("/Default/")) ?? inFolder[0];
};

mkdirSync(OUT, { recursive: true });
const missing = [];
let downloaded = 0;

for (const icon of icons) {
  const file = resolve(OUT, `${slug(icon)}.webp`);
  if (existsSync(file)) continue;
  const path = pathFor(icon);
  if (!path) {
    missing.push(icon);
    continue;
  }
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  let res;
  for (const base of MIRRORS) {
    res = await fetch(base + encoded);
    if (res.ok) break;
  }
  if (!res.ok) {
    missing.push(`${icon} (HTTP ${res.status})`);
    continue;
  }
  const png = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, await sharp(png).resize(SIZE, SIZE).webp({ quality: 82 }).toBuffer());
  downloaded++;
}

console.log(`${icons.size} ikon, ${downloaded} diunduh, ${icons.size - downloaded - missing.length} sudah ada.`);
if (missing.length) {
  console.error(`Tidak ditemukan: ${missing.join(", ")}`);
  process.exitCode = 1;
}
