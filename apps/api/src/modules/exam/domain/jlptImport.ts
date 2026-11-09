import { z } from "zod";
import { JLPT_CATEGORIES, isJlptCode, type JlptCode, type SimSection } from "./JlptSim";

/**
 * Format paket soal simulasi JLPT (data ingestion). Satu file = satu paket, mis. "jlpt-n5-mock-01".
 * Tambahan di luar format dasar:
 * - passage: teks bacaan Dokkai (tampil di atas soal) atau skrip percakapan Choukai (hanya tampil di pembahasan).
 * - audioScript: bila audioUrl kosong, audio Choukai dibuat dari teks ini lewat /api/tts.
 * - variantIndex: nomor paket 1-10. Bila kosong, diambil dari angka di akhir examSlug (jlpt-n5-mock-04 -> 4).
 * - Per soal (dipakai file hasil ekspor bank, lihat jlptBank.ts):
 *   sourceKey: identitas tetap soal (impor ulang memperbarui, bukan menggandakan);
 *   status: "published" | "draft"; section: bagian (wajib bila questionType kosong di MOJI_GOI).
 *   questionType boleh kosong untuk soal tanpa tipe Daimon.
 * durationMinutes, passingScore, dan sectionalMinimums dicatat tapi tidak menimpa aturan di admin.
 */

/** Jumlah paket simulasi per level. */
export const JLPT_PACKAGE_COUNT = 10;

/** questionType di file -> tipe soal (Daimon) di aplikasi. */
export const QUESTION_TYPE_MAP: Record<string, string> = {
  KANJI_READING: "kanji_yomi",
  ORTHOGRAPHY: "hyouki",
  WORD_FORMATION: "gokeisei",
  CONTEXTUAL_EXPRESSION: "bunmyaku",
  PARAPHRASE: "iikae",
  USAGE: "youhou",
  GRAMMAR_FORM: "bunpou_keishiki",
  SENTENCE_COMPOSITION: "narabikae",
  TEXT_GRAMMAR: "bunshou_bunpou",
  SHORT_PASSAGE: "dokkai_tanbun",
  MID_PASSAGE: "dokkai_chuubun",
  LONG_PASSAGE: "dokkai_choubun",
  INTEGRATED_READING: "dokkai_tougou",
  INFORMATION_RETRIEVAL: "dokkai_jouhou",
  TASK_BASED: "choukai_kadai",
  POINT_COMPREHENSION: "choukai_point",
  SUMMARY_COMPREHENSION: "choukai_gaiyou",
  QUICK_RESPONSE: "choukai_sokuji",
  INTEGRATED_LISTENING: "choukai_tougou",
};

/** sectionType di file -> bagian yang boleh ditampungnya. */
const SECTION_TYPES: Record<string, SimSection[]> = {
  MOJI_GOI: ["membaca", "kosakata"],
  BUNPOU: ["tata_bahasa"],
  DOKKAI: ["dokkai"],
  CHOUKAI: ["mendengar"],
};

const optionSchema = z.union([
  z.string().trim().min(1).max(500),
  z.object({ index: z.number().int().min(1), text: z.string().trim().min(1).max(500) }),
]);

const questionSchema = z.object({
  questionNumber: z.number().int().min(1),
  questionType: z.string().trim().toUpperCase().nullish(),
  sourceKey: z.string().trim().regex(/^[\w:.-]{3,100}$/, "sourceKey hanya huruf, angka, dan : . - _ (3-100 karakter).").optional(),
  status: z.enum(["published", "draft"]).optional(),
  section: z.enum(["membaca", "kosakata", "tata_bahasa", "dokkai", "mendengar"]).optional(),
  promptText: z.string().trim().min(1).max(2000),
  passage: z.string().trim().max(6000).nullish(),
  audioUrl: z.string().trim().max(2000).nullish(),
  audioScript: z.string().trim().max(1500).nullish(),
  imageUrl: z.string().trim().max(500).nullish(),
  options: z.array(optionSchema).min(2).max(6),
  correctOptionIndex: z.number().int().min(1),
  explanation: z.string().trim().max(2000).nullish(),
  difficulty: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
});

export const jlptPackageSchema = z.object({
  examSlug: z.string().trim().regex(/^[a-z0-9-]{3,60}$/, "examSlug hanya huruf kecil, angka, dan tanda hubung (3-60 karakter)."),
  levelCode: z.string().trim().toUpperCase(),
  variantIndex: z.number().int().min(1).max(JLPT_PACKAGE_COUNT).optional(),
  title: z.string().trim().max(200).optional(),
  durationMinutes: z.number().int().positive().optional(),
  passingScore: z.number().int().positive().optional(),
  sectionalMinimums: z.record(z.number()).optional(),
  sections: z
    .array(
      z.object({
        sectionType: z.string().trim().toUpperCase(),
        title: z.string().optional(),
        timeMinutes: z.number().optional(),
        questions: z.array(questionSchema).min(1).max(200),
      }),
    )
    .min(1),
});
export type JlptPackage = z.infer<typeof jlptPackageSchema>;

export interface ImportedQuestion {
  sourceKey: string;
  /** Nomor paket 1-10, atau null untuk bank campuran. */
  packageNo: number | null;
  section: SimSection;
  /** Tipe soal Daimon; null bila soal tidak diberi tipe. */
  category: string | null;
  type: "pilihan_ganda" | "mendengar";
  /** Status dari file (hasil ekspor); null bila file tidak menentukan. */
  status: "published" | "draft" | null;
  question: string;
  passage: string | null;
  options: string[];
  correctAnswer: string;
  audioUrl: string | null;
  imageUrl: string | null;
  explanation: string | null;
  difficulty: number;
}

