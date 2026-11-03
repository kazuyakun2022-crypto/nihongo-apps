import { apiRequest } from "@/core/http/apiClient";

export interface AskMessage {
  role: "user" | "assistant";
  content: string;
}

export async function postQuestion(question: string, history: AskMessage[]): Promise<string> {
  const res = await apiRequest<{ answer: string }>("/ask", {
    method: "POST",
    body: { question, history },
  });
  return res.answer;
}

/** Konteks aplikasi untuk Miu-chan: layar yang sedang dibuka dan peran pemandu. */
export interface AskAppContext {
  screen?: string;
  /** Boleh mengembalikan `guide` (tujuan tur) bila user minta ditunjukkan suatu fitur. */
  guide?: boolean;
  /** Jawaban ringkas untuk gelembung asisten. */
  widget?: boolean;
}

/** Pertanyaan dari widget asisten: jawaban + tujuan tur bila user minta ditunjukkan jalan. */
export async function postAssistant(question: string, history: AskMessage[], app: AskAppContext): Promise<{ answer: string; guide: string | null }> {
  const res = await apiRequest<{ answer: string; guide?: string | null }>("/ask", {
    method: "POST",
    body: { question, history, app },
  });
  return { answer: res.answer, guide: res.guide ?? null };
}
