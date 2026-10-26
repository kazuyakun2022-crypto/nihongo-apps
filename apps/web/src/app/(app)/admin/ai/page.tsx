"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { adminApi, type AiPromptItem } from "@/features/admin/data/adminApi";
import { AdminHeaderNav } from "@/features/admin/ui/AdminHeaderNav";
import styles from "@/app/(app)/admin/admin.module.css";

export default function AdminAiPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [prompts, setPrompts] = useState<AiPromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/beranda");
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadPrompts();
    }
  }, [isAdmin]);

  const showMsg = (text: string, error = false) => {
    setActionMessage({ text, error });
    setTimeout(() => setActionMessage(null), 4000);
  };

  async function loadPrompts() {
    setLoading(true);
    try {
      const list = await adminApi.getAiPrompts();
      setPrompts(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePrompt(item: AiPromptItem) {
    try {
      await adminApi.updateAiPrompt(item.levelId, {
        systemPrompt: item.systemPrompt,
        maxSentenceWords: item.maxSentenceWords,
        furiganaRule: item.furiganaRule,
        speechRate: item.speechRate,
      });
      showMsg(`Prompt level ${item.levelCode} berhasil diperbarui.`);
      loadPrompts();
    } catch (e: any) {
      showMsg(e.message || "Gagal menyimpan prompt AI", true);
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
        subtitle="Sesuaikan prompt instruksi karakter Neko-sensei, batasan kosakata, aturan furigana, dan kecepatan audio TTS per level JLPT (N5–N1)."
      />

      {/* Action Notification */}
      {actionMessage && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: actionMessage.error ? "#fee2e2" : "#dcfce7",
            color: actionMessage.error ? "#991b1b" : "#166534",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          {actionMessage.text}
        </div>
      )}

      <div className={styles.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <h2 className={styles.panelTitle}>Konfigurasi AI Maskot per Level JLPT</h2>
          {!isSuperAdmin && (
            <small style={{ color: "#b45309", background: "#fef3c7", padding: "4px 8px", borderRadius: "6px" }}>
              Mode Baca (Hanya Super Admin yang dapat menyimpan perubahan)
            </small>
          )}
        </div>

        {loading ? (
          <p className={styles.emptyState}>Memuat konfigurasi AI...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {prompts.map((p, idx) => (
              <div key={p.levelId} className={styles.promptCard}>
                <div className={styles.promptHead}>
                  <span className={styles.levelTag}>
                    Level {p.levelId}: {p.levelCode} ({p.levelName})
                  </span>
                  <small style={{ color: "#64748b" }}>
                    Diperbarui oleh: {p.updatedBy ?? "Sistem"}
                  </small>
                </div>

                <div className={styles.controlField}>
                  <label className={styles.fieldLabel}>Instruksi Sistem (System Prompt)</label>
                  <textarea
                    className={styles.promptTextarea}
                    value={p.systemPrompt}
                    disabled={!isSuperAdmin}
                    onChange={(e) => {
                      const updated = [...prompts];
                      updated[idx].systemPrompt = e.target.value;
                      setPrompts(updated);
                    }}
                  />
                </div>

                <div className={styles.promptControls}>
                  <div className={styles.controlField}>
                    <label className={styles.fieldLabel}>Maks Kata / Kalimat</label>
                    <input
                      type="number"
                      className={styles.selectInput}
                      value={p.maxSentenceWords}
                      disabled={!isSuperAdmin}
                      onChange={(e) => {
                        const updated = [...prompts];
                        updated[idx].maxSentenceWords = parseInt(e.target.value, 10) || 5;
                        setPrompts(updated);
                      }}
                    />
                  </div>

                  <div className={styles.controlField}>
                    <label className={styles.fieldLabel}>Aturan Furigana</label>
                    <select
                      className={styles.selectInput}
                      value={p.furiganaRule}
                      disabled={!isSuperAdmin}
                      onChange={(e) => {
                        const updated = [...prompts];
                        updated[idx].furiganaRule = e.target.value as any;
                        setPrompts(updated);
                      }}
                    >
                      <option value="full">Full (Semua Kanji)</option>
                      <option value="hard_only">Hard Only (Kanji Sulit)</option>
                      <option value="none">None (Tanpa Furigana)</option>
                    </select>
                  </div>

                  <div className={styles.controlField}>
                    <label className={styles.fieldLabel}>Kecepatan TTS: {p.speechRate}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={p.speechRate}
                      disabled={!isSuperAdmin}
                      onChange={(e) => {
                        const updated = [...prompts];
                        updated[idx].speechRate = parseFloat(e.target.value);
                        setPrompts(updated);
                      }}
                    />
                  </div>
                </div>

                {isSuperAdmin && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className={`${styles.btnSm} ${styles.btnPrimary}`}
                      onClick={() => handleSavePrompt(p)}
                    >
                      Simpan Pengaturan {p.levelCode}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
