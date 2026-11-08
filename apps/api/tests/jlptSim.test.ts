import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  JLPT_SPEC,
  SIM_SECTIONS,
  defaultJlptSimConfig,
  isJlptCode,
  jlptSessions,
  orderBySection,
  scoreJlpt,
  sessionOf,
} from "../src/modules/exam/domain/JlptSim";
import { jlptPackageSchema, mapJlptPackage, packageNumber, QUESTION_TYPE_MAP } from "../src/modules/exam/domain/jlptImport";
import { PLAN } from "../src/modules/exam/domain/jlptPlan";
import { JLPT_CATEGORIES } from "../src/modules/exam/domain/JlptSim";
import { examTotal, parseSectionRules, pickQuestions, withUnanswered } from "../src/modules/exam/domain/SectionRules";

const full = (correct: number, total: number) => ({ correct, total });

describe("struktur resmi simulasi JLPT", () => {
  it("waktu total sama dengan JLPT asli", () => {
    const total = (c: "N5" | "N4" | "N3" | "N2" | "N1") => defaultJlptSimConfig(c).timeLimitMin;
    expect([total("N5"), total("N4"), total("N3"), total("N2"), total("N1")]).toEqual([90, 115, 140, 155, 165]);
  });

  it("batas lulus total dalam skala 0-180", () => {
    expect(["N5", "N4", "N3", "N2", "N1"].map((c) => defaultJlptSimConfig(c as "N5").passScore)).toEqual([80, 90, 95, 90, 100]);
  });

  it("jumlah soal bawaan sesuai perkiraan resmi dan memuat Dokkai", () => {
    const c = defaultJlptSimConfig("N5");
    expect(c.questionCount).toBe(62);
    expect(examTotal(c.questionCount, parseSectionRules(c.sectionRules, SIM_SECTIONS))).toBe(62);
    expect(c.sectionRules.dokkai?.count).toBeGreaterThan(0);
  });

  it("N5 punya tiga sesi, N2 dua sesi; tiap bagian masuk tepat satu sesi", () => {
    expect(JLPT_SPEC.N5.sessions.map((s) => s.minutes)).toEqual([20, 40, 30]);
    expect(JLPT_SPEC.N2.sessions.map((s) => s.minutes)).toEqual([105, 50]);
    for (const code of ["N5", "N4", "N3", "N2", "N1"] as const) {
      for (const sec of SIM_SECTIONS) expect(sessionOf(code, sec)).not.toBeNull();
    }
    expect(sessionOf("N5", "dokkai")).toBe("bunpou_dokkai");
    expect(sessionOf("N2", "dokkai")).toBe("bahasa_dokkai");
  });

  it("waktu sesi ikut berubah proporsional saat admin mengubah total waktu", () => {
    const s = jlptSessions("N5", 60);
    expect(s.reduce((n, x) => n + x.minutes, 0)).toBe(60);
    expect(s.map((x) => x.minutes)).toEqual([13, 27, 20]);
    expect(jlptSessions("N5")).toBe(JLPT_SPEC.N5.sessions);
  });

  it("hanya N5 sampai N1", () => {
    expect(isJlptCode("N3")).toBe(true);
    expect(isJlptCode("PEMULA")).toBe(false);
  });

  it("soal diurutkan seperti kertas ujian, urutan dalam bagian tetap", () => {
    const qs = [
      { id: "1", section: "mendengar" },
      { id: "2", section: "dokkai" },
      { id: "3", section: "kosakata" },
      { id: "4", section: "membaca" },
      { id: "5", section: "tata_bahasa" },
      { id: "6", section: "kosakata" },
    ];
    expect(orderBySection(qs).map((q) => q.id)).toEqual(["4", "3", "6", "5", "2", "1"]);
  });

  it("pemilihan soal memakai jumlah per bagian termasuk Dokkai", () => {
    const pool = [
      ...Array.from({ length: 5 }, (_, i) => ({ id: `d${i}`, section: "dokkai" })),
      ...Array.from({ length: 5 }, (_, i) => ({ id: `k${i}`, section: "kosakata" })),
    ];
    const picked = pickQuestions(pool, 4, { dokkai: { count: 2, minScore: 0 }, kosakata: { count: 2, minScore: 0 } }, SIM_SECTIONS);
    expect(picked.filter((q) => q.section === "dokkai")).toHaveLength(2);
    expect(picked.filter((q) => q.section === "kosakata")).toHaveLength(2);
  });
});

