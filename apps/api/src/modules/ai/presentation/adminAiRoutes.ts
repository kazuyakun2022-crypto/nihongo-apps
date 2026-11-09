import { Router } from "express";
import { z } from "zod";
import type { PrismaClient, AiProvider, AiKeyStatus, AiFeature } from "@prisma/client";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { parseBody } from "../../../shared/http/validate";
import { currentUser } from "../../../shared/http/auth";
import { encryptApiKey, decryptApiKey } from "../infrastructure/aiKeyVault";
import { fetchDiscoveredModels } from "../infrastructure/modelDiscoveryService";
import { AiCircuitBreaker } from "../infrastructure/aiCircuitBreaker";
import { ensureDefaultFeatureRoutes } from "../infrastructure/aiFeatureRouter";

const providerEnum = z.enum(["groq", "gemini", "openai", "anthropic", "openrouter"]);
const keyStatusEnum = z.enum(["active", "standby", "degraded", "exhausted", "revoked"]);
const featureEnum = z.enum(["neko_chat", "voice_overlay", "vision_scanner", "workbook_evaluator"]);

const createKeySchema = z.object({
  provider: providerEnum,
  label: z.string().min(2).max(100),
  rawKey: z.string().min(8).max(500),
  priority: z.number().int().min(1).max(10).default(1),
  weight: z.number().int().min(1).max(100).default(100),
});

const patchKeySchema = z.object({
  label: z.string().min(2).max(100).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  weight: z.number().int().min(1).max(100).optional(),
  status: keyStatusEnum.optional(),
});

const updateRouteSchema = z.object({
  primaryProvider: providerEnum,
  primaryModelId: z.string().min(1).max(120),
  backupProvider: providerEnum.nullable().optional(),
  backupModelId: z.string().max(120).nullable().optional(),
  fallbackProvider: providerEnum.nullable().optional(),
  fallbackModelId: z.string().max(120).nullable().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(64).max(8192).optional(),
  timeoutMs: z.number().int().min(2000).max(60000).optional(),
});

