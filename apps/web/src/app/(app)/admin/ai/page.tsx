"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import {
  adminApi,
  type AiPromptItem,
  type AiKeyItem,
  type AiModelItem,
  type AiRouteItem,
  type AiCircuitLogItem,
  type AiEngineStats,
  type AiProvider,
} from "@/features/admin/data/adminApi";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { AiKeyModal } from "@/features/admin/ui/ai/AiKeyModal";
import { AiKeyCard } from "@/features/admin/ui/ai/AiKeyCard";
import { AiModelRegistryTable } from "@/features/admin/ui/ai/AiModelRegistryTable";
import { AiFeatureRoutingMatrix } from "@/features/admin/ui/ai/AiFeatureRoutingMatrix";
import { AiCircuitLogTable } from "@/features/admin/ui/ai/AiCircuitLogTable";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import styles from "@/features/admin/ui/ai/aiEngine.module.css";

type TabMode = "vault" | "discovery" | "routing" | "circuit" | "prompts";

type EditablePrompt = Pick<AiPromptItem, "systemPrompt" | "maxSentenceWords" | "furiganaRule" | "speechRate">;

const samePromptSettings = (a: EditablePrompt, b: EditablePrompt) =>
  a.systemPrompt === b.systemPrompt &&
  a.maxSentenceWords === b.maxSentenceWords &&
  a.furiganaRule === b.furiganaRule &&
  a.speechRate === b.speechRate;

const PROVIDERS_META: { id: AiProvider; label: string; tag: string }[] = [
  { id: "groq", label: "Groq Cloud", tag: "GROQ" },
  { id: "gemini", label: "Google Gemini", tag: "GEMINI" },
  { id: "openai", label: "OpenAI", tag: "OPENAI" },
  { id: "anthropic", label: "Anthropic Claude", tag: "CLAUDE" },
  { id: "openrouter", label: "OpenRouter", tag: "ROUTER" },
];

const JLPT_LEVEL_META: Record<number, { kanji: string; sub: string }> = {
  1: { kanji: "入門", sub: "Pemula Total / Nol Bahasa Jepang" },
  2: { kanji: "初級", sub: "Dasar N5 (Hiragana, Katakana & Pola Desu/Masu)" },
  3: { kanji: "初中", sub: "Dasar N4 (Percakapan Sehari-hari Sederhana)" },
  4: { kanji: "中級", sub: "Menengah N3 (Jembatan Bahasa Jepang Praktis)" },
  5: { kanji: "中上", sub: "Pra-Mahir N2 (Wacana Bisnis & Artikel Kompleks)" },
  6: { kanji: "上級", sub: "Mahir N1 (Nuansa Ekspresi Alami Penutur Asli)" },
};

