import type { ScanResult } from "../domain/types";
import type { PrismaClient } from "@prisma/client";

export class ScanHistoryRepo {
  private memoryHistory: Map<string, ScanResult[]> = new Map();

  constructor(private readonly prisma?: PrismaClient) {}

  async save(userId: string, result: ScanResult): Promise<void> {
    // 1. Simpan di memori selalu sebagai jaminan cepat
    const list = this.memoryHistory.get(userId) || [];
    list.unshift(result);
    if (list.length > 50) list.pop();
    this.memoryHistory.set(userId, list);

    // 2. Jika prisma & tabel tersedia, simpan di database PostgreSQL
    if (this.prisma) {
      try {
        const client = this.prisma as any;
        if (client.cameraScanHistory) {
          await client.cameraScanHistory.create({
            data: {
              id: result.id.startsWith("scan_") ? undefined : result.id,
              userId,
              originalImgUrl: result.originalImgUrl.slice(0, 500),
              rawJapaneseText: result.rawJapaneseText,
              furiganaHtml: result.furiganaHtml,
              romajiText: result.romajiText,
              indonesianTrans: result.indonesianTrans,
              detectedLevel: result.detectedLevel,
              tokens: {
                create: result.tokens.map((t) => ({
                  surfaceForm: t.surfaceForm,
                  dictionaryForm: t.dictionaryForm,
                  readingKana: t.readingKana,
                  romaji: t.romaji,
                  partOfSpeech: t.partOfSpeech,
                  indonesianMean: t.indonesianMean,
                  jlptLevel: t.jlptLevel,
                  pitchAccent: t.pitchAccent,
                })),
              },
            },
          });
        }
      } catch (err) {
        console.warn("[ScanHistoryRepo] Gagal simpan ke DB, data tersimpan di memori:", err instanceof Error ? err.message : err);
      }
    }
  }

  async getByUser(userId: string): Promise<ScanResult[]> {
    if (this.prisma) {
      try {
        const client = this.prisma as any;
        if (client.cameraScanHistory) {
          const rows = await client.cameraScanHistory.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 30,
            include: { tokens: true },
          });

          if (rows && rows.length > 0) {
            return rows.map((r: any) => ({
              id: r.id,
              originalImgUrl: r.originalImgUrl,
              rawJapaneseText: r.rawJapaneseText,
              furiganaHtml: r.furiganaHtml,
              romajiText: r.romajiText,
              indonesianTrans: r.indonesianTrans,
              detectedLevel: r.detectedLevel || "N5",
              createdAt: r.createdAt.toISOString(),
              tokens: r.tokens.map((t: any) => ({
                id: t.id,
                surfaceForm: t.surfaceForm,
                dictionaryForm: t.dictionaryForm,
                readingKana: t.readingKana,
                romaji: t.romaji,
                partOfSpeech: t.partOfSpeech,
                indonesianMean: t.indonesianMean,
                jlptLevel: t.jlptLevel,
                pitchAccent: t.pitchAccent,
              })),
            }));
          }
        }
      } catch (err) {
        console.warn("[ScanHistoryRepo] Gagal ambil dari DB, pakai memori:", err instanceof Error ? err.message : err);
      }
    }

    return this.memoryHistory.get(userId) || [];
  }

  async getById(userId: string, scanId: string): Promise<ScanResult | null> {
    const list = await this.getByUser(userId);
    return list.find((item) => item.id === scanId) || null;
  }

  async delete(userId: string, scanId: string): Promise<boolean> {
    const list = this.memoryHistory.get(userId) || [];
    this.memoryHistory.set(userId, list.filter((i) => i.id !== scanId));

    if (this.prisma) {
      try {
        const client = this.prisma as any;
        if (client.cameraScanHistory) {
          await client.cameraScanHistory.delete({
            where: { id: scanId },
          });
        }
      } catch {
        // Abaikan jika tidak di DB
      }
    }
    return true;
  }
}

