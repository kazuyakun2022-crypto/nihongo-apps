import type { PrismaClient, AiProvider, AiFeature, AiKeyStatus } from "@prisma/client";
import { decryptApiKey } from "./aiKeyVault";

export interface AcquiredKey {
  keyId: string;
  provider: AiProvider;
  rawKey: string;
  priority: number;
  label: string;
}

export class AiCircuitBreaker {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Mengambil kunci terbaik yang siap digunakan untuk penyedia tertentu.
   * Diurutkan berdasarkan Priority (1 = Utama, 2 = Cadangan, dst.) dan bobot.
   * Kunci yang sedang dalam masa cooldown atau revoked otomatis dilewati.
   */
  async acquireKey(provider: AiProvider): Promise<AcquiredKey | null> {
    const now = new Date();

    // 1. Ambil kandidat kunci dari database
    const keys = await this.prisma.aiProviderKey.findMany({
      where: {
        provider,
        status: { in: ["active", "standby", "degraded", "exhausted"] },
      },
      orderBy: [{ priority: "asc" }, { weight: "desc" }],
    });

    for (const k of keys) {
      // Periksa apakah kunci sedang berstatus exhausted tapi waktu cooldown sudah berakhir
      if (k.cooldownUntil && k.cooldownUntil <= now) {
        // Otomatis pulihkan status kunci setelah cooldown usai
        const restoredStatus: AiKeyStatus = k.priority === 1 ? "active" : "standby";
        await this.prisma.aiProviderKey.update({
          where: { id: k.id },
          data: { status: restoredStatus, cooldownUntil: null, failureCount: 0 },
        });
        k.status = restoredStatus;
        k.cooldownUntil = null;
      }

      // Lewati kunci yang masih dalam cooldown
      if (k.cooldownUntil && k.cooldownUntil > now) {
        continue;
      }

      // Lewati kunci yang statusnya revoked atau masih exhausted
      if (k.status === "exhausted" || k.status === "revoked") {
        continue;
      }

      try {
        const rawKey = decryptApiKey(k.encryptedKey, k.keyIv, k.keyTag);
        return {
          keyId: k.id,
          provider: k.provider,
          rawKey,
          priority: k.priority,
          label: k.label,
        };
      } catch (err) {
        // Jika dekripsi gagal (misal kunci rusak), tandai revoked
        await this.prisma.aiProviderKey.update({
          where: { id: k.id },
          data: { status: "revoked" },
        });
      }
    }

    return null;
  }

  /**
   * Mengambil semua kunci aktif/standby cadangan berikutnya setelah kunci saat ini gagal.
   */
  async acquireNextBackupKey(provider: AiProvider, excludeKeyId: string): Promise<AcquiredKey | null> {
    const candidate = await this.acquireKey(provider);
    if (!candidate || candidate.keyId === excludeKeyId) {
      return null;
    }
    return candidate;
  }

  /**
   * Melaporkan pemanggilan API berhasil ke Circuit Breaker.
   */
  async reportSuccess(keyId: string, latencyMs: number): Promise<void> {
    const key = await this.prisma.aiProviderKey.findUnique({ where: { id: keyId } });
    if (!key) return;

    const data: any = {
      successCount: { increment: 1 },
      lastLatencyMs: latencyMs,
      lastUsedAt: new Date(),
    };

    // Jika sebelumnya degraded dan latensi kini kembali cepat (< 1500ms), pulihkan ke active
    if (key.status === "degraded" && latencyMs < 1500) {
      data.status = key.priority === 1 ? "active" : "standby";
      data.failureCount = 0;
    }

    await this.prisma.aiProviderKey.update({
      where: { id: keyId },
      data,
    });
  }

  /**
   * Melaporkan kegagalan panggilan API. Otomatis mengubah State Machine (EXHAUSTED / REVOKED / DEGRADED)
   * dan mencatat log kejadian ke AiCircuitLog.
   */
  async reportFailure(params: {
    keyId: string;
    provider: AiProvider;
    feature?: AiFeature;
    status?: number;
    error: any;
    latencyMs?: number;
    failoverTriggered?: boolean;
  }): Promise<void> {
    const { keyId, provider, feature, status, error, latencyMs, failoverTriggered = true } = params;
    const now = new Date();
    const errMsg = typeof error === "string" ? error : error?.message || "Unknown error";

    let newStatus: AiKeyStatus | undefined;
    let cooldownUntil: Date | null = null;
    let errorType = "API_ERROR";

    if (status === 429) {
      // Rate limit / Kuota habis -> Masuk mode EXHAUSTED dengan cooldown 60 menit
      errorType = "RATE_LIMIT_429";
      newStatus = "exhausted";
      cooldownUntil = new Date(now.getTime() + 60 * 60 * 1000); // 60 menit
    } else if (status === 401 || status === 403) {
      // Kunci dicabut atau tidak valid -> Matikan permanen REVOKED
      errorType = "UNAUTHORIZED_401";
      newStatus = "revoked";
    } else if (latencyMs && latencyMs > 3000) {
      errorType = "SLOW_LATENCY";
      newStatus = "degraded";
    } else if (status && status >= 500) {
      errorType = `SERVER_ERROR_${status}`;
    }

    // 1. Update status kunci jika ada perubahan state
    if (newStatus) {
      await this.prisma.aiProviderKey.update({
        where: { id: keyId },
        data: {
          status: newStatus,
          cooldownUntil,
          failureCount: { increment: 1 },
          lastLatencyMs: latencyMs,
          lastUsedAt: now,
        },
      });
    } else {
      await this.prisma.aiProviderKey.update({
        where: { id: keyId },
        data: {
          failureCount: { increment: 1 },
          lastLatencyMs: latencyMs,
          lastUsedAt: now,
        },
      });
    }

    // 2. Simpan jejak kegagalan ke AiCircuitLog
    await this.prisma.aiCircuitLog.create({
      data: {
        providerKeyId: keyId,
        provider,
        feature,
        httpStatus: status ?? 500,
        errorType,
        errorMessage: errMsg.slice(0, 1000),
        latencyMs,
        failoverTriggered,
      },
    });
  }

  /**
   * Reset cooldown secara manual dari antarmuka Super Admin.
   */
  async resetCooldown(keyId: string): Promise<void> {
    const key = await this.prisma.aiProviderKey.findUnique({ where: { id: keyId } });
    if (!key) return;

    await this.prisma.aiProviderKey.update({
      where: { id: keyId },
      data: {
        status: key.priority === 1 ? "active" : "standby",
        cooldownUntil: null,
        failureCount: 0,
      },
    });
  }
}

