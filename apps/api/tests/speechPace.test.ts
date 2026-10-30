import { describe, expect, it } from "vitest";
import { AskQuestion } from "../src/modules/ask/application/AskUseCase";
import { FAST_TEMPO, paceTempo, planSpeech, speechText } from "../src/shared/domain/speechPace";
import { estimateSpeechSeconds } from "../src/shared/infrastructure/geminiTts";
import { cutPoints, shiftPitchByPace } from "../src/shared/infrastructure/pitchShift";

describe("paceTempo", () => {
  it("bahasa Indonesia selalu normal, Jepang hanya setengah dari perlambatan level", () => {
    expect(paceTempo("id", 0.7)).toBe(1);
    expect(paceTempo("ja", 0.7)).toBe(0.85);
    expect(paceTempo("ja", 1)).toBe(1);
  });

  it("pelan memakai kecepatan level, tetap diperlambat walau level lanjut", () => {
    expect(paceTempo("pelan", 0.7)).toBe(0.7);
    expect(paceTempo("pelan", 1)).toBe(0.85);
    expect(paceTempo("cepat", 0.7)).toBe(FAST_TEMPO);
  });
});

describe("planSpeech", () => {
  it("memisahkan bagian bertanda dan bahasa, tanpa tanda di teks tampilan", () => {
    const runs = planSpeech("Jadi <pelan>学校に行きます</pelan>. Coba ulangi deh!", 0.7);
    expect(runs).toEqual([
      { text: "Jadi ", tempo: 1 },
      { text: "学校に行きます", tempo: 0.7, mark: "pelan" },
      { text: ". Coba ulangi deh!", tempo: 1 },
    ]);
    expect(speechText(runs)).toBe("Jadi 学校に行きます. Coba ulangi deh!");
  });

  it("Jepang tanpa tanda diperlambat sedikit, seruan cepat dipercepat", () => {
    const runs = planSpeech("<cepat>Eeeh?!</cepat> お腹すいた？ Lapar ya?", 0.75);
    expect(runs.map((r) => r.tempo)).toEqual([FAST_TEMPO, 0.88, 1]);
  });

  it("kata Jepang sependek partikel di tengah kalimat Indonesia tidak dipecah", () => {
    expect(planSpeech("Tujuan pakai に, bukan で ya.", 0.7)).toEqual([{ text: "Tujuan pakai に, bukan で ya.", tempo: 1 }]);
  });

  it("tanda yang tidak ditutup dibuang, potongan yang sama digabung", () => {
    const runs = planSpeech("Halo <pelan>semua, apa kabar?", 1);
    expect(runs).toEqual([{ text: "Halo semua, apa kabar?", tempo: 1 }]);
  });
});

describe("AskQuestion tempo suara", () => {
  it("jawaban suara membawa rencana tempo, koreksi tanpa tanda", async () => {
    const uc = new AskQuestion({
      ask: { answer: async () => "[biasa] Jadi <pelan>学校に行きます</pelan> ya!{{benar: <pelan>学校に行きます</pelan>}}" },
    });
    const res = await uc.execute("aku 学校で行きます", [], "voice");
    expect(res.answer).toBe("Jadi 学校に行きます ya!");
    expect(res.correction).toBe("学校に行きます");
    expect(res.speech?.map((r) => r.mark ?? null)).toEqual([null, "pelan", null]);
  });
});

describe("tempo per bagian audio", () => {
  const sr = 8000;
  // Bunyi 1 detik, hening 0,3 detik, bunyi 1 detik
  const tone = (n: number) => Array.from({ length: n }, (_, i) => Math.sin(i / 3) * 0.5);
  const signal = Float32Array.from([...tone(sr), ...new Array(sr * 0.3).fill(0), ...tone(sr)]);

  it("batas bagian digeser ke jeda terdekat", () => {
    // Perkiraan teks meleset (bagian pertama dikira lebih pendek), tapi potongan tetap jatuh di hening
    const [cut] = cutPoints(signal, sr, [0.8, 1.2]);
    expect(cut).toBeGreaterThan(sr);
    expect(cut).toBeLessThan(sr * 1.3);
  });

  it("bagian pelan memanjang, bagian normal tetap", () => {
    const pcm = Buffer.alloc(signal.length * 2);
    signal.forEach((v, i) => pcm.writeInt16LE(Math.round(v * 32767), i * 2));
    const out = shiftPitchByPace(pcm, sr, 1, [{ seconds: 1, tempo: 0.5 }, { seconds: 1, tempo: 1 }]);
    const seconds = out.pcm.length / 2 / out.sampleRate;
    expect(seconds).toBeGreaterThan(3);
    expect(seconds).toBeLessThan(3.8);
  });

  it("perkiraan lama ucapan: kana lebih lama dari huruf latin", () => {
    expect(estimateSpeechSeconds("がっこう")).toBeGreaterThan(estimateSpeechSeconds("sekol"));
  });
});
