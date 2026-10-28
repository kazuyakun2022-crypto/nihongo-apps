import { Errors } from "../../../shared/domain/errors";
import type { AskProvider, AskUser } from "../infrastructure/MockAskProvider";
import { extractCorrection, extractEmotion, type Emotion } from "../domain/emotion";

export interface AskMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskAnswer {
  answer: string;
  emotion: Emotion;
  /** Kalimat yang benar bila user salah mengucapkan bahasa Jepang (hanya mode suara). */
  correction: string | null;
}

interface Deps {
  ask: AskProvider;
  /** Nama dan jenis kelamin akun terdaftar; null untuk tamu atau user tidak ditemukan. */
  userProfile?: (userId: string) => Promise<AskUser | null>;
}

/** Menjawab pertanyaan pengguna tentang bahasa Jepang dengan konteks percakapan. */
export class AskQuestion {
  constructor(private readonly deps: Deps) {}

  async execute(question: string, history: AskMessage[], mode: "text" | "voice" = "text", userId?: string): Promise<AskAnswer> {
    const q = question.trim();
    if (!q) throw Errors.validation("Pertanyaan tidak boleh kosong.");
    if (q.length > 2000) throw Errors.validation("Pertanyaan maksimal 2000 karakter.");

    const trimmedHistory = history.slice(-10);
    const user = mode === "voice" && userId && this.deps.userProfile ? await this.deps.userProfile(userId) : null;
    const raw = await this.deps.ask.answer(q, trimmedHistory, mode, user ?? undefined);
    if (mode !== "voice") return { answer: raw, emotion: "biasa", correction: null };
    // Mode suara: AI menulis tanda emosi di awal jawaban ("[marah]") dan koreksi di akhir ("{{benar: …}}")
    const { text: withoutCorrection, correction } = extractCorrection(raw);
    const { text, emotion } = extractEmotion(withoutCorrection);
    return { answer: text, emotion, correction };
  }
}
