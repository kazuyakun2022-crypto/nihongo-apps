/**
 * Bantuan memilih karakter VOICEVOX untuk bagian bahasa Jepang Miu-chan.
 *
 *   npm run voice:voicevox                          → daftar karakter & gaya (ID speaker)
 *   npm run voice:voicevox -- --try <id>            → contoh suara Jepang saja ke voicevox-<id>.wav
 *   npm run voice:voicevox -- --try <id> --mixed    → contoh jawaban campuran (Jepang VOICEVOX + Indonesia sesuai
 *                                                      VOICEVOX_INDONESIAN: gemini/elevenlabs/voicevox)
 *   tambah --emotion semangat untuk mencoba emosi
 *
 * Butuh mesin VOICEVOX jalan (docker compose up -d voicevox) dan VOICEVOX_URL di apps/api/.env.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { ElevenLabsTts } from "../src/shared/infrastructure/elevenLabsTts";
import { GeminiTts, pcmToWav } from "../src/shared/infrastructure/geminiTts";
import { MixedVoice, elevenLabsIndonesian, geminiIndonesian, voicevoxIndonesian, voicevoxStyle, type IndonesianVoice } from "../src/shared/infrastructure/mixedVoice";
import { VOICEVOX_SAMPLE_RATE, VoicevoxTts } from "../src/shared/infrastructure/voicevoxTts";

const url = process.env.VOICEVOX_URL || "http://localhost:50021";
const JA = "こんにちは！ わたしは ミウ です。 いっしょに にほんご を べんきょう しましょう！";
const MIXED = "こんにちは！ Aku Miu-chan. Hari ini kita belajar kata <pelan>ありがとう</pelan>, artinya terima kasih. がんばろうね！";

(async () => {
  const args = process.argv.slice(2);
  const at = args.indexOf("--try");
  const emo = args.indexOf("--emotion");
  const emotion = emo >= 0 ? args[emo + 1] : undefined;
  if (at < 0 || !args[at + 1]) {
    const speakers = await new VoicevoxTts(url, 0).speakers();
    console.log(`\n${speakers.length} karakter di ${url}:\n`);
    for (const s of speakers) console.log(`  ${s.name.padEnd(14)} ${s.styles.map((st) => `${st.id}=${st.name}`).join("  ")}`);
    console.log("\nCoba: npm run voice:voicevox -- --try <id>   (lalu isi VOICEVOX_SPEAKER=<id> di .env)");
    console.log("Ingat: tampilkan kredit \"VOICEVOX:<nama karakter>\" dan baca ketentuan karakternya.");
    return;
  }
  const id = Number(args[at + 1]);
  const voicevox = new VoicevoxTts(url, id);
  const started = Date.now();
  let wav: Buffer;
  if (args.includes("--mixed")) {
    const mode = process.env.VOICEVOX_INDONESIAN || "gemini";
    const indonesian: IndonesianVoice[] = [];
    if (mode === "gemini" && process.env.GEMINI_API_KEY) indonesian.push(geminiIndonesian(new GeminiTts(process.env.GEMINI_API_KEY)));
    if (mode === "elevenlabs" && process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) {
      indonesian.push(elevenLabsIndonesian(new ElevenLabsTts(process.env.ELEVENLABS_API_KEY, process.env.ELEVENLABS_VOICE_ID, process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5")));
    }
    // --kana: paksa bagian Indonesia dibacakan VOICEVOX (seperti saat kuota Gemini habis)
    if (args.includes("--kana")) indonesian.length = 0;
    indonesian.push(voicevoxIndonesian(voicevox));
    console.log(`Bagian Indonesia: ${indonesian.map((v) => v.name).join(" → ")}`);
    wav = await new MixedVoice(voicevox, indonesian).speak(MIXED, emotion, 1);
  } else {
    wav = pcmToWav(await voicevox.pcm(JA, voicevoxStyle(emotion, 1)), VOICEVOX_SAMPLE_RATE);
  }
  const file = `voicevox-${id}${args.includes("--mixed") ? (args.includes("--kana") ? "-campur-kana" : "-campur") : ""}.wav`;
  writeFileSync(file, wav);
  console.log(`✓ ${file} (${(wav.length / 1024).toFixed(0)} KB, ${Date.now() - started} ms) · ${await voicevox.credit()}`);
})().catch((err) => {
  const cause = err instanceof Error ? (err.cause as { code?: string } | undefined)?.code : undefined;
  console.error("✗", err instanceof Error ? err.message : err, cause ? `(${cause})` : "");
  if (cause === "ECONNREFUSED") console.error("  Mesin VOICEVOX belum jalan: docker compose up -d voicevox");
  process.exit(1);
});
