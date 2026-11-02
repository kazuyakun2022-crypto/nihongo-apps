/**
 * Bahasa Indonesia → katakana (notasi AquesTalk) supaya VOICEVOX, yang hanya mengerti bahasa Jepang, bisa membacakan
 * bagian bahasa Indonesia dengan suara karakter yang sama ("Aku Miu, ayo belajar" → アク/ミウ、アヨ/ブラジャル).
 * Ejaan bahasa Indonesia teratur (satu huruf ≈ satu bunyi), jadi aturan sederhana cukup; hasilnya bahasa Indonesia
 * berlogat Jepang.
 *
 * Notasi AquesTalk (VOICEVOX /accent_phrases?is_kana=true): kata dipisah "/" (tanpa jeda), "、" = jeda, "？" = nada
 * bertanya, "'" = letak aksen (nada turun sesudah mora itu). Tekanan bahasa Indonesia jatuh di suku kata kedua dari
 * belakang, jadi aksen ditaruh di sana.
 */

type Vowel = "a" | "i" | "u" | "e" | "o";
const VOWELS = "aiueo";

/** Baris kana per bunyi awal: [a, i, u, e, o]. */
const ROWS: Record<string, [string, string, string, string, string]> = {
  "": ["ア", "イ", "ウ", "エ", "オ"],
  k: ["カ", "キ", "ク", "ケ", "コ"],
  g: ["ガ", "ギ", "グ", "ゲ", "ゴ"],
  s: ["サ", "シ", "ス", "セ", "ソ"],
  z: ["ザ", "ジ", "ズ", "ゼ", "ゾ"],
  t: ["タ", "ティ", "トゥ", "テ", "ト"],
  d: ["ダ", "ディ", "ドゥ", "デ", "ド"],
  n: ["ナ", "ニ", "ヌ", "ネ", "ノ"],
  h: ["ハ", "ヒ", "フ", "ヘ", "ホ"],
  b: ["バ", "ビ", "ブ", "ベ", "ボ"],
  p: ["パ", "ピ", "プ", "ペ", "ポ"],
  m: ["マ", "ミ", "ム", "メ", "モ"],
  y: ["ヤ", "イ", "ユ", "イェ", "ヨ"],
  r: ["ラ", "リ", "ル", "レ", "ロ"],
  w: ["ワ", "ウィ", "ウ", "ウェ", "ウォ"],
  c: ["チャ", "チ", "チュ", "チェ", "チョ"],
  j: ["ジャ", "ジ", "ジュ", "ジェ", "ジョ"],
  f: ["ファ", "フィ", "フ", "フェ", "フォ"],
  ny: ["ニャ", "ニ", "ニュ", "ニェ", "ニョ"],
  sy: ["シャ", "シ", "シュ", "シェ", "ショ"],
  ng: ["ンガ", "ンギ", "ング", "ンゲ", "ンゴ"],
};
/** Ejaan lain yang bunyinya sama. */
const ALIAS: Record<string, string> = { l: "r", v: "f", q: "k", kh: "h", sh: "sy", ch: "c" };
const DIGRAPHS = ["ng", "ny", "sy", "sh", "ch", "kh"];

/** Konsonan tanpa vokal (akhir suku kata / gugus awal). */
const LONE: Record<string, string> = {
  s: "ス",
  r: "ル",
  f: "フ",
  z: "ズ",
  y: "イ",
  w: "ウ",
  h: "",
  sy: "シュ",
  ny: "ニュ",
  b: "ブ",
  d: "ド",
  g: "グ",
  j: "ジ",
  c: "チ",
  p: "プ",
  t: "ト",
  k: "ク",
  x: "クス",
};

interface Unit {
  /** Kana unit ini; `syllable` = punya vokal (calon tempat aksen). */
  kana: string;
  syllable: boolean;
}

/** Suku-suku satu kata (huruf kecil a–z). */
function wordUnits(word: string): Unit[] {
  const units: Unit[] = [];
  let i = 0;
  let afterVowel = false;
  while (i < word.length) {
    let cons = "";
    const two = word.slice(i, i + 2);
    if (DIGRAPHS.includes(two)) cons = two;
    else if (!VOWELS.includes(word[i])) cons = word[i];
    i += cons.length;
    const key = ALIAS[cons] ?? cons;
    const vowel = word[i] as Vowel | undefined;
    if (vowel && VOWELS.includes(vowel)) {
      i++;
      const row = ROWS[key];
      units.push({ kana: row ? row[VOWELS.indexOf(vowel)] : ROWS[""][VOWELS.indexOf(vowel)], syllable: true });
      afterVowel = true;
      continue;
    }
    // Konsonan tanpa vokal: akhir kata, akhir suku kata (coda), atau gugus awal (tr, pr, st, …)
    const final = i >= word.length;
    const coda = afterVowel;
    let kana: string;
    if (key === "n" || key === "ng") kana = "ン";
    else if (key === "m") kana = !final && "bpm".includes(word[i]) ? "ン" : "ム";
    else if (coda && (key === "k" || key === "t")) kana = "ッ";
    else if (coda && key === "p") kana = final ? "ップ" : "ッ";
    else if (key === "h") kana = coda ? "" : "フ";
    else kana = LONE[key] ?? "";
    if (kana) units.push({ kana, syllable: false });
    afterVowel = false;
  }
  return units;
}

