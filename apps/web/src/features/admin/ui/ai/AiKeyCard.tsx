"use client";

import React, { useState } from "react";
import { adminApi, type AiKeyItem } from "@/features/admin/data/adminApi";
import styles from "./aiEngine.module.css";

interface Props {
  item: AiKeyItem;
  onRefresh: () => void;
}

export function AiKeyCard({ item, onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const isCooldown = item.cooldownUntil && new Date(item.cooldownUntil) > new Date();

  async function handleResetCooldown() {
    setBusy(true);
    try {
      await adminApi.resetAiKeyCooldown(item.id);
      setActionNotice("Cooldown berhasil direset.");
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Gagal: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRefreshModels() {
    setBusy(true);
    setActionNotice("Menyegarkan model...");
    try {
      const res = await adminApi.refreshAiKeyModels(item.id);
      setActionNotice(`Berhasil: ${res.modelsCount} model aktif.`);
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Gagal: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleStatus() {
    setBusy(true);
    try {
      const nextStatus = item.status === "active" ? "standby" : "active";
      await adminApi.patchAiKey(item.id, { status: nextStatus });
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Gagal: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Hapus kunci "${item.label}"? Model yang terdaftar tidak akan terhapus.`)) {
      return;
    }
    setBusy(true);
    try {
      await adminApi.deleteAiKey(item.id);
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Gagal: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.keyCard}>
      <div className={styles.keyCardHeader}>
        <div>
          <span className={styles.keyPriorityBadge}>
            {item.priority === 1 ? "★ #1 UTAMA" : `#${item.priority} CADANGAN`}
          </span>
          <h4 className={styles.keyLabel} style={{ marginTop: 6 }}>
            {item.label}
          </h4>
        </div>

        <div>
          {item.status === "active" && <span className={`${styles.statusPill} ${styles.statusActive}`}>Aktif</span>}
          {item.status === "standby" && <span className={`${styles.statusPill} ${styles.statusStandby}`}>Siaga</span>}
          {item.status === "degraded" && <span className={`${styles.statusPill} ${styles.statusDegraded}`}>Degradasi</span>}
          {item.status === "exhausted" && <span className={`${styles.statusPill} ${styles.statusExhausted}`}>Habis Kuota</span>}
          {item.status === "revoked" && <span className={`${styles.statusPill} ${styles.statusRevoked}`}>Dicabut</span>}
        </div>
      </div>

      <div className={styles.keyHintBox}>
        <code className={styles.keyHintCode}>{item.keyHint}</code>
        <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>AES-256-GCM</span>
      </div>

      {isCooldown && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 10px", fontSize: "0.78rem", color: "#991b1b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Cooldown s/d {new Date(item.cooldownUntil!).toLocaleTimeString()}</span>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleResetCooldown}
            disabled={busy}
            style={{ fontSize: "0.72rem", padding: "2px 6px" }}
          >
            Reset
          </button>
        </div>
      )}

      {actionNotice && (
        <div style={{ fontSize: "0.76rem", color: "var(--color-primary)", fontWeight: 700 }}>
          {actionNotice}
        </div>
      )}

      <div className={styles.keyMetricsRow}>
        <span>Latensi: <strong>{item.lastLatencyMs ? `${item.lastLatencyMs}ms` : "-"}</strong></span>
        <span>Sukses: <strong>{item.successCount}</strong> · Gagal: <strong>{item.failureCount}</strong></span>
      </div>

      <div className={styles.keyActionsRow}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleToggleStatus}
          disabled={busy || item.status === "revoked"}
          title="Ubah antara Active dan Standby"
          style={{ fontSize: "0.76rem" }}
        >
          {item.status === "active" ? "Set Siaga" : "Set Aktif"}
        </button>

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleRefreshModels}
          disabled={busy}
          title="Tarik ulang daftar model dari penyedia"
          style={{ fontSize: "0.76rem" }}
        >
          Segarkan
        </button>

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleDelete}
          disabled={busy}
          style={{ fontSize: "0.76rem", color: "#b91c1c", borderColor: "#fca5a5" }}
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

