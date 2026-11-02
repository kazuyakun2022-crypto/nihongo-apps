/**
 * Umpan balik Miu-chan per huruf, tanpa pengulangan:
 *  - kalimat pembuka mengikuti tingkat keparahan (sempurna / ringan / sedang / berat) dan berganti tiap percobaan;
 *  - penjelasan memakai sudut pandang berbeda bila kesalahan yang sama terulang (riwayat di HandwritingLog):
 *    percobaan 1 langsung menunjuk bagian yang salah, ke-2 memakai analogi, ke-3 memandu langkah demi langkah.
 * Semua kalimat berasal dari panduan manual (writingGuide), bukan karangan AI.
 */
import { ANALOGY, DIMENSION_OF, DISTINCT, ISSUES, QUADRANT_NAME, STEPS, type Dimension, type IssueCode, type Quadrant } from "./writingGuide";

export type Severity = "sempurna" | "ringan" | "sedang" | "berat";
export type Emotion = "happy" | "thinking" | "encouraging" | "surprised";
export type Angle = "langsung" | "analogi" | "langkah";

export interface NekoFeedback {
  emotionState: Emotion;
  severity: Severity;
  headlineText: string;
  detailedExplanation: string;
  actionableTip: string;
  /** Sudut pandang penjelasan dan percobaan ke berapa untuk masalah ini (dari riwayat). */
  angle: Angle;
  attempt: number;
}

export function severityOf(score: number): Severity {
  return score >= 95 ? "sempurna" : score >= 80 ? "ringan" : score >= 60 ? "sedang" : "berat";
}

const HEADLINES: Record<Severity, string[]> = {
  sempurna: ["Sempurna, nya~!", "Rapi sekali, seperti contoh di buku! Nya~", "Wah, cantik sekali tulisanmu, nya!"],
  ringan: ["Sedikit lagi sempurna! Nya~", "Bentuknya sudah bagus sekali~", "Hampir sempurna, tinggal dipoles, nya!"],
  sedang: ["Bentuk dasarnya sudah terlihat!", "Sudah di jalur yang benar, nya~", "Ayo rapikan sedikit lagi~"],
  berat: ["Ups! Ada yang perlu dibenahi, nya~", "Tenang, kita perbaiki pelan-pelan ya~", "Jangan menyerah, nya! Kita coba lagi~"],
};

const EMOTION: Record<Severity, Emotion> = { sempurna: "happy", ringan: "happy", sedang: "thinking", berat: "encouraging" };

const ANGLES: Angle[] = ["langsung", "analogi", "langkah"];

/** Fokus latihan per dimensi rubrik. */
const FOCUS: Record<Dimension, string> = {
  strokeCount: "jumlah goresan yang lengkap",
  strokeEnding: "cara mengakhiri tiap goresan",
  proportion: "keseimbangan bagian-bagian huruf",
  centerAlignment: "posisi huruf di tengah kotak",
  legibility: "goresan yang mantap dan halus",
};

/** Masalah utama satu huruf: kesalahan huruf (tertukar) atau kode masalah bentuk, beserta kotak dan bagiannya. */
export interface MainIssue {
  /** Kunci riwayat: kode masalah atau "salah:<huruf terbaca>". */
  key: string;
  code: IssueCode | null;
  read: string;
  cells: string[];
  quadrant: Quadrant | null;
  stroke: number;
}

export interface CharInfo {
  char: string;
  reading: string;
  strokes?: number;
  tips?: string[];
}

const fill = (text: string, c: CharInfo, quadrant: Quadrant | null) =>
  text.replace(/\{n\}/g, c.strokes ? String(c.strokes) : "beberapa").replace(/\{q\}/g, quadrant ? QUADRANT_NAME[quadrant] : "yang ditandai");

const strip = (tip: string) => tip.replace(/^\s*\d+[.)]\s*/, "").replace(/\.$/, "");

/** Urutan goresan baku sebagai langkah bernomor (bila tersedia). */
function strokeSteps(c: CharInfo): string | null {
  if (!c.tips?.length) return null;
  return `Ikuti urutan goresan ${c.char} pelan-pelan: ${c.tips.map((t, i) => `${i + 1}) ${strip(t).toLowerCase()}`).join(", ")}.`;
}

/**
 * Susun umpan balik. `attempt` = sudah berapa kali masalah yang sama tercatat sebelumnya untuk huruf ini (0 = baru).
 */
