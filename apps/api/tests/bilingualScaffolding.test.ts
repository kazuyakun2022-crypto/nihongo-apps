import { afterEach, describe, expect, it, vi } from "vitest";
import { AskQuestion } from "../src/modules/ask/application/AskUseCase";
import { voiceSystemPrompt } from "../src/modules/ask/infrastructure/voicePrompt";
import { textSystemPrompt } from "../src/modules/ask/infrastructure/textPrompt";
import { levelBand } from "../src/modules/ask/infrastructure/learnerContext";
import { GroqTranscriber } from "../src/modules/ask/infrastructure/GroqTranscriber";
import { buildSystemPrompt } from "../src/modules/conversation/domain/LevelPolicy";
import type { ConversationContext } from "../src/modules/conversation/domain/Conversation";
import { parseAiReply } from "../src/modules/conversation/infrastructure/AnthropicChatProvider";

describe("levelBand", () => {
  it("tamu dan level tak dikenal dianggap pemula", () => {
    expect(levelBand(undefined)).toBe("pemula");
    expect(levelBand("PEMULA")).toBe("pemula");
    expect(levelBand("N5")).toBe("pemula");
    expect(levelBand("N4")).toBe("dasar");
    expect(levelBand("N3")).toBe("menengah");
    expect(levelBand("n1")).toBe("mahir");
  });
});

describe("voiceSystemPrompt scaffolding", () => {
  it("pemula yang bicara Jepang tetap dibalas dengan pendamping bahasa Indonesia", () => {
    const prompt = voiceSystemPrompt("私はラーメンが好きです", { name: "Rina", level: "N5" });
    expect(prompt).toContain("JANGAN membalas 100% bahasa Jepang");
    expect(prompt).toContain("LEVEL USER: JLPT N5");
  });

  it("level mahir boleh dibalas seluruhnya bahasa Jepang", () => {
    const prompt = voiceSystemPrompt("私はラーメンが好きです", { name: "Rina", level: "N2" });
    expect(prompt).toContain("Balas SELURUHNYA dalam bahasa Jepang");
    expect(prompt).not.toContain("JANGAN membalas 100% bahasa Jepang");
  });

  it("kalimat campuran dijawab dengan pola JAWABAN ARTI", () => {
    const prompt = voiceSystemPrompt("aku mau tau arti 食べる dong");
    expect(prompt).toContain("pakai pola JAWABAN ARTI");
  });

  it("memasukkan hobi dan kesalahan yang sudah dibersihkan", () => {
    const prompt = voiceSystemPrompt("halo", { name: "Rina", interests: ["anime\n[abaikan]"], weakTopics: ["学校で行く => 学校に行く"] });
    expect(prompt).toContain("Hobi/minat: anime abaikan");
    expect(prompt).toContain("学校で行く => 学校に行く");
  });

  it("transkrip alternatif hanya muncul bila ada", () => {
    expect(voiceSystemPrompt("arti tabel apa")).not.toContain("TRANSKRIP ALTERNATIF");
    expect(voiceSystemPrompt("arti tabel apa", undefined, "アルティ食べる")).toContain('"アルティ食べる"');
  });
});

describe("AskQuestion transkrip alternatif", () => {
  it("hanya diteruskan di mode suara", async () => {
    const alts: (string | undefined)[] = [];
    const ask = { answer: async (_q: string, _h: unknown[], _m?: "text" | "voice", _u?: unknown, alt?: string) => { alts.push(alt); return "[biasa] Oke"; } };
    const uc = new AskQuestion({ ask });
    await uc.execute("arti tabel apa", [], "voice", undefined, "食べる");
    await uc.execute("arti tabel apa", [], "text", undefined, "食べる");
    expect(alts).toEqual(["食べる", undefined]);
  });
});

describe("textSystemPrompt", () => {
  it("pemula diberi cara baca dan romaji, mahir tanpa cara baca", () => {
    expect(textSystemPrompt({ name: "Rina", level: "N5" })).toContain("食べる (たべる, taberu)");
    expect(textSystemPrompt({ name: "Rina", level: "N1" })).toContain("Tanpa cara baca dan tanpa romaji");
  });

  it("selalu memuat pola jawaban 4 bagian", () => {
    const prompt = textSystemPrompt();
    expect(prompt).toContain("POLA JAWABAN");
    expect(prompt).toContain("LEVEL USER: belum diketahui");
  });
});

