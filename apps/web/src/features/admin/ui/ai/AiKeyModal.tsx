"use client";

import React, { useState } from "react";
import { adminApi, type AiProvider } from "@/features/admin/data/adminApi";
import styles from "./aiEngine.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PROVIDERS: { id: AiProvider; label: string; icon: string; hint: string }[] = [
  { id: "groq", label: "Groq Cloud", icon: "⚡", hint: "gsk_..." },
  { id: "gemini", label: "Google Gemini", icon: "✨", hint: "AIza..." },
  { id: "openai", label: "OpenAI", icon: "🟢", hint: "sk-..." },
  { id: "anthropic", label: "Anthropic Claude", icon: "🎭", hint: "sk-ant-..." },
  { id: "openrouter", label: "OpenRouter", icon: "🌐", hint: "sk-or-..." },
];

export function AiKeyModal({ isOpen, onClose, onSuccess }: Props) {
  const [provider, setProvider] = useState<AiProvider>("groq");
  const [label, setLabel] = useState("");
  const [rawKey, setRawKey] = useState("");
  const [priority, setPriority] = useState<number>(1);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !rawKey.trim()) {
      setErrorMsg("Mohon lengkapi label dan kunci API.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await adminApi.createAiKey({
        provider,
        label: label.trim(),
        rawKey: rawKey.trim(),
        priority,
      });

      setSuccessMsg(`Kunci valid! Berhasil mendeteksi ${res.modelsDiscovered} model.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menguji atau menyimpan kunci API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>Tambah Kunci API & Auto-Discovery</h3>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onClose}
            style={{ padding: "4px 8px" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {errorMsg && (
              <div className={`${styles.noticeAlert} ${styles.noticeAlertError}`}>
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className={`${styles.noticeAlert} ${styles.noticeAlertOk}`}>
                {successMsg}
              </div>
            )}

            {/* Pilihan Provider */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>Penyedia AI</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                {PROVIDERS.map((p) => {
                  const isSel = provider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvider(p.id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: isSel ? "2px solid var(--color-primary, #b91c1c)" : "1px solid var(--color-border, #e5e0dc)",
                        background: isSel ? "rgba(185, 28, 28, 0.05)" : "var(--color-surface, #fff)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        fontSize: "0.84rem",
                        fontWeight: 700,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem" }}>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Label Kunci */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="key-label">
                <span>Label Pengenal</span>
              </label>
              <input
                id="key-label"
                type="text"
                className={styles.formInput}
                placeholder="Contoh: Groq Prod Utama (Llama-3.3)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </div>

            {/* Raw API Key */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="raw-key">
                <span>Kunci API Rahasia</span>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", fontSize: "0.76rem", fontWeight: 700 }}
                >
                  {showKey ? "Sembunyikan" : "Tampilkan"}
                </button>
              </label>
              <input
                id="raw-key"
                type={showKey ? "text" : "password"}
                className={styles.formInput}
                placeholder={`Masukkan kredensial ${PROVIDERS.find((p) => p.id === provider)?.hint}`}
                value={rawKey}
                onChange={(e) => setRawKey(e.target.value)}
                required
              />
              <span style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>
                Kunci otomatis dienkripsi dengan AES-256-GCM dan diuji langsung ke server resmi.
              </span>
            </div>

            {/* Priority Selector */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="key-priority">
                <span>Tingkat Prioritas (Priority Order)</span>
              </label>
              <select
                id="key-priority"
                className={styles.formSelect}
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10))}
              >
                <option value={1}>1 — Kunci Utama (Active Primary)</option>
                <option value={2}>2 — Cadangan Pertama (Backup Standby #1)</option>
                <option value={3}>3 — Cadangan Kedua (Backup Standby #2)</option>
                <option value={4}>4 — Cadangan Darurat (Backup Standby #3)</option>
              </select>
            </div>
          </div>

          <div className={styles.modalFoot}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? "Menguji & Mendeteksi Model..." : "Simpan & Uji Koneksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

