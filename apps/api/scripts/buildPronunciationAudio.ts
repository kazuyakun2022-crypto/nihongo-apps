/**
 * Audio pelafalan statis untuk yang paling sering diputar: semua kana (dasar, dakuten, yoon), contoh katanya,
 * dan kosakata Pemula. Hasilnya MP3 di apps/web/public/audio/ja/ + manifest yang dibaca useSpeech,
 * jadi berbunyi instan tanpa API. Sisanya (kanji, kosakata N5–N1, kamus) lewat /api/tts dengan suara yang sama.
 *
 *   npm run audio:pronunciation      # suara Nanami (Edge TTS)
 *
 * Nama berkas memuat suara yang dipakai, jadi ganti suara = berkas baru; berkas suara lama dihapus.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as kana from "../../web/src/features/huruf/data/characters";
import { KURIKULUM_PRE_N5 } from "../prisma/scripts/kurikulumPreN5";
import { synthesizePronunciation } from "../src/shared/infrastructure/edgeTts";
import { EDGE_PRONUNCIATION_VOICE } from "../src/shared/infrastructure/pronunciationAudio";

// Modul web dimuat lintas paket; ekspornya bisa terbungkus di `default` tergantung loader
const { DAKUTEN_CHARS, HIRAGANA_BASIC, KATAKANA_BASIC, YOON_CHARS } = ((kana as { default?: typeof kana }).default ?? kana) as typeof kana;

// Dijalankan dari apps/api (npm run audio:pronunciation)
const WEB = path.resolve(process.cwd(), "../web");
if (!existsSync(path.join(WEB, "package.json"))) throw new Error("Jalankan dari folder apps/api.");
const OUT_DIR = path.join(WEB, "public/audio/ja");
const MANIFEST = path.join(WEB, "src/shared/lib/pronunciationManifest.json");

const JAPANESE_ONLY = /^[぀-ヿ一-鿿々ー・、。！？「」　 ]+$/;

/** Sama dengan cleanText di useSpeech: buang anotasi dalam kurung lalu rapikan spasi. */
function normalizeSpeech(text: string): string {
  return text.replace(/[（(【[《〈<][^）)】\]》〉>]*[）)】\]》〉>]/g, "").trim();
}

function exampleWord(example?: string): string {
  if (!example) return "";
  const beforeEqual = example.split("=")[0].trim();
  return beforeEqual.match(/^([^(（]+)/)?.[1].trim() ?? beforeEqual;
}

/** Teks yang dibuatkan audio. */
function collect(): string[] {
  const items = new Set<string>();
  const add = (t: string | undefined) => {
    const n = normalizeSpeech(t ?? "");
    if (n && JAPANESE_ONLY.test(n)) items.add(n);
  };
  for (const c of [...HIRAGANA_BASIC, ...KATAKANA_BASIC]) {
    add(c.char);
    add(exampleWord(c.example));
  }
  for (const c of [...DAKUTEN_CHARS, ...YOON_CHARS]) add(c.char);
  for (const chapter of KURIKULUM_PRE_N5) {
    for (const [word, reading] of chapter.vocab) {
      add(word);
      add(reading);
    }
  }
  return [...items];
}

async function main() {
  const voiceKey = EDGE_PRONUNCIATION_VOICE;
  console.log(`Suara: ${voiceKey}`);
  mkdirSync(OUT_DIR, { recursive: true });

  const files: Record<string, string> = {};
  const items = collect();
  let made = 0;
  let failed = 0;
  for (const [i, text] of items.entries()) {
    const id = createHash("sha1").update(`${voiceKey}|${text}`).digest("hex").slice(0, 12);
    const file = path.join(OUT_DIR, `${id}.mp3`);
    if (!existsSync(file)) {
      try {
        writeFileSync(file, await synthesizePronunciation(text));
        made++;
      } catch (err) {
        failed++;
        console.warn(`Gagal: ${text} (${err instanceof Error ? err.message : err})`);
        continue;
      }
    }
    files[text] = id;
    if ((i + 1) % 50 === 0) console.log(`${i + 1}/${items.length}…`);
  }

  if (failed) {
    console.log(`${failed} gagal; manifest dan berkas lama tidak diubah. Jalankan ulang setelah masalahnya beres.`);
    process.exit(1);
  }
  // Berkas dari suara sebelumnya tidak dipakai lagi
  const keep = new Set(Object.values(files).map((id) => `${id}.mp3`));
  let removed = 0;
  for (const f of readdirSync(OUT_DIR)) {
    if (f.endsWith(".mp3") && !keep.has(f)) {
      unlinkSync(path.join(OUT_DIR, f));
      removed++;
    }
  }
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b, "ja")));
  writeFileSync(MANIFEST, JSON.stringify({ voice: voiceKey, files: sorted }) + "\n");
  console.log(`Selesai: ${items.length} teks, ${made} berkas baru, ${removed} berkas lama dihapus.`);
  process.exit(0);
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