/** Hanya URL http(s) atau jalur relatif aplikasi (mis. /api/tts?...) yang diterima untuk media. */
function safeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) || url.startsWith("/") ? url : null;
}

export const ttsUrl = (text: string) => `/api/tts?text=${encodeURIComponent(text)}`;

/** Nomor paket dari variantIndex, atau dari angka di akhir examSlug; di luar 1-10 berarti bank campuran. */
export function packageNumber(pkg: Pick<JlptPackage, "variantIndex" | "examSlug">): number | null {
  if (pkg.variantIndex) return pkg.variantIndex;
  const n = Number(/-(\d{1,2})$/.exec(pkg.examSlug)?.[1]);
  return n >= 1 && n <= JLPT_PACKAGE_COUNT ? n : null;
}

/**
 * Ubah satu paket menjadi baris soal. Error dikumpulkan per soal (bukan berhenti di soal pertama),
 * supaya penulis paket bisa memperbaiki semuanya sekaligus.
 */
export function mapJlptPackage(pkg: JlptPackage): { level: JlptCode; questions: ImportedQuestion[]; errors: string[] } {
  const errors: string[] = [];
  const questions: ImportedQuestion[] = [];
  if (!isJlptCode(pkg.levelCode)) {
    return { level: "N5", questions, errors: [`levelCode "${pkg.levelCode}" tidak dikenal; pakai N5, N4, N3, N2, atau N1.`] };
  }
  const level = pkg.levelCode;
  const packageNo = packageNumber(pkg);
  const seenKeys = new Set<string>();

  for (const section of pkg.sections) {
    const allowed = SECTION_TYPES[section.sectionType];
    if (!allowed) {
      errors.push(`sectionType "${section.sectionType}" tidak dikenal; pakai MOJI_GOI, BUNPOU, DOKKAI, atau CHOUKAI.`);
      continue;
    }
    for (const q of section.questions) {
      const where = `${section.sectionType} no. ${q.questionNumber}`;
      // Bagian & tipe soal: dari questionType bila ada; bila kosong, dari field section (atau satu-satunya bagian sectionType)
      let target: { section: SimSection; category: string | null };
      if (q.questionType) {
        const cat = JLPT_CATEGORIES.find((c) => c.key === QUESTION_TYPE_MAP[q.questionType!]);
        if (!cat) {
          errors.push(`${where}: questionType "${q.questionType}" tidak dikenal.`);
          continue;
        }
        if (!allowed.includes(cat.section) || (q.section && q.section !== cat.section)) {
          errors.push(`${where}: questionType ${q.questionType} tidak termasuk bagian ${q.section ?? section.sectionType}.`);
          continue;
        }
        target = { section: cat.section, category: cat.key };
      } else {
        const sec = q.section ?? (allowed.length === 1 ? allowed[0] : undefined);
        if (!sec || !allowed.includes(sec)) {
          errors.push(`${where}: tanpa questionType, isi section (${allowed.join(" atau ")}).`);
          continue;
        }
        target = { section: sec, category: null };
      }
      const sourceKey = q.sourceKey ?? `${pkg.examSlug}:${section.sectionType.toLowerCase()}:${q.questionNumber}`.slice(0, 100);
      if (seenKeys.has(sourceKey)) {
        errors.push(`${where}: sourceKey ${sourceKey} dipakai lebih dari sekali dalam paket ini.`);
        continue;
      }
      seenKeys.add(sourceKey);
      const options = q.options.map((o) => (typeof o === "string" ? o : o.text));
      // Opsi berbentuk { index, text } diurutkan menurut index; jawaban benar dirujuk lewat nomor 1..n
      const ordered =
        typeof q.options[0] === "string"
          ? options
          : [...(q.options as { index: number; text: string }[])].sort((a, b) => a.index - b.index).map((o) => o.text);
      if (new Set(ordered).size !== ordered.length) {
        errors.push(`${where}: pilihan jawaban tidak boleh kembar.`);
        continue;
      }
      const correct = ordered[q.correctOptionIndex - 1];
      if (!correct) {
        errors.push(`${where}: correctOptionIndex ${q.correctOptionIndex} di luar jumlah pilihan (${ordered.length}).`);
        continue;
      }
      const listening = target.section === "mendengar";
      const audioUrl = safeMediaUrl(q.audioUrl) ?? (q.audioScript ? ttsUrl(q.audioScript) : null);
      if (listening && !audioUrl) {
        errors.push(`${where}: soal Choukai butuh audioUrl (http/https) atau audioScript.`);
        continue;
      }
      questions.push({
        sourceKey,
        packageNo,
        section: target.section,
        category: target.category,
        type: listening ? "mendengar" : "pilihan_ganda",
        status: q.status ?? null,
        question: q.promptText,
        // Skrip dengar disimpan sebagai passage supaya muncul di pembahasan
        passage: q.passage ?? (listening ? q.audioScript ?? null : null),
        options: ordered,
        correctAnswer: correct,
        audioUrl,
        imageUrl: safeMediaUrl(q.imageUrl),
        explanation: q.explanation ?? null,
        difficulty: q.difficulty ?? 1,
      });
    }
  }
  return { level, questions, errors };
}
