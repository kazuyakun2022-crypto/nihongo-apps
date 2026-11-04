"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { adminApi, type AiPromptItem } from "@/features/admin/data/adminApi";
import { AdminHeaderNav } from "@/features/admin/ui/AdminHeaderNav";
import { Skeleton, SkeletonRegion, SkeletonText } from "@/shared/ui/Skeleton";
import styles from "@/app/(app)/admin/admin.module.css";

type Editable = Pick<AiPromptItem, "systemPrompt" | "maxSentenceWords" | "furiganaRule" | "speechRate">;

const sameSettings = (a: Editable, b: Editable) =>
  a.systemPrompt === b.systemPrompt && a.maxSentenceWords === b.maxSentenceWords && a.furiganaRule === b.furiganaRule && a.speechRate === b.speechRate;

export default function AdminAiPage() {
  const { user } = useAuth();
  const router = useRouter();

  /** Versi tersimpan di server (pembanding perubahan) dan versi yang sedang diedit, per level. */
  const [saved, setSaved] = useState<AiPromptItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Editable>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  /** Pesan hasil simpan ditampilkan di kartu level yang bersangkutan, bukan di atas halaman. */
  const [notice, setNotice] = useState<{ levelId: number; text: string; error?: boolean } | null>(null);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/beranda");
    }
  }, [user, isAdmin, router]);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await adminApi.getAiPrompts();
      setSaved(list);
      setDrafts(Object.fromEntries(list.map((p) => [p.levelId, { systemPrompt: p.systemPrompt, maxSentenceWords: p.maxSentenceWords, furiganaRule: p.furiganaRule, speechRate: p.speechRate }])));
    } catch (e: any) {
      setLoadError(e.message || "Konfigurasi AI belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadPrompts();
  }, [isAdmin, loadPrompts]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const patch = (levelId: number, change: Partial<Editable>) => setDrafts((d) => ({ ...d, [levelId]: { ...d[levelId], ...change } }));

  async function handleSave(item: AiPromptItem) {
    const draft = drafts[item.levelId];
    if (!draft || savingId !== null) return;
    setSavingId(item.levelId);
    try {
      await adminApi.updateAiPrompt(item.levelId, draft);
      // Hanya level ini yang diperbarui: perubahan yang belum disimpan di level lain tetap utuh
      setSaved((list) => list.map((p) => (p.levelId === item.levelId ? { ...p, ...draft, updatedBy: user?.displayName ?? p.updatedBy } : p)));
      setNotice({ levelId: item.levelId, text: `Pengaturan ${item.levelCode} tersimpan.` });
    } catch (e: any) {
      setNotice({ levelId: item.levelId, text: e.message || "Gagal menyimpan pengaturan.", error: true });
    } finally {
      setSavingId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <p className={styles.emptyState}>Memeriksa hak akses administrator...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <AdminHeaderNav
        title="Konfigurasi AI Maskot"
        subtitle="Sesuaikan instruksi karakter Miu-chan, batas kata per kalimat, aturan furigana, dan kecepatan suara per level."
      />

      <div className={styles.panel}>
        <div className={styles.promptHead}>
          <h2 className={styles.panelTitle}>Konfigurasi per Level</h2>
          {!isSuperAdmin && <small className={styles.readOnlyTag}>Mode baca: hanya Super Admin yang dapat menyimpan perubahan</small>}
        </div>

        {loadError ? (
          <div className={styles.errorBanner} role="alert">
            <span>{loadError}</span>
            <button type="button" className={`${styles.btnSm} ${styles.btnSecondary}`} onClick={() => void loadPrompts()}>
              Coba lagi
            </button>
          </div>
        ) : loading ? (
          <SkeletonRegion label="Memuat konfigurasi AI…" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.promptCard}>
                <div className={styles.promptHead}>
                  <Skeleton width="12rem" height="1.5rem" radius="6px" />
                  <Skeleton width="8rem" height="0.75rem" />
                </div>
                <Skeleton width="10rem" height="0.875rem" />
                <Skeleton height="7rem" radius="8px" />
                <SkeletonText lines={1} lastWidth="40%" />
              </div>
            ))}
          </SkeletonRegion>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {saved.map((p) => {
              const d = drafts[p.levelId] ?? p;
              const dirty = !sameSettings(d, p);
              const id = (k: string) => `ai-${p.levelId}-${k}`;
              const busy = savingId === p.levelId;
              return (
                <section key={p.levelId} className={styles.promptCard} aria-labelledby={id("title")}>
                  <div className={styles.promptHead}>
                    <span id={id("title")} className={styles.levelTag}>
                      Level {p.levelId}: {p.levelCode} ({p.levelName})
                    </span>
                    <small className={styles.mutedSmall}>Diperbarui oleh: {p.updatedBy ?? "Sistem"}</small>
                  </div>

                  <div className={styles.controlField}>
                    <label className={styles.fieldLabel} htmlFor={id("prompt")}>
                      Instruksi Sistem (System Prompt)
                    </label>
                    <textarea
                      id={id("prompt")}
                      className={styles.promptTextarea}
                      value={d.systemPrompt}
                      readOnly={!isSuperAdmin}
                      onChange={(e) => patch(p.levelId, { systemPrompt: e.target.value })}
                    />
                  </div>

                  <div className={styles.promptControls}>
                    <div className={styles.controlField}>
                      <label className={styles.fieldLabel} htmlFor={id("words")}>
                        Maks Kata / Kalimat (0 = bebas)
                      </label>
                      <input
                        id={id("words")}
                        type="number"
                        className={styles.selectInput}
                        value={d.maxSentenceWords}
                        min={0}
                        max={100}
                        readOnly={!isSuperAdmin}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          patch(p.levelId, { maxSentenceWords: Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n)) });
                        }}
                      />
                    </div>

                    <div className={styles.controlField}>
                      <label className={styles.fieldLabel} htmlFor={id("furigana")}>
                        Aturan Furigana
                      </label>
                      <select
                        id={id("furigana")}
                        className={styles.selectInput}
                        value={d.furiganaRule}
                        disabled={!isSuperAdmin}
                        onChange={(e) => patch(p.levelId, { furiganaRule: e.target.value as Editable["furiganaRule"] })}
                      >
                        <option value="full">Semua kanji diberi furigana</option>
                        <option value="hard_only">Hanya kanji sulit</option>
                        <option value="none">Tanpa furigana</option>
                      </select>
                    </div>

                    <div className={styles.controlField}>
                      <label className={styles.fieldLabel} htmlFor={id("rate")}>
                        Kecepatan suara: {d.speechRate.toFixed(2)}x
                      </label>
                      <input
                        id={id("rate")}
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={d.speechRate}
                        disabled={!isSuperAdmin}
                        onChange={(e) => patch(p.levelId, { speechRate: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div className={styles.promptFoot}>
                      {notice?.levelId === p.levelId ? (
                        <span className={notice.error ? styles.noticeError : styles.noticeOk} role="status">
                          {notice.text}
                        </span>
                      ) : dirty ? (
                        <span className={styles.mutedSmall}>Ada perubahan yang belum disimpan</span>
                      ) : (
                        <span />
                      )}
                      <div className={styles.actionGroup}>
                        {dirty && (
                          <button
                            type="button"
                            className={`${styles.btnSm} ${styles.btnSecondary}`}
                            disabled={busy}
                            onClick={() => patch(p.levelId, { systemPrompt: p.systemPrompt, maxSentenceWords: p.maxSentenceWords, furiganaRule: p.furiganaRule, speechRate: p.speechRate })}
                          >
                            Batalkan
                          </button>
                        )}
                        <button type="button" className={`${styles.btnSm} ${styles.btnPrimary}`} disabled={!dirty || savingId !== null} onClick={() => void handleSave(p)}>
                          {busy ? "Menyimpan…" : `Simpan ${p.levelCode}`}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