export default function AdminAiPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabMode>("vault");

  // Data States
  const [stats, setStats] = useState<AiEngineStats | null>(null);
  const [keys, setKeys] = useState<AiKeyItem[]>([]);
  const [models, setModels] = useState<AiModelItem[]>([]);
  const [routes, setRoutes] = useState<AiRouteItem[]>([]);
  const [logs, setLogs] = useState<AiCircuitLogItem[]>([]);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // Level Prompts (Original Tab)
  const [savedPrompts, setSavedPrompts] = useState<AiPromptItem[]>([]);
  const [promptDrafts, setPromptDrafts] = useState<Record<number, EditablePrompt>>({});
  const [savingPromptId, setSavingPromptId] = useState<number | null>(null);
  const [promptNotice, setPromptNotice] = useState<{ levelId: number; text: string; error?: boolean } | null>(null);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/beranda");
    }
  }, [user, isAdmin, router]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Muat data engine dan prompts secara paralel
      const [statsRes, keysRes, modelsRes, routesRes, logsRes, promptsRes] = await Promise.all([
        adminApi.getAiEngineStats().catch(() => null),
        adminApi.getAiKeys().catch(() => ({ keys: [] })),
        adminApi.getAiModels().catch(() => ({ models: [] })),
        adminApi.getAiRoutes().catch(() => ({ routes: [] })),
        adminApi.getAiCircuitLogs().catch(() => ({ logs: [] })),
        adminApi.getAiPrompts().catch(() => []),
      ]);

      if (statsRes) setStats(statsRes);
      setKeys(keysRes.keys || []);
      setModels(modelsRes.models || []);
      setRoutes(routesRes.routes || []);
      setLogs(logsRes.logs || []);

      if (promptsRes) {
        setSavedPrompts(promptsRes);
        setPromptDrafts(
          Object.fromEntries(
            promptsRes.map((p) => [
              p.levelId,
              {
                systemPrompt: p.systemPrompt,
                maxSentenceWords: p.maxSentenceWords,
                furiganaRule: p.furiganaRule,
                speechRate: p.speechRate,
              },
            ]),
          ),
        );
      }
    } catch (e: any) {
      setLoadError(e.message || "Gagal memuat konfigurasi pusat kontrol AI.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadAllData();
  }, [isAdmin, loadAllData]);

  // Prompt helper functions
  const patchPrompt = (levelId: number, change: Partial<EditablePrompt>) =>
    setPromptDrafts((d) => ({ ...d, [levelId]: { ...d[levelId], ...change } }));

  async function handleSavePrompt(item: AiPromptItem) {
    const draft = promptDrafts[item.levelId];
    if (!draft || savingPromptId !== null) return;
    setSavingPromptId(item.levelId);
    try {
      await adminApi.updateAiPrompt(item.levelId, draft);
      setSavedPrompts((list) =>
        list.map((p) =>
          p.levelId === item.levelId
            ? { ...p, ...draft, updatedBy: user?.displayName ?? p.updatedBy }
            : p,
        ),
      );
      setPromptNotice({ levelId: item.levelId, text: `Pengaturan ${item.levelCode} tersimpan.` });
    } catch (e: any) {
      setPromptNotice({ levelId: item.levelId, text: e.message || "Gagal menyimpan pengaturan.", error: true });
    } finally {
      setSavingPromptId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className={adminStyles.container}>
        <p className={adminStyles.emptyState}>Memeriksa hak akses administrator...</p>
      </div>
    );
  }

  // Kelompokkan kunci per penyedia
  const keysByProvider: Record<AiProvider, AiKeyItem[]> = {
    groq: [],
    gemini: [],
    openai: [],
    anthropic: [],
    openrouter: [],
  };
  keys.forEach((k) => {
    if (keysByProvider[k.provider]) {
      keysByProvider[k.provider].push(k);
    }
  });

  return (
    <div className={styles.aiContainer}>
      {/* ── TOP HEADER ── */}
      <div className={adminStyles.header}>
        <div className={adminStyles.titleRow}>
          <div>
            <span className={adminStyles.titleJa}>AI CONTROL ENGINE</span>
            <h1 className={adminStyles.title} style={{ marginTop: 2 }}>
              Manajemen Infrastruktur AI & Failover
            </h1>
          </div>
          {isSuperAdmin ? (
            <span className={adminStyles.superBadge}>👑 Super Admin Control</span>
          ) : (
            <span className={adminStyles.adminBadge}>🛡️ Mode Baca Admin</span>
          )}
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Kunci Terdaftar</span>
          <span className={styles.statVal}>{stats?.totalKeys ?? keys.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Kunci Aktif (Ready)</span>
          <span className={styles.statVal} style={{ color: "#16a34a" }}>
            {stats?.activeKeys ?? keys.filter((k) => k.status === "active").length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Kunci Cooldown (429)</span>
          <span className={styles.statVal} style={{ color: stats?.exhaustedKeys ? "#dc2626" : "inherit" }}>
            {stats?.exhaustedKeys ?? keys.filter((k) => k.status === "exhausted").length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Model Terdeteksi</span>
          <span className={styles.statVal} style={{ color: "#2563eb" }}>
            {stats?.totalModels ?? models.length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Failover 24 Jam Terakhir</span>
          <span className={styles.statVal} style={{ color: "#d97706" }}>
            {stats?.recentFailovers24h ?? 0}
          </span>
        </div>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className={styles.tabsNav} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "vault"}
          className={`${styles.tabBtn} ${activeTab === "vault" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("vault")}
        >
          <span>Key Vault & Failover Pool</span>
          <span className={styles.tabCountBadge}>{keys.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "discovery"}
          className={`${styles.tabBtn} ${activeTab === "discovery" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("discovery")}
        >
          <span>Dynamic Model Discovery</span>
          <span className={styles.tabCountBadge}>{models.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "routing"}
          className={`${styles.tabBtn} ${activeTab === "routing" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("routing")}
        >
          <span>Feature Routing Matrix</span>
          <span className={styles.tabCountBadge}>4 Fitur</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "circuit"}
          className={`${styles.tabBtn} ${activeTab === "circuit" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("circuit")}
        >
          <span>Circuit Logs & Health</span>
          <span className={styles.tabCountBadge}>{logs.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "prompts"}
          className={`${styles.tabBtn} ${activeTab === "prompts" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("prompts")}
        >
          <span>System Prompts per Level</span>
          <span className={styles.tabCountBadge}>{savedPrompts.length}</span>
        </button>
      </div>

      {/* ── ERROR BANNER ── */}
      {loadError && (
        <div className={adminStyles.errorBanner} role="alert">
          <span>{loadError}</span>
          <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => void loadAllData()}>
            Coba lagi
          </button>
        </div>
      )}

      {/* ── TAB CONTENT ── */}
      {loading ? (
        <SkeletonRegion label="Memuat data AI Engine…" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.statCard}>
              <Skeleton width="14rem" height="1.5rem" radius="6px" />
              <Skeleton width="8rem" height="0.75rem" />
              <Skeleton height="5rem" radius="8px" />
            </div>
          ))}
        </SkeletonRegion>
      ) : activeTab === "vault" ? (
        /* ── TAB 1: API KEY VAULT ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className={styles.toolbarRow}>
            <div>
              <h2 className={styles.sectionTitle}>Kolam Kunci API & Urutan Eksekusi (Failover Pool)</h2>
              <p className={styles.sectionDesc}>
                Kunci cadangan otomatis mengambil alih saat kunci utama mengalami kuota habis (HTTP 429) dalam latensi &lt; 50ms.
              </p>
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setIsKeyModalOpen(true)}
              >
                <span>+ Tambah Kunci API Baru</span>
              </button>
            )}
          </div>

          {PROVIDERS_META.map((p) => {
            const providerKeys = keysByProvider[p.id] || [];
            return (
              <section key={p.id} className={styles.providerSection}>
                <div className={styles.providerHeader}>
                  <div className={styles.providerBrand}>
                    <span className={styles.providerIcon} style={{ fontSize: "0.72rem", fontWeight: 800 }}>{p.tag}</span>
                    <span className={styles.providerName}>{p.label}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                      ({providerKeys.length} kunci terdaftar)
                    </span>
                  </div>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => setIsKeyModalOpen(true)}
                      style={{ fontSize: "0.78rem" }}
                    >
                      + Tambah Kunci {p.label}
                    </button>
                  )}
                </div>

                {providerKeys.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                    Belum ada kunci API cadangan untuk {p.label}. Fitur yang mengandalkan penyedia ini akan menggunakan kunci lingkungan (.env) atau beralih ke fallback.
                  </div>
                ) : (
                  <div className={styles.keysGrid}>
                    {providerKeys.map((item) => (
                      <AiKeyCard key={item.id} item={item} onRefresh={loadAllData} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : activeTab === "discovery" ? (
        /* ── TAB 2: DYNAMIC MODEL DISCOVERY ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className={styles.toolbarRow}>
            <div>
              <h2 className={styles.sectionTitle}>Katalog Model Dinamis (Auto-Discovered Registry)</h2>
              <p className={styles.sectionDesc}>
                Terdeteksi otomatis via REST API resmi penyedia dengan penanda kapabilitas (Text LLM, Vision OCR, STT, TTS).
              </p>
            </div>
            <button type="button" className={styles.btnSecondary} onClick={loadAllData}>
              🔄 Refresh Semua Discovery
            </button>
          </div>

          <AiModelRegistryTable models={models} loading={loading} />
        </div>
      ) : activeTab === "routing" ? (
        /* ── TAB 3: FEATURE ROUTING MATRIX ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className={styles.toolbarRow}>
            <div>
              <h2 className={styles.sectionTitle}>Matriks Perutean Model Berbasis Fitur</h2>
              <p className={styles.sectionDesc}>
                Hubungkan setiap fitur NihonGo dengan pasangan penyedia, model utama, dan jalur cadangan darurat.
              </p>
            </div>
            <button type="button" className={styles.btnSecondary} onClick={loadAllData}>
              🔄 Sinkronkan Rute
            </button>
          </div>

          <AiFeatureRoutingMatrix routes={routes} models={models} onRefresh={loadAllData} />
        </div>
      ) : activeTab === "circuit" ? (
        /* ── TAB 4: CIRCUIT LOGS & HEALTH MONITOR ── */
        <AiCircuitLogTable logs={logs} loading={loading} onRefresh={loadAllData} />
      ) : (
        /* ── TAB 5: LEVEL SYSTEM PROMPTS ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className={styles.toolbarRow}>
            <div>
              <h2 className={styles.sectionTitle}>Konfigurasi Prompt & Aturan AI per Level JLPT</h2>
              <p className={styles.sectionDesc}>
                Instruksi sistem menentukan kepribadian, batasan kosakata, aturan Furigana, dan kecepatan vokal Miu-chan saat merespons siswa di tiap level JLPT.
              </p>
            </div>
            {isSuperAdmin ? (
              <span className={styles.promptStatusPill} style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
                Hak Akses: Super Admin (Simpan Aktif)
              </span>
            ) : (
              <span className={styles.promptStatusPill} style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                Mode Baca: Hanya Super Admin yang dapat mengubah prompt
              </span>
            )}
          </div>

          <div className={styles.promptsList}>
            {savedPrompts.map((p) => {
              const d = promptDrafts[p.levelId] ?? p;
              const dirty = !samePromptSettings(d, p);
              const id = (k: string) => `ai-${p.levelId}-${k}`;
              const busy = savingPromptId === p.levelId;
              const meta = JLPT_LEVEL_META[p.levelId] || { kanji: "級", sub: p.levelName };

              return (
                <section
                  key={p.levelId}
                  className={`${styles.promptCard} ${dirty ? styles.promptCardDirty : ""}`}
                  aria-labelledby={id("title")}
                >
                  {/* Header Kartu Level */}
                  <div className={styles.promptHead}>
                    <div className={styles.promptHeadLeft}>
                      <span className={styles.promptKanjiBadge} aria-hidden="true">
                        {meta.kanji}
                      </span>
                      <div>
                        <h3 id={id("title")} className={styles.promptLevelTitle}>
                          <span>Level {p.levelId}: {p.levelCode}</span>
                          <span className={styles.promptLevelSub}>({p.levelName})</span>
                        </h3>
                        <div style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>
                          {meta.sub}
                        </div>
                      </div>
                    </div>

                    <div className={styles.promptHeadRight}>
                      <span className={styles.promptUpdatedBy}>
                        Diperbarui oleh: <strong>{p.updatedBy ?? "Sistem"}</strong>
                      </span>
                      {dirty ? (
                        <span className={`${styles.promptStatusPill} ${styles.promptStatusDirty}`}>
                          ● Belum Disimpan
                        </span>
                      ) : (
                        <span className={`${styles.promptStatusPill} ${styles.promptStatusClean}`}>
                          ✓ Tersimpan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Isi Kartu: Textarea & Pengaturan */}
                  <div className={styles.promptCardBody}>
                    {/* Instruksi Sistem Textarea */}
                    <div className={styles.promptFieldGroup}>
                      <div className={styles.promptLabelRow}>
                        <label className={styles.promptLabel} htmlFor={id("prompt")}>
                          Instruksi Persona & Aturan AI (System Prompt)
                        </label>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                          {d.systemPrompt.length} karakter
                        </span>
                      </div>
                      <p className={styles.promptHelper}>
                        Panduan instruksi karakter, batasan gramatika, dan etika respon yang disuntikkan langsung ke model AI saat percakapan level ini aktif.
                      </p>
                      <textarea
                        id={id("prompt")}
                        className={styles.promptTextarea}
                        rows={4}
                        value={d.systemPrompt}
                        readOnly={!isSuperAdmin}
                        placeholder="Masukkan instruksi sistem per level..."
                        onChange={(e) => patchPrompt(p.levelId, { systemPrompt: e.target.value })}
                      />
                    </div>

                    {/* Kontrol Respons: 3 Kolom Responsif */}
                    <div className={styles.promptControlsGrid}>
                      {/* Kolom 1: Batas Panjang Kalimat */}
                      <div className={styles.promptControlCol}>
                        <label className={styles.promptControlLabel} htmlFor={id("words")}>
                          <span>Maks Kata / Kalimat</span>
                          <span className={styles.promptControlSub}>0 = bebas</span>
                        </label>
                        <input
                          id={id("words")}
                          type="number"
                          className={styles.promptNumberInput}
                          value={d.maxSentenceWords}
                          min={0}
                          max={100}
                          readOnly={!isSuperAdmin}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            patchPrompt(p.levelId, { maxSentenceWords: Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n)) });
                          }}
                        />
                        <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                          Membatasi AI agar tidak berbicara terlalu panjang per giliran.
                        </span>
                      </div>

                      {/* Kolom 2: Aturan Furigana */}
                      <div className={styles.promptControlCol}>
                        <label className={styles.promptControlLabel} htmlFor={id("furigana")}>
                          <span>Aturan Furigana</span>
                          <span className={styles.promptControlSub}>Rubi Kanji</span>
                        </label>
                        <select
                          id={id("furigana")}
                          className={styles.promptSelect}
                          value={d.furiganaRule}
                          disabled={!isSuperAdmin}
                          onChange={(e) => patchPrompt(p.levelId, { furiganaRule: e.target.value as EditablePrompt["furiganaRule"] })}
                        >
                          <option value="full">Semua kanji diberi furigana (Pemula)</option>
                          <option value="hard_only">Hanya kanji sulit / langka</option>
                          <option value="none">Tanpa furigana (Kanji polos)</option>
                        </select>
                        <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                          Format penulisan teks kanji di balon pesan obrolan siswa.
                        </span>
                      </div>

                      {/* Kolom 3: Kecepatan Suara TTS */}
                      <div className={styles.promptControlCol}>
                        <div className={styles.promptControlLabel}>
                          <span>Kecepatan Suara TTS</span>
                          <span className={styles.promptSpeedBadge}>
                            {d.speechRate.toFixed(2)}x {d.speechRate < 0.95 ? "(Lambat)" : d.speechRate > 1.05 ? "(Cepat)" : "(Normal)"}
                          </span>
                        </div>

                        <div className={styles.promptSliderWrap}>
                          <input
                            id={id("rate")}
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.05"
                            value={d.speechRate}
                            disabled={!isSuperAdmin}
                            className={styles.promptSlider}
                            onChange={(e) => patchPrompt(p.levelId, { speechRate: parseFloat(e.target.value) })}
                          />

                          <div className={styles.promptSpeedPresets}>
                            <button
                              type="button"
                              disabled={!isSuperAdmin}
                              className={`${styles.promptSpeedPresetBtn} ${d.speechRate === 0.8 ? styles.promptSpeedPresetBtnActive : ""}`}
                              onClick={() => patchPrompt(p.levelId, { speechRate: 0.8 })}
                            >
                              0.8x Lambat
                            </button>
                            <button
                              type="button"
                              disabled={!isSuperAdmin}
                              className={`${styles.promptSpeedPresetBtn} ${d.speechRate === 1.0 ? styles.promptSpeedPresetBtnActive : ""}`}
                              onClick={() => patchPrompt(p.levelId, { speechRate: 1.0 })}
                            >
                              1.0x Normal
                            </button>
                            <button
                              type="button"
                              disabled={!isSuperAdmin}
                              className={`${styles.promptSpeedPresetBtn} ${d.speechRate === 1.2 ? styles.promptSpeedPresetBtnActive : ""}`}
                              onClick={() => patchPrompt(p.levelId, { speechRate: 1.2 })}
                            >
                              1.2x Cepat
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Aksi */}
                  {isSuperAdmin && (
                    <div className={styles.promptFoot}>
                      <div>
                        {promptNotice?.levelId === p.levelId ? (
                          <span
                            className={`${styles.promptFootNotice} ${promptNotice.error ? styles.promptFootNoticeError : styles.promptFootNoticeOk}`}
                            role="status"
                          >
                            {promptNotice.error ? "✕" : "✓"} {promptNotice.text}
                          </span>
                        ) : dirty ? (
                          <span style={{ fontSize: "0.78rem", color: "#b45309", fontWeight: 600 }}>
                            ● Terdapat perubahan konfigurasi yang belum disimpan.
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.76rem", color: "var(--color-text-muted)" }}>
                            Konfigurasi aktif di server.
                          </span>
                        )}
                      </div>

                      <div className={styles.promptFootActions}>
                        {dirty && (
                          <button
                            type="button"
                            className={styles.btnSecondary}
                            disabled={busy}
                            onClick={() =>
                              patchPrompt(p.levelId, {
                                systemPrompt: p.systemPrompt,
                                maxSentenceWords: p.maxSentenceWords,
                                furiganaRule: p.furiganaRule,
                                speechRate: p.speechRate,
                              })
                            }
                          >
                            Batalkan
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          disabled={!dirty || savingPromptId !== null}
                          onClick={() => void handleSavePrompt(p)}
                        >
                          {busy ? "Menyimpan…" : `Simpan Konfigurasi ${p.levelCode}`}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL TAMBAH KUNCI API ── */}
      <AiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onSuccess={loadAllData}
      />
    </div>
  );
}
