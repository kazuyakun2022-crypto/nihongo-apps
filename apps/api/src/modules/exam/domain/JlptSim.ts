import type { SectionRules } from "./SectionRules";

/**
 * Simulasi JLPT (PRD 4.8) mengikuti struktur ujian resmi N5–N1: sesi berwaktu sendiri-sendiri, skor skala 0–180,
 * dan dua syarat lulus sekaligus: nilai total minimal DAN nilai minimal tiap kelompok skor (sectional minimum).
 * Hasil simulasi tidak mengubah level siswa.
 *
 * Admin boleh mengubah jumlah soal per bagian, total waktu (dibagi ke sesi sesuai proporsi resmi), dan nilai lulus
 * total (0–180). Kelompok skor dan ambang per kelompok tetap mengikuti JLPT resmi.
 */
export const JLPT_SIM_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
export type JlptCode = (typeof JLPT_SIM_LEVELS)[number];

/** Bagian bank soal yang dipakai simulasi, berurutan seperti kertas ujian. membaca = Kanji Yomi (Moji-Goi). */
export const SIM_SECTIONS = ["membaca", "kosakata", "tata_bahasa", "dokkai", "mendengar"] as const;
export type SimSection = (typeof SIM_SECTIONS)[number];

export const JLPT_MAX_SCORE = 180;

export interface JlptSession {
  key: string;
  title: string;
  minutes: number;
  sections: SimSection[];
}

/** Kelompok skor resmi (得点区分): punya skor maksimum dan ambang minimal sendiri. */
export interface JlptScoreGroup {
  key: string;
  label: string;
  sections: SimSection[];
  max: number;
  min: number;
}

interface JlptSpec {
  sessions: JlptSession[];
  groups: JlptScoreGroup[];
  pass: number;
  /** Jumlah soal bawaan per bagian (perkiraan jumlah soal resmi). */
  counts: Record<SimSection, number>;
}

const MOJI_GOI: SimSection[] = ["membaca", "kosakata"];
const LANGUAGE: SimSection[] = ["membaca", "kosakata", "tata_bahasa"];
const LISTENING_GROUP: JlptScoreGroup = { key: "choukai", label: "Mendengar (Choukai)", sections: ["mendengar"], max: 60, min: 19 };
/** N5 dan N4: pengetahuan bahasa dan membaca dinilai jadi satu kelompok 0–120. */
const BASIC_GROUPS: JlptScoreGroup[] = [
  { key: "bahasa_membaca", label: "Pengetahuan Bahasa & Membaca", sections: ["membaca", "kosakata", "tata_bahasa", "dokkai"], max: 120, min: 38 },
  LISTENING_GROUP,
];

export const JLPT_SPEC: Record<JlptCode, JlptSpec> = {
  N5: {
    pass: 80,
    sessions: [
      { key: "moji_goi", title: "Moji-Goi (Huruf & Kosakata)", minutes: 20, sections: MOJI_GOI },
      { key: "bunpou_dokkai", title: "Bunpou & Dokkai (Tata Bahasa & Membaca)", minutes: 40, sections: ["tata_bahasa", "dokkai"] },
      { key: "choukai", title: "Choukai (Mendengar)", minutes: 30, sections: ["mendengar"] },
    ],
    groups: BASIC_GROUPS,
    counts: { membaca: 7, kosakata: 14, tata_bahasa: 16, dokkai: 6, mendengar: 19 },
  },
  N4: {
    pass: 90,
    sessions: [
      { key: "moji_goi", title: "Moji-Goi (Huruf & Kosakata)", minutes: 25, sections: MOJI_GOI },
      { key: "bunpou_dokkai", title: "Bunpou & Dokkai (Tata Bahasa & Membaca)", minutes: 55, sections: ["tata_bahasa", "dokkai"] },
      { key: "choukai", title: "Choukai (Mendengar)", minutes: 35, sections: ["mendengar"] },
    ],
    groups: BASIC_GROUPS,
    counts: { membaca: 9, kosakata: 26, tata_bahasa: 15, dokkai: 8, mendengar: 22 },
  },
  N3: {
    pass: 95,
    sessions: [
      { key: "moji_goi", title: "Moji-Goi (Huruf & Kosakata)", minutes: 30, sections: MOJI_GOI },
      { key: "bunpou_dokkai", title: "Bunpou & Dokkai (Tata Bahasa & Membaca)", minutes: 70, sections: ["tata_bahasa", "dokkai"] },
      { key: "choukai", title: "Choukai (Mendengar)", minutes: 40, sections: ["mendengar"] },
    ],
    groups: [
      { key: "moji_goi", label: "Moji-Goi (Huruf & Kosakata)", sections: MOJI_GOI, max: 60, min: 19 },
      { key: "bunpou_dokkai", label: "Bunpou & Dokkai", sections: ["tata_bahasa", "dokkai"], max: 60, min: 19 },
      LISTENING_GROUP,
    ],
    counts: { membaca: 8, kosakata: 27, tata_bahasa: 23, dokkai: 16, mendengar: 24 },
  },
  N2: {
    pass: 90,
    sessions: [
      { key: "bahasa_dokkai", title: "Pengetahuan Bahasa & Dokkai", minutes: 105, sections: ["membaca", "kosakata", "tata_bahasa", "dokkai"] },
      { key: "choukai", title: "Choukai (Mendengar)", minutes: 50, sections: ["mendengar"] },
    ],
    groups: [
      { key: "bahasa", label: "Pengetahuan Bahasa (Moji-Goi & Bunpou)", sections: LANGUAGE, max: 60, min: 19 },
      { key: "dokkai", label: "Membaca (Dokkai)", sections: ["dokkai"], max: 60, min: 19 },
      LISTENING_GROUP,
    ],
    counts: { membaca: 5, kosakata: 27, tata_bahasa: 22, dokkai: 21, mendengar: 30 },
  },
  N1: {
    pass: 100,
    sessions: [
      { key: "bahasa_dokkai", title: "Pengetahuan Bahasa & Dokkai", minutes: 110, sections: ["membaca", "kosakata", "tata_bahasa", "dokkai"] },
      { key: "choukai", title: "Choukai (Mendengar)", minutes: 55, sections: ["mendengar"] },
    ],
    groups: [
      { key: "bahasa", label: "Pengetahuan Bahasa (Moji-Goi & Bunpou)", sections: LANGUAGE, max: 60, min: 19 },
      { key: "dokkai", label: "Membaca (Dokkai)", sections: ["dokkai"], max: 60, min: 19 },
      LISTENING_GROUP,
    ],
    counts: { membaca: 6, kosakata: 19, tata_bahasa: 20, dokkai: 25, mendengar: 27 },
  },
};

