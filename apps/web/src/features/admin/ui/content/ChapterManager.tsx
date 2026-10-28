"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { contentApi, type ChapterRow, type ContentLevel, type ContentStatus } from "@/features/admin/data/contentApi";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { FormModal } from "./FormModal";
import { STATUS_LABEL, useFlash } from "./ContentShell";
import styles from "./content.module.css";

/** Pilih level dari ?level= supaya tombol kembali dari editor bab membuka level yang sama. */
export function useLevelParam(levels: ContentLevel[]) {
  const params = useSearchParams();
  const router = useRouter();
  const fromUrl = Number(params.get("level"));
  const levelId = levels.some((l) => l.id === fromUrl) ? fromUrl : levels[0]?.id;
  const select = (id: number) => router.replace(`?level=${id}`, { scroll: false });
  return [levelId, select] as const;
}

export function LevelPicker({ levels, value, onChange, meta }: { levels: ContentLevel[]; value?: number; onChange: (id: number) => void; meta: (l: ContentLevel) => string }) {
  return (
    <div className={styles.levelBar} role="tablist" aria-label="Pilih level">
      {levels.map((l) => (
        <button
          key={l.id}
          type="button"
          role="tab"
          aria-selected={l.id === value}
          className={`${styles.levelPill} ${l.id === value ? styles.levelPillActive : ""}`}
          onClick={() => onChange(l.id)}
        >
          <span className={styles.levelCode}>{l.code}</span>
          <span className={styles.levelMeta}>{meta(l)}</span>
        </button>
      ))}
    </div>
  );
}

