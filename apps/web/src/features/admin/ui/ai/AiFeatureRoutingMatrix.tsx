"use client";

import React, { useState } from "react";
import {
  adminApi,
  type AiRouteItem,
  type AiModelItem,
  type AiFeature,
  type AiProvider,
} from "@/features/admin/data/adminApi";
import styles from "./aiEngine.module.css";

interface Props {
  routes: AiRouteItem[];
  models: AiModelItem[];
  onRefresh: () => void;
}

const FEATURE_INFO: Record<
  AiFeature,
  { title: string; tag: string; desc: string; requiredCap: string }
> = {
  neko_chat: {
    title: "Neko-sensei Chat",
    tag: "CHAT",
    desc: "Obrolan teks interaktif, skenario situasional, dan latihan percakapan.",
    requiredCap: "TEXT_LLM",
  },
  voice_overlay: {
    title: "Voice Chat Overlay",
    tag: "VOICE",
    desc: "Tanya Sensei via suara real-time, transkripsi STT, dan jawaban cepat.",
    requiredCap: "TEXT_LLM + STT",
  },
  vision_scanner: {
    title: "Camera Vision Scanner",
    tag: "VISION",
    desc: "OCR kamera aksara Jepang, pembaca Furigana, dan urai morfologi token.",
    requiredCap: "VISION_OCR",
  },
  workbook_evaluator: {
    title: "Workbook Evaluator",
    tag: "EVAL",
    desc: "Penilaian presisi lembar kotak latihan tulisan tangan & ujian Gerbang Tulis.",
    requiredCap: "VISION_OCR + TEXT_LLM",
  },
};

