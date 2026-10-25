import { api } from "@/core/http/apiClient";
import type { ConversationRepository } from "../domain/types";

export const conversationApi: ConversationRepository = {
  start: (scenarioId) => api.post("/conversation/sessions", { scenarioId }),
  send: (sessionId, text) => api.post(`/conversation/sessions/${sessionId}/messages`, { text }),
  end: (sessionId) => api.post(`/conversation/sessions/${sessionId}/end`),
};