describe("penilaian simulasi JLPT", () => {
  it("N5: dua kelompok (0-120 dan 0-60) dijumlahkan ke skala 180", () => {
    const s = scoreJlpt("N5", { kosakata: full(14, 21), tata_bahasa: full(10, 16), dokkai: full(4, 6), mendengar: full(12, 19) }, 80);
    expect(s.groups.map((g) => [g.key, g.max, g.min])).toEqual([["bahasa_membaca", 120, 38], ["choukai", 60, 19]]);
    expect(s.groups[0].scaled).toBe(Math.round((28 / 43) * 120));
    expect(s.total).toBe(s.groups[0].scaled + s.groups[1].scaled);
    expect(s.passed).toBe(true);
  });

  it("total cukup tapi satu kelompok di bawah ambang tetap tidak lulus", () => {
    const s = scoreJlpt("N3", { kosakata: full(30, 30), tata_bahasa: full(25, 25), dokkai: full(10, 10), mendengar: full(3, 24) }, 95);
    expect(s.total).toBeGreaterThanOrEqual(95);
    expect(s.groups.find((g) => g.key === "choukai")?.passed).toBe(false);
    expect(s.passed).toBe(false);
  });

  it("kelompok tanpa soal tidak ikut syarat; total dihitung ulang dari kelompok yang ada", () => {
    const s = scoreJlpt("N2", { kosakata: full(30, 30), mendengar: full(30, 30) }, 90);
    expect(s.partial).toBe(true);
    expect(s.groups.find((g) => g.key === "dokkai")?.empty).toBe(true);
    expect(s.total).toBe(180);
    expect(s.passed).toBe(true);
  });

  it("tanpa soal sama sekali tidak lulus", () => {
    expect(scoreJlpt("N1", {}, 100)).toMatchObject({ total: 0, passed: false });
  });
});

describe("impor paket soal JSON", () => {
  const base = {
    examSlug: "jlpt-n5-mock-99",
    levelCode: "n5",
    sections: [
      {
        sectionType: "moji_goi",
        questions: [
          {
            questionNumber: 1,
            questionType: "CONTEXTUAL_EXPRESSION",
            promptText: "でんきを（　）ください。",
            options: [{ index: 2, text: "けして" }, { index: 1, text: "つけて" }],
            correctOptionIndex: 1,
          },
        ],
      },
    ],
  };

  it("opsi berindeks diurutkan dan jawaban benar diambil dari nomornya", () => {
    const { questions, errors } = mapJlptPackage(jlptPackageSchema.parse(base));
    expect(errors).toEqual([]);
    expect(questions[0]).toMatchObject({
      section: "kosakata",
      category: "bunmyaku",
      options: ["つけて", "けして"],
      correctAnswer: "つけて",
      sourceKey: "jlpt-n5-mock-99:moji_goi:1",
    });
  });

  it("Choukai tanpa audio ditolak; audioScript diubah jadi audio TTS dan disimpan sebagai skrip", () => {
    const listen = (extra: object) =>
      mapJlptPackage(
        jlptPackageSchema.parse({
          ...base,
          sections: [{ sectionType: "CHOUKAI", questions: [{ ...base.sections[0].questions[0], questionType: "TASK_BASED", ...extra }] }],
        }),
      );
    expect(listen({}).errors[0]).toMatch(/audio/);
    const ok = listen({ audioScript: "店員は何をしますか。" });
    expect(ok.questions[0].audioUrl).toMatch(/^\/api\/tts\?text=/);
    expect(ok.questions[0].passage).toBe("店員は何をしますか。");
    expect(ok.questions[0].type).toBe("mendengar");
  });

  it("menolak tipe soal yang tidak cocok dengan bagiannya dan URL media yang tidak aman", () => {
    const bad = mapJlptPackage(
      jlptPackageSchema.parse({
        ...base,
        sections: [{ sectionType: "BUNPOU", questions: [{ ...base.sections[0].questions[0], imageUrl: "javascript:alert(1)" }] }],
      }),
    );
    expect(bad.errors[0]).toMatch(/tidak termasuk bagian BUNPOU/);
    const img = mapJlptPackage(
      jlptPackageSchema.parse({ ...base, sections: [{ ...base.sections[0], questions: [{ ...base.sections[0].questions[0], imageUrl: "javascript:alert(1)" }] }] }),
    );
    expect(img.questions[0].imageUrl).toBeNull();
  });

  it("semua file di bank soal (prisma/data/jlpt-sim/bank) valid", () => {
    const dir = join(__dirname, "..", "prisma", "data", "jlpt-sim", "bank");
    const files = readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const f of files) {
      const { errors, questions } = mapJlptPackage(jlptPackageSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
      expect(errors, f).toEqual([]);
      expect(questions.length, f).toBeGreaterThan(0);
      // Endpoint TTS memotong teks di 300 karakter
      for (const q of questions) if (q.passage && q.section === "mendengar") expect(q.passage.length, f).toBeLessThanOrEqual(300);
    }
  });
});

