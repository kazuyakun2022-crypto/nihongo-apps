import { describe, expect, it, vi } from "vitest";
import { MixedVoice, mixedParts, voicevoxStyle, type IndonesianVoice } from "../src/shared/infrastructure/mixedVoice";
import { resamplePcm } from "../src/shared/infrastructure/geminiTts";
import { normalizeLoudness, speechRms, TARGET_SPEECH_RMS } from "../src/shared/infrastructure/loudness";
import type { VoicevoxTts } from "../src/shared/infrastructure/voicevoxTts";
import { indonesianToKana, numberWords } from "../src/shared/domain/indonesianKana";

/** PCM 16-bit 24 kHz sepanjang `seconds` dengan nilai tetap (supaya asal potongan bisa dikenali). */
const pcm = (seconds: number, value: number) => {
  const b = Buffer.alloc(Math.round(24000 * seconds) * 2);
  for (let i = 0; i < b.length; i += 2) b.writeInt16LE(value, i);
  return b;
};

function fakes() {
  const japanese = { available: true, pcm: vi.fn(async () => pcm(0.5, 3000)), credit: vi.fn(async () => "VOICEVOX:春日部つむぎ") };
  // Bagian Indonesia: Gemini dulu, VOICEVOX (katakana) bila Gemini gagal
  const indonesian = { name: "gemini", available: true, pcm: vi.fn(async (_t: string, _e: string | undefined, _tempo: number) => pcm(0.5, 2000)) };
  const kana = { name: "voicevox", available: true, pcm: vi.fn(async (_t: string, _e: string | undefined, _tempo: number) => pcm(0.5, 3000)) };
  return { japanese, indonesian, kana, voice: new MixedVoice(japanese as unknown as VoicevoxTts, [indonesian, kana] as IndonesianVoice[]) };
}

describe("Suara campuran: VOICEVOX (Jepang) + Gemini/cadangan (Indonesia)", () => {
  it("jawaban dipecah per bahasa, tanda tempo tidak ikut dibacakan", () => {
    const parts = mixedParts("Coba ucapkan <pelan>ありがとう</pelan> ya! Artinya terima kasih.", 1);
    expect(parts.map((p) => p.lang)).toEqual(["id", "ja", "id"]);
    expect(parts[1].text).toBe("ありがとう");
    expect(parts.map((p) => p.text).join(" ")).not.toMatch(/<|>/);
    // Bagian <pelan> lebih lambat dari bagian lain
    expect(parts[1].tempo).toBeLessThan(parts[0].tempo);
  });

  it("bagian Jepang ke VOICEVOX, bagian Indonesia ke mesin Indonesia, disambung jadi satu WAV 24 kHz", async () => {
    const { japanese, indonesian, voice } = fakes();
    const wav = await voice.speak("こんにちは！ Aku Miu. 一緒に頑張ろうね！", "senang");
    expect(japanese.pcm).toHaveBeenCalledTimes(2);
    expect(japanese.pcm.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["こんにちは！", "一緒に頑張ろうね！"]);
    expect(indonesian.pcm).toHaveBeenCalledTimes(1);
    expect(indonesian.pcm.mock.calls[0].slice(0, 2)).toEqual(["Aku Miu.", "senang"]);
    expect(wav.toString("latin1", 0, 4)).toBe("RIFF");
    expect(wav.readUInt32LE(24)).toBe(24000);
    // Tiga potongan + jeda; potongan VOICEVOX (3000) dan Gemini (2000) disamakan kerasnya
    const samples = (wav.length - 44) / 2;
    const at = (sec: number) => wav.readInt16LE(44 + Math.round(sec * 24000) * 2);
    expect(samples / 24000).toBeGreaterThan(1.4);
    expect(at(0.2)).toBe(at(0.85));
    expect(at(0.2)).toBeGreaterThan(3000);
  });

  it("Gemini gagal/kuota habis → bagian Indonesia dibacakan VOICEVOX (katakana)", async () => {
    const { indonesian, kana, voice } = fakes();
    indonesian.pcm.mockRejectedValueOnce(new Error("kuota harian habis"));
    await voice.speak("Halo semua!", "biasa");
    expect(kana.pcm).toHaveBeenCalledTimes(1);
  });

  it("jawaban tanpa bahasa Jepang memakai mesin Indonesia saja", async () => {
    const { japanese, indonesian, voice } = fakes();
    await voice.speak("Halo, ayo belajar!", "biasa");
    expect(japanese.pcm).not.toHaveBeenCalled();
    expect(indonesian.pcm).toHaveBeenCalledTimes(1);
  });

  it("VOICEVOX gagal → seluruh jawaban gagal, supaya rute memakai mesin cadangan berikutnya", async () => {
    const { japanese, voice } = fakes();
    japanese.pcm.mockRejectedValueOnce(new Error("VOICEVOX mati"));
    await expect(voice.speak("こんにちは！ Halo.", "biasa")).rejects.toThrow("VOICEVOX mati");
  });

  it("emosi mengubah nada/intonasi VOICEVOX dalam batas aman", () => {
    const happy = voicevoxStyle("semangat", 1);
    const sad = voicevoxStyle("sedih", 1);
    expect(happy.intonation).toBeGreaterThan(sad.intonation);
    expect(happy.pitch).toBeGreaterThan(sad.pitch);
    expect(voicevoxStyle("biasa", 1).pitch).toBe(0);
    for (const s of [happy, sad, voicevoxStyle("nangis", 0.5), voicevoxStyle("kaget", 1.5)]) {
      expect(Math.abs(s.pitch)).toBeLessThanOrEqual(0.08);
      expect(s.speed).toBeGreaterThanOrEqual(0.8);
      expect(s.speed).toBeLessThanOrEqual(1.3);
    }
  });
});

