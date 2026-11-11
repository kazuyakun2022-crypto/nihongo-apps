/**
 * Dual-Field Schema & Phonetic Target Matching (Web Client)
 *
 * Memisahkan antara apa yang dilihat siswa di layar (Display Text)
 * dan kunci fonetik yang didengar sistem (Phonetic Target).
 */

export type LessonLevel = "PRE_N5" | "N5" | "N4" | "N3" | "N2" | "N1";
export type SpeakingItemType = "VOCABULARY" | "SENTENCE" | "GRAMMAR_PHRASE";

export interface SpeakingTarget {
  lessonLevel: LessonLevel | string;
  itemType: SpeakingItemType;
  displayText: string;              // Yang tampil di layar pengguna (Hiragana murni pada Pre-N5)
  phoneticTarget: string;           // Kunci mutlak pencocokan suara (Hiragana murni dinormalisasi)
  kanjiAlternative?: string | null; // Bentuk kanji (disimpan sebagai referensi internal)
  romaji?: string | null;           // Cara baca alfabet (mis. "neko")
  acceptedReadings: string[];       // Semua variasi yang sah dianggap BENAR (mis. ["ねこ", "ネコ", "猫"])
}

export const PUNCTUATION_REGEX = /[\s　。、．，,.!！?？「」『』（）()・~〜…"'“”\-—_+=/\\|*^%$#@!~`]/gu;
export const KANJI_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF]/gu;

/**
 * Kamus Padanan Kanji Dasar ke Hiragana (Pre-N5 / N5 / N4 umum)
 */
export const COMMON_KANJI_READINGS: Record<string, string> = {
  // Hewan & Benda Umum
  猫: "ねこ",
  犬: "いぬ",
  鳥: "とり",
  魚: "さかな",
  水: "みず",
  本: "ほん",
  車: "くるま",
  山: "やま",
  川: "かわ",
  雨: "あめ",
  雪: "ゆき",
  空: "そら",
  木: "き",
  花: "はな",
  月: "つき",
  日: "ひ",
  火: "ひ",
  風: "かぜ",
  海: "うみ",
  道: "みち",
  家: "いえ",
  部屋: "へや",
  机: "つくえ",
  椅子: "いす",
  鞄: "かばん",
  時計: "とけい",
  眼鏡: "めがね",
  お金: "おかね",

  // Orang & Hubungan
  私: "わたし",
  僕: "ぼく",
  俺: "おれ",
  あなた: "あなた",
  人: "ひと",
  男: "おとこ",
  女: "おんな",
  子供: "こども",
  友達: "ともだち",
  家族: "かぞく",
  父: "ちち",
  母: "はは",
  お父さん: "おとうさん",
  お母さん: "おかあさん",
  兄: "あに",
  姉: "あね",
  弟: "おとうと",
  妹: "いもうと",
  先生: "せんせい",
  学生: "がくせい",
  生徒: "せいと",
  医者: "いしゃ",

  // Waktu
  今: "いま",
  今日: "きょう",
  明日: "あした",
  昨日: "きのう",
  毎日: "まいにち",
  朝: "あさ",
  昼: "ひる",
  夜: "よる",
  晩: "ばん",
  午前: "ごぜん",
  午後: "ごご",
  時間: "じかん",
  時: "じ",
  分: "ふん",
  年: "とし",
  月曜日: "げつようび",
  火曜日: "かようび",
  水曜日: "すいようび",
  木曜日: "もくようび",
  金曜日: "きんようび",
  土曜日: "どようび",
  日曜日: "にちようび",

  // Makanan & Minuman
  ご飯: "ごはん",
  朝ご飯: "あさごはん",
  昼ご飯: "ひるごはん",
  晩ご飯: "ばんごはん",
  パン: "ぱん",
  肉: "にく",
  野菜: "やさい",
  果物: "くだもの",
  卵: "たまご",
  お茶: "おちゃ",
  牛乳: "ぎゅうにゅう",
  酒: "さけ",

  // Tempat
  学校: "がっこう",
  大学: "だいがく",
  会社: "かいしゃ",
  病院: "びょういん",
  店: "みせ",
  駅: "えき",
  空港: "くうこう",
  日本: "にほん",
  国: "くに",

  // Kata Kerja Dasar
  食べる: "たべる",
  食べます: "たべます",
  飲む: "のむ",
  飲みます: "のみます",
  行く: "いく",
  行きます: "いきます",
  来る: "くる",
  来ます: "きます",
  見る: "みる",
  見ます: "みます",
  聞く: "きく",
  聞きます: "ききます",
  話す: "はなす",
  話します: "はなします",
  読む: "よむ",
  読みます: "よみます",
  書く: "かく",
  書きます: "かきます",
  買う: "かう",
  買います: "かいます",
  寝る: "ねる",
  寝ます: "ねます",
  起きる: "おきる",
  起きます: "おきます",
  会う: "あう",
  会います: "あいます",
  待つ: "まつ",
  待ちます: "まちます",
  帰る: "かえる",
  帰ります: "かえります",
  ある: "ある",
  あります: "あります",
  いる: "いる",
  います: "います",

  // Kata Sifat Dasar
  大きい: "おおきい",
  小さい: "ちいさい",
  新しい: "あたらしい",
  古い: "ふるい",
  いい: "いい",
  良い: "よい",
  悪い: "わるい",
  高い: "たかい",
  安い: "やすい",
  暑い: "あつい",
  寒い: "さむい",
  好き: "すき",
  嫌い: "きらい",
  上手: "じょうず",
  下手: "へた",
};

