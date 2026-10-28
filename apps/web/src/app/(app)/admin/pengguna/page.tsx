"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import {
  adminApi,
  type AdminUserItem,
  type SystemStats,
} from "@/features/admin/data/adminApi";
import type { Role } from "@/features/auth/domain/types";
import { AdminHeaderNav } from "@/features/admin/ui/AdminHeaderNav";
import { SkeletonTableRows } from "@/shared/ui/Skeleton";
import styles from "@/app/(app)/admin/admin.module.css";

export default function AdminPenggunaPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userQuery, setUserQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Modals state
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);
  const [newRole, setNewRole] = useState<Role>("student");
  const [suspendModalUser, setSuspendModalUser] = useState<AdminUserItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [grantModalUser, setGrantModalUser] = useState<AdminUserItem | null>(null);
  const [grantDays, setGrantDays] = useState(30);
  const [grantReason, setGrantReason] = useState("");

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/beranda");
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadUsers();
    }
  }, [isAdmin]);

  const showMsg = (text: string, error = false) => {
    setActionMessage({ text, error });
    setTimeout(() => setActionMessage(null), 4000);
  };

  async function loadStats() {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch {
      // ignore
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await adminApi.searchUsers({
        q: userQuery || undefined,
        role: (selectedRoleFilter as Role) || undefined,
      });
      setUsers(res.items);
      setUsersTotal(res.total);
    } catch (e: any) {
      showMsg(e.message || "Gagal memuat pengguna", true);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange() {
    if (!roleModalUser) return;
    try {
      await adminApi.changeRole(roleModalUser.id, newRole);
      showMsg(`Role ${roleModalUser.displayName} berhasil diubah menjadi ${newRole}`);
      setRoleModalUser(null);
      loadUsers();
      loadStats();
    } catch (e: any) {
      showMsg(e.message || "Gagal mengubah role", true);
    }
  }

  async function handleSuspend() {
    if (!suspendModalUser) return;
    try {
      await adminApi.suspendUser(suspendModalUser.id, suspendReason || "Ditangguhkan oleh administrator");
      showMsg(`Pengguna ${suspendModalUser.displayName} berhasil ditangguhkan.`);
      setSuspendModalUser(null);
      setSuspendReason("");
      loadUsers();
      loadStats();
    } catch (e: any) {
      showMsg(e.message || "Gagal suspend pengguna", true);
    }
  }

  async function handleUnsuspend(target: AdminUserItem) {
    try {
      await adminApi.unsuspendUser(target.id);
      showMsg(`Pengguna ${target.displayName} telah diaktifkan kembali.`);
      loadUsers();
      loadStats();
    } catch (e: any) {
      showMsg(e.message || "Gagal mengaktifkan pengguna", true);
    }
  }

  async function handleGrantSubscription() {
    if (!grantModalUser) return;
    try {
      await adminApi.grantSubscription(grantModalUser.id, grantDays, grantReason || "Diberikan oleh Super Admin");
      showMsg(`Akses Premium ${grantDays} hari berhasil diberikan kepada ${grantModalUser.displayName}`);
      setGrantModalUser(null);
      setGrantReason("");
      loadUsers();
      loadStats();
    } catch (e: any) {
      showMsg(e.message || "Gagal memberikan langganan", true);
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
        title="Tata Kelola Pengguna"
        subtitle="Cari dan kelola akun pengguna platform, ubah peranan (role), moderasi penangguhan, dan berikan akses langganan."
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
        {/* Quick Role Filter Pills */}
        <div className={styles.rolePillsRow}>
          {[
            { id: "", label: "Semua Pengguna", count: stats?.totalUsers },
            { id: "student", label: "Murid Reguler", count: stats?.roleBreakdown.student },
            { id: "premium", label: "Pelajar Premium", count: stats?.roleBreakdown.premium },
            { id: "teacher", label: "Guru / Sensei", count: stats?.roleBreakdown.teacher },
            { id: "admin", label: "Admin", count: stats?.roleBreakdown.admin },
            { id: "super_admin", label: "Super Admin", count: stats?.roleBreakdown.super_admin },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.rolePill} ${selectedRoleFilter === p.id ? styles.rolePillActive : ""}`}
              onClick={() => {
                setSelectedRoleFilter(p.id);
                adminApi
                  .searchUsers({ q: userQuery || undefined, role: (p.id as Role) || undefined })
                  .then((r) => {
                    setUsers(r.items);
                    setUsersTotal(r.total);
                  });
              }}
            >
              <span>{p.label}</span>
              {p.count !== undefined && <small>({p.count})</small>}
            </button>
          ))}
        </div>

        <div className={styles.filterBar}>
          <input
            type="text"
            placeholder="Cari nama atau email..."
            className={styles.searchInput}
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUsers()}
          />
          <select
            className={styles.selectInput}
            value={selectedRoleFilter}
            onChange={(e) => {
              setSelectedRoleFilter(e.target.value);
              adminApi
                .searchUsers({ q: userQuery || undefined, role: (e.target.value as Role) || undefined })
                .then((r) => {
                  setUsers(r.items);
                  setUsersTotal(r.total);
                });
            }}
          >
            <option value="">Semua Role</option>
            <option value="student">Student</option>
            <option value="premium">Premium</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button type="button" className={`${styles.btnSm} ${styles.btnPrimary}`} onClick={loadUsers}>
            Cari ({usersTotal})
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Pengguna</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <SkeletonTableRows rows={8} columns={5} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === user?.id;
                  const canEdit = isSuperAdmin || (u.role !== "admin" && u.role !== "super_admin");
                  return (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.displayName}</strong>
                        {isSelf && <small style={{ marginLeft: "6px", color: "#6366f1" }}>(Anda)</small>}
                      </td>
                      <td>{u.email ?? "-"}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`role_${u.role}`] || ""}`}>{u.role}</span>
                      </td>
                      <td>
                        <span className={u.status === "active" ? styles.status_active : styles.status_suspended}>
                          {u.status === "active" ? "Aktif" : "Ditangguhkan"}
                        </span>
                      </td>
                      <td>
                        {isSelf && (
                          <span style={{ fontSize: "0.75rem", color: "#6366f1", fontStyle: "italic", fontWeight: 600 }}>
                            (Akun Anda)
                          </span>
                        )}
                        {!isSelf && !canEdit && (
                          <span style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            Terproteksi (Super Admin)
                          </span>
                        )}
                        {!isSelf && canEdit && (
                          <div className={styles.actionGroup}>
                            <button
                              type="button"
                              className={`${styles.btnSm} ${styles.btnSecondary}`}
                              onClick={() => {
                                setRoleModalUser(u);
                                setNewRole(u.role);
                              }}
                            >
                              Ubah Role
                            </button>

                            {isSuperAdmin && (
                              <button
                                type="button"
                                className={`${styles.btnSm} ${styles.btnSuccess}`}
                                onClick={() => setGrantModalUser(u)}
                              >
                                + Premium
                              </button>
                            )}

                            {u.status === "active" && u.role !== "super_admin" && (
                              <button
                                type="button"
                                className={`${styles.btnSm} ${styles.btnDanger}`}
                                onClick={() => setSuspendModalUser(u)}
                              >
                                Suspend
                              </button>
                            )}

                            {u.status === "suspended" && (
                              <button
                                type="button"
                                className={`${styles.btnSm} ${styles.btnSuccess}`}
                                onClick={() => handleUnsuspend(u)}
                              >
                                Aktifkan
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: UBAH ROLE */}
      {roleModalUser && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Ubah Peran Pengguna</h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Pilih peran baru untuk <strong>{roleModalUser.displayName}</strong>:
            </p>
            <select
              className={styles.selectInput}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
            >
              <option value="student">Student (Pelajar Gratis)</option>
              <option value="premium">Premium (Pelajar Berbayar)</option>
              <option value="teacher">Teacher (Pengajar)</option>
              {isSuperAdmin && <option value="admin">Admin (Administrator)</option>}
              {isSuperAdmin && <option value="super_admin">Super Admin (Pimpinan)</option>}
            </select>
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.btnSm} ${styles.btnSecondary}`}
                onClick={() => setRoleModalUser(null)}
              >
                Batal
              </button>
              <button type="button" className={`${styles.btnSm} ${styles.btnPrimary}`} onClick={handleRoleChange}>
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUSPEND PENGGUNA */}
      {suspendModalUser && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Tangguhkan / Blokir Akun</h3>
            <p style={{ margin: 0, color: "#dc2626" }}>
              Anda akan menangguhkan akun <strong>{suspendModalUser.displayName}</strong>. Semua sesi login pengguna ini akan
              segera dicabut.
            </p>
            <div className={styles.controlField}>
              <label className={styles.fieldLabel}>Alasan Penangguhan</label>
              <input
                type="text"
                className={styles.selectInput}
                placeholder="Contoh: Pelanggaran ketentuan atau aktivitas mencurigakan"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.btnSm} ${styles.btnSecondary}`}
                onClick={() => setSuspendModalUser(null)}
              >
                Batal
              </button>
              <button type="button" className={`${styles.btnSm} ${styles.btnDanger}`} onClick={handleSuspend}>
                Ya, Tangguhkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GRANT PREMIUM */}
      {grantModalUser && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Beri Akses Premium Manual</h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Berikan status Premium langsung kepada <strong>{grantModalUser.displayName}</strong>:
            </p>
            <div className={styles.controlField}>
              <label className={styles.fieldLabel}>Durasi Hari</label>
              <input
                type="number"
                min="1"
                max="3650"
                className={styles.selectInput}
                value={grantDays}
                onChange={(e) => setGrantDays(parseInt(e.target.value, 10) || 30)}
              />
            </div>
            <div className={styles.controlField}>
              <label className={styles.fieldLabel}>Alasan Pemberian</label>
              <input
                type="text"
                className={styles.selectInput}
                placeholder="Contoh: Reward kontribusi atau kompensasi"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
              />
            </div>
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.btnSm} ${styles.btnSecondary}`}
                onClick={() => setGrantModalUser(null)}
              >
                Batal
              </button>
              <button type="button" className={`${styles.btnSm} ${styles.btnSuccess}`} onClick={handleGrantSubscription}>
                Beri Akses Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
