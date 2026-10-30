"use client";

import { useCallback, useEffect, useState } from "react";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { contentApi, type ContentLevel } from "@/features/admin/data/contentApi";
import {
  kamusAdminApi,
  type KamusAdminCategory,
  type KamusAdminEntry,
  type KamusCategoryType,
  type KamusEntryInput,
  type KamusStatus,
  type KamusType,
} from "@/features/admin/data/kamusAdminApi";
import { SkeletonRegion, SkeletonTableRows } from "@/shared/ui/Skeleton";
import { FormModal, type FieldDef, type FormValues } from "./FormModal";
import { useFlash } from "./ContentShell";
import styles from "./content.module.css";

const TYPES: { key: KamusType; label: string; icon: string }[] = [
  { key: "gambar", label: "Bergambar", icon: "🖼️" },
  { key: "kosakata", label: "Kosakata", icon: "📖" },
  { key: "kanji", label: "Kanji", icon: "漢" },
  { key: "tata_bahasa", label: "Tata Bahasa", icon: "🧩" },
  { key: "ungkapan", label: "Ungkapan & Sebutan", icon: "💬" },
];

const hasCategories = (t: KamusType): t is KamusCategoryType => t === "gambar" || t === "ungkapan";
const fromChapters = (t: KamusType) => t === "kosakata" || t === "kanji" || t === "tata_bahasa";

/** Isian form per jenis kamus; level, status, dan urutan ditambahkan di akhir. */
function entryFields(type: KamusType, levels: ContentLevel[], categories: KamusAdminCategory[]): FieldDef[] {
  const category: FieldDef = {
    name: "categoryId",
    label: type === "gambar" ? "Kategori" : "Kategori (opsional)",
    type: "select",
    options: [...(type === "gambar" ? [] : [{ value: "", label: "Tanpa kategori" }]), ...categories.map((c) => ({ value: c.id, label: c.title }))],
  };
  const common: FieldDef[] = [
    { name: "levelId", label: "Level", type: "select", options: levels.map((l) => ({ value: String(l.id), label: l.name })), hint: "Siswa melihat entri sampai levelnya sendiri." },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "published", label: "Terbit (tampil ke siswa)" },
        { value: "draft", label: "Draft (tersembunyi)" },
      ],
    },
    { name: "sortOrder", label: "Urutan", type: "number", min: 0, max: 100000, hint: "Angka kecil tampil lebih dulu dalam level yang sama." },
  ];
  switch (type) {
    case "gambar":
      return [
        category,
        { name: "term", label: "Kata (tulisan Jepang)", type: "text", required: true, jp: true },
        { name: "reading", label: "Kana", type: "text", jp: true },
        { name: "romaji", label: "Romaji", type: "text" },
        { name: "meaning", label: "Arti", type: "text", required: true },
        { name: "imageUrl", label: "Gambar", type: "image", hint: "Wajib. Gambar benda dengan latar polos paling mudah dikenali." },
        ...common,
      ];
    case "kosakata":
      return [
        { name: "term", label: "Kata", type: "text", required: true, jp: true },
        { name: "reading", label: "Cara baca (hiragana)", type: "text", jp: true },
        { name: "romaji", label: "Romaji", type: "text" },
        { name: "meaning", label: "Arti", type: "text", required: true, wide: true },
        { name: "exampleSentence", label: "Contoh kalimat", type: "text", wide: true, jp: true },
        { name: "exampleTranslation", label: "Terjemahan contoh", type: "text", wide: true },
        { name: "note", label: "Catatan pemakaian (opsional)", type: "text", wide: true },
        { name: "imageUrl", label: "Gambar (opsional)", type: "image" },
        ...common,
      ];
    case "kanji":
      return [
        { name: "term", label: "Kanji", type: "text", required: true, jp: true, hint: "Satu karakter." },
        { name: "meaning", label: "Arti", type: "text", required: true },
        { name: "onyomi", label: "Onyomi", type: "text", jp: true, hint: "Pisahkan dengan ・" },
        { name: "kunyomi", label: "Kunyomi", type: "text", jp: true, hint: "Pisahkan dengan ・" },
        { name: "exampleSentence", label: "Contoh kata/kalimat (opsional)", type: "text", wide: true, jp: true },
        { name: "exampleTranslation", label: "Arti contoh", type: "text", wide: true },
        { name: "note", label: "Catatan (opsional)", type: "text", wide: true },
        ...common,
      ];
    case "tata_bahasa":
      return [
        { name: "term", label: "Pola", type: "text", required: true, wide: true, jp: true },
        { name: "meaning", label: "Arti singkat", type: "text", required: true, wide: true, hint: "Satu kalimat, tampil di daftar." },
        { name: "explanation", label: "Penjelasan lengkap", type: "textarea" },
        { name: "exampleSentence", label: "Contoh kalimat", type: "text", wide: true, jp: true },
        { name: "exampleTranslation", label: "Terjemahan contoh", type: "text", wide: true },
        { name: "imageUrl", label: "Gambar (opsional)", type: "image", hint: "Mis. diagram pola kalimat." },
        ...common,
      ];
    case "ungkapan":
      return [
        category,
        { name: "term", label: "Ungkapan / sebutan", type: "text", required: true, jp: true },
        { name: "reading", label: "Kana", type: "text", jp: true },
        { name: "romaji", label: "Romaji", type: "text" },
        { name: "meaning", label: "Arti", type: "text", required: true, wide: true },
        { name: "note", label: "Catatan pemakaian (opsional)", type: "text", wide: true, hint: "Mis. kapan dipakai, versi sopan/santai, pasangan sebutannya." },
        ...common,
      ];
  }
}

