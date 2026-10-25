import { api } from "@/core/http/apiClient";
import type { SrsRepository } from "../domain/types";

export const srsApi: SrsRepository = {
  due: () => api.get("/srs/due"),
  review: (cardId, grade) => api.post(`/srs/cards/${cardId}/review`, { grade }),
};