export function buildNekoFeedback(c: CharInfo, score: number, issue: MainIssue | null, attempt: number, wrongCount: number): NekoFeedback {
  const severity = severityOf(score);
  const angle = ANGLES[attempt % ANGLES.length];
  const headlines = HEADLINES[severity];
  let headlineText = headlines[attempt % headlines.length];
  let emotionState = EMOTION[severity];
  if (wrongCount && severity !== "sempurna") {
    emotionState = "surprised";
    const wrongLines = [`Eh? Ada ${c.char} yang tertukar, nya!`, `Hmm, ${c.char} masih tertukar, nya~`, `Ayo kita taklukkan ${c.char} bersama, nya!`];
    headlineText = wrongLines[attempt % wrongLines.length];
  }

  if (!issue) {
    return {
      emotionState,
      severity,
      headlineText,
      detailedExplanation:
        severity === "sempurna"
          ? `Semua ${c.char} sudah rapi dan konsisten. Tanganmu sudah hafal bentuknya!`
          : `Bentuk ${c.char} sudah benar. Nilainya bisa naik lagi dengan menulis lebih konsisten di setiap kotak.`,
      actionableTip: "Tantang dirimu menulis tanpa melihat contoh, lalu cocokkan hasilnya.",
      angle,
      attempt: attempt + 1,
    };
  }

  const where = issue.cells.length ? ` (kotak ${issue.cells.slice(0, 4).join(", ")}${issue.cells.length > 4 ? ", …" : ""})` : "";
  let detailedExplanation: string;
  let actionableTip: string;

  if (!issue.code) {
    // Huruf tertukar dengan huruf lain
    const own = DISTINCT[c.char];
    if (angle === "langsung") {
      // Pembeda lengkap sudah ada di catatan tiap kotak; di sini latihan singkatnya
      detailedExplanation = `Tulisanmu terbaca ${issue.read}${where}, padahal seharusnya ${c.char}. Lihat bedanya di catatan kotak bertanda merah.`;
      actionableTip = `Latihan singkat: tulis ${c.char} 3 kali di kotak kosong, dan sebelum tiap goresan cek lagi ciri yang membedakannya dari ${issue.read}.`;
    } else if (angle === "analogi") {
      detailedExplanation = own
        ? `Kunci mengenali ${c.char}: ${own}. Ucapkan ciri itu dalam hati setiap kali akan menulis ${c.char}.`
        : `${c.char} dan ${issue.read} itu seperti saudara kembar yang mirip; bedanya ada di detail kecil.`;
      actionableTip = `Tulis ${c.char} dan ${issue.read} berdampingan beberapa kali sambil mengucapkan "${c.reading}".`;
    } else {
      detailedExplanation = `${c.char} masih tertukar dengan ${issue.read}. Kali ini kita tulis bersama langkah demi langkah, nya~`;
      actionableTip = strokeSteps(c) ?? `Tulis ${c.char} pelan-pelan sesuai urutan goresan pada contoh, satu goresan dalam satu tarikan napas.`;
    }
  } else {
    const code = issue.code;
    const part = issue.quadrant && issue.quadrant !== "tengah" ? ` di bagian ${QUADRANT_NAME[issue.quadrant]}` : "";
    const strokeNote = issue.stroke > 0 ? ` (goresan ke-${issue.stroke})` : "";
    const fix = fill(ISSUES[code].fix, c, issue.quadrant);
    if (angle === "langsung") {
      // Cara memperbaiki per kotak sudah ada di catatan tanda; di sini latihan singkat yang fokus pada aspeknya
      detailedExplanation = `${ISSUES[code].label}${strokeNote}${part}${where}.`;
      actionableTip = `Latihan singkat: tulis ${c.char} 3 kali di kotak kosong, fokus pada ${FOCUS[DIMENSION_OF[code]]}.`;
    } else if (angle === "analogi") {
      detailedExplanation = fill(ANALOGY[code], c, issue.quadrant);
      actionableTip = fix;
    } else {
      detailedExplanation = `${ISSUES[code].label}${part} masih terulang. Yuk, kita tulis langkah demi langkah, nya~`;
      actionableTip = ["goresan_kurang", "goresan_lebih", "tanda"].includes(code) ? (strokeSteps(c) ?? fill(STEPS[code], c, issue.quadrant)) : fill(STEPS[code], c, issue.quadrant);
    }
  }
  return { emotionState, severity, headlineText, detailedExplanation, actionableTip, angle, attempt: attempt + 1 };
}