/** Mengubah teks yang memuat Kanji umum ke padanan Hiragana-nya */
export function kanjiToKana(text: string): string {
  if (!text) return "";
  let res = text;
  const entries = Object.entries(COMMON_KANJI_READINGS).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of entries) {
    if (res.includes(k)) {
      res = res.split(k).join(v);
    }
  }
  return res;
}

/**
 * Normalisasi Fonetik Tingkat Tinggi
 */
export function normalizePhoneticSpeech(text: string): string {
  if (!text) return "";
  let res = kanjiToKana(text);
  res = res.normalize("NFKC").replace(PUNCTUATION_REGEX, "").toLowerCase();
  res = res.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  res = res.replace(/づ/g, "ず").replace(/ぢ/g, "じ").replace(/を/g, "お");
  res = res.replace(/は(?=です|だ|ます|が|に|で|を|と|$)/g, "わ");
  res = res.replace(/へ(?=いく|いきます|くる|きます|かえる|帰る|$)/g, "え");
  return res.trim();
}

/**
 * Sanitizer Lapisan Klien/UI:
 * Memastikan bila Pre-N5 / pemula, kanji yang lolos dikonversi ke Hiragana
 */
export function sanitizePreN5Kana(text: string): string {
  if (!text) return "";
  let sanitized = text.replace(/[\u4E00-\u9FFF\u3400-\u4DBF々]+[(（]([\u3041-\u3096\u30A1-\u30FAー]+)[)）]/g, "$1");
  sanitized = kanjiToKana(sanitized);
  return sanitized;
}

export function hasKanji(text: string): boolean {
  return /[\u4E00-\u9FFF\u3400-\u4DBF]/u.test(text);
}

export function createSpeakingTarget(opts: {
  displayText: string;
  phoneticTarget?: string;
  kanjiAlternative?: string | null;
  romaji?: string | null;
  acceptedReadings?: string[];
  lessonLevel?: LessonLevel | string;
  itemType?: SpeakingItemType;
}): SpeakingTarget {
  const level = opts.lessonLevel ?? "PRE_N5";
  const isPreN5 = level === "PRE_N5" || level.toLowerCase().includes("pemula");
  const cleanDisplayText = isPreN5 ? sanitizePreN5Kana(opts.displayText) : opts.displayText.trim();
  const phoneticTarget = opts.phoneticTarget?.trim() || kanjiToKana(cleanDisplayText);

  const readings = new Set<string>();
  readings.add(cleanDisplayText);
  readings.add(phoneticTarget);
  if (opts.displayText) readings.add(opts.displayText.trim());
  if (opts.kanjiAlternative) readings.add(opts.kanjiAlternative.trim());
  if (opts.acceptedReadings) {
    opts.acceptedReadings.forEach((r) => r && readings.add(r.trim()));
  }
  const kanaVersion = kanjiToKana(cleanDisplayText);
  if (kanaVersion) readings.add(kanaVersion);

  return {
    lessonLevel: level,
    itemType: opts.itemType ?? "VOCABULARY",
    displayText: cleanDisplayText,
    phoneticTarget,
    kanjiAlternative: opts.kanjiAlternative ?? (hasKanji(opts.displayText) ? opts.displayText : null),
    romaji: opts.romaji ?? null,
    acceptedReadings: Array.from(readings).filter(Boolean),
  };
}

export function isSpeakingMatch(spoken: string, target: SpeakingTarget): boolean {
  if (!spoken || !spoken.trim()) return false;
  const cleanSpoken = spoken.trim();

  for (const r of target.acceptedReadings) {
    if (cleanSpoken === r || cleanSpoken.replace(PUNCTUATION_REGEX, "") === r.replace(PUNCTUATION_REGEX, "")) {
      return true;
    }
  }

  const normSpoken = normalizePhoneticSpeech(cleanSpoken);
  const normTarget = normalizePhoneticSpeech(target.phoneticTarget);

  if (normSpoken === normTarget) return true;

  for (const r of target.acceptedReadings) {
    if (normSpoken === normalizePhoneticSpeech(r)) {
      return true;
    }
  }

  return false;
}