describe("Bahasa Indonesia → katakana untuk VOICEVOX", () => {
  it("kata dipisah tanpa jeda, aksen di suku kata kedua dari belakang, tanda baca jadi jeda", () => {
    expect(indonesianToKana("Aku Miu-chan, ayo belajar bareng!").marked).toBe("ア'ク/ミ'ウ/チャ'ン、ア'ヨ/ベラ'ジャル/バ'レン");
    expect(indonesianToKana("Tidak apa-apa, coba lagi ya?").marked).toBe("ティ'ダッ/ア'パ/ア'パ、チョ'バ/ラ'ギ/ヤ'？");
  });

  it("bunyi khusus: ng, ny, sy, c, j, akhir k/t, gugus konsonan", () => {
    expect(indonesianToKana("dengan").plain).toBe("デンガン");
    expect(indonesianToKana("nyanyi").plain).toBe("ニャニ");
    expect(indonesianToKana("syukur").plain).toBe("シュクル");
    expect(indonesianToKana("cinta").plain).toBe("チンタ");
    expect(indonesianToKana("selamat").plain).toBe("セラマッ");
    expect(indonesianToKana("praktis").plain).toBe("プラッティス");
  });

  it("angka dan singkatan dieja dalam bahasa Indonesia", () => {
    expect(numberWords(100)).toBe("seratus");
    expect(numberWords(1250)).toBe("seribu dua ratus lima puluh");
    expect(numberWords(17)).toBe("tujuh belas");
    expect(indonesianToKana("N5").plain).toBe("エンリマ");
    expect(indonesianToKana("JLPT").plain).toBe("ジェエルペテ");
  });

  it("teks tanpa huruf menghasilkan kosong", () => {
    expect(indonesianToKana("... !!").marked).toBe("");
  });
});

describe("Resample PCM", () => {
  it("durasi tetap saat sample rate diubah", () => {
    const src = pcm(1, 500);
    const out = resamplePcm(src, 28800, 24000);
    expect(out.length / 2).toBe(Math.round((src.length / 2) * 24000 / 28800));
    expect(out.readInt16LE(100)).toBe(500);
  });
});

describe("Penyamaan keras suara antarmesin", () => {
  /** Ucapan tiruan: nada 200 Hz dengan selingan hening, amplitudo `amp`. */
  const speech = (amp: number) => {
    const b = Buffer.alloc(24000 * 2);
    for (let i = 0; i < 24000; i++) b.writeInt16LE(i % 6000 < 4500 ? Math.round(Math.sin((2 * Math.PI * 200 * i) / 24000) * amp) : 0, i * 2);
    return b;
  };

  it("potongan pelan (VOICEVOX) dan keras (Gemini) menjadi sama keras", () => {
    const quiet = normalizeLoudness(speech(4000), 24000);
    const loud = normalizeLoudness(speech(15000), 24000);
    expect(speechRms(quiet, 24000)).toBeGreaterThan(TARGET_SPEECH_RMS * 0.95);
    expect(speechRms(quiet, 24000)).toBeLessThan(TARGET_SPEECH_RMS * 1.05);
    expect(Math.abs(speechRms(quiet, 24000) - speechRms(loud, 24000))).toBeLessThan(TARGET_SPEECH_RMS * 0.05);
  });

  it("puncak dilunakkan, tidak pernah pecah", () => {
    // Nada keras dengan satu lonjakan: setelah dikeraskan tetap di bawah batas 16-bit
    const b = speech(3000);
    b.writeInt16LE(30000, 200);
    const out = normalizeLoudness(b, 24000);
    let peak = 0;
    for (let i = 0; i < out.length; i += 2) peak = Math.max(peak, Math.abs(out.readInt16LE(i)));
    expect(peak).toBeLessThanOrEqual(32767);
    expect(out.readInt16LE(200)).toBeGreaterThan(26000);
  });

  it("hening tidak dikeraskan", () => {
    const silence = Buffer.alloc(4800);
    expect(normalizeLoudness(silence, 24000)).toBe(silence);
  });
});
