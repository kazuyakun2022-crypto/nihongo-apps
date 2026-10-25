import type { ConversationContext } from "./Conversation";

const KANJI = /[\u4E00-\u9FFF\u3400-\u4DBF]/g;

/** Mengembalikan kanji di teks yang belum dipelajari pengguna (dokumen bagian 6, langkah 4). */
export function findDisallowedKanji(text: string, allowed: Set<string>): string[] {
  const found = new Set(text.match(KANJI) ?? []);
  return [...found].filter((k) => !allowed.has(k));
}

/**
 * Menyusun system prompt untuk maskot: aturan level + kepribadian + skenario + memori pengguna.
 * Fungsi murni agar mudah diuji dan diubah tanpa menyentuh kode lain.
 */
export function buildSystemPrompt(ctx: ConversationContext): string {
  const { rules, mascot, scenario, memories, displayName } = ctx;
  const kanjiRule =
    ctx.allowedKanji.size === 0
      ? "Jangan memakai kanji sama sekali; tulis dengan hiragana dan katakana."
      : `Hanya pakai kanji dari daftar ini: ${[...ctx.allowedKanji].join("")}. Kata lain tulis dengan kana.`;

  return [
    `Kamu adalah ${mascot.name}, maskot aplikasi belajar bahasa Jepang. Kepribadianmu: ${mascot.personality}`,
    `Lawan bicaramu bernama ${displayName}, pelajar bahasa Jepang level ${rules.levelCode} dari Indonesia.`,
    rules.systemPrompt,
    `Setiap kalimatmu maksimal ${rules.maxSentenceWords} kata. ${kanjiRule}`,
    scenario
      ? `Skenario: ${scenario.title}. Peranmu: ${scenario.mascotRole}. Tujuan pengguna: ${scenario.goal}. Tetap dalam peran.`
      : "Mode ngobrol bebas: tanyakan keseharian dan hobi pengguna.",
    memories.length ? `Yang kamu ingat tentang pengguna: ${memories.join("; ")}.` : "",
    "Jika kalimat pengguna salah, jangan menyalahkan. Balas secara alami memakai bentuk yang benar, lalu isi koreksi.",
    'Balas HANYA dengan JSON: {"reply": "<balasan dalam bahasa Jepang>", "correction": null atau {"original": "...", "corrected": "...", "explanation": "<penjelasan singkat dalam bahasa Indonesia>"}}',
  ]
    .filter(Boolean)
    .join("\n");
}

/** Instruksi tambahan saat jawaban AI memakai kanji di atas level pengguna. */
export function rewriteInstruction(disallowed: string[]): string {
  return `Jawabanmu memakai kanji yang belum dipelajari pengguna: ${disallowed.join("")}. Tulis ulang dengan kana untuk kata-kata tersebut. Format JSON tetap sama.`;
}