const PROVIDER_OPTIONS: { id: AiProvider; label: string }[] = [
  { id: "groq", label: "Groq Cloud" },
  { id: "gemini", label: "Google Gemini" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
];

export function AiFeatureRoutingMatrix({ routes, models, onRefresh }: Props) {
  const [drafts, setDrafts] = useState<Record<AiFeature, AiRouteItem>>(
    Object.fromEntries(routes.map((r) => [r.feature, { ...r }])) as any,
  );
  const [savingFeature, setSavingFeature] = useState<AiFeature | null>(null);
  const [notice, setNotice] = useState<{ feature: AiFeature; text: string; error?: boolean } | null>(null);

  // Sync drafts when routes change from parent
  React.useEffect(() => {
    setDrafts(Object.fromEntries(routes.map((r) => [r.feature, { ...r }])) as any);
  }, [routes]);

  function getModelsForProvider(provider: AiProvider | null): AiModelItem[] {
    if (!provider) return [];
    return models.filter((m) => m.provider === provider);
  }

  function handleDraftChange(feature: AiFeature, patch: Partial<AiRouteItem>) {
    setDrafts((prev) => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        ...patch,
      },
    }));
  }

  async function handleSave(feature: AiFeature) {
    const draft = drafts[feature];
    if (!draft) return;

    setSavingFeature(feature);
    setNotice(null);
    try {
      await adminApi.updateAiRoute(feature, {
        primaryProvider: draft.primaryProvider,
        primaryModelId: draft.primaryModelId,
        backupProvider: draft.backupProvider,
        backupModelId: draft.backupModelId,
        fallbackProvider: draft.fallbackProvider,
        fallbackModelId: draft.fallbackModelId,
        temperature: Number(draft.temperature),
        maxTokens: Number(draft.maxTokens),
      });

      setNotice({ feature, text: "Rute berhasil disimpan dan langsung aktif!" });
      onRefresh();
    } catch (err: any) {
      setNotice({ feature, text: `Gagal: ${err.message}`, error: true });
    } finally {
      setSavingFeature(null);
    }
  }

  return (
    <div className={styles.routingGrid}>
      {Object.entries(FEATURE_INFO).map(([featKey, info]) => {
        const feat = featKey as AiFeature;
        const draft = drafts[feat] || {
          feature: feat,
          primaryProvider: "groq",
          primaryModelId: "llama-3.3-70b-versatile",
          backupProvider: "gemini",
          backupModelId: "gemini-1.5-flash",
          fallbackProvider: "openrouter",
          fallbackModelId: "mistralai/mixtral-8x7b-instruct",
          temperature: 0.7,
          maxTokens: 2048,
          timeoutMs: 15000,
        };

        const primaryModels = getModelsForProvider(draft.primaryProvider);
        const backupModels = getModelsForProvider(draft.backupProvider);
        const fallbackModels = getModelsForProvider(draft.fallbackProvider);
        const isSaving = savingFeature === feat;

        return (
          <div key={feat} className={styles.routeCard}>
            <div className={styles.routeCardHeader}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span className={styles.routeIconBadge}>{info.tag}</span>
                <div>
                  <h3 className={styles.routeTitle}>{info.title}</h3>
                  <p className={styles.routeDesc}>{info.desc}</p>
                </div>
              </div>
              <span className={`${styles.capBadge} ${styles.capText}`}>
                {info.requiredCap}
              </span>
            </div>

            {/* Stage 1: Jalur Utama (Primary) */}
            <div className={styles.routeStageBox}>
              <div className={styles.routeStageLabel} style={{ color: "#15803d" }}>
                <span>🟢 1. JALUR UTAMA (PRIMARY)</span>
              </div>
              <div className={styles.routeSelectRow}>
                <select
                  className={styles.formSelect}
                  value={draft.primaryProvider}
                  onChange={(e) => {
                    const nextProv = e.target.value as AiProvider;
                    const available = getModelsForProvider(nextProv);
                    handleDraftChange(feat, {
                      primaryProvider: nextProv,
                      primaryModelId: available[0]?.modelId || "",
                    });
                  }}
                >
                  {PROVIDER_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <select
                  className={styles.formSelect}
                  value={draft.primaryModelId}
                  onChange={(e) => handleDraftChange(feat, { primaryModelId: e.target.value })}
                >
                  {primaryModels.length === 0 ? (
                    <option value={draft.primaryModelId}>{draft.primaryModelId} (Default)</option>
                  ) : (
                    primaryModels.map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.displayName}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Stage 2: Jalur Cadangan (Secondary Backup) */}
            <div className={styles.routeStageBox}>
              <div className={styles.routeStageLabel} style={{ color: "#a16207" }}>
                <span>🟡 2. CADANGAN PERTAMA (FAILOVER SECONDARY)</span>
              </div>
              <div className={styles.routeSelectRow}>
                <select
                  className={styles.formSelect}
                  value={draft.backupProvider || ""}
                  onChange={(e) => {
                    const nextProv = (e.target.value || null) as AiProvider | null;
                    const available = getModelsForProvider(nextProv);
                    handleDraftChange(feat, {
                      backupProvider: nextProv,
                      backupModelId: available[0]?.modelId || null,
                    });
                  }}
                >
                  <option value="">(Tanpa Cadangan)</option>
                  {PROVIDER_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <select
                  className={styles.formSelect}
                  value={draft.backupModelId || ""}
                  disabled={!draft.backupProvider}
                  onChange={(e) => handleDraftChange(feat, { backupModelId: e.target.value || null })}
                >
                  {!draft.backupProvider ? (
                    <option value="">-</option>
                  ) : backupModels.length === 0 ? (
                    <option value={draft.backupModelId || ""}>{draft.backupModelId || "Default"}</option>
                  ) : (
                    backupModels.map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.displayName}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Stage 3: Jalur Darurat (Fallback) */}
            <div className={styles.routeStageBox}>
              <div className={styles.routeStageLabel} style={{ color: "#b91c1c" }}>
                <span>🔴 3. CADANGAN DARURAT (CROSS-PROVIDER FALLBACK)</span>
              </div>
              <div className={styles.routeSelectRow}>
                <select
                  className={styles.formSelect}
                  value={draft.fallbackProvider || ""}
                  onChange={(e) => {
                    const nextProv = (e.target.value || null) as AiProvider | null;
                    const available = getModelsForProvider(nextProv);
                    handleDraftChange(feat, {
                      fallbackProvider: nextProv,
                      fallbackModelId: available[0]?.modelId || null,
                    });
                  }}
                >
                  <option value="">(Tanpa Fallback)</option>
                  {PROVIDER_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <select
                  className={styles.formSelect}
                  value={draft.fallbackModelId || ""}
                  disabled={!draft.fallbackProvider}
                  onChange={(e) => handleDraftChange(feat, { fallbackModelId: e.target.value || null })}
                >
                  {!draft.fallbackProvider ? (
                    <option value="">-</option>
                  ) : fallbackModels.length === 0 ? (
                    <option value={draft.fallbackModelId || ""}>{draft.fallbackModelId || "Default"}</option>
                  ) : (
                    fallbackModels.map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.displayName}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Parameter sliders */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Temperature: {Number(draft.temperature).toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={draft.temperature}
                  onChange={(e) => handleDraftChange(feat, { temperature: parseFloat(e.target.value) })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Max Tokens: {draft.maxTokens}</span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  min={128}
                  max={8192}
                  step={64}
                  value={draft.maxTokens}
                  onChange={(e) => handleDraftChange(feat, { maxTokens: parseInt(e.target.value, 10) || 1024 })}
                />
              </div>
            </div>

            {/* Notice Alert */}
            {notice?.feature === feat && (
              <div className={`${styles.noticeAlert} ${notice.error ? styles.noticeAlertError : styles.noticeAlertOk}`}>
                {notice.text}
              </div>
            )}

            {/* Save Button */}
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => handleSave(feat)}
                disabled={isSaving}
              >
                {isSaving ? "Menyimpan Rute..." : "Simpan Konfigurasi Rute"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

