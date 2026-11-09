"use client";

import React, { useState } from "react";
import type { AiModelItem, AiProvider, AiCapability } from "@/features/admin/data/adminApi";
import styles from "./aiEngine.module.css";

interface Props {
  models: AiModelItem[];
  loading: boolean;
}

const PROVIDER_FILTERS: { id: "all" | AiProvider; label: string }[] = [
  { id: "all", label: "Semua Provider" },
  { id: "groq", label: "Groq Cloud" },
  { id: "gemini", label: "Google Gemini" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
];

export function AiModelRegistryTable({ models, loading }: Props) {
  const [selectedProvider, setSelectedProvider] = useState<"all" | AiProvider>("all");
  const [search, setSearch] = useState("");

  const filtered = models.filter((m) => {
    if (selectedProvider !== "all" && m.provider !== selectedProvider) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return m.displayName.toLowerCase().includes(q) || m.modelId.toLowerCase().includes(q);
    }
    return true;
  });

  function renderCapBadge(cap: AiCapability) {
    switch (cap) {
      case "TEXT_LLM":
        return <span key={cap} className={`${styles.capBadge} ${styles.capText}`}>Text LLM</span>;
      case "VISION_OCR":
        return <span key={cap} className={`${styles.capBadge} ${styles.capVision}`}>Vision OCR</span>;
      case "AUDIO_STT":
        return <span key={cap} className={`${styles.capBadge} ${styles.capStt}`}>Audio STT</span>;
      case "AUDIO_TTS":
        return <span key={cap} className={`${styles.capBadge} ${styles.capTts}`}>Audio TTS</span>;
      default:
        return null;
    }
  }

  function formatContextLength(tokens?: number | null) {
    if (!tokens) return "-";
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(0)}M token`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K token`;
    return `${tokens} token`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Filter and Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PROVIDER_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={styles.btnSecondary}
              onClick={() => setSelectedProvider(f.id)}
              style={{
                background: selectedProvider === f.id ? "var(--color-primary, #b91c1c)" : undefined,
                color: selectedProvider === f.id ? "#fff" : undefined,
                borderColor: selectedProvider === f.id ? "var(--color-primary, #b91c1c)" : undefined,
                fontWeight: 700,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ width: 240 }}>
          <input
            type="text"
            className={styles.formInput}
            placeholder="Cari model atau ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
          Memuat katalog model dinamis...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "var(--color-surface)", borderRadius: 12, border: "1px dashed var(--color-border)" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Belum ada model terdeteksi.</p>
          <small style={{ color: "var(--color-text-muted)" }}>
            Tambahkan kunci API pada tab "Key Vault" untuk memicu Dynamic Model Discovery otomatis.
          </small>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Penyedia</th>
                <th>Nama Model</th>
                <th>Model ID Resmi</th>
                <th>Kapabilitas Terdeteksi</th>
                <th style={{ width: 130 }}>Konteks Window</th>
                <th style={{ width: 130 }}>Terdeteksi Pada</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span style={{ fontWeight: 800, textTransform: "capitalize" }}>
                      {m.provider}
                    </span>
                  </td>
                  <td>
                    <strong>{m.displayName}</strong>
                  </td>
                  <td>
                    <code style={{ fontSize: "0.8rem", color: "#4b5563" }}>{m.modelId}</code>
                  </td>
                  <td>
                    <div className={styles.capsCell}>
                      {m.capabilities.map(renderCapBadge)}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                      {formatContextLength(m.contextLength)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                      {new Date(m.discoveredAt).toLocaleDateString("id-ID")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