export function adminAiRoutes(prisma: PrismaClient) {
  const router = Router();
  const circuitBreaker = new AiCircuitBreaker(prisma);

  // Pastikan rute default selalu ada
  void ensureDefaultFeatureRoutes(prisma);

  // ── 1. STATISTIK SISTEM AI ──
  router.get(
    "/stats",
    asyncHandler(async (_req, res) => {
      const [totalKeys, activeKeys, exhaustedKeys, totalModels, recentLogs] = await Promise.all([
        prisma.aiProviderKey.count(),
        prisma.aiProviderKey.count({ where: { status: "active" } }),
        prisma.aiProviderKey.count({ where: { status: "exhausted" } }),
        prisma.aiModelRegistry.count(),
        prisma.aiCircuitLog.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            failoverTriggered: true,
          },
        }),
      ]);

      res.json({
        totalKeys,
        activeKeys,
        exhaustedKeys,
        totalModels,
        recentFailovers24h: recentLogs,
      });
    }),
  );

  // ── 2. DAFTAR KUNCI API (KEY VAULT) ──
  router.get(
    "/keys",
    asyncHandler(async (_req, res) => {
      const keys = await prisma.aiProviderKey.findMany({
        select: {
          id: true,
          provider: true,
          label: true,
          keyHint: true,
          priority: true,
          weight: true,
          status: true,
          failureCount: true,
          successCount: true,
          lastLatencyMs: true,
          cooldownUntil: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ provider: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
      });

      res.json({ keys });
    }),
  );

  // ── 3. TAMBAH KUNCI API BARU (DENGAN AUTO-DISCOVERY PING) ──
  router.post(
    "/keys",
    asyncHandler(async (req, res) => {
      const body = parseBody(createKeySchema, req.body);
      const user = currentUser(req);

      // Jalankan Discovery Ping ke endpoint resmi untuk memverifikasi kunci & menarik model
      let discoveredModels: any[] = [];
      try {
        discoveredModels = await fetchDiscoveredModels(body.provider, body.rawKey);
      } catch (err: any) {
        return res.status(400).json({
          error: {
            code: "KEY_VERIFICATION_FAILED",
            message: `Verifikasi Kunci API Gagal: ${err.message || "Penyedia menolak otentikasi."}`,
          },
        });
      }

      // Enkripsi kunci API mentah dengan AES-256-GCM
      const encrypted = encryptApiKey(body.rawKey);

      // Simpan kunci ke Vault
      const createdKey = await prisma.aiProviderKey.create({
        data: {
          provider: body.provider,
          label: body.label,
          encryptedKey: encrypted.encryptedKey,
          keyIv: encrypted.keyIv,
          keyTag: encrypted.keyTag,
          keyHint: encrypted.keyHint,
          priority: body.priority,
          weight: body.weight,
          status: "active",
          createdById: user?.id,
        },
        select: {
          id: true,
          provider: true,
          label: true,
          keyHint: true,
          priority: true,
          weight: true,
          status: true,
          createdAt: true,
        },
      });

      // Simpan model yang terdeteksi ke Registry
      let modelsSaved = 0;
      for (const m of discoveredModels) {
        await prisma.aiModelRegistry.upsert({
          where: {
            provider_modelId: {
              provider: body.provider,
              modelId: m.modelId,
            },
          },
          update: {
            displayName: m.displayName,
            capabilities: m.capabilities,
            contextLength: m.contextLength,
            updatedAt: new Date(),
          },
          create: {
            provider: body.provider,
            modelId: m.modelId,
            displayName: m.displayName,
            capabilities: m.capabilities,
            contextLength: m.contextLength,
          },
        });
        modelsSaved++;
      }

      res.status(201).json({
        ok: true,
        key: createdKey,
        modelsDiscovered: modelsSaved,
      });
    }),
  );

  // ── 4. UBAH KUNCI API (LABEL / PRIORITAS / STATUS) ──
  router.patch(
    "/keys/:id",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const body = parseBody(patchKeySchema, req.body);

      const updated = await prisma.aiProviderKey.update({
        where: { id },
        data: body,
        select: {
          id: true,
          provider: true,
          label: true,
          keyHint: true,
          priority: true,
          weight: true,
          status: true,
          updatedAt: true,
        },
      });

      res.json({ ok: true, key: updated });
    }),
  );

  // ── 5. SEGAR KEMBALI MODEL DARI KUNCI TERSIMPAN (REFRESH DISCOVERY) ──
  router.post(
    "/keys/:id/refresh-models",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const keyRecord = await prisma.aiProviderKey.findUnique({ where: { id } });

      if (!keyRecord) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Kunci tidak ditemukan." } });
      }

      const rawKey = decryptApiKey(keyRecord.encryptedKey, keyRecord.keyIv, keyRecord.keyTag);
      const discoveredModels = await fetchDiscoveredModels(keyRecord.provider, rawKey);

      for (const m of discoveredModels) {
        await prisma.aiModelRegistry.upsert({
          where: {
            provider_modelId: {
              provider: keyRecord.provider,
              modelId: m.modelId,
            },
          },
          update: {
            displayName: m.displayName,
            capabilities: m.capabilities,
            contextLength: m.contextLength,
            updatedAt: new Date(),
          },
          create: {
            provider: keyRecord.provider,
            modelId: m.modelId,
            displayName: m.displayName,
            capabilities: m.capabilities,
            contextLength: m.contextLength,
          },
        });
      }

      res.json({ ok: true, modelsCount: discoveredModels.length });
    }),
  );

  // ── 6. RESET COOLDOWN KUNCI SECARA MANUAL ──
  router.post(
    "/keys/:id/reset-cooldown",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      await circuitBreaker.resetCooldown(id);
      res.json({ ok: true });
    }),
  );

  // ── 7. HAPUS KUNCI API ──
  router.delete(
    "/keys/:id",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      await prisma.aiProviderKey.delete({ where: { id } });
      res.json({ ok: true });
    }),
  );

  // ── 8. DAFTAR MODEL REGISTRY ──
  router.get(
    "/models",
    asyncHandler(async (req, res) => {
      const provider = req.query.provider as AiProvider | undefined;
      const models = await prisma.aiModelRegistry.findMany({
        where: provider ? { provider } : undefined,
        orderBy: [{ provider: "asc" }, { displayName: "asc" }],
      });

      res.json({ models });
    }),
  );

  // ── 9. FEATURE ROUTING MATRIX ──
  router.get(
    "/routes",
    asyncHandler(async (_req, res) => {
      await ensureDefaultFeatureRoutes(prisma);
      const routes = await prisma.aiFeatureRoute.findMany({
        orderBy: { feature: "asc" },
      });
      res.json({ routes });
    }),
  );

  router.put(
    "/routes/:feature",
    asyncHandler(async (req, res) => {
      const feature = featureEnum.parse(req.params.feature);
      const body = parseBody(updateRouteSchema, req.body);
      const user = currentUser(req);

      const updated = await prisma.aiFeatureRoute.upsert({
        where: { feature },
        update: {
          primaryProvider: body.primaryProvider,
          primaryModelId: body.primaryModelId,
          backupProvider: body.backupProvider ?? null,
          backupModelId: body.backupModelId ?? null,
          fallbackProvider: body.fallbackProvider ?? null,
          fallbackModelId: body.fallbackModelId ?? null,
          temperature: body.temperature !== undefined ? (body.temperature as any) : undefined,
          maxTokens: body.maxTokens,
          timeoutMs: body.timeoutMs,
          updatedById: user?.id,
        },
        create: {
          feature,
          primaryProvider: body.primaryProvider,
          primaryModelId: body.primaryModelId,
          backupProvider: body.backupProvider ?? null,
          backupModelId: body.backupModelId ?? null,
          fallbackProvider: body.fallbackProvider ?? null,
          fallbackModelId: body.fallbackModelId ?? null,
          temperature: (body.temperature ?? 0.7) as any,
          maxTokens: body.maxTokens ?? 2048,
          timeoutMs: body.timeoutMs ?? 15000,
          updatedById: user?.id,
        },
      });

      res.json({ ok: true, route: updated });
    }),
  );

  // ── 10. CIRCUIT BREAKER LOGS ──
  router.get(
    "/circuit-logs",
    asyncHandler(async (_req, res) => {
      const logs = await prisma.aiCircuitLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          providerKey: {
            select: {
              label: true,
              keyHint: true,
            },
          },
        },
      });

      res.json({
        logs: logs.map((l) => ({
          id: l.id.toString(),
          provider: l.provider,
          feature: l.feature,
          httpStatus: l.httpStatus,
          errorType: l.errorType,
          errorMessage: l.errorMessage,
          latencyMs: l.latencyMs,
          failoverTriggered: l.failoverTriggered,
          createdAt: l.createdAt,
          keyLabel: l.providerKey?.label,
          keyHint: l.providerKey?.keyHint,
        })),
      });
    }),
  );

  return router;
}
