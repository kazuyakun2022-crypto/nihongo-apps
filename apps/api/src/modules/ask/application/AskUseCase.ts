import { Errors } from "../../../shared/domain/errors";
import type { AskProvider, AskUser } from "../infrastructure/MockAskProvider";
import { planSpeech, speechText, stripPaceTags, type SpeechRun } from "../../../shared/domain/speechPace";
import { extractCorrection, extractEmotion, type Emotion } from "../domain/emotion";
import { extractGuide, type AppContext } from "../domain/navigationGuide";
import { SAFE_HINT, leakedTerms, type AnswerKey } from "../domain/answerGuard";
import { shortGuideReply, withScreen } from "../domain/navigationGuide";
import { stripEmoji } from "../../../shared/domain/emoji";

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
  /** Kunci jawaban soal latihan/kuis, untuk memastikan mode petunjuk tidak membocorkannya. */
  answerKey?: (questionId: string) => Promise<AnswerKey | null>;
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
    const asked = withScreen(q, app);
    let { text: raw, guide: wantedGuide } = extractGuide(stripEmoji(await this.deps.ask.answer(asked, trimmedHistory, mode, user ?? undefined, alt)));

    // Mode petunjuk: periksa kebocoran kunci jawaban; tulis ulang sekali dengan kata terlarang, lalu jawaban aman
    if (user?.app?.assessment && user.app.questionId && this.deps.answerKey) {
      const key = await this.deps.answerKey(user.app.questionId);
      const leaked = key ? leakedTerms(raw, key) : [];
      if (key && leaked.length) {
        const retryUser = { ...user, app: { ...user.app, avoid: leaked } };
        const retry = extractGuide(stripEmoji(await this.deps.ask.answer(asked, trimmedHistory, mode, retryUser, alt))).text;
        raw = leakedTerms(retry, key).length ? SAFE_HINT : retry;
        wantedGuide = null;
      }
    }
    const guide = app?.assessment ? null : wantedGuide;
    // Menunjukkan jalan: cukup satu kalimat pendek, penjelasannya ada di tur langkah demi langkah
    if (guide) raw = shortGuideReply(raw);
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
