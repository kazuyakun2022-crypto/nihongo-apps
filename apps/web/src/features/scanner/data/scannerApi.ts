import { apiRequest } from "@/core/http/apiClient";
import type { ScanResult, ScanToken, VoiceCheckResult } from "../domain/types";

export const scannerApi = {
  async analyze(params: {
    image?: string; // base64 data url
    text?: string;
    mode?: "live" | "crop" | "batch";
    crop?: { x: number; y: number; width: number; height: number };
  }): Promise<ScanResult> {
    try {
      return await apiRequest<ScanResult>("/scan/analyze", {
        method: "POST",
        body: params,
        timeoutMs: 30000,
      });
    } catch (err: any) {
      throw new Error(err?.message || "Gagal memindai teks kamera.");
    }
  },

  async getHistory(): Promise<ScanResult[]> {
    try {
      return await apiRequest<ScanResult[]>("/scan/history");
    } catch {
      return [];
    }
  },

  async deleteHistory(id: string): Promise<void> {
    try {
      await apiRequest<void>(`/scan/history/${id}`, { method: "DELETE" });
    } catch {
      // Abaikan jika gagal
    }
  },

  async evaluatePronunciation(targetText: string, spokenText: string): Promise<VoiceCheckResult> {
    try {
      return await apiRequest<VoiceCheckResult>("/scan/voice-check", {
        method: "POST",
        body: { targetText, spokenText },
      });
    } catch (err: any) {
      throw new Error(err?.message || "Gagal mengevaluasi suara.");
    }
  },

  async saveToSrs(token: ScanToken): Promise<{ ok: boolean; message: string }> {
    try {
      return await apiRequest<{ ok: boolean; message: string }>("/scan/save-srs", {
        method: "POST",
        body: {
          surfaceForm: token.surfaceForm,
          readingKana: token.readingKana,
          indonesianMean: token.indonesianMean,
          jlptLevel: token.jlptLevel,
        },
      });
    } catch (err: any) {
      throw new Error(err?.message || "Gagal menyimpan ke flashcard.");
    }
  },
};