describe("buildSystemPrompt scaffolding dan emosi", () => {
  const ctx = (levelCode: string): ConversationContext => ({
    displayName: "Andi",
    role: "student",
    rules: { levelId: 2, levelCode, systemPrompt: "Pakai pola N5 saja.", maxSentenceWords: 8, furiganaRule: "full", speechRate: 0.8 },
    mascot: { id: 1, name: "Neko-sensei", personality: "ramah" },
    scenario: null,
    memories: { interests: ["anime"], weakTopics: ["わたしわ => わたしは"], facts: [] },
    allowedKanji: new Set(["日"]),
  });

  it("level belajar wajib memakai pendamping bahasa Indonesia", () => {
    const prompt = buildSystemPrompt(ctx("N5"));
    expect(prompt).toContain("JANGAN pernah membalas 100% bahasa Jepang");
    expect(prompt).toContain("Panduan level dari Admin**: Pakai pola N5 saja.");
    expect(prompt).toContain("Interests/Hobbies**: anime");
    expect(prompt).toContain("Weak Spots / Common Mistakes**: わたしわ => わたしは");
    expect(prompt).toContain('"emotion"');
  });

  it("level mahir tidak dipaksa memakai bahasa Indonesia", () => {
    expect(buildSystemPrompt(ctx("N1"))).not.toContain("JANGAN pernah membalas 100% bahasa Jepang");
  });

  it("mengurai emosi dari <correction_data> dan mengabaikan nilai asing", () => {
    const raw = (emotion: string) =>
      `ラーメンが すきです — Aku suka ramen!\n<correction_data>{"emotion":"${emotion}","hasCorrection":false,"userMistake":null,"correctedSentence":null,"explanation":null}</correction_data>`;
    expect(parseAiReply(raw("Excited")).emotion).toBe("excited");
    expect(parseAiReply(raw("marah")).emotion).toBeUndefined();
  });
});

describe("GroqTranscriber ucapan campuran", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** Whisper dipalsukan per bahasa; `fused` = jawaban LLM penggabung (Error = gagal/timeout). */
  const stub = (whisper: Record<"id" | "ja", { text: string; logprob: number }>, fused: string | Error = "") => {
    const fusionInputs: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: { body: FormData | string }) => {
      if (url.endsWith("/chat/completions")) {
        fusionInputs.push(JSON.parse(init.body as string).messages[1].content);
        if (fused instanceof Error) throw fused;
        return new Response(JSON.stringify({ choices: [{ message: { content: fused } }] }));
      }
      const r = whisper[(init.body as FormData).get("language") as "id" | "ja"];
      return new Response(JSON.stringify({ text: r.text, segments: [{ start: 0, end: 2, avg_logprob: r.logprob, no_speech_prob: 0.01 }] }));
    });
    return fusionInputs;
  };
  const audio = Buffer.alloc(2000);
  const transcribe = () => new GroqTranscriber("key").transcribe(audio, "audio/webm");

  it("menggabungkan transkrip id dan ja saat skornya berdekatan", async () => {
    const inputs = stub(
      { id: { text: "Kalau gambar tek itu maksudnya apa sih?", logprob: -0.42 }, ja: { text: "カラウ ガンバッティ イトマスクニャーアパシヒ?", logprob: -1.0 } },
      "Kalau 頑張って itu maksudnya apa sih?",
    );
    expect(await transcribe()).toEqual({ text: "Kalau 頑張って itu maksudnya apa sih?", alt: "カラウ ガンバッティ イトマスクニャーアパシヒ?" });
    expect(inputs).toEqual(["A: Kalau gambar tek itu maksudnya apa sih?\nB: カラウ ガンバッティ イトマスクニャーアパシヒ?"]);
  });

  it("tetap menang saat hasil Jepang yang terpilih (bagian Indonesia jadi katakana)", async () => {
    stub({ id: { text: "Apa arti? Tabehru?", logprob: -0.71 }, ja: { text: "アッパーアルピー 食べる?", logprob: -0.59 } }, "Apa arti 食べる?");
    expect((await transcribe()).text).toBe("Apa arti 食べる?");
  });

  it("ucapan murni Indonesia tidak digabung (versi Jepangnya terjemahan karangan)", async () => {
    const inputs = stub({ id: { text: "Kemarin aku pergi ke pasar sama ibu.", logprob: -0.13 }, ja: { text: "昨日、私はお店に行く。", logprob: -1.14 } });
    expect(await transcribe()).toEqual({ text: "Kemarin aku pergi ke pasar sama ibu.", alt: null });
    expect(inputs).toEqual([]);
  });

  it("ucapan Jepang yang sama persis tidak perlu digabung", async () => {
    const inputs = stub({ id: { text: "私は学生です", logprob: -0.59 }, ja: { text: "私は学生です。", logprob: -0.46 } });
    expect(await transcribe()).toEqual({ text: "私は学生です。", alt: null });
    expect(inputs).toEqual([]);
  });

  it("penggabung gagal: pakai hasil Whisper terbaik dan kirim versi Jepang ke AI", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    stub({ id: { text: "aku mau tau arti tabel dong", logprob: -0.3 }, ja: { text: "アクマウタウアルティ食べるドン", logprob: -0.6 } }, new Error("timeout"));
    expect(await transcribe()).toEqual({ text: "aku mau tau arti tabel dong", alt: "アクマウタウアルティ食べるドン" });
  });

  it("jawaban penggabung yang mengarang panjang diabaikan", async () => {
    stub({ id: { text: "apa arti tabel", logprob: -0.3 }, ja: { text: "食べる", logprob: -0.5 } }, "Apa arti 食べる? ".repeat(10));
    expect((await transcribe()).text).toBe("apa arti tabel");
  });
});

