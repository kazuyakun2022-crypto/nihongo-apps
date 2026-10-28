/**
 * Menerjemahkan arti kosakata JLPT (Inggris) ke bahasa Indonesia dan memberi tema, memakai Gemini.
 * Hasil disimpan per level di prisma/data/jlpt-vocab/id-n{level}.json dan bisa dilanjutkan
 * kalau terputus (kata yang sudah ada di file dilewati).
 *
 * Jalankan dari apps/api: npx tsx prisma/scripts/translateVocab.ts [5 4 3 2 1]
 * Model bisa diganti lewat env TRANSLATE_MODEL (default gemini-3.5-flash-lite: hasil uji paling akurat
 * dan kuotanya terpisah dari model voice chat).
 */
import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, THEMES, readVocabCsv, type TranslatedVocab } from "./vocabData";

const MODEL = process.env.TRANSLATE_MODEL ?? "gemini-3.5-flash-lite";
const BATCH = 100;

const SYSTEM = `Kamu penerjemah kamus Jepang–Indonesia untuk aplikasi belajar bahasa Jepang.
Untuk setiap kata, tulis arti bahasa Indonesia yang singkat dan alami (maksimal 6 kata, pisahkan beberapa arti dengan " / "),
lalu pilih SATU tema yang paling cocok dari daftar ini: ${THEMES.map((t) => t.id).join(", ")}.
Pakai arti Inggris sebagai petunjuk, tapi terjemahkan sesuai makna kata Jepangnya. Jangan ulangi arti yang sama.
Balas HANYA JSON: {"items":[{"i":<nomor>,"id":"<arti indonesia>","t":"<tema>"}]} untuk semua nomor.`;

async function translateBatch(rows: { i: number; expression: string; reading: string; meaning: string }[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY kosong di .env");
  const user = rows.map((r) => `${r.i}|${r.expression}|${r.reading}|${r.meaning}`).join("\n");

  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(90_000),
    }).catch((err: Error) => err);

    if (res instanceof Error) {
      console.log(`  ${res.message}, ulangi…`);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      const body = await res.text();
      if (/PerDay/i.test(body)) throw new Error(`Kuota harian ${MODEL} habis, lanjutkan besok (progres tersimpan).`);
      console.log(`  ${res.status}, tunggu 30 detik…`);
      await new Promise((r) => setTimeout(r, 30_000));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    try {
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      return (JSON.parse(text) as { items: { i: number; id: string; t: string }[] }).items;
    } catch {
      console.log("  JSON rusak, ulangi batch…");
    }
  }
  throw new Error("Batch gagal setelah beberapa kali percobaan");
}

async function translateLevel(level: number) {
  const rows = readVocabCsv(level);
  const outPath = join(DATA_DIR, `id-n${level}.json`);
  const done: Record<string, TranslatedVocab> = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};
  const themeIds = new Set<string>(THEMES.map((t) => t.id));
  const todo = rows.filter((r) => !done[r.guid]);
  console.log(`N${level}: ${rows.length} kata, ${todo.length} belum diterjemahkan`);

  for (let start = 0; start < todo.length; start += BATCH) {
    const chunk = todo.slice(start, start + BATCH).map((r, i) => ({ ...r, i }));
    const items = await translateBatch(chunk);
    for (const item of items) {
      const row = chunk[item.i];
      if (!row || !item.id?.trim()) continue;
      done[row.guid] = {
        meaningId: item.id.trim().slice(0, 200),
        theme: themeIds.has(item.t) ? item.t : "lainnya",
      };
    }
    writeFileSync(outPath, JSON.stringify(done, null, 1));
    console.log(`  ${Math.min(start + BATCH, todo.length)}/${todo.length}`);
  }
}

async function main() {
  const levels = process.argv.slice(2).map(Number).filter((n) => n >= 1 && n <= 5);
  // Diulang sekali: kata yang terlewat di batch pertama (jawaban model tidak lengkap) ikut dicoba lagi
  for (let pass = 0; pass < 2; pass++) {
    for (const level of levels.length ? levels : [5, 4, 3, 2, 1]) await translateLevel(level);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