/** Kata → kana dengan aksen di suku kata kedua dari belakang (bila ada). */
function wordKana(word: string): { plain: string; marked: string } | null {
  const units = wordUnits(word);
  if (!units.length) return null;
  const syllables = units.map((u, i) => (u.syllable ? i : -1)).filter((i) => i >= 0);
  if (!syllables.length) return null;
  const accentAt = syllables.length >= 2 ? syllables[syllables.length - 2] : syllables[0];
  const plain = units.map((u) => u.kana).join("");
  const marked = units.map((u, i) => (i === accentAt ? `${u.kana}'` : u.kana)).join("");
  return { plain, marked };
}

// ───────────────────────── Angka & singkatan ─────────────────────────

const DIGIT = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];

/** Angka → kata bahasa Indonesia (sampai ratusan juta). */
export function numberWords(n: number): string {
  if (n < 10) return DIGIT[n];
  if (n === 10) return "sepuluh";
  if (n === 11) return "sebelas";
  if (n < 20) return `${DIGIT[n - 10]} belas`;
  if (n < 100) return `${DIGIT[Math.floor(n / 10)]} puluh${n % 10 ? ` ${DIGIT[n % 10]}` : ""}`;
  const big = (unit: number, name: string, one: string) => {
    const head = Math.floor(n / unit);
    const rest = n % unit;
    return `${head === 1 ? one : `${numberWords(head)} ${name}`}${rest ? ` ${numberWords(rest)}` : ""}`;
  };
  if (n < 1000) return big(100, "ratus", "seratus");
  if (n < 1_000_000) return big(1000, "ribu", "seribu");
  if (n < 1_000_000_000) return big(1_000_000, "juta", "satu juta");
  return String(n).split("").map((d) => DIGIT[Number(d)]).join(" ");
}

/** Nama huruf dalam bahasa Indonesia, untuk singkatan seperti JLPT. */
const LETTER: Record<string, string> = {
  a: "a", b: "be", c: "ce", d: "de", e: "e", f: "ef", g: "ge", h: "ha", i: "i", j: "je", k: "ka", l: "el", m: "em",
  n: "en", o: "o", p: "pe", q: "ki", r: "er", s: "es", t: "te", u: "u", v: "fe", w: "we", x: "eks", y: "ye", z: "zet",
};

// ───────────────────────── Teks ─────────────────────────

/** Ubah teks bahasa Indonesia menjadi notasi AquesTalk (`marked`) dan katakana polos (`plain`, cadangan). */
export function indonesianToKana(text: string): { marked: string; plain: string } {
  const words: string[] = [];
  // Angka dan singkatan dieja dulu menjadi kata biasa
  const expanded = text
    .replace(/(\d)[.,](?=\d{3}\b)/g, "$1")
    .replace(/\d+/g, (d) => ` ${numberWords(Number(d))} `)
    .replace(/\b([A-Z]{2,5})\b/g, (abbr) => ` ${abbr.split("").map((c) => LETTER[c.toLowerCase()]).join(" ")} `)
    .replace(/\b([A-Z])\b/g, (c) => ` ${LETTER[c.toLowerCase()]} `);

  const tokens = expanded.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]+|[,;:.!…]+|\?+/g) ?? [];
  let marked = "";
  let plain = "";
  let sep = "";
  for (const t of tokens) {
    if (/^\?/.test(t)) {
      if (marked) {
        marked += "？";
        plain += "？";
      }
      sep = "";
      continue;
    }
    if (/^[,;:.!…]/.test(t)) {
      if (marked && !/[、？]$/.test(marked)) {
        marked += "、";
        plain += "、";
      }
      sep = "";
      continue;
    }
    const kana = wordKana(t);
    if (!kana) continue;
    marked += sep + kana.marked;
    plain += kana.plain;
    sep = "/";
    words.push(t);
  }
  return { marked: marked.replace(/、$/, ""), plain: plain.replace(/、$/, "") };
}