const EMPTY_ENTRY = {
  categoryId: "",
  term: "",
  reading: "",
  romaji: "",
  meaning: "",
  onyomi: "",
  kunyomi: "",
  explanation: "",
  note: "",
  exampleSentence: "",
  exampleTranslation: "",
  imageUrl: null,
  status: "published",
  sortOrder: 0,
};

function toEntryInput(type: KamusType, values: FormValues): KamusEntryInput {
  const str = (k: string) => {
    const v = values[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return {
    type,
    levelId: Number(values.levelId),
    categoryId: str("categoryId"),
    term: str("term") ?? "",
    reading: str("reading"),
    romaji: str("romaji"),
    meaning: str("meaning") ?? "",
    onyomi: str("onyomi"),
    kunyomi: str("kunyomi"),
    explanation: str("explanation"),
    note: str("note"),
    exampleSentence: str("exampleSentence"),
    exampleTranslation: str("exampleTranslation"),
    imageUrl: (values.imageUrl as string | null) || null,
    status: (values.status as KamusStatus) ?? "published",
    sortOrder: Number(values.sortOrder) || 0,
  };
}

const CATEGORY_FIELDS: FieldDef[] = [
  { name: "title", label: "Nama kategori", type: "text", required: true },
  { name: "key", label: "Kunci (untuk URL)", type: "text", required: true, hint: "Huruf kecil tanpa spasi, mis. alat_dapur." },
  { name: "titleJa", label: "Nama Jepang (opsional)", type: "text", jp: true },
  { name: "titleKana", label: "Cara baca nama Jepang (opsional)", type: "text", jp: true },
  { name: "coverUrl", label: "Gambar sampul (opsional)", type: "image", hint: "Kosongkan untuk memakai gambar entri pertama." },
  { name: "tint", label: "Warna latar kartu (opsional)", type: "text", hint: "Kode hex, mis. #fff3dc." },
  { name: "sortOrder", label: "Urutan", type: "number", min: 0, max: 1000 },
];

/** Pengelolaan seluruh isi kamus siswa: entri lima jenis kamus dan kategorinya. */
export function KamusManager() {
  const flash = useFlash();
  const [type, setType] = useState<KamusType>("kosakata");
  const [levels, setLevels] = useState<ContentLevel[]>([]);
  const [categories, setCategories] = useState<KamusAdminCategory[]>([]);
  const [summary, setSummary] = useState<Record<KamusType, Record<KamusStatus, number>> | null>(null);
  const [filter, setFilter] = useState<{ levelId?: number; categoryId?: string; status?: KamusStatus; page: number }>({ page: 1 });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [list, setList] = useState<{ entries: KamusAdminEntry[]; total: number; pageSize: number } | null>(null);
  const [editing, setEditing] = useState<KamusAdminEntry | "new" | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KamusAdminCategory | "new" | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    contentApi.levels().then((r) => setLevels(r.levels)).catch(flash.fail);
  }, [flash.fail]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadSummary = useCallback(() => kamusAdminApi.summary().then((r) => setSummary(r.summary)).catch(flash.fail), [flash.fail]);
  const loadCategories = useCallback(
    () => (hasCategories(type) ? kamusAdminApi.categories(type).then((r) => setCategories(r.categories)) : Promise.resolve(setCategories([]))).catch(flash.fail),
    [type, flash.fail],
  );
  const loadEntries = useCallback(
    () =>
      kamusAdminApi
        .entries({ type, ...filter, q: debounced || undefined })
        .then((r) => setList(r))
        .catch(flash.fail),
    [type, filter, debounced, flash.fail],
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);
  useEffect(() => {
    setList(null);
    void loadEntries();
  }, [loadEntries]);

  function switchType(t: KamusType) {
    setType(t);
    setFilter({ page: 1 });
    setSearch("");
  }

  async function refresh() {
    await Promise.all([loadEntries(), loadSummary(), loadCategories()]);
  }

  async function toggleStatus(e: KamusAdminEntry) {
    try {
      await kamusAdminApi.updateEntry(e.id, { status: e.status === "published" ? "draft" : "published" });
      await refresh();
      flash.ok(e.status === "published" ? "Entri disembunyikan." : "Entri diterbitkan.");
    } catch (err) {
      flash.fail(err);
    }
  }

  async function remove(e: KamusAdminEntry) {
    if (!confirm(`Hapus "${e.term}" dari kamus?`)) return;
    try {
      await kamusAdminApi.deleteEntry(e.id);
      await refresh();
      flash.ok("Entri dihapus.");
    } catch (err) {
      flash.fail(err);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const { added } = await kamusAdminApi.sync();
      await refresh();
      const n = added.kosakata + added.kanji + added.tata_bahasa;
      flash.ok(n ? `Ditambahkan dari materi bab: ${added.kosakata} kosakata, ${added.kanji} kanji, ${added.tata_bahasa} pola.` : "Kamus sudah memuat semua materi bab.");
    } catch (err) {
      flash.fail(err);
    } finally {
      setSyncing(false);
    }
  }

  async function removeCategory(c: KamusAdminCategory) {
    if (!confirm(`Hapus kategori "${c.title}"?`)) return;
    try {
      await kamusAdminApi.deleteCategory(c.id);
      await loadCategories();
      flash.ok("Kategori dihapus.");
    } catch (err) {
      flash.fail(err);
    }
  }

  const meta = TYPES.find((t) => t.key === type)!;
  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;
  const defaultLevel = levels[0]?.id;

  return (
    <>
      {flash.node}

      <section className={adminStyles.panel}>
        <div className={`${adminStyles.tabs} ${styles.wrapTabs}`} role="tablist" aria-label="Jenis kamus">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={type === t.key}
              className={`${adminStyles.tabBtn} ${type === t.key ? adminStyles.tabBtnActive : ""}`}
              onClick={() => switchType(t.key)}
            >
              {t.icon} {t.label}{" "}
              {summary && <span className={styles.muted}>({summary[t.key].published + summary[t.key].draft})</span>}
            </button>
          ))}
        </div>

        <div className={`${styles.toolbar} ${styles.toolbarWrap}`}>
          <h2 className={adminStyles.panelTitle}>
            {meta.label} <span className={styles.muted}>({list?.total ?? "…"})</span>
            {summary && summary[type].draft > 0 && <span className={styles.muted}> · {summary[type].draft} draft</span>}
          </h2>
          <div className={adminStyles.actionGroup}>
            {fromChapters(type) && (
              <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} onClick={sync} disabled={syncing} title="Tambahkan materi bab yang belum ada di kamus">
                {syncing ? "Mengambil…" : "↻ Ambil dari materi bab"}
              </button>
            )}
            {hasCategories(type) && (
              <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} onClick={() => setShowCategories(true)}>
                Kategori ({categories.length})
              </button>
            )}
            <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={() => setEditing("new")} disabled={!defaultLevel}>
              + Entri baru
            </button>
          </div>
        </div>

        <div className={adminStyles.filterBar}>
          <input className={adminStyles.searchInput} placeholder="Cari kata, cara baca, romaji, atau arti…" value={search} onChange={(e) => { setSearch(e.target.value); setFilter((f) => ({ ...f, page: 1 })); }} aria-label="Cari entri" />
          <select
            className={adminStyles.selectInput}
            value={filter.levelId ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, levelId: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
            aria-label="Filter level"
          >
            <option value="">Semua level</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {hasCategories(type) && (
            <select
              className={adminStyles.selectInput}
              value={filter.categoryId ?? ""}
              onChange={(e) => setFilter((f) => ({ ...f, categoryId: e.target.value || undefined, page: 1 }))}
              aria-label="Filter kategori"
            >
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          <select
            className={adminStyles.selectInput}
            value={filter.status ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as KamusStatus | undefined, page: 1 }))}
            aria-label="Filter status"
          >
            <option value="">Semua status</option>
            <option value="published">Terbit</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {!list ? (
          <SkeletonRegion label="Memuat entri…" className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <tbody>
                <SkeletonTableRows rows={8} columns={3} />
              </tbody>
            </table>
          </SkeletonRegion>
        ) : list.entries.length === 0 ? (
          <p className={adminStyles.emptyState}>{debounced ? `Tidak ada entri untuk "${debounced}".` : "Belum ada entri. Tambahkan entri baru untuk melengkapi kamus."}</p>
        ) : (
          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Entri</th>
                  <th className={styles.hideMobile}>Level</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.entries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className={styles.itemWithThumb}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {e.imageUrl && <img src={e.imageUrl} alt="" className={styles.thumb} loading="lazy" />}
                        <div style={{ minWidth: 0 }}>
                          <div className={styles.itemMain} lang="ja">
                            {e.term}{" "}
                            <span className={styles.muted}>
                              {[e.reading !== e.term ? e.reading : null, e.romaji, e.onyomi, e.kunyomi].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                          <div>{e.meaning}</div>
                          {(e.category || e.note) && (
                            <div className={styles.muted}>{[e.category?.title, e.note].filter(Boolean).join(" · ")}</div>
                          )}
                          {e.status === "draft" && <span className={`${adminStyles.badge} ${styles.status_draft}`}>Draft</span>}
                        </div>
                      </div>
                    </td>
                    <td className={styles.hideMobile}>
                      <span className={adminStyles.badge}>{e.level.code}</span>
                    </td>
                    <td style={{ width: 1 }}>
                      <div className={adminStyles.actionGroup} style={{ flexWrap: "nowrap" }}>
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => setEditing(e)}>
                          Edit
                        </button>
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => toggleStatus(e)}>
                          {e.status === "published" ? "Sembunyikan" : "Terbitkan"}
                        </button>
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnDanger}`} onClick={() => remove(e)}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className={styles.pager}>
            <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} disabled={filter.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))}>
              ← Sebelumnya
            </button>
            <span>
              Halaman {filter.page} dari {pages}
            </span>
            <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} disabled={filter.page >= pages} onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))}>
              Berikutnya →
            </button>
          </div>
        )}
      </section>

      {editing && defaultLevel && (
        <FormModal
          title={`${editing === "new" ? "Tambah" : "Ubah"} entri ${meta.label.toLowerCase()}`}
          fields={entryFields(type, levels, categories)}
          initial={
            editing === "new"
              ? { ...EMPTY_ENTRY, levelId: String(filter.levelId ?? defaultLevel), categoryId: filter.categoryId ?? (type === "gambar" ? categories[0]?.id ?? "" : "") }
              : {
                  ...EMPTY_ENTRY,
                  ...Object.fromEntries(Object.entries(editing).map(([k, v]) => [k, v ?? (k === "imageUrl" ? null : "")])),
                  levelId: String(editing.levelId),
                }
          }
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            const data = toEntryInput(type, values);
            if (editing === "new") await kamusAdminApi.createEntry(data);
            else await kamusAdminApi.updateEntry(editing.id, data);
            setEditing(null);
            await refresh();
            flash.ok("Entri kamus tersimpan.");
          }}
        />
      )}

      {showCategories && hasCategories(type) && !editingCategory && (
        <div className={adminStyles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && setShowCategories(false)}>
          <div className={`${adminStyles.modalContent} ${styles.modalWide}`} role="dialog" aria-modal="true" aria-label="Kategori kamus">
            <div className={styles.toolbar}>
              <h2 className={adminStyles.modalTitle}>Kategori {meta.label}</h2>
              <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={() => setEditingCategory("new")}>
                + Kategori
              </button>
            </div>
            {categories.length === 0 ? (
              <p className={adminStyles.emptyState}>Belum ada kategori.</p>
            ) : (
              <div className={adminStyles.tableWrap}>
                <table className={adminStyles.table}>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className={styles.itemWithThumb}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {c.coverUrl && <img src={c.coverUrl} alt="" className={styles.thumb} />}
                            <div>
                              <div className={styles.itemMain}>
                                {c.title} {c.titleJa && <span className={styles.muted} lang="ja">{c.titleJa}</span>}
                              </div>
                              <div className={styles.muted}>
                                {c._count.entries} entri · kunci: {c.key}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ width: 1 }}>
                          <div className={adminStyles.actionGroup} style={{ flexWrap: "nowrap" }}>
                            <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => setEditingCategory(c)}>
                              Edit
                            </button>
                            <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnDanger}`} onClick={() => removeCategory(c)} disabled={c._count.entries > 0} title={c._count.entries > 0 ? "Kosongkan kategori dulu" : undefined}>
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className={adminStyles.modalButtons}>
              <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} onClick={() => setShowCategories(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCategory && hasCategories(type) && (
        <FormModal
          title={`${editingCategory === "new" ? "Tambah" : "Ubah"} kategori`}
          fields={type === "gambar" ? CATEGORY_FIELDS : CATEGORY_FIELDS.filter((f) => ["title", "key", "sortOrder"].includes(f.name))}
          initial={
            editingCategory === "new"
              ? { title: "", key: "", titleJa: "", titleKana: "", coverUrl: null, tint: "", sortOrder: categories.length + 1 }
              : { ...editingCategory, titleJa: editingCategory.titleJa ?? "", titleKana: editingCategory.titleKana ?? "", tint: editingCategory.tint ?? "" }
          }
          onClose={() => setEditingCategory(null)}
          onSubmit={async (values) => {
            const data = {
              type,
              key: String(values.key ?? "").trim(),
              title: String(values.title ?? "").trim(),
              titleJa: (values.titleJa as string) || null,
              titleKana: (values.titleKana as string) || null,
              coverUrl: (values.coverUrl as string | null) || null,
              tint: (values.tint as string) || null,
              sortOrder: Number(values.sortOrder) || 0,
            };
            if (editingCategory === "new") await kamusAdminApi.createCategory(data);
            else await kamusAdminApi.updateCategory(editingCategory.id, data);
            setEditingCategory(null);
            await loadCategories();
            flash.ok("Kategori tersimpan.");
          }}
        />
      )}

    </>
  );
}
