"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { adminApi, type AuditLogItem } from "@/features/admin/data/adminApi";
import { AdminHeaderNav } from "@/features/admin/ui/AdminHeaderNav";
import styles from "@/app/(app)/admin/admin.module.css";

function formatAuditDetail(action: string, details: Record<string, unknown> | null): string {
  if (!details) return "-";
  if (action === "change_role") {
    return `Peran diubah: ${details.from} ➔ ${details.to}`;
  }
  if (action === "suspend") {
    return `Alasan suspend: "${details.reason}" (Role: ${details.targetRole || "-"})`;
  }
  if (action === "unsuspend") {
    return `Akun diaktifkan kembali (Role: ${details.targetRole || "-"})`;
  }
  if (action === "grant_subscription") {
    return `+ ${details.durationDays} hari Premium ("${details.reason}")`;
  }
  if (action === "update_ai_prompt") {
    return `Level ${details.levelId}: maks ${details.maxSentenceWords} kata, furigana ${details.furiganaRule}, speed ${details.speechRate}x`;
  }
  return JSON.stringify(details);
}

function getActionBadgeStyle(action: string): React.CSSProperties {
  switch (action) {
    case "change_role":
      return { background: "#f3e8ff", color: "#7e22ce", border: "1px solid #d8b4fe" };
    case "suspend":
      return { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" };
    case "unsuspend":
      return { background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" };
    case "grant_subscription":
      return { background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" };
    case "update_ai_prompt":
      return { background: "#e0f2fe", color: "#0369a1", border: "1px solid #7dd3fc" };
    default:
      return { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
  }
}

export default function AdminAuditPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/beranda");
      return;
    }
    if (user && !isSuperAdmin) {
      router.replace("/admin/ringkasan");
      return;
    }
  }, [user, isAdmin, isSuperAdmin, router]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAuditLogs();
    }
  }, [isSuperAdmin]);

  async function loadAuditLogs() {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs();
      setAuditLogs(res.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className={styles.container}>
        <p className={styles.emptyState}>Hanya Super Administrator yang berhak mengakses audit trail.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <AdminHeaderNav
        title="Audit Trail Keamanan & Forensik"
        subtitle="Pantau seluruh rekam jejak aksi administratif sensitif, perubahan role, penangguhan akun, dan riwayat sistem."
      />

      <div className={styles.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.panelTitle}>Riwayat Log Audit Forensik</h2>
          <button
            type="button"
            className={`${styles.btnSm} ${styles.btnSecondary}`}
            onClick={loadAuditLogs}
          >
            {loading ? "Memuat…" : "Segarkan Log"}
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Waktu Kejadian</th>
                <th>Pelaku (Actor)</th>
                <th>Aksi</th>
                <th>Target</th>
                <th>Rincian Detail Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    {loading ? "Memuat log audit..." : "Belum ada catatan aktivitas administratif."}
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "#64748b" }}>
                      {new Date(log.createdAt).toLocaleString("id-ID")}
                    </td>
                    <td>
                      <strong>{log.actorName}</strong>
                    </td>
                    <td>
                      <span className={styles.badge} style={getActionBadgeStyle(log.action)}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <strong>{log.targetUserName ?? "—"}</strong>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "#334155" }}>
                      {formatAuditDetail(log.action, log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