/** Istirahat di antara sesi; server menoleransi jeda ini saat memeriksa batas waktu. */
export const JLPT_BREAK_MINUTES = 10;

export function isJlptCode(code: string): code is JlptCode {
  return (JLPT_SIM_LEVELS as readonly string[]).includes(code);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Aturan bawaan simulasi, berbentuk sama dengan baris LevelExam. passScore di sini dalam skala 0–180. */
export function defaultJlptSimConfig(code: JlptCode) {
  const spec = JLPT_SPEC[code];
  const sectionRules: SectionRules = Object.fromEntries(SIM_SECTIONS.map((s) => [s, { count: spec.counts[s], minScore: 0 }]));
  return {
    id: undefined,
    questionCount: sum(Object.values(spec.counts)),
    timeLimitMin: sum(spec.sessions.map((s) => s.minutes)),
    passScore: spec.pass,
    sectionMinScore: 0,
    cooldownHours: 0,
    sectionRules,
  };
}

/** Sesi dengan menit yang disesuaikan bila admin mengubah total waktu (proporsi resmi dipertahankan). */
export function jlptSessions(code: JlptCode, totalMinutes?: number): JlptSession[] {
  const base = JLPT_SPEC[code].sessions;
  const official = sum(base.map((s) => s.minutes));
  if (!totalMinutes || totalMinutes === official) return base;
  const scaled = base.map((s) => ({ ...s, minutes: Math.max(1, Math.round((s.minutes / official) * totalMinutes)) }));
  // Pembulatan bisa membuat jumlahnya meleset satu-dua menit; selisihnya ditaruh di sesi terakhir
  const drift = totalMinutes - sum(scaled.map((s) => s.minutes));
  scaled[scaled.length - 1].minutes = Math.max(1, scaled[scaled.length - 1].minutes + drift);
  return scaled;
}

export function sessionOf(code: JlptCode, section: string): string | null {
  return JLPT_SPEC[code].sessions.find((s) => (s.sections as string[]).includes(section))?.key ?? null;
}

/**
 * Urutkan soal seperti kertas ujian: per bagian, lalu per tipe soal (Daimon) di dalam bagian, lalu nomor soal
 * di paket (angka di akhir sourceKey). Soal tanpa tipe/nomor mempertahankan urutan asalnya.
 */
export function orderBySection<T extends { section: string; category?: string | null; sourceKey?: string | null }>(questions: T[]): T[] {
  const sectionRank = (s: string) => {
    const i = (SIM_SECTIONS as readonly string[]).indexOf(s);
    return i < 0 ? SIM_SECTIONS.length : i;
  };
  const categoryRank = (c?: string | null) => {
    const i = c ? JLPT_CATEGORIES.findIndex((x) => x.key === c) : -1;
    return i < 0 ? JLPT_CATEGORIES.length : i;
  };
  const number = (key?: string | null) => Number(/:(\d+)$/.exec(key ?? "")?.[1] ?? Number.MAX_SAFE_INTEGER);
  return questions
    .map((q, i) => ({ q, i }))
    .sort(
      (a, b) =>
        sectionRank(a.q.section) - sectionRank(b.q.section) ||
        categoryRank(a.q.category) - categoryRank(b.q.category) ||
        number(a.q.sourceKey) - number(b.q.sourceKey) ||
        a.i - b.i,
    )
    .map(({ q }) => q);
}

/** Bank simulasi hanya soal pilihan: lembar jawaban bulat (1-4) seperti JLPT tidak cocok untuk soal susun/tulis/bicara. */
export const SIM_QUESTION_TYPES = ["pilihan_ganda", "mendengar"] as const;

export interface GroupScore {
  key: string;
  label: string;
  max: number;
  min: number;
  /** Skor skala kelompok ini (0..max). */
  scaled: number;
  correct: number;
  total: number;
  passed: boolean;
  /** Belum ada soal untuk kelompok ini di bank; tidak ikut syarat minimal. */
  empty: boolean;
}

export interface JlptScore {
  total: number;
  pass: number;
  passed: boolean;
  groups: GroupScore[];
  /** Ada kelompok tanpa soal, sehingga skor total dihitung ulang dari kelompok yang ada. */
  partial: boolean;
}

/**
 * Nilai simulasi seperti JLPT: tiap kelompok diskalakan ke skor maksimumnya, lalu dijumlahkan ke 0–180.
 * Lulus bila total >= batas lulus DAN setiap kelompok >= ambang minimalnya.
 * JLPT asli memakai penyetaraan statistik; di sini memakai rasio benar sebagai pendekatan.
 */
export function scoreJlpt(code: JlptCode, perSection: Record<string, { correct: number; total: number }>, pass: number): JlptScore {
  const groups: GroupScore[] = JLPT_SPEC[code].groups.map((g) => {
    const correct = sum(g.sections.map((s) => perSection[s]?.correct ?? 0));
    const total = sum(g.sections.map((s) => perSection[s]?.total ?? 0));
    const empty = total === 0;
    const scaled = empty ? 0 : Math.round((correct / total) * g.max);
    return { key: g.key, label: g.label, max: g.max, min: g.min, scaled, correct, total, empty, passed: empty || scaled >= g.min };
  });
  const filled = groups.filter((g) => !g.empty);
  const partial = filled.length > 0 && filled.length < groups.length;
  const raw = sum(filled.map((g) => g.scaled));
  const total = filled.length === 0 ? 0 : partial ? Math.round((raw / sum(filled.map((g) => g.max))) * JLPT_MAX_SCORE) : raw;
  return { total, pass, groups, partial, passed: filled.length > 0 && total >= pass && groups.every((g) => g.passed) };
}

/** Tipe soal resmi JLPT (大問 / Daimon) per bagian. */
export const JLPT_CATEGORIES: { key: string; label: string; section: SimSection }[] = [
  { key: "kanji_yomi", label: "Kanji Yomi 漢字読み (cara baca kanji)", section: "membaca" },
  { key: "hyouki", label: "Hyouki 表記 (penulisan kanji/katakana)", section: "kosakata" },
  { key: "gokeisei", label: "Gokeisei 語形成 (imbuhan, N2)", section: "kosakata" },
  { key: "bunmyaku", label: "Bunmyaku Kitei 文脈規定 (kata sesuai konteks)", section: "kosakata" },
  { key: "iikae", label: "Iikae Ruigi 言い換え類義 (padanan makna)", section: "kosakata" },
  { key: "youhou", label: "Youhou 用法 (penggunaan kata)", section: "kosakata" },
  { key: "bunpou_keishiki", label: "Bun no Bunpou 1 文の文法1 (pola tata bahasa)", section: "tata_bahasa" },
  { key: "narabikae", label: "Bun no Bunpou 2 文の文法2 (menyusun kalimat ★)", section: "tata_bahasa" },
  { key: "bunshou_bunpou", label: "Bunshou no Bunpou 文章の文法 (tata bahasa wacana)", section: "tata_bahasa" },
  { key: "dokkai_tanbun", label: "Naiyou Rikai Tanbun 短文 (wacana pendek)", section: "dokkai" },
  { key: "dokkai_chuubun", label: "Naiyou Rikai Chuubun 中文 (wacana menengah)", section: "dokkai" },
  { key: "dokkai_choubun", label: "Naiyou Rikai Choubun 長文 (wacana panjang)", section: "dokkai" },
  { key: "dokkai_tougou", label: "Tougou Rikai 統合理解 (bandingkan dua teks)", section: "dokkai" },
  { key: "dokkai_jouhou", label: "Jouhou Kensaku 情報検索 (cari informasi)", section: "dokkai" },
  { key: "choukai_kadai", label: "Kadai Rikai 課題理解 (tugas berikutnya)", section: "mendengar" },
  { key: "choukai_point", label: "Point Rikai ポイント理解 (poin tertentu)", section: "mendengar" },
  { key: "choukai_gaiyou", label: "Gaiyou Rikai 概要理解 (ide utama)", section: "mendengar" },
  { key: "choukai_sokuji", label: "Sokuji Outou 即時応答 (respons cepat)", section: "mendengar" },
  { key: "choukai_tougou", label: "Tougou Rikai 統合理解 (percakapan panjang)", section: "mendengar" },
];
