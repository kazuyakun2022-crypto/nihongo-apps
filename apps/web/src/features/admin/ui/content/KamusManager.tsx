"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Skeleton, SkeletonRegion, SkeletonTableRows } from "@/shared/ui/Skeleton";
import { Pagination, usePaged } from "../Pagination";
import { FormModal, type FieldDef, type FormValues } from "./FormModal";
import { useFlash } from "./ContentShell";
import styles from "./content.module.css";
import { BookOpenIcon, ImageIcon, MessageIcon, PuzzleIcon } from "@/shared/ui/icons";
import type { ReactNode } from "react";
import { askConfirm } from "@/shared/ui/confirmDialog";

const TYPES: { key: KamusType; label: string; icon: ReactNode }[] = [
  { key: "gambar", label: "Bergambar", icon: <ImageIcon size={14} /> },
  { key: "kosakata", label: "Kosakata", icon: <BookOpenIcon size={14} /> },
  { key: "kanji", label: "Kanji", icon: "漢" },
  { key: "tata_bahasa", label: "Tata Bahasa", icon: <PuzzleIcon size={14} /> },
  { key: "ungkapan", label: "Ungkapan & Sebutan", icon: <MessageIcon size={14} /> },
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

/** Isi yang sedang dibuka: satu kategori, entri tanpa kategori, atau semua entri. */
type Scope = KamusAdminCategory | "none" | "all";

/**
 * Pengelolaan seluruh isi kamus siswa. Jenis berkategori (bergambar, ungkapan) dibuka per kategori dulu:
 * kategorinya bisa diubah langsung dari kartu, lalu isinya dikelola di dalam kategori itu.
 */
export function KamusManager() {
  const flash = useFlash();
  const [type, setType] = useState<KamusType>("gambar");
  const [levels, setLevels] = useState<ContentLevel[]>([]);
  const [categories, setCategories] = useState<KamusAdminCategory[] | null>(null);
  const [uncategorized, setUncategorized] = useState(0);
  const [summary, setSummary] = useState<Record<KamusType, Record<KamusStatus, number>> | null>(null);
  // null = sedang di daftar kategori (khusus jenis berkategori)
  const [scope, setScope] = useState<Scope | null>(null);
  const [editingCategory, setEditingCategory] = useState<KamusAdminCategory | "new" | null>(null);

  useEffect(() => {
    contentApi.levels().then((r) => setLevels(r.levels)).catch(flash.fail);
  }, [flash.fail]);

  const loadSummary = useCallback(() => kamusAdminApi.summary().then((r) => setSummary(r.summary)).catch(flash.fail), [flash.fail]);
  const loadCategories = useCallback(async () => {
    if (!hasCategories(type)) {
      setCategories([]);
      setUncategorized(0);
      return;
    }
    try {
      const r = await kamusAdminApi.categories(type);
      setCategories(r.categories);
      setUncategorized(r.uncategorized);
      // Kategori yang sedang dibuka ikut diperbarui (mis. setelah judulnya diubah)
      setScope((s) => (s && typeof s === "object" ? r.categories.find((c) => c.id === s.id) ?? null : s));
    } catch (err) {
      flash.fail(err);
    }
  }, [type, flash.fail]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);
  useEffect(() => {
    setCategories(null);
    void loadCategories();
  }, [loadCategories]);

  function switchType(t: KamusType) {
    setType(t);
    setScope(hasCategories(t) ? null : "all");
  }

  async function removeCategory(c: KamusAdminCategory) {
    if (!(await askConfirm({ title: `Hapus kategori "${c.title}"?`, description: "Kategori ini akan dihapus dari kamus." }))) return;
    try {
      await kamusAdminApi.deleteCategory(c.id);
      if (scope && typeof scope === "object" && scope.id === c.id) setScope(null);
      await loadCategories();
      flash.ok("Kategori dihapus.");
    } catch (err) {
      flash.fail(err);
    }
  }

  const meta = TYPES.find((t) => t.key === type)!;
  const categorized = hasCategories(type);

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

        {categorized && scope === null ? (
          <CategoryBrowser
            label={meta.label}
            type={type}
            categories={categories}
            uncategorized={uncategorized}
            onOpen={setScope}
            onEdit={setEditingCategory}
            onRemove={removeCategory}
          />
        ) : (
          <EntryList
            key={`${type}:${scope && typeof scope === "object" ? scope.id : scope}`}
            type={type}
            label={meta.label}
            scope={scope ?? "all"}
            levels={levels}
            categories={categories ?? []}
            summary={summary}
            onBack={categorized ? () => setScope(null) : undefined}
            onEditCategory={setEditingCategory}
            onChanged={async () => {
              await Promise.all([loadSummary(), loadCategories()]);
            }}
          />
        )}
      </section>

      {editingCategory && categorized && (
        <FormModal
          title={`${editingCategory === "new" ? "Tambah" : "Ubah"} kategori ${meta.label.toLowerCase()}`}
          fields={type === "gambar" ? CATEGORY_FIELDS : CATEGORY_FIELDS.filter((f) => ["title", "key", "sortOrder"].includes(f.name))}
          initial={
            editingCategory === "new"
              ? { title: "", key: "", titleJa: "", titleKana: "", coverUrl: null, tint: "", sortOrder: (categories?.length ?? 0) + 1 }
              : {
                  title: editingCategory.title,
                  key: editingCategory.key,
                  titleJa: editingCategory.titleJa ?? "",
                  titleKana: editingCategory.titleKana ?? "",
                  coverUrl: editingCategory.coverUrl,
                  tint: editingCategory.tint ?? "",
                  sortOrder: editingCategory.sortOrder,
                }
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

function CategoryBrowser({
  label,
  type,
  categories,
  uncategorized,
  onOpen,
  onEdit,
  onRemove,
}: {
  label: string;
  type: KamusType;
  categories: KamusAdminCategory[] | null;
  uncategorized: number;
  onOpen: (scope: Scope) => void;
  onEdit: (c: KamusAdminCategory | "new") => void;
  onRemove: (c: KamusAdminCategory) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (categories ?? []).filter((c) => !q || [c.title, c.key, c.titleJa, c.titleKana].some((v) => v?.toLowerCase().includes(q)));
  }, [categories, query]);
  const { pageItems, pagerProps } = usePaged(filtered, query, 12);
  const totalEntries = (categories ?? []).reduce((n, c) => n + c._count.entries, 0) + uncategorized;
  const showUncategorized = uncategorized > 0 && !query;

  return (
    <>
      <div className={`${styles.toolbar} ${styles.toolbarWrap}`}>
        <h2 className={adminStyles.panelTitle}>
          Kategori {label}{" "}
          <span className={styles.muted}>
            ({categories?.length ?? "…"} kategori · {totalEntries} entri)
          </span>
        </h2>
        <div className={adminStyles.actionGroup}>
          <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} onClick={() => onOpen("all")}>
            Lihat semua entri
          </button>
          <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={() => onEdit("new")}>
            + Kategori baru
          </button>
        </div>
      </div>

      <div className={adminStyles.filterBar}>
        <input className={adminStyles.searchInput} placeholder="Cari nama kategori…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari kategori" />
      </div>

      {categories === null ? (
        <SkeletonRegion label="Memuat kategori…" className={styles.catGrid}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height="15rem" radius="14px" />
          ))}
        </SkeletonRegion>
      ) : filtered.length === 0 && !showUncategorized ? (
        <p className={adminStyles.emptyState}>
          {query ? `Tidak ada kategori "${query}".` : "Belum ada kategori. Buat kategori pertama untuk mulai mengelompokkan entri."}
        </p>
      ) : (
        <>
          <div className={styles.catGrid}>
            {pageItems.map((c) => {
              const cover = c.coverUrl ?? c.sampleImage;
              return (
                <article key={c.id} className={styles.catCard}>
                  <button
                    type="button"
                    className={styles.catCover}
                    style={{ background: c.tint ?? undefined }}
                    onClick={() => onOpen(c)}
                    aria-label={`Buka isi kategori ${c.title}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {cover ? <img src={cover} alt="" loading="lazy" /> : <span className={styles.catCoverEmpty}>{type === "ungkapan" ? <MessageIcon size={28} strokeWidth={1.5} /> : <ImageIcon size={28} strokeWidth={1.5} />}</span>}
                  </button>
                  <div className={styles.catBody}>
                    <h3 className={styles.catTitle}>
                      {c.title}
                      {c.titleJa && (
                        <span className={styles.muted} lang="ja">
                          {" "}
                          {c.titleJa}
                        </span>
                      )}
                    </h3>
                    <p className={styles.catMeta}>
                      {c._count.entries} entri
                      {c.draftCount > 0 && ` · ${c.draftCount} draft`} · urutan {c.sortOrder}
                    </p>
                    <div className={styles.catActions}>
                      <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnPrimary}`} onClick={() => onOpen(c)}>
                        Kelola isi
                      </button>
                      <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => onEdit(c)}>
                        Edit kategori
                      </button>
                      <button
                        type="button"
                        className={`${adminStyles.btnSm} ${adminStyles.btnDanger}`}
                        onClick={() => onRemove(c)}
                        disabled={c._count.entries > 0}
                        title={c._count.entries > 0 ? "Kosongkan kategori dulu" : undefined}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {showUncategorized && (
              <article className={`${styles.catCard} ${styles.catCardMuted}`}>
                <button type="button" className={styles.catCover} onClick={() => onOpen("none")} aria-label="Buka entri tanpa kategori">
                  <span className={styles.catCoverEmpty}>？</span>
                </button>
                <div className={styles.catBody}>
                  <h3 className={styles.catTitle}>Tanpa kategori</h3>
                  <p className={styles.catMeta}>{uncategorized} entri belum dikelompokkan</p>
                  <div className={styles.catActions}>
                    <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnPrimary}`} onClick={() => onOpen("none")}>
                      Kelola isi
                    </button>
                  </div>
                </div>
              </article>
            )}
          </div>
          <Pagination {...pagerProps} unit="kategori" pageSizes={[12, 24, 48]} />
        </>
      )}
    </>
  );
}

function EntryList({
  type,
  label,
  scope,
  levels,
  categories,
  summary,
  onBack,
  onEditCategory,
  onChanged,
}: {
  type: KamusType;
  label: string;
  scope: Scope;
  levels: ContentLevel[];
  categories: KamusAdminCategory[];
  summary: Record<KamusType, Record<KamusStatus, number>> | null;
  onBack?: () => void;
  onEditCategory: (c: KamusAdminCategory) => void;
  onChanged: () => Promise<void>;
}) {
  const flash = useFlash();
  const fixedCategory = scope === "all" ? undefined : scope === "none" ? "none" : scope.id;
  const [filter, setFilter] = useState<{ levelId?: number; categoryId?: string; status?: KamusStatus; page: number; pageSize: number }>({
    page: 1,
    pageSize: 30,
  });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [list, setList] = useState<{ entries: KamusAdminEntry[]; total: number } | null>(null);
  const [editing, setEditing] = useState<KamusAdminEntry | "new" | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const requestRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const loadEntries = useCallback(() => {
    // Hanya respons terakhir yang dipakai (ketik cepat / ganti halaman tidak saling menimpa)
    const req = ++requestRef.current;
    setRefreshing(true);
    return kamusAdminApi
      .entries({ type, ...filter, categoryId: fixedCategory ?? filter.categoryId, q: debounced || undefined })
      .then((r) => req === requestRef.current && setList(r))
      .catch((err) => req === requestRef.current && flash.fail(err))
      .finally(() => req === requestRef.current && setRefreshing(false));
  }, [type, filter, fixedCategory, debounced, flash.fail]);

  // Ganti jenis kamus: tabel lama tidak relevan, tampilkan kerangka. Ganti halaman/filter: baris lama tetap
  // tampil redup sampai data baru datang, supaya tabel & paginasi tidak melompat.
  const listTypeRef = useRef(type);
  useEffect(() => {
    if (listTypeRef.current !== type) {
      listTypeRef.current = type;
      setList(null);
    }
    void loadEntries();
  }, [loadEntries, type]);

  async function refresh() {
    await Promise.all([loadEntries(), onChanged()]);
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
    if (!(await askConfirm({ title: `Hapus "${e.term}"?`, description: "Entri ini akan dihapus dari kamus." }))) return;
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

  const defaultLevel = levels[0]?.id;
  const scopeTitle = scope === "all" ? `Semua entri ${label.toLowerCase()}` : scope === "none" ? "Tanpa kategori" : scope.title;
  const newEntryCategory =
    typeof scope === "object" ? scope.id : scope === "none" ? "" : filter.categoryId && filter.categoryId !== "none" ? filter.categoryId : type === "gambar" ? categories[0]?.id ?? "" : "";
  const headerCover = typeof scope === "object" ? scope.coverUrl ?? scope.sampleImage : null;

  return (
    <>
      {flash.node}
      {onBack && (
        <nav className={styles.breadcrumb} aria-label="Lokasi">
          <button type="button" className={styles.breadcrumbBack} onClick={onBack}>
            ← Semua kategori
          </button>
          <span aria-hidden>›</span>
          <span>{scopeTitle}</span>
        </nav>
      )}

      {typeof scope === "object" && (
        <div className={styles.catHeader} style={{ background: scope.tint ?? undefined }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {headerCover && <img src={headerCover} alt="" className={styles.catHeaderImg} />}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className={adminStyles.panelTitle} style={{ margin: 0 }}>
              {scope.title}{" "}
              {scope.titleJa && (
                <span className={styles.muted} lang="ja">
                  {scope.titleJa}
                  {scope.titleKana ? ` (${scope.titleKana})` : ""}
                </span>
              )}
            </h2>
            <p className={styles.muted} style={{ margin: "4px 0 0" }}>
              {scope._count.entries} entri{scope.draftCount ? ` · ${scope.draftCount} draft` : ""} · kunci: {scope.key} · urutan {scope.sortOrder}
            </p>
          </div>
          <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} onClick={() => onEditCategory(scope)}>
            Edit kategori
          </button>
        </div>
      )}

      <div className={`${styles.toolbar} ${styles.toolbarWrap}`}>
        <h2 className={adminStyles.panelTitle}>
          {typeof scope === "object" ? "Isi kategori" : scopeTitle} <span className={styles.muted}>({list?.total ?? "…"})</span>
          {scope === "all" && summary && summary[type].draft > 0 && <span className={styles.muted}> · {summary[type].draft} draft</span>}
        </h2>
        <div className={adminStyles.actionGroup}>
          {fromChapters(type) && (
            <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} onClick={sync} disabled={syncing} title="Tambahkan materi bab yang belum ada di kamus">
              {syncing ? "Mengambil…" : "↻ Ambil dari materi bab"}
            </button>
          )}
          <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={() => setEditing("new")} disabled={!defaultLevel}>
            + Entri baru
          </button>
        </div>
      </div>

      <div className={adminStyles.filterBar}>
        <input
          className={adminStyles.searchInput}
          placeholder="Cari kata, cara baca, romaji, atau arti…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setFilter((f) => (f.page === 1 ? f : { ...f, page: 1 }));
          }}
          aria-label="Cari entri"
        />
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
        {hasCategories(type) && scope === "all" && (
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
            <option value="none">Tanpa kategori</option>
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
        <p className={adminStyles.emptyState}>
          {debounced ? `Tidak ada entri untuk "${debounced}".` : "Belum ada entri di sini. Tambahkan entri baru untuk melengkapi kamus."}
        </p>
      ) : (
        <div className={adminStyles.tableWrap} aria-busy={refreshing} style={{ opacity: refreshing ? 0.55 : 1, transition: "opacity var(--motion-fast) ease" }}>
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
                          <span className={styles.muted}>{[e.reading !== e.term ? e.reading : null, e.romaji, e.onyomi, e.kunyomi].filter(Boolean).join(" · ")}</span>
                        </div>
                        <div>{e.meaning}</div>
                        {((scope === "all" && e.category) || e.note) && (
                          <div className={styles.muted}>{[scope === "all" ? e.category?.title : null, e.note].filter(Boolean).join(" · ")}</div>
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

      {list && (
        <Pagination
          page={filter.page}
          pageSize={filter.pageSize}
          total={list.total}
          unit="entri"
          pageSizes={[10, 30, 50, 100]}
          onPage={(page) => setFilter((f) => ({ ...f, page }))}
          onPageSize={(pageSize) => setFilter((f) => ({ ...f, pageSize, page: 1 }))}
        />
      )}

      {editing && defaultLevel && (
        <FormModal
          title={`${editing === "new" ? "Tambah" : "Ubah"} entri ${label.toLowerCase()}`}
          fields={entryFields(type, levels, categories)}
          initial={
            editing === "new"
              ? { ...EMPTY_ENTRY, levelId: String(filter.levelId ?? defaultLevel), categoryId: newEntryCategory }
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
    </>
  );
}
