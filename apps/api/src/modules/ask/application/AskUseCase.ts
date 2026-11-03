import { Errors } from "../../../shared/domain/errors";
import type { AskProvider, AskUser } from "../infrastructure/MockAskProvider";
import { planSpeech, speechText, stripPaceTags, type SpeechRun } from "../../../shared/domain/speechPace";
import { extractCorrection, extractEmotion, type Emotion } from "../domain/emotion";
import { extractGuide, type AppContext } from "../domain/navigationGuide";

export interface AskMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskAnswer {
  answer: string;
  emotion: Emotion;
  /** Kalimat yang benar bila user salah mengucapkan bahasa Jepang (hanya mode suara). */
  correction: string | null;
  /** Kecepatan bicara Miu-chan untuk level user (diatur admin); null untuk tamu. */
  speechRate: number | null;
  /** Mode suara: jawaban per bagian beserta tempo bicaranya (pelan/normal/cepat). */
  speech: SpeechRun[] | null;
  /** Tujuan tur yang diminta user (kunci GUIDE_DESTINATIONS); klien lalu menunjukkan jalannya. */
  guide: string | null;
}

interface Deps {
  ask: AskProvider;
  /** Nama, jenis kelamin, level, dan memori akun terdaftar; null untuk tamu atau user tidak ditemukan. */
  userProfile?: (userId: string) => Promise<AskUser | null>;
}

/** Menjawab pertanyaan pengguna tentang bahasa Jepang dengan konteks percakapan. */
export class AskQuestion {
  constructor(private readonly deps: Deps) {}

  async execute(
    question: string,
    history: AskMessage[],
    mode: "text" | "voice" = "text",
    userId?: string,
    /** Mode suara: transkrip versi bahasa Jepang dari ucapan yang sama (lihat GroqTranscriber). */
    transcriptAlt?: string,
    /** Layar yang sedang dibuka & peran pemandu; hanya dipakai untuk user terdaftar. */
    app?: AppContext,
  ): Promise<AskAnswer> {
    const q = question.trim();
    if (!q) throw Errors.validation("Pertanyaan tidak boleh kosong.");
    if (q.length > 2000) throw Errors.validation("Pertanyaan maksimal 2000 karakter.");

    const trimmedHistory = history.slice(-10);
    const profile = userId && this.deps.userProfile ? await this.deps.userProfile(userId) : null;
    const user = profile && app ? { ...profile, app } : profile;
    const alt = mode === "voice" ? transcriptAlt?.trim() || undefined : undefined;
    const { text: raw, guide } = extractGuide(await this.deps.ask.answer(q, trimmedHistory, mode, user ?? undefined, alt));
    const speechRate = user?.levelGuide?.speechRate ?? null;
    if (mode !== "voice") return { answer: raw, emotion: "biasa", correction: null, speechRate, speech: null, guide };
    // Mode suara: AI menulis tanda emosi di awal jawaban ("[marah]"), koreksi di akhir ("{{benar: …}}"),
    // dan tanda tempo di sekitar bagian yang perlu dibacakan pelan/cepat ("<pelan>…</pelan>")
    const { text: withoutCorrection, correction } = extractCorrection(raw);
    const { text, emotion } = extractEmotion(withoutCorrection);
    const speech = planSpeech(text, speechRate ?? 1);
    return {
      answer: speechText(speech) || stripPaceTags(text),
      emotion,
      correction: correction && stripPaceTags(correction),
      speechRate,
      speech,
      guide,
    };
  }
}
