/**
 * Menerjemahkan arti kanji JLPT (N5–N1) dari kanji.json ke bahasa Indonesia memakai Gemini.
 * Hasil: prisma/data/kanji-data/id-kanji.json ({ "日": "hari / matahari / Jepang" }), bisa dilanjutkan kalau terputus.
 *
 * Jalankan dari apps/api: npx tsx prisma/scripts/translateKanji.ts
 */
import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MODEL = process.env.TRANSLATE_MODEL ?? "gemini-3.5-flash-lite";
const BATCH = 150;
const KANJI_DIR = join(process.cwd(), "prisma", "data", "kanji-data");

interface KanjiEntry {
  jlpt_new: number | null;
  meanings: string[];
}

const SYSTEM = `Kamu penerjemah kamus kanji untuk pelajar Indonesia.
Untuk setiap kanji, tulis arti bahasa Indonesia yang singkat (1–3 arti utama, dipisah " / ", maksimal 6 kata).
Pakai arti Inggris sebagai petunjuk. Balas HANYA JSON: {"items":[{"k":"<kanji>","id":"<arti>"}]} untuk semua kanji.`;

async function translateBatch(lines: string[]): Promise<{ k: string; id: string }[]> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: lines.join("\n") }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(90_000),
      },
    ).catch((err: Error) => err);
    if (res instanceof Error || res.status === 429 || res.status >= 500) {
      const body = res instanceof Error ? res.message : await res.text();
      if (/PerDay/i.test(body)) throw new Error(`Kuota harian ${MODEL} habis, lanjutkan besok (progres tersimpan).`);
      console.log("  gagal sementara, tunggu 30 detik…");
      await new Promise((r) => setTimeout(r, 30_000));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    try {
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      return (JSON.parse(text) as { items: { k: string; id: string }[] }).items;
    } catch {
      console.log("  JSON rusak, ulangi batch…");
    }
  }
  throw new Error("Batch gagal setelah beberapa kali percobaan");
}

async function main() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY kosong di .env");
  const all = JSON.parse(readFileSync(join(KANJI_DIR, "kanji.json"), "utf8")) as Record<string, KanjiEntry>;
  const outPath = join(KANJI_DIR, "id-kanji.json");
  const done: Record<string, string> = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};

  const todo = Object.entries(all).filter(([k, v]) => v.jlpt_new && !done[k]);
  console.log(`${todo.length} kanji belum diterjemahkan`);
  for (let start = 0; start < todo.length; start += BATCH) {
    const chunk = todo.slice(start, start + BATCH);
    const items = await translateBatch(chunk.map(([k, v]) => `${k}|${v.meanings.slice(0, 4).join(", ")}`));
    const wanted = new Set(chunk.map(([k]) => k));
    for (const item of items) if (wanted.has(item.k) && item.id?.trim()) done[item.k] = item.id.trim().slice(0, 120);
    writeFileSync(outPath, JSON.stringify(done, null, 1));
    console.log(`  ${Math.min(start + BATCH, todo.length)}/${todo.length}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
