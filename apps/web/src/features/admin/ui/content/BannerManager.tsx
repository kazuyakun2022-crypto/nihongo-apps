"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { bannerApi } from "@/features/banner/data/bannerApi";
import type { BannerInput, BannerItem } from "@/features/banner/domain/types";
import { getBannerShadingStyle } from "@/features/banner/domain/shading";
import { SkeletonRegion } from "@/shared/ui/Skeleton";
import { askConfirm } from "@/shared/ui/confirmDialog";
import { BannerModal } from "./BannerModal";
import { PlusIcon, CheckIcon, PencilIcon, SparklesIcon } from "@/shared/ui/icons";
import styles from "./bannerManager.module.css";

export function BannerManager() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const loadData = () => {
    setLoading(true);
    bannerApi
      .listAll()
      .then((items) => {
        setBanners(items);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal mengambil data banner admin:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openCreateModal = () => {
    setEditingBanner(null);
    setModalOpen(true);
  };

  const openEditModal = (item: BannerItem) => {
    setEditingBanner(item);
    setModalOpen(true);
  };

  const handleSave = async (payload: BannerInput) => {
    if (editingBanner) {
      await bannerApi.update(editingBanner.id, payload);
      showToast(`Banner "${payload.title}" berhasil diperbarui.`);
    } else {
      await bannerApi.create(payload);
      showToast(`Banner baru "${payload.title}" berhasil dipasang.`);
    }
    loadData();
  };

  const handleToggle = async (item: BannerItem) => {
    const nextState = !item.isActive;
    try {
      // Optimistic update
      setBanners((prev) =>
        prev.map((b) => (b.id === item.id ? { ...b, isActive: nextState } : b))
      );
      await bannerApi.toggle(item.id);
      showToast(`Status "${item.title}" diubah menjadi ${nextState ? "Aktif" : "Nonaktif"}.`);
    } catch (err: any) {
      // Revert if error
      setBanners((prev) =>
        prev.map((b) => (b.id === item.id ? { ...b, isActive: !nextState } : b))
      );
      alert("Gagal mengubah status: " + (err?.message || "Terjadi kesalahan."));
    }
  };

  const handleDelete = async (item: BannerItem) => {
    const ok = await askConfirm({
      title: "Hapus Banner & Iklan",
      description: `Apakah kamu yakin ingin menghapus banner "${item.title}"? Banner ini akan dihapus secara permanen dari Beranda siswa.`,
      confirmText: "Hapus Permanen",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await bannerApi.delete(item.id);
      setBanners((prev) => prev.filter((b) => b.id !== item.id));
      showToast(`Banner "${item.title}" berhasil dihapus.`);
    } catch (err: any) {
      alert("Gagal menghapus banner: " + (err?.message || "Terjadi kesalahan."));
    }
  };

  // Filtered list
  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const matchSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.badge && b.badge.toLowerCase().includes(searchQuery.toLowerCase())) ||
        b.linkUrl.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && b.isActive) ||
        (statusFilter === "inactive" && !b.isActive);

      return matchSearch && matchStatus;
    });
  }, [banners, searchQuery, statusFilter]);

  const activeCount = banners.filter((b) => b.isActive).length;
  const inactiveCount = banners.length - activeCount;
  const externalCount = banners.filter((b) => b.linkUrl.startsWith("http")).length;

  return (
    <div className={styles.container}>
      {/* Toast Notifikasi Sukses */}
      {toastMessage && (
        <div className={styles.toastNotice} role="status">
          <span className={styles.toastCheck}>
            <CheckIcon size={13} strokeWidth={3} />
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER CARD KELOLA BANNER ── */}
      <section className={styles.headerCard} aria-label="Ringkasan banner beranda">
        <span className={styles.headerKanjiWatermark} aria-hidden="true" lang="ja">
          広
        </span>

        <div className={styles.headerInfo}>
          <h2 className={styles.headerTitle}>
            <span>Manajemen Banner & Iklan Beranda</span>
            <span className={styles.headerBadge}>{activeCount} Sedang Berputar</span>
          </h2>
          <p className={styles.headerDesc}>
            Atur spanduk rekomendasi materi, simulasi ujian, atau promosi iklan yang berputar secara otomatis di halaman Beranda siswa. Siswa hanya akan melihat banner berstatus <strong>Aktif</strong>.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link
            href="/beranda"
            target="_blank"
            className={styles.btnSecondary}
            title="Buka Beranda di tab baru untuk melihat hasil rotasi banner"
          >
            <span>Lihat di Beranda</span>
            <span style={{ fontSize: "0.85rem" }}>↗</span>
          </Link>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={openCreateModal}
          >
            <PlusIcon size={16} strokeWidth={2.8} />
            <span>Pasang Banner Baru</span>
          </button>
        </div>
      </section>

      {/* ── RINGKASAN STATISTIK CEPAT ── */}
      <section className={styles.statsRow} aria-label="Statistik banner">
        <div className={styles.statCard}>
          <div>
            <div className={styles.statCardLabel}>Total Banner</div>
            <div className={styles.statCardValue}>{banners.length}</div>
          </div>
          <div className={`${styles.statCardIcon} ${styles.statIconTotal}`} aria-hidden="true">
            📑
          </div>
        </div>

        <div className={styles.statCard}>
          <div>
            <div className={styles.statCardLabel}>Aktif di Beranda</div>
            <div className={styles.statCardValue} style={{ color: "#16a34a" }}>
              {activeCount}
            </div>
          </div>
          <div className={`${styles.statCardIcon} ${styles.statIconActive}`} aria-hidden="true">
            ✓
          </div>
        </div>

        <div className={styles.statCard}>
          <div>
            <div className={styles.statCardLabel}>Draft / Nonaktif</div>
            <div className={styles.statCardValue} style={{ color: "#64748b" }}>
              {inactiveCount}
            </div>
          </div>
          <div className={`${styles.statCardIcon} ${styles.statIconInactive}`} aria-hidden="true">
            ⏸
          </div>
        </div>

        <div className={styles.statCard}>
          <div>
            <div className={styles.statCardLabel}>Tautan Luar / Internal</div>
            <div className={styles.statCardValue} style={{ fontSize: "1.25rem" }}>
              {externalCount} luar / {banners.length - externalCount} app
            </div>
          </div>
          <div className={`${styles.statCardIcon} ${styles.statIconTotal}`} aria-hidden="true">
            🔗
          </div>
        </div>
      </section>

      {/* ── FILTER & PENCARIAN ── */}
      <section className={styles.filterBar} aria-label="Alat pencarian dan penyaringan banner">
        <div className={styles.searchBox}>
          <span style={{ color: "var(--color-text-muted)" }}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Cari berdasarkan judul, badge, atau link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "0.8rem" }}
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.filterControls}>
          {/* Status Tabs */}
          <div className={styles.segmentedGroup} role="group" aria-label="Saring status">
            <button
              type="button"
              className={`${styles.segmentBtn} ${statusFilter === "all" ? styles.segmentBtnActive : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              Semua ({banners.length})
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${statusFilter === "active" ? styles.segmentBtnActive : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Aktif ({activeCount})
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${statusFilter === "inactive" ? styles.segmentBtnActive : ""}`}
              onClick={() => setStatusFilter("inactive")}
            >
              Nonaktif ({inactiveCount})
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className={styles.segmentedGroup} role="group" aria-label="Pilih tampilan">
            <button
              type="button"
              className={`${styles.segmentBtn} ${viewMode === "grid" ? styles.segmentBtnActive : ""}`}
              onClick={() => setViewMode("grid")}
              title="Tampilan Kartu Visual"
            >
              🎴 Kartu
            </button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${viewMode === "table" ? styles.segmentBtnActive : ""}`}
              onClick={() => setViewMode("table")}
              title="Tampilan Tabel Rinci"
            >
              📄 Tabel
            </button>
          </div>
        </div>
      </section>

      {/* ── DAFTAR KONTEN BANNER ── */}
      {loading ? (
        <SkeletonRegion label="Memuat banner rekomendasi…">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 220,
                  borderRadius: 20,
                  background: "var(--color-surface)",
                  border: "1.5px solid var(--color-border)",
                }}
              />
            ))}
          </div>
        </SkeletonRegion>
      ) : filteredBanners.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            background: "var(--color-surface)",
            border: "1.5px dashed var(--color-border)",
            borderRadius: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: "2.5rem" }}>⛩️</span>
          <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>
            {searchQuery
              ? "Tidak ada banner yang cocok dengan kata kunci."
              : "Belum ada banner yang dipasang."}
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-muted)", maxWidth: 420 }}>
            {searchQuery
              ? "Coba gunakan kata kunci lain atau bersihkan kotak pencarian di atas."
              : "Buat spanduk promosi, rekomendasi fitur, atau event untuk menarik antusiasme belajar siswa di Beranda."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={openCreateModal}
              style={{ marginTop: 8 }}
            >
              <PlusIcon size={15} />
              <span>Pasang Banner Pertama</span>
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ── TAMPILAN KARTU SHOWCASE VISUAL (GRID) ── */
        <div className={styles.cardsGrid}>
          {filteredBanners.map((item) => (
            <article
              key={item.id}
              className={`${styles.bannerCard} ${!item.isActive ? styles.cardInactive : ""}`}
            >
              {/* Header Info Admin: Urutan Rotasi, Shading, & Status */}
              <div className={styles.cardAdminHeader}>
                <div className={styles.cardAdminHeaderLeft}>
                  <span className={styles.cardOrderBadge}>
                    Rotasi #{item.order}
                  </span>
                  <span className={styles.cardShadingBadge}>
                    Shading: {item.shadingPosition === "right" ? "Kanan" : item.shadingPosition === "bottom" ? "Bawah" : item.shadingPosition === "full" ? "Merata" : "Kiri"} · {item.shadingOpacity ?? 60}%
                  </span>
                </div>
                <span className={item.isActive ? styles.cardStatusActive : styles.cardStatusDraft}>
                  {item.isActive ? "● Aktif" : "○ Nonaktif"}
                </span>
              </div>

              {/* Realistic Beranda Banner Preview (sama persis dengan yang dilihat siswa di Beranda) */}
              <div className={styles.bannerPreviewWrapper}>
                <div className={styles.realBannerPreview}>
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className={styles.realBannerImg}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                  <div
                    className={styles.realBannerOverlay}
                    style={getBannerShadingStyle(item.shadingPosition, item.shadingOpacity)}
                  />
                  <span className={styles.realBannerKanji} aria-hidden="true" lang="ja">
                    推
                  </span>

                  {/* Konten Utama Banner (Badge, Judul, Deskripsi, Tombol Aksi) */}
                  <div className={styles.realBannerContent}>
                    {item.badge && <span className={styles.realBannerBadge}>{item.badge}</span>}
                    <h3 className={styles.realBannerTitle}>{item.title}</h3>
                    {item.description && (
                      <p className={styles.realBannerDesc}>{item.description}</p>
                    )}
                    <div className={styles.realBannerActionRow}>
                      <span className={styles.realBannerBtn}>
                        <span>Buka Sekarang</span>
                        <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strip Tautan Arah */}
              <div className={styles.cardLinkStrip}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: "0.8rem", flexShrink: 0 }}>
                    {item.linkUrl.startsWith("http") ? "🌐" : "📍"}
                  </span>
                  <span className={styles.cardLinkText} title={item.linkUrl}>
                    {item.linkUrl}
                  </span>
                </div>
                <span className={styles.cardTargetBadge}>
                  {item.target === "_blank" ? "Tab Baru ↗" : "Halaman Ini"}
                </span>
              </div>

              {/* Footer Aksi: Toggle Switch Langsung & Tombol Edit/Hapus */}
              <div className={styles.cardFooter}>
                <label
                  className={styles.switchWrap}
                  title="Klik untuk langsung mengaktifkan atau menonaktifkan banner"
                >
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={() => handleToggle(item)}
                    style={{ display: "none" }}
                  />
                  <div className={`${styles.switchTrack} ${item.isActive ? styles.switchTrackActive : ""}`}>
                    <div className={`${styles.switchThumb} ${item.isActive ? styles.switchThumbActive : ""}`} />
                  </div>
                  <span style={{ color: item.isActive ? "#16a34a" : "var(--color-text-muted)" }}>
                    {item.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </label>

                <div className={styles.cardActionBtns}>
                  <button
                    type="button"
                    className={styles.btnEdit}
                    onClick={() => openEditModal(item)}
                    title="Ubah banner"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => handleDelete(item)}
                    title="Hapus banner"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* ── TAMPILAN TABEL RINCI (TABLE VIEW) ── */
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 70, textAlign: "center" }}>Rotasi</th>
                  <th style={{ width: 110 }}>Pratinjau</th>
                  <th>Judul & Badge</th>
                  <th>Deskripsi</th>
                  <th>Tautan Arah</th>
                  <th style={{ width: 100 }}>Jendela</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 130, textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredBanners.map((item) => (
                  <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.7 }}>
                    <td style={{ textAlign: "center", fontWeight: 800 }}>
                      #{item.order}
                    </td>
                    <td>
                      <div
                        style={{
                          width: 80,
                          height: 46,
                          borderRadius: 8,
                          overflow: "hidden",
                          background: "#1f1a1c",
                          border: "1px solid var(--color-border)",
                          position: "relative",
                        }}
                      >
                        <img
                          src={item.imageUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            ...getBannerShadingStyle(item.shadingPosition, item.shadingOpacity),
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: 999,
                              background: "var(--palette-tamago-soft)",
                              color: "#925f00",
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                        <strong>{item.title}</strong>
                      </div>
                    </td>
                    <td style={{ maxWidth: 220, color: "var(--color-text-muted)" }}>
                      <div
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.description || "-"}
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: "0.78rem" }}>{item.linkUrl}</code>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        {item.target === "_blank" ? "Tab Baru ↗" : "Halaman Ini"}
                      </span>
                    </td>
                    <td>
                      <label className={styles.switchWrap} style={{ fontSize: "0.74rem" }}>
                        <input
                          type="checkbox"
                          checked={item.isActive}
                          onChange={() => handleToggle(item)}
                          style={{ display: "none" }}
                        />
                        <div
                          className={`${styles.switchTrack} ${item.isActive ? styles.switchTrackActive : ""}`}
                          style={{ width: 34, height: 20 }}
                        >
                          <div
                            className={`${styles.switchThumb} ${item.isActive ? styles.switchThumbActive : ""}`}
                            style={{ width: 16, height: 16, transform: item.isActive ? "translateX(14px)" : "none" }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, color: item.isActive ? "#16a34a" : "var(--color-text-muted)" }}>
                          {item.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </label>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className={styles.btnEdit}
                          onClick={() => openEditModal(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.btnDanger}
                          onClick={() => handleDelete(item)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL MANDIRI: FORM TAMBAH & EDIT BANNER ── */}
      {modalOpen && (
        <BannerModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          banner={editingBanner}
          defaultOrder={banners.length}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
