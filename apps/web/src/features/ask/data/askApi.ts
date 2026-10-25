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