export function ChapterManager() {
  const router = useRouter();
  const flash = useFlash();
  const [levels, setLevels] = useState<ContentLevel[]>([]);
  const [levelId, selectLevel] = useLevelParam(levels);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ContentStatus>("");
  const [creating, setCreating] = useState(false);

  const loadLevels = useCallback(() => contentApi.levels().then((r) => setLevels(r.levels)).catch(flash.fail), [flash.fail]);
  const loadChapters = useCallback(
    (id: number) => {
      setLoading(true);
      return contentApi
        .chapters(id)
        .then((r) => setChapters(r.chapters))
        .catch(flash.fail)
        .finally(() => setLoading(false));
    },
    [flash.fail],
  );

  useEffect(() => {
    void loadLevels();
  }, [loadLevels]);
  useEffect(() => {
    if (levelId) void loadChapters(levelId);
  }, [levelId, loadChapters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chapters.filter((c) => (!q || c.title.toLowerCase().includes(q)) && (!statusFilter || c.status === statusFilter));
  }, [chapters, query, statusFilter]);
  const isFiltered = filtered.length !== chapters.length;

  async function move(index: number, delta: number) {
    if (!levelId) return;
    const next = [...chapters];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setChapters(next);
    try {
      await contentApi.reorderChapters(levelId, next.map((c) => c.id));
    } catch (err) {
      flash.fail(err);
      void loadChapters(levelId);
    }
  }

  async function setStatus(c: ChapterRow, status: ContentStatus) {
    try {
      await contentApi.updateChapter(c.id, { status });
      setChapters((list) => list.map((x) => (x.id === c.id ? { ...x, status } : x)));
      flash.ok(status === "published" ? `"${c.title}" diterbitkan.` : `"${c.title}" disembunyikan dari siswa.`);
      void loadLevels();
    } catch (err) {
      flash.fail(err);
    }
  }

  async function remove(c: ChapterRow) {
    if (!confirm(`Hapus bab "${c.title}" beserta seluruh materi dan latihannya? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await contentApi.deleteChapter(c.id);
      setChapters((list) => list.filter((x) => x.id !== c.id));
      flash.ok("Bab dihapus.");
      void loadLevels();
    } catch (err) {
      flash.fail(err);
    }
  }

  const level = levels.find((l) => l.id === levelId);

  return (
    <>
      <LevelPicker
        levels={levels}
        value={levelId}
        onChange={selectLevel}
        meta={(l) => `${l.chapters.published ?? 0} terbit${l.chapters.draft ? ` · ${l.chapters.draft} draft` : ""}`}
      />
      {flash.node}

      <section className={adminStyles.panel}>
        <div className={styles.toolbar}>
          <h2 className={adminStyles.panelTitle}>
            Bab {level?.name ?? ""} <span className={styles.muted}>({chapters.length})</span>
          </h2>
          <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={() => setCreating(true)} disabled={!levelId}>
            + Bab Baru
          </button>
        </div>
        <div className={adminStyles.filterBar}>
          <input className={adminStyles.searchInput} placeholder="Cari judul bab…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari judul bab" />
          <select className={adminStyles.selectInput} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | ContentStatus)} aria-label="Filter status">
            <option value="">Semua status</option>
            <option value="published">Terbit</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
          </select>
        </div>
        {isFiltered && <p className={styles.muted}>Urutan bab hanya bisa diubah saat filter dikosongkan.</p>}

        {loading ? (
          <p className={adminStyles.emptyState}>Memuat bab…</p>
        ) : filtered.length === 0 ? (
          <p className={adminStyles.emptyState}>{chapters.length ? "Tidak ada bab yang cocok." : "Belum ada bab di level ini."}</p>
        ) : (
          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Judul</th>
                  <th className={styles.hideMobile}>Isi</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const index = chapters.indexOf(c);
                  return (
                    <tr key={c.id}>
                      <td className={styles.muted}>{index + 1}</td>
                      <td>
                        <Link href={`/admin/konten/bab/${c.id}?level=${levelId}`} className={styles.chapterTitle}>
                          {c.title}
                        </Link>
                      </td>
                      <td className={styles.hideMobile}>
                        <div className={styles.counts}>
                          <span>{c._count.vocabularies} kosakata</span>
                          {c._count.kanji > 0 && <span>{c._count.kanji} kanji</span>}
                          {c._count.grammarPoints > 0 && <span>{c._count.grammarPoints} pola</span>}
                          <span>{c._count.quizQuestions} latihan</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${adminStyles.badge} ${styles[`status_${c.status}`]}`}>{STATUS_LABEL[c.status]}</span>
                      </td>
                      <td>
                        <div className={adminStyles.actionGroup}>
                          <button type="button" className={styles.iconBtn} aria-label="Naikkan urutan" disabled={isFiltered || index === 0} onClick={() => move(index, -1)}>
                            ↑
                          </button>
                          <button type="button" className={styles.iconBtn} aria-label="Turunkan urutan" disabled={isFiltered || index === chapters.length - 1} onClick={() => move(index, 1)}>
                            ↓
                          </button>
                          <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => router.push(`/admin/konten/bab/${c.id}?level=${levelId}`)}>
                            Edit
                          </button>
                          {c.status === "published" ? (
                            <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => setStatus(c, "draft")}>
                              Sembunyikan
                            </button>
                          ) : (
                            <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSuccess}`} onClick={() => setStatus(c, "published")}>
                              Terbitkan
                            </button>
                          )}
                          <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnDanger}`} onClick={() => remove(c)}>
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating && levelId && (
        <FormModal
          title="Bab baru"
          initial={{ title: "", explanation: "" }}
          fields={[
            { name: "title", label: "Judul bab", type: "text", required: true, wide: true },
            { name: "explanation", label: "Pengantar bab", type: "textarea", hint: "Tampil di awal pelajaran. Boleh dikosongkan." },
          ]}
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            const { chapter } = await contentApi.createChapter(levelId, { title: v.title as string, explanation: (v.explanation as string) || undefined });
            router.push(`/admin/konten/bab/${chapter.id}?level=${levelId}`);
          }}
        />
      )}
    </>
  );
}
