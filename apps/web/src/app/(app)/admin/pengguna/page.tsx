"use client";

import { useEffect, useRef, useState } from "react";
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
import { Pagination } from "@/features/admin/ui/Pagination";
import styles from "@/app/(app)/admin/admin.module.css";

const ROLE_LABEL: Record<string, string> = {
  student: "Pelajar",
  premium: "Premium",
  teacher: "Guru",
  admin: "Admin",
  super_admin: "Super Admin",
  guest: "Tamu",
};

const STATUS: Record<string, { label: string; cls: "status_active" | "status_suspended" | "status_pending" }> = {
  active: { label: "Aktif", cls: "status_active" },
  suspended: { label: "Ditangguhkan", cls: "status_suspended" },
  pending_deletion: { label: "Menunggu dihapus", cls: "status_pending" },
};

export default function AdminPenggunaPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
  const [busy, setBusy] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  /** Kata kunci yang benar-benar dicari (bukan yang sedang diketik). */
  const [appliedQuery, setAppliedQuery] = useState("");
  const requestRef = useRef(0);
  const msgTimer = useRef<number | undefined>(undefined);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/beranda");
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedRoleFilter, page, pageSize, appliedQuery]);

  /** Pencarian & ganti filter selalu mulai dari halaman pertama. */
  function searchFromStart() {
    const q = userQuery.trim();
    if (q !== appliedQuery) {
      setAppliedQuery(q);
      setPage(1);
    } else if (page !== 1) setPage(1);
    else loadUsers();
  }

  const showMsg = (text: string, error = false) => {
    window.clearTimeout(msgTimer.current);
    setActionMessage({ text, error });
    msgTimer.current = window.setTimeout(() => setActionMessage(null), 4000);
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
    // Hanya respons permintaan terakhir yang dipakai (ganti filter cepat tidak menimpa hasil baru dengan yang lama)
    const req = ++requestRef.current;
    setLoading(true);
    setUsersError(null);
    try {
      const res = await adminApi.searchUsers({
        q: appliedQuery || undefined,
        role: (selectedRoleFilter as Role) || undefined,
        page,
        pageSize,
      });
      if (req !== requestRef.current) return;
      // Baris terakhir di halaman ini hilang (mis. setelah ganti peran): mundur ke halaman terakhir yang ada
      const lastPage = Math.max(1, Math.ceil(res.total / pageSize));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setUsers(res.items);
      setUsersTotal(res.total);
    } catch (e: any) {
      if (req === requestRef.current) setUsersError(e.message || "Gagal memuat pengguna.");
    } finally {
      if (req === requestRef.current) setLoading(false);
    }
  }

  /** Satu aksi berjalan dalam satu waktu: tombol dikunci supaya klik ganda tidak mengirim dua kali (mis. Premium ganda). */
  async function runAction(action: () => Promise<void>, failText: string) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      loadUsers();
      loadStats();
    } catch (e: any) {
      showMsg(e.message || failText, true);
    } finally {
      setBusy(false);
    }
  }

  function closeModals() {
    if (busy) return;
    setRoleModalUser(null);
    setSuspendModalUser(null);
    setGrantModalUser(null);
  }

  // Esc menutup modal (kecuali sedang menyimpan)
  useEffect(() => {
    if (!roleModalUser && !suspendModalUser && !grantModalUser) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModals();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleModalUser, suspendModalUser, grantModalUser, busy]);

  function handleRoleChange() {
    const target = roleModalUser;
    if (!target) return;
    void runAction(async () => {
      await adminApi.changeRole(target.id, newRole);
      showMsg(`Peran ${target.displayName} diubah menjadi ${ROLE_LABEL[newRole] ?? newRole}.`);
      setRoleModalUser(null);
    }, "Gagal mengubah peran");
  }

  function handleSuspend() {
    const target = suspendModalUser;
    if (!target) return;
    void runAction(async () => {
      await adminApi.suspendUser(target.id, suspendReason.trim() || "Ditangguhkan oleh administrator");
      showMsg(`Pengguna ${target.displayName} berhasil ditangguhkan.`);
      setSuspendModalUser(null);
    }, "Gagal menangguhkan pengguna");
  }

  function handleUnsuspend(target: AdminUserItem) {
    void runAction(async () => {
      await adminApi.unsuspendUser(target.id);
      showMsg(`Pengguna ${target.displayName} telah diaktifkan kembali.`);
    }, "Gagal mengaktifkan pengguna");
  }

  const grantDaysValid = Number.isInteger(grantDays) && grantDays >= 1 && grantDays <= 3650;

  function handleGrantSubscription() {
    const target = grantModalUser;
    if (!target || !grantDaysValid) return;
    void runAction(async () => {
      await adminApi.grantSubscription(target.id, grantDays, grantReason.trim() || "Diberikan oleh Super Admin");
      showMsg(`Akses Premium ${grantDays} hari diberikan kepada ${target.displayName}.`);
      setGrantModalUser(null);
    }, "Gagal memberikan langganan");
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
              aria-pressed={selectedRoleFilter === p.id}
              onClick={() => {
                setSelectedRoleFilter(p.id);
                setPage(1);
              }}
            >
              <span>{p.label}</span>
              {p.count !== undefined && <small>({p.count})</small>}
            </button>
          ))}
        </div>

        {/* Filter peran cukup lewat tombol di atas (sebelumnya dobel dengan dropdown berbahasa Inggris) */}
        <form
          className={styles.filterBar}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            searchFromStart();
          }}
        >
          <input
            type="search"
            placeholder="Cari nama atau email..."
            aria-label="Cari nama atau email pengguna"
            className={styles.searchInput}
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          <button type="submit" className={`${styles.btnSm} ${styles.btnPrimary}`}>
            Cari
          </button>
        </form>

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
              {usersError ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState} role="alert">
                    {usersError}{" "}
                    <button type="button" className={`${styles.btnSm} ${styles.btnSecondary}`} onClick={loadUsers}>
                      Coba lagi
                    </button>
                  </td>
                </tr>
              ) : loading && users.length === 0 ? (
                <SkeletonTableRows rows={8} columns={5} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    {appliedQuery ? `Tidak ada pengguna yang cocok dengan "${appliedQuery}".` : "Tidak ada pengguna ditemukan."}
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
                        {isSelf && <small style={{ marginLeft: "6px", color: "var(--color-primary)" }}>(Anda)</small>}
                      </td>
                      <td>{u.email ?? "-"}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`role_${u.role}`] || ""}`}>{ROLE_LABEL[u.role] ?? u.role}</span>
                      </td>
                      <td>
                        <span className={styles[(STATUS[u.status] ?? STATUS.suspended).cls]}>
                          {(STATUS[u.status] ?? { label: u.status }).label}
                        </span>
                      </td>
                      <td>
                        {isSelf && (
                          <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", fontStyle: "italic", fontWeight: 600 }}>
                            (Akun Anda)
                          </span>
                        )}
                        {!isSelf && !canEdit && (
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            Terproteksi (Super Admin)
                          </span>
                        )}
                        {!isSelf && canEdit && (
                          <div className={styles.actionGroup}>
                            <button
                              type="button"
                              className={`${styles.btnSm} ${styles.btnSecondary}`}
                              disabled={busy}
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
                                disabled={busy}
                                onClick={() => {
                                  // Modal selalu mulai bersih, tidak membawa isian pengguna sebelumnya
                                  setGrantDays(30);
                                  setGrantReason("");
                                  setGrantModalUser(u);
                                }}
                              >
                                + Premium
                              </button>
                            )}

                            {u.status === "active" && u.role !== "super_admin" && (
                              <button
                                type="button"
                                className={`${styles.btnSm} ${styles.btnDanger}`}
                                disabled={busy}
                                onClick={() => {
                                  setSuspendReason("");
                                  setSuspendModalUser(u);
                                }}
                              >
                                Suspend
                              </button>
                            )}

                            {u.status === "suspended" && (
                              <button
                                type="button"
                                className={`${styles.btnSm} ${styles.btnSuccess}`}
                                disabled={busy}
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
        <Pagination
          page={page}
          pageSize={pageSize}
          total={usersTotal}
          unit="pengguna"
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {/* MODAL: UBAH ROLE */}
      {roleModalUser && (
        <div className={styles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && closeModals()}>
          <div className={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="modal-role-title">
            <h3 id="modal-role-title" className={styles.modalTitle}>Ubah Peran Pengguna</h3>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              Pilih peran baru untuk <strong>{roleModalUser.displayName}</strong>:
            </p>
            <select
              className={styles.selectInput}
              aria-label="Peran baru"
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
                onClick={closeModals}
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="button"
                className={`${styles.btnSm} ${styles.btnPrimary}`}
                onClick={handleRoleChange}
                disabled={busy || newRole === roleModalUser.role}
              >
                {busy ? "Menyimpan…" : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUSPEND PENGGUNA */}
      {suspendModalUser && (
        <div className={styles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && closeModals()}>
          <div className={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="modal-suspend-title">
            <h3 id="modal-suspend-title" className={styles.modalTitle}>Tangguhkan / Blokir Akun</h3>
            <p style={{ margin: 0, color: "var(--color-danger)" }}>
              Anda akan menangguhkan akun <strong>{suspendModalUser.displayName}</strong>. Semua sesi login pengguna ini akan
              segera dicabut.
            </p>
            <div className={styles.controlField}>
              <label className={styles.fieldLabel} htmlFor="suspend-reason">
                Alasan Penangguhan
              </label>
              <input
                id="suspend-reason"
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
                onClick={closeModals}
                disabled={busy}
              >
                Batal
              </button>
              <button type="button" className={`${styles.btnSm} ${styles.btnDanger}`} onClick={handleSuspend} disabled={busy}>
                {busy ? "Memproses…" : "Ya, Tangguhkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GRANT PREMIUM */}
      {grantModalUser && (
        <div className={styles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && closeModals()}>
          <div className={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="modal-grant-title">
            <h3 id="modal-grant-title" className={styles.modalTitle}>Beri Akses Premium Manual</h3>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              Berikan status Premium langsung kepada <strong>{grantModalUser.displayName}</strong>:
            </p>
            <div className={styles.controlField}>
              <label className={styles.fieldLabel} htmlFor="grant-days">
                Durasi Hari (1–3650)
              </label>
              <input
                id="grant-days"
                type="number"
                min="1"
                max="3650"
                inputMode="numeric"
                className={styles.selectInput}
                value={Number.isNaN(grantDays) ? "" : grantDays}
                onChange={(e) => setGrantDays(e.target.value === "" ? NaN : parseInt(e.target.value, 10))}
                aria-invalid={!grantDaysValid}
              />
              {!grantDaysValid && <small style={{ color: "var(--color-danger)" }}>Isi angka 1 sampai 3650.</small>}
            </div>
            <div className={styles.controlField}>
              <label className={styles.fieldLabel} htmlFor="grant-reason">
                Alasan Pemberian
              </label>
              <input
                id="grant-reason"
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
                onClick={closeModals}
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="button"
                className={`${styles.btnSm} ${styles.btnSuccess}`}
                onClick={handleGrantSubscription}
                disabled={busy || !grantDaysValid}
              >
                {busy ? "Memproses…" : "Beri Akses Premium"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
