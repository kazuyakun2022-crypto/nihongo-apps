"use client";

import React from "react";
import type { AiCircuitLogItem } from "@/features/admin/data/adminApi";
import styles from "./aiEngine.module.css";

interface Props {
  logs: AiCircuitLogItem[];
  loading: boolean;
  onRefresh: () => void;
}

export function AiCircuitLogTable({ logs, loading, onRefresh }: Props) {
  function formatFeature(feat?: string | null) {
    if (!feat) return "-";
    switch (feat) {
      case "neko_chat":
        return "Neko-sensei Chat";
      case "voice_overlay":
        return "Voice Chat Overlay";
      case "vision_scanner":
        return "Vision Scanner";
      case "workbook_evaluator":
        return "Workbook Evaluator";
      default:
        return feat;
    }
  }

  function renderStatusBadge(status?: number | null) {
    if (!status) return "-";
    if (status === 200) {
      return <span style={{ color: "#16a34a", fontWeight: 800 }}>200 OK</span>;
    }
    if (status === 429) {
      return (
        <span style={{ color: "#dc2626", fontWeight: 800, background: "#fee2e2", padding: "2px 6px", borderRadius: 4 }}>
          429 Rate Limit
        </span>
      );
    }
    if (status === 401 || status === 403) {
      return (
        <span style={{ color: "#b91c1c", fontWeight: 800, background: "#fef2f2", padding: "2px 6px", borderRadius: 4 }}>
          {status} Auth Error
        </span>
      );
    }
    return (
      <span style={{ color: "#ea580c", fontWeight: 800 }}>
        {status} Error
      </span>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 className={styles.sectionTitle}>Log Peristiwa Circuit Breaker & Failover</h3>
          <p className={styles.sectionDesc}>
            Mencatat kegagalan API, pembatasan kuota (HTTP 429), dan keputusan rotasi kunci otomatis secara real-time.
          </p>
        </div>
        <button type="button" className={styles.btnSecondary} onClick={onRefresh} disabled={loading}>
          Segarkan Log
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
          Memuat log aktivitas circuit breaker...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "var(--color-surface)", borderRadius: 12, border: "1px dashed var(--color-border)" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#16a34a" }}>Semua sirkuit AI beroperasi normal</p>
          <small style={{ color: "var(--color-text-muted)" }}>
            Belum ada insiden rate limit atau kegagalan penyedia yang memicu rotasi cadangan.
          </small>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 150 }}>Waktu Kejadian</th>
                <th style={{ width: 120 }}>Penyedia</th>
                <th>Fitur Terkait</th>
                <th>Kunci Terlibat</th>
                <th style={{ width: 120 }}>Status HTTP</th>
                <th>Jenis Error / Alasan</th>
                <th style={{ width: 90 }}>Latensi</th>
                <th style={{ width: 160 }}>Respon Failover</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                      {new Date(l.createdAt).toLocaleTimeString("id-ID")} · {new Date(l.createdAt).toLocaleDateString("id-ID")}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, textTransform: "capitalize" }}>
                      {l.provider}
                    </span>
                  </td>
                  <td>
                    <strong>{formatFeature(l.feature)}</strong>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 700 }}>{l.keyLabel || "Kunci Terhapus"}</span>
                      {l.keyHint && <code style={{ fontSize: "0.72rem", color: "#6b7280" }}>{l.keyHint}</code>}
                    </div>
                  </td>
                  <td>{renderStatusBadge(l.httpStatus)}</td>
                  <td>
                    <span style={{ fontSize: "0.8rem", color: "#dc2626", fontWeight: 600 }}>
                      {l.errorType || l.errorMessage || "Unknown"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.8rem" }}>
                      {l.latencyMs ? `${l.latencyMs}ms` : "-"}
                    </span>
                  </td>
                  <td>
                    {l.failoverTriggered ? (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "#fef9c3",
                          color: "#a16207",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        Failover Aktif (Rotated)
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.76rem", color: "var(--color-text-muted)" }}>
                        Logged Only
                      </span>
                    )}
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

