import { Errors } from "../../../shared/domain/errors";
import type { AskProvider } from "../infrastructure/MockAskProvider";

export interface AskMessage {
  role: "user" | "assistant";
  content: string;
}

interface Deps {
  ask: AskProvider;
}

/** Menjawab pertanyaan pengguna tentang bahasa Jepang dengan konteks percakapan. */
export class AskQuestion {
  constructor(private readonly deps: Deps) {}

  async execute(question: string, history: AskMessage[], mode: "text" | "voice" = "text"): Promise<string> {
    const q = question.trim();
    if (!q) throw Errors.validation("Pertanyaan tidak boleh kosong.");
    if (q.length > 2000) throw Errors.validation("Pertanyaan maksimal 2000 karakter.");

    const trimmedHistory = history.slice(-10);
    return this.deps.ask.answer(q, trimmedHistory, mode);
  }
}
