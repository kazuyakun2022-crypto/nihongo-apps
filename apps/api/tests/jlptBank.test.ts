import { describe, expect, it } from "vitest";
import { buildBankFiles, parseLevels, parsePackages, planInjection, resolveStatus, type BankRow } from "../src/modules/exam/domain/jlptBank";
import { jlptPackageSchema, mapJlptPackage, ttsUrl } from "../src/modules/exam/domain/jlptImport";

const row = (over: Partial<BankRow>): BankRow => ({
  id: "11111111-2222-3333-4444-555555555555",
  levelCode: "N5",
  packageNo: 2,
  section: "kosakata",
  category: "bunmyaku",
  question: "へやが くらいですから、でんきを（　）ください。",
  passage: null,
  options: ["しめて", "けして", "あけて", "つけて"],
  correctAnswer: "つけて",
  audioUrl: null,
  imageUrl: null,
  explanation: "Kamar gelap.",
  difficulty: 1,
  status: "published",
  sourceKey: "jlpt-n5-mock-02:moji_goi:1",
  ...over,
});

describe("bank soal: ekspor lalu impor kembali", () => {
  it("menghasilkan soal yang sama persis (sourceKey, status, paket, bagian, jawaban)", () => {
    const rows = [
      row({}),
      row({ id: "a2", sourceKey: "jlpt-n5-mock-02:moji_goi:2", section: "membaca", category: "kanji_yomi", status: "draft", question: "<u>水</u>を のみます。", options: ["みず", "みづ", "みす", "みっず"], correctAnswer: "みず" }),
      row({ id: "a3", sourceKey: null, section: "tata_bahasa", category: null, question: "これは わたし（　）ほんです。", options: ["の", "が", "を", "に"], correctAnswer: "の" }),
      row({
        id: "a4",
        sourceKey: "jlpt-n5-mock-02:choukai:1",
        section: "mendengar",
        category: "choukai_kadai",
        passage: "店員は何をしますか。",
        audioUrl: ttsUrl("店員は何をしますか。"),
        question: "このあと なにを しますか。",
      }),
    ];
    const { files, skipped } = buildBankFiles(rows);
    expect(skipped).toEqual([]);
    expect(files.map((f) => f.path)).toEqual(["n5/paket-02.json"]);

    const back = mapJlptPackage(jlptPackageSchema.parse(JSON.parse(JSON.stringify(files[0].pkg))));
    expect(back.errors).toEqual([]);
    expect(back.level).toBe("N5");
    for (const r of rows) {
      const q = back.questions.find((x) => x.question === r.question)!;
      expect(q, r.question).toBeDefined();
      expect(q.packageNo).toBe(2);
      expect(q.section).toBe(r.section);
      expect(q.category).toBe(r.category);
      expect(q.correctAnswer).toBe(r.correctAnswer);
      expect(q.options).toEqual(r.options);
      expect(q.status).toBe(r.status);
      expect(q.audioUrl).toBe(r.audioUrl);
      if (r.sourceKey) expect(q.sourceKey).toBe(r.sourceKey);
    }
    // Soal buatan admin tanpa sourceKey diberi kunci tetap dari id-nya (ekspor ulang = kunci sama)
    const adminQ = back.questions.find((q) => q.section === "tata_bahasa")!;
    expect(adminQ.sourceKey).toBe("jlpt-n5-mock-02:q:a3");
    expect(buildBankFiles(rows).files[0].pkg).toEqual(files[0].pkg);
  });

  it("audio TTS disimpan sebagai skrip yang bisa dibaca, bukan URL panjang", () => {
    const { files } = buildBankFiles([row({ section: "mendengar", category: "choukai_kadai", audioUrl: ttsUrl("すみません、トイレはどこですか。") })]);
    const q = files[0].pkg.sections[0].questions[0];
    expect(q.audioScript).toBe("すみません、トイレはどこですか。");
    expect(q.audioUrl).toBeUndefined();
  });

  it("soal tanpa paket masuk file campuran; soal yang kuncinya hilang dilewati dengan peringatan", () => {
    const { files, skipped } = buildBankFiles([row({ packageNo: null, sourceKey: "x:1" }), row({ id: "bad", sourceKey: "x:2", correctAnswer: "tidak ada" })]);
    // Paket 02 hanya berisi soal rusak itu, jadi filenya tidak dibuat sama sekali
    expect(files.map((f) => f.path)).toEqual(["n5/campuran.json"]);
    expect(files.find((f) => f.path === "n5/campuran.json")!.pkg.examSlug).toBe("jlpt-n5-campuran");
    expect(skipped).toHaveLength(1);
  });
});

describe("bank soal: argumen dan rencana", () => {
  it("membaca rentang paket dan tingkat", () => {
    expect(parsePackages("2-5,7")).toEqual([2, 3, 4, 5, 7]);
    expect(parsePackages("semua")).toHaveLength(10);
    expect(() => parsePackages("0-3")).toThrow();
    expect(() => parsePackages("9-11")).toThrow();
    expect(parseLevels("n5, N4")).toEqual(["N5", "N4"]);
    expect(parseLevels(undefined)).toEqual(["N5", "N4", "N3", "N2", "N1"]);
    expect(() => parseLevels("N6")).toThrow();
  });

  it("status ikut file kecuali dipaksa; file tanpa status menjadi draft", () => {
    expect(resolveStatus({ status: "published" }, "ikut-file")).toBe("published");
    expect(resolveStatus({ status: null }, "ikut-file")).toBe("draft");
    expect(resolveStatus({ status: "published" }, "draft")).toBe("draft");
  });

  it("rencana menghitung soal baru vs diperbarui per tingkat dan paket", () => {
    const { questions } = mapJlptPackage(jlptPackageSchema.parse(buildBankFiles([row({}), row({ id: "b", sourceKey: "k:2" })]).files[0].pkg));
    const plan = planInjection(questions.map((q) => ({ level: "N5" as const, q })), new Set(["jlpt-n5-mock-02:moji_goi:1"]), "ikut-file");
    expect(plan).toEqual([{ level: "N5", packageNo: 2, total: 2, created: 1, updated: 1, published: 2, draft: 0 }]);
  });
});
