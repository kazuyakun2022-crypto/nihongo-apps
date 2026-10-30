import { api } from "@/core/http/apiClient";
import type { ConversationRepository, ScenarioItem } from "../domain/types";

export const scenarioApi = {
  list: () => api.get<{ scenarios: ScenarioItem[] }>("/conversation/scenarios").then((r) => r.scenarios),
};

export const conversationApi: ConversationRepository = {
  start: (scenarioId) => api.post("/conversation/sessions", { scenarioId }),
  send: (sessionId, text) => api.post(`/conversation/sessions/${sessionId}/messages`, { text }),
  end: (sessionId) => api.post(`/conversation/sessions/${sessionId}/end`),
};
