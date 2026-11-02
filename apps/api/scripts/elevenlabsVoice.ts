/**
 * Bantuan memilih suara ElevenLabs untuk Miu-chan.
 *
 *   npm run voice:elevenlabs                         → daftar voice di akunmu (nama, ID, bahasa) + sisa kredit
 *   npm run voice:elevenlabs -- --try <voiceId>      → buat contoh suara (Indonesia + Jepang) ke voice-<id>.wav
 *   npm run voice:elevenlabs -- --try <voiceId> --emotion semangat
 *
 * Butuh ELEVENLABS_API_KEY di apps/api/.env. Voice dari Voice Library harus ditambahkan dulu ke "My Voices" di
 * situs ElevenLabs supaya bisa dipakai lewat API.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { ElevenLabsTts, fetchElevenLabs } from "../src/shared/infrastructure/elevenLabsTts";

const API = "https://api.elevenlabs.io/v1";
const key = process.env.ELEVENLABS_API_KEY ?? "";
const model = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";
const SAMPLE = "こんにちは！ <pelan>わたしは ミウ です。</pelan> Hari ini kita belajar hiragana bareng, ya! がんばろうね！";

async function get<T>(path: string): Promise<T> {
  const res = await fetchElevenLabs(`${API}${path}`, { headers: { "xi-api-key": key } });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

async function list() {
  const { voices } = await get<{ voices: { voice_id: string; name: string; category?: string; labels?: Record<string, string>; verified_languages?: { language: string }[] }[] }>("/voices");
  console.log(`\n${voices.length} voice di akunmu (model: ${model}):\n`);
  for (const v of voices) {
    const labels = Object.values(v.labels ?? {}).join(", ");
    const langs = (v.verified_languages ?? []).map((l) => l.language).join("/");
    console.log(`  ${v.voice_id}  ${v.name.padEnd(24)} ${[v.category, labels, langs].filter(Boolean).join(" · ")}`);
  }
  try {
    const sub = await get<{ character_count: number; character_limit: number; tier: string }>("/user/subscription");
    console.log(`\nPaket: ${sub.tier} · kredit terpakai ${sub.character_count}/${sub.character_limit}`);
  } catch {
    // API key dengan izin terbatas tidak bisa membaca langganan
  }
  console.log("\nCoba satu voice: npm run voice:elevenlabs -- --try <voiceId>");
}

async function tryVoice(voiceId: string, emotion?: string) {
  const tts = new ElevenLabsTts(key, voiceId, model);
  const started = Date.now();
  const wav = await tts.speak(SAMPLE, emotion, 1);
  const file = `voice-${voiceId}.wav`;
  writeFileSync(file, wav);
  console.log(`✓ ${file} (${(wav.length / 1024).toFixed(0)} KB, ${Date.now() - started} ms, emosi: ${emotion ?? "biasa"})`);
  console.log(`  Cocok? Isi ELEVENLABS_VOICE_ID=${voiceId} di apps/api/.env lalu jalankan ulang API.`);
}

(async () => {
  if (!key) throw new Error("ELEVENLABS_API_KEY belum diisi di apps/api/.env");
  const args = process.argv.slice(2);
  const at = args.indexOf("--try");
  const emo = args.indexOf("--emotion");
  if (at >= 0 && args[at + 1]) await tryVoice(args[at + 1], emo >= 0 ? args[emo + 1] : undefined);
  else await list();
})().catch((err) => {
  const cause = err instanceof Error ? (err.cause as { code?: string } | undefined)?.code : undefined;
  console.error("✗", err instanceof Error ? err.message : err, cause ? `(${cause})` : "");
  process.exit(1);
});