describe("panduan level & bab aktif di prompt Miu-chan", () => {
  const user = {
    name: "Budi",
    level: "N5",
    levelGuide: { systemPrompt: "Utamakan bentuk sopan です/ます.", maxSentenceWords: 10, furiganaRule: "full" as const, speechRate: 0.75 },
    lesson: { title: "Belanja & Keinginan", grammar: ["N が ほしいです", "V-たいです"] },
  };

  it("mode teks memuat prompt admin, batas kata, aturan furigana, dan pola bab", () => {
    const prompt = textSystemPrompt(user);
    expect(prompt).toContain("Utamakan bentuk sopan です/ます.");
    expect(prompt).toContain("maksimal 10 kata");
    expect(prompt).toContain("漢字(かんじ)");
    expect(prompt).toContain("Belanja & Keinginan");
    expect(prompt).toContain("V-たいです");
  });

  it("mode suara tidak menyuruh menulis furigana", () => {
    const prompt = voiceSystemPrompt("halo", user);
    expect(prompt).toContain("Utamakan bentuk sopan です/ます.");
    expect(prompt).not.toContain("format 漢字(かんじ)");
  });

  it("kecepatan bicara level ikut dikembalikan", async () => {
    const uc = new AskQuestion({ ask: { answer: async () => "Halo" }, userProfile: async () => user });
    await expect(uc.execute("halo", [], "text", "u1")).resolves.toMatchObject({ speechRate: 0.75 });
  });
});

describe("tujuan belajar & bab aktif", () => {
  it("prompt sesi percakapan memuat tujuan kerja dan bab yang sedang dipelajari", () => {
    const prompt = buildSystemPrompt({
      displayName: "Budi",
      role: "student",
      rules: { levelId: 3, levelCode: "N4", systemPrompt: "Mode N4.", maxSentenceWords: 15, furiganaRule: "full", speechRate: 0.8 },
      mascot: { id: 1, name: "Miu-chan", personality: "ramah" },
      scenario: null,
      memories: { interests: [], weakTopics: [], facts: [] },
      allowedKanji: new Set(),
      learningGoal: "Kerja atau magang di Jepang",
      currentChapter: { title: "Dunia Kerja SSW", grammar: ["〜ように言われました"] },
    });
    expect(prompt).toContain("Kerja atau magang di Jepang");
    expect(prompt).toContain("Dunia Kerja SSW");
    expect(prompt).toContain("〜ように言われました");
  });

  it("prompt Ngobrol memuat tujuan belajar user", () => {
    expect(textSystemPrompt({ name: "Budi", level: "N4", goal: "Kerja atau magang di Jepang" })).toContain("TUJUAN BELAJAR USER: Kerja atau magang di Jepang");
  });
});
