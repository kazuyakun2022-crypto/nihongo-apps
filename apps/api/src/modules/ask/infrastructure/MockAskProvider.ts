import { siblingCall, type AskUser } from "./voicePrompt";

export type { AskUser };

export interface AskProvider {
  answer(
    question: string,
    history: { role: "user" | "assistant"; content: string }[],
    mode?: "text" | "voice",
    user?: AskUser,
    /** Mode suara: transkrip versi bahasa Jepang dari ucapan yang sama, untuk ucapan campuran. */
    transcriptAlt?: string,
  ): Promise<string>;
}

const EXAMPLES: Record<string, string> = {
  hiragana: `Hiragana adalah aksara silabis Jepang untuk kosakata asli Jepang. Ada 46 karakter dasar:\n\nBaris A: あ(a) い(i) う(u) え(e) お(o)\nBaris K: か(ka) き(ki) く(ku) け(ke) こ(ko)\ndan seterusnya.\n\nContoh: わたし (watashi) = saya, ねこ (neko) = kucing`,
  katakana: `Katakana dipakai untuk kata serapan asing.\n\nContoh:\nテレビ (terebi) = televisi\nコーヒー (kōhī) = kopi\nアニメ (anime) = anime\n\nBentuknya lebih kaku dan tegas dibanding hiragana.`,
  kanji: `Kanji adalah aksara yang diadopsi dari bahasa Cina. Ada ribuan kanji, tapi N5 cukup ~100 kanji dasar.\n\nContoh:\n日 (nichi/hi) = matahari/hari\n本 (hon/moto) = buku/asal\n人 (jin/hito) = orang`,
  salam: `Salam umum bahasa Jepang:\n\nおはようございます (ohayō gozaimasu) — Selamat pagi (formal)\nこんにちは (konnichiwa) — Selamat siang/halo\nこんばんは (konbanwa) — Selamat malam\nありがとう (arigatō) — Terima kasih`,
};

/**
 * Provider mock untuk development tanpa API key.
 * Mengembalikan penjelasan berguna tentang bahasa Jepang.
 */
export class MockAskProvider implements AskProvider {
  async answer(question: string, _history: { role: string; content: string }[], mode?: "text" | "voice", user?: AskUser): Promise<string> {
    const q = question.toLowerCase();
    if (mode === "voice") return mockVoiceAnswer(q, user);
    if (q.includes("hiragana")) return EXAMPLES.hiragana;
    if (q.includes("katakana")) return EXAMPLES.katakana;
    if (q.includes("kanji")) return EXAMPLES.kanji;
    if (q.includes("salam") || q.includes("halo") || q.includes("ohayou") || q.includes("ohayō")) return EXAMPLES.salam;
    if (q.includes("partikel") || q.includes("は") || q.includes("が") || q.includes("を")) {
      return `Partikel penting bahasa Jepang:\n\nは (wa) — topik kalimat: わたしは がくせい です (Saya adalah pelajar)\nが (ga) — subjek kalimat: ねこが います (Ada kucing)\nを (wo) — objek langsung: ほんを よみます (Membaca buku)\nに (ni) — arah/waktu: がっこうに いきます (Pergi ke sekolah)\nで (de) — tempat/alat: バスで いきます (Pergi naik bus)`;
    }
    if (q.includes("angka") || q.includes("nomor") || q.includes("number")) {
      return `Angka dalam bahasa Jepang:\n\n1 = いち (ichi)\n2 = に (ni)\n3 = さん (san)\n4 = し/よん (shi/yon)\n5 = ご (go)\n6 = ろく (roku)\n7 = しち/なな (shichi/nana)\n8 = はち (hachi)\n9 = く/きゅう (ku/kyū)\n10 = じゅう (jū)`;
    }
    return `(Mode demo — belum ada API key)\n\nPertanyaanmu: "${question}"\n\nSaya bisa menjawab pertanyaan tentang:\n• Huruf hiragana, katakana, kanji\n• Partikel dan grammar\n• Kosakata sehari-hari\n• Salam dan ungkapan umum\n• Cara baca / pengucapan\n\nCoba tanyakan salah satunya! Untuk jawaban AI sungguhan, isi ANTHROPIC_API_KEY di .env.`;
  }
}

/** Jawaban suara tiruan dengan tanda emosi, supaya animasi Neko bisa dicoba tanpa API key. */
function mockVoiceAnswer(q: string, user?: AskUser): string {
  if (/nama (aku|saya|ku)|namaku siapa/.test(q)) {
    const call = user ? siblingCall(user.gender) : null;
    return user
      ? `[senang] Ya ${user.name} dong${call ? `, ${call}` : ""}! Masa aku lupa sama teman ngobrolku sendiri, hehe.`
      : "[bingung] Hmm, kamu masih masuk sebagai tamu, jadi aku belum tahu namamu. Kasih tahu dong!";
  }
  if (/(jelek|gendut|bodoh)/.test(q)) {
    return "[marah] Enak aja ngomong begitu! Ini bulu, bukan lemak! Ya udah, kali ini aku maafin deh.";
  }
  if (/(mandi|penyedot|anjing|nyebelin)/.test(q)) {
    return "[kesal] Hmph, terserah deh... tapi aku tetap mau bantu kok.";
  }
  if (/(sedih|gagal|capek|kangen|sakit|kecewa|nangis)/.test(q)) {
    return "[sedih] Yaah, aku ikut sedih dengarnya. Sini cerita pelan-pelan, aku dengerin kok.";
  }
  return "[biasa] Hehe, aku dengar kok! Ini mode demo, jadi jawabanku masih tiruan ya.";
}