describe("penilaian soal yang tidak dijawab", () => {
  const details = { questions: [{ id: "a" }, { id: "b" }, { id: "c" }] };

  it("soal yang tidak dijawab ikut dinilai sebagai jawaban kosong", () => {
    expect(withUnanswered([{ questionId: "a", answer: "x" }], details)).toEqual([
      { questionId: "a", answer: "x" },
      { questionId: "b", answer: "" },
      { questionId: "c", answer: "" },
    ]);
  });

  it("jawaban untuk soal di luar percobaan dibuang", () => {
    const out = withUnanswered([{ questionId: "z", answer: "x" }, { questionId: "b", answer: "y" }], details);
    expect(out.map((a) => a.questionId)).toEqual(["a", "b", "c"]);
    expect(out[1].answer).toBe("y");
  });

  it("percobaan lama tanpa daftar soal dinilai seperti dulu", () => {
    const answers = [{ questionId: "z", answer: "x" }];
    expect(withUnanswered(answers, null)).toBe(answers);
  });
});

describe("paket simulasi", () => {
  it("rencana Daimon tiap level menghasilkan jumlah soal per bagian yang sama dengan aturan resmi", () => {
    for (const code of ["N5", "N4", "N3", "N2", "N1"] as const) {
      const perSection: Record<string, number> = {};
      for (const item of PLAN[code]) {
        const category = JLPT_CATEGORIES.find((c) => c.key === QUESTION_TYPE_MAP[item.questionType]);
        expect(category, `${code} ${item.questionType}`).toBeDefined();
        perSection[category!.section] = (perSection[category!.section] ?? 0) + item.count;
      }
      expect(perSection, code).toEqual(JLPT_SPEC[code].counts);
    }
  });

  it("nomor paket dari variantIndex atau dari akhir examSlug", () => {
    expect(packageNumber({ examSlug: "jlpt-n5-mock-04" })).toBe(4);
    expect(packageNumber({ examSlug: "jlpt-n5-mock-04", variantIndex: 7 })).toBe(7);
    expect(packageNumber({ examSlug: "jlpt-n5-latihan" })).toBeNull();
    expect(packageNumber({ examSlug: "jlpt-n5-mock-11" })).toBeNull();
  });

  it("soal dalam satu bagian diurutkan per Daimon lalu nomor soal", () => {
    const qs = [
      { id: "a", section: "kosakata", category: "iikae", sourceKey: "p:moji_goi:3" },
      { id: "b", section: "kosakata", category: "bunmyaku", sourceKey: "p:moji_goi:9" },
      { id: "c", section: "kosakata", category: "bunmyaku", sourceKey: "p:moji_goi:2" },
      { id: "d", section: "membaca", category: "kanji_yomi", sourceKey: "p:moji_goi:1" },
    ];
    expect(orderBySection(qs).map((q) => q.id)).toEqual(["d", "c", "b", "a"]);
  });
});
