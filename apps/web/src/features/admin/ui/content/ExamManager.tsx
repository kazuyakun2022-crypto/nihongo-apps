"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { contentApi, type ContentLevel, type ExamConfig, type ExamQuestionItem, type ExamSection, type ExamType } from "@/features/admin/data/contentApi";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { Skeleton, SkeletonRegion, SkeletonTableRows } from "@/shared/ui/Skeleton";
import { Field, type FieldDef, type FormValues } from "./FormModal";
import { ExerciseSummary } from "./ChapterEditor";
import { ExerciseForm } from "./ExerciseForm";
import { LevelPicker, useLevelParam } from "./ChapterManager";
import { STATUS_LABEL, useFlash } from "./ContentShell";
import { Pagination } from "../Pagination";
import styles from "./content.module.css";
import { askConfirm } from "@/shared/ui/confirmDialog";
import { useUnsavedWarning } from "@/shared/ui/useUnsavedWarning";

const SECTIONS: { value: ExamSection; label: string }[] = [
  { value: "kosakata", label: "Kosakata" },
  { value: "tata_bahasa", label: "Tata Bahasa" },
  { value: "membaca", label: "Membaca" },
  { value: "mendengar", label: "Mendengar" },
];
/** Simulasi JLPT memakai lima bagian dengan istilah kertas ujian resmi. */
const SIM_SECTIONS: { value: ExamSection; label: string }[] = [
  { value: "membaca", label: "Moji-Goi: Kanji Yomi" },
  { value: "kosakata", label: "Moji-Goi: Kosakata" },
  { value: "tata_bahasa", label: "Bunpou" },
  { value: "dokkai", label: "Dokkai (bacaan)" },
  { value: "mendengar", label: "Choukai" },
];

/** Tipe soal resmi JLPT (Daimon) per bagian; sama dengan JLPT_CATEGORIES di server. */
const JLPT_CATEGORIES: { value: string; label: string; section: ExamSection }[] = [
  { value: "kanji_yomi", label: "漢字読み Kanji Yomi", section: "membaca" },
  { value: "hyouki", label: "表記 Hyouki (penulisan)", section: "kosakata" },
  { value: "gokeisei", label: "語形成 Gokeisei (imbuhan, N2)", section: "kosakata" },
  { value: "bunmyaku", label: "文脈規定 Bunmyaku Kitei (konteks)", section: "kosakata" },
  { value: "iikae", label: "言い換え類義 Iikae Ruigi (padanan)", section: "kosakata" },
  { value: "youhou", label: "用法 Youhou (penggunaan)", section: "kosakata" },
  { value: "bunpou_keishiki", label: "文の文法1 (pola tata bahasa)", section: "tata_bahasa" },
  { value: "narabikae", label: "文の文法2 ★ (menyusun kalimat)", section: "tata_bahasa" },
  { value: "bunshou_bunpou", label: "文章の文法 (tata bahasa wacana)", section: "tata_bahasa" },
  { value: "dokkai_tanbun", label: "内容理解 短文 (wacana pendek)", section: "dokkai" },
  { value: "dokkai_chuubun", label: "内容理解 中文 (wacana menengah)", section: "dokkai" },
  { value: "dokkai_choubun", label: "内容理解 長文 (wacana panjang)", section: "dokkai" },
  { value: "dokkai_tougou", label: "統合理解 (bandingkan dua teks)", section: "dokkai" },
  { value: "dokkai_jouhou", label: "情報検索 (cari informasi)", section: "dokkai" },
  { value: "choukai_kadai", label: "課題理解 (tugas berikutnya)", section: "mendengar" },
  { value: "choukai_point", label: "ポイント理解 (poin tertentu)", section: "mendengar" },
  { value: "choukai_gaiyou", label: "概要理解 (ide utama)", section: "mendengar" },
  { value: "choukai_sokuji", label: "即時応答 (respons cepat)", section: "mendengar" },
  { value: "choukai_tougou", label: "統合理解 (percakapan panjang)", section: "mendengar" },
];

/** Aturan awal di formulir sebelum admin menyimpan; aturan penempatan sama dengan bawaan server. */
const DEFAULT_CONFIG: Record<ExamType, ExamConfig> = {
  level_up: { questionCount: 30, timeLimitMin: 25, passScore: 75, sectionMinScore: 60, cooldownHours: 24, minChapterCompletion: 80 },
  placement: { questionCount: 20, timeLimitMin: 20, passScore: 70, sectionMinScore: 0, cooldownHours: 0, minChapterCompletion: 0 },
  // Sama dengan WORKBOOK_DEFAULTS di server; batas waktu & nilai per bagian tidak dipakai
  workbook: { questionCount: 20, timeLimitMin: 60, passScore: 75, sectionMinScore: 0, cooldownHours: 12, minChapterCompletion: 80 },
  // Cadangan saja; server mengirim aturan bawaan per level (rasio JLPT asli) lewat defaultConfig
  jlpt_sim: { questionCount: 62, timeLimitMin: 90, passScore: 80, sectionMinScore: 0, cooldownHours: 0, minChapterCompletion: 0 },
};

const EXAM_TYPES: { value: ExamType; param: string; label: string }[] = [
  { value: "level_up", param: "naik-tahap", label: "Tes naik tahap" },
  { value: "placement", param: "penempatan", label: "Tes penempatan (saat daftar)" },
  { value: "workbook", param: "gerbang-tulis", label: "Gerbang Tulis (tulisan tangan)" },
  { value: "jlpt_sim", param: "simulasi-jlpt", label: "Simulasi JLPT" },
];

/** Batas lulus JLPT asli (skala 0-180), untuk keterangan di formulir simulasi. */
const JLPT_PASS: Record<string, number> = { N5: 80, N4: 90, N3: 95, N2: 90, N1: 100 };
/** Kelompok skor dan ambang resmi JLPT (tidak bisa diubah admin). */
const JLPT_GROUPS: Record<string, string> = {
  N5: "Pengetahuan Bahasa & Membaca minimal 38/120, Choukai minimal 19/60",
  N4: "Pengetahuan Bahasa & Membaca minimal 38/120, Choukai minimal 19/60",
  N3: "Moji-Goi, Bunpou & Dokkai, dan Choukai masing-masing minimal 19/60",
  N2: "Pengetahuan Bahasa, Dokkai, dan Choukai masing-masing minimal 19/60",
  N1: "Pengetahuan Bahasa, Dokkai, dan Choukai masing-masing minimal 19/60",
};

/** Isian Gerbang Tulis: jumlah huruf acak, nilai lulus, jeda, dan syarat bab. */
const WORKBOOK_FIELDS: typeof CONFIG_FIELDS = [
  { key: "questionCount", label: "Jumlah huruf per percobaan", hint: "Diambil acak dari kanji level ini (kana untuk Pemula). Maks. 60; 5 huruf per lembar foto.", min: 4, max: 60 },
  { key: "passScore", label: "Nilai lulus (0–100)", hint: "Rata-rata nilai semua huruf.", min: 1, max: 100 },
  { key: "cooldownHours", label: "Jeda ulang setelah gagal (jam)", hint: "0 = boleh langsung mengulang.", min: 0, max: 720 },
  { key: "minChapterCompletion", label: "Syarat bab selesai (%)", hint: "Persentase bab level ini yang harus selesai.", min: 0, max: 100 },
];

const CONFIG_FIELDS: { key: Exclude<keyof ExamConfig, "sectionRules">; label: string; hint: string; min: number; max: number }[] = [
  { key: "questionCount", label: "Jumlah soal", hint: "Dibagi rata ke 4 bagian.", min: 4, max: 200 },
  { key: "timeLimitMin", label: "Batas waktu (menit)", hint: "", min: 1, max: 300 },
  { key: "passScore", label: "Nilai lulus total (%)", hint: "", min: 1, max: 100 },
  { key: "sectionMinScore", label: "Nilai minimal per bagian (%)", hint: "Gagal jika satu bagian di bawah ini.", min: 0, max: 100 },
  { key: "cooldownHours", label: "Jeda ulang setelah gagal (jam)", hint: "0 = boleh langsung mengulang.", min: 0, max: 720 },
  { key: "minChapterCompletion", label: "Syarat bab selesai (%)", hint: "Persentase bab level ini yang harus selesai.", min: 0, max: 100 },
];

/** Isian Simulasi JLPT: jumlah soal diatur per bagian, ambang per kelompok mengikuti JLPT resmi. */
const SIM_FIELDS: typeof CONFIG_FIELDS = [
  { key: "timeLimitMin", label: "Total waktu (menit)", hint: "Dibagi ke tiap sesi sesuai proporsi resmi.", min: 10, max: 300 },
  { key: "passScore", label: "Nilai lulus total (0–180)", hint: "Skala skor JLPT.", min: 1, max: 180 },
  { key: "cooldownHours", label: "Jeda ulang setelah gagal (jam)", hint: "0 = boleh langsung mengulang.", min: 0, max: 720 },
];

/** Isian khusus ujian; isi soalnya (jenis, pertanyaan, jawaban) diatur ExerciseForm. */
function examFields(sim: boolean, section: string): FieldDef[] {
  if (!sim) return EXAM_FIELDS;
  return [
    { name: "section", label: "Bagian", type: "select", options: SIM_SECTIONS },
    {
      name: "category",
      label: "Tipe soal JLPT",
      type: "select",
      options: [{ value: "", label: "Tidak ditentukan" }, ...JLPT_CATEGORIES.filter((c) => c.section === section)],
    },
    ...EXAM_FIELDS.slice(1),
    {
      name: "passage",
      label: section === "mendengar" ? "Skrip percakapan" : "Teks bacaan",
      type: "textarea",
      jp: true,
      hint:
        section === "mendengar"
          ? "Hanya tampil di pembahasan setelah ujian. Audio diisi di kolom audio soal."
          : section === "dokkai"
            ? "Ditampilkan di atas soal selama ujian."
            : "Opsional.",
    },
  ];
}

const EXAM_FIELDS: FieldDef[] = [
  { name: "section", label: "Bagian", type: "select", options: SECTIONS },
  { name: "status", label: "Status", type: "select", options: [{ value: "published", label: "Terbit (dipakai di ujian)" }, { value: "draft", label: "Draft (tidak dipakai)" }] },
  { name: "difficulty", label: "Tingkat kesulitan (1–5)", type: "number", min: 1, max: 5 },
];

export function ExamManager() {
  const flash = useFlash();
  const unsaved = useUnsavedWarning();
  const params = useSearchParams();
  const router = useRouter();
  const jenis = params.get("jenis");
  const examType: ExamType = EXAM_TYPES.find((t) => t.param === jenis)?.value ?? "level_up";
  const [levels, setLevels] = useState<ContentLevel[]>([]);
  const [levelId, selectLevel] = useLevelParam(levels);
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<ExamConfig | null>(null);
  const [questions, setQuestions] = useState<ExamQuestionItem[]>([]);
  const [perSection, setPerSection] = useState<Partial<Record<ExamSection, number>>>({});
  const [borrowed, setBorrowed] = useState<Partial<Record<ExamSection, number>>>({});
  const [defaultConfig, setDefaultConfig] = useState<ExamConfig | null>(null);
  const [resetting, setResetting] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [filter, setFilter] = useState<{ section?: ExamSection; search: string; page: number }>({ search: "", page: 1 });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ExamQuestionItem | "new" | null>(null);
  const requestRef = useRef(0);
  /** Level & jenis tes milik konfigurasi yang sedang tampil; simpan ditolak kalau berbeda dari pilihan aktif. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const currentKey = `${levelId}:${examType}`;

  useEffect(() => {
    contentApi.levels().then((r) => setLevels(r.levels)).catch(flash.fail);
  }, [flash.fail]);

  const load = useCallback(async () => {
    if (!levelId) return;
    // Ganti level/jenis cepat: respons lama yang datang terlambat tidak boleh menimpa (dan lalu tersimpan ke) level baru
    const req = ++requestRef.current;
    try {
      const r = await contentApi.exam(levelId, examType, filter);
      if (req !== requestRef.current) return;
      setLoadedKey(`${levelId}:${examType}`);
      setConfig(r.config ?? r.defaultConfig ?? DEFAULT_CONFIG[examType]);
      setSavedConfig(r.config);
      setDefaultConfig(r.defaultConfig ?? null);
      setBorrowed(r.borrowedPerSection ?? {});
      setQuestions(r.questions.map((q) => ({ ...q, options: q.options as string[] })));
      setPerSection(r.publishedPerSection);
      setTotal(r.total);
      setPageSize(r.pageSize);
      // Soal terakhir di halaman ini dihapus: mundur ke halaman terakhir yang masih ada
      const lastPage = Math.max(1, Math.ceil(r.total / r.pageSize));
      if (filter.page > lastPage) setFilter((f) => ({ ...f, page: lastPage }));
    } catch (err) {
      if (req === requestRef.current) flash.fail(err);
    }
  }, [levelId, examType, filter, flash.fail]);
  useEffect(() => {
    void load();
  }, [load]);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setFilter((f) => (f.search === search ? f : { ...f, search, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [search]);

  const level = levels.find((l) => l.id === levelId);
  const isPlacement = examType === "placement";
  const isWorkbook = examType === "workbook";
  const isJlptSim = examType === "jlpt_sim";
  // Simulasi JLPT hanya ada di N5-N1
  const noJlptSim = isJlptSim && !!level && !level.hasJlptSim;
  const sections = isJlptSim ? SIM_SECTIONS : SECTIONS;
  const sectionLabel = (s: ExamSection) => sections.find((x) => x.value === s)?.label ?? s;
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  // Level tertinggi tidak punya ujian naik level; tes penempatan & Gerbang Tulis tetap bisa diatur untuk semua level
  const isTopLevel = examType === "level_up" && !!level && level.id === Math.max(...levels.map((l) => l.id));
  const configFields = isWorkbook
    ? WORKBOOK_FIELDS
    : isJlptSim
      ? SIM_FIELDS
      : isPlacement
        ? CONFIG_FIELDS.filter((f) => f.key !== "minChapterCompletion")
        : CONFIG_FIELDS;
  // Aturan bawaan yang belum disimpan tidak dianggap perubahan
  const configDirty = JSON.stringify(config) !== JSON.stringify(savedConfig ?? defaultConfig);
  unsaved.current = configDirty;
  const rules = config?.sectionRules ?? null;
  const neededFor = (s: ExamSection) => (rules ? rules[s]?.count ?? 0 : config ? Math.floor(config.questionCount / sections.length) : 0);
  const rulesTotal = rules ? Object.values(rules).reduce((n, r) => n + (r?.count ?? 0), 0) : 0;

  function toggleRules(on: boolean) {
    if (!config) return;
    const even = Math.floor(config.questionCount / sections.length);
    setConfig({
      ...config,
      sectionRules: on ? Object.fromEntries(sections.map((s) => [s.value, { count: even, minScore: config.sectionMinScore }])) : null,
    });
  }

  function setRule(s: ExamSection, key: "count" | "minScore", value: number) {
    if (!config?.sectionRules) return;
    const current = config.sectionRules[s] ?? { count: 0, minScore: config.sectionMinScore };
    setConfig({ ...config, sectionRules: { ...config.sectionRules, [s]: { ...current, [key]: value } } });
  }

  async function saveConfig() {
    if (!levelId || !config || saving || loadedKey !== currentKey) return;
    setSaving(true);
    try {
      // Simulasi: jumlah soal = jumlah per bagian; ambang per bagian tidak dipakai (kelompok skor resmi)
      const toSave = isJlptSim && config.sectionRules
        ? { ...config, sectionMinScore: 0, questionCount: Math.max(4, rulesTotal) }
        : config;
      await contentApi.saveExamConfig(levelId, examType, toSave);
      setConfig(toSave);
      setSavedConfig(toSave);
      flash.ok("Pengaturan ujian disimpan.");
    } catch (err) {
      flash.fail(err);
    } finally {
      setSaving(false);
    }
  }

  async function resetConfig() {
    if (!levelId || resetting) return;
    const ok = await askConfirm({
      title: "Kembalikan ke aturan bawaan?",
      description: isJlptSim
        ? "Jumlah soal, waktu, dan batas lulus kembali mengikuti rasio JLPT asli untuk level ini."
        : "Aturan tes kembali ke bawaan server.",
    });
    if (!ok) return;
    setResetting(true);
    try {
      await contentApi.resetExamConfig(levelId, examType);
      flash.ok("Aturan dikembalikan ke bawaan.");
      await load();
    } catch (err) {
      flash.fail(err);
    } finally {
      setResetting(false);
    }
  }

  async function importPackage(file: File) {
    if (!levelId || importing) return;
    setImporting(true);
    try {
      let pkg: unknown;
      try {
        pkg = JSON.parse(await file.text());
      } catch {
        throw new Error("File ini bukan JSON yang valid.");
      }
      const r = await contentApi.importJlptPackage(levelId, pkg);
      flash.ok(`Paket ${r.examSlug} diimpor: ${r.created} soal baru, ${r.updated} soal diperbarui.`);
      await load();
    } catch (err) {
      flash.fail(err);
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  }

  async function remove(q: ExamQuestionItem) {
    if (removingId || !(await askConfirm({ title: "Hapus soal ini?", description: "Soal yang pernah dijawab siswa tidak dihapus, melainkan diubah ke draft." }))) return;
    setRemovingId(q.id);
    try {
      const res = await contentApi.deleteExamQuestion(q.id);
      flash.ok(res?.archived ? "Soal ini sudah pernah dijawab siswa, jadi diubah ke draft (tidak dipakai lagi)." : "Soal dihapus.");
      await load();
    } catch (err) {
      flash.fail(err);
    } finally {
      setRemovingId(null);
    }
  }

  function selectType(type: ExamType) {
    const sp = new URLSearchParams(params.toString());
    sp.set("jenis", EXAM_TYPES.find((t) => t.value === type)!.param);
    setConfig(null);
    setSavedConfig(null);
    setDefaultConfig(null);
    setBorrowed({});
    setFilter({ search: "", page: 1 });
    setSearch("");
    router.replace(`?${sp}`, { scroll: false });
  }

  return (
    <>
      <div className={`${adminStyles.tabs} ${styles.wrapTabs}`} role="tablist" aria-label="Jenis tes">
        {EXAM_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={examType === t.value}
            className={`${adminStyles.tabBtn} ${examType === t.value ? adminStyles.tabBtnActive : ""}`}
            onClick={() => selectType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <LevelPicker
        levels={levels}
        value={levelId}
        onChange={(id) => { selectLevel(id); setConfig(null); setFilter({ search: "", page: 1 }); setSearch(""); }}
        meta={(l) =>
          isWorkbook
            ? l.hasWorkbook ? "diatur" : "bawaan"
            : isJlptSim
              ? l.hasJlptSim ? `${l.jlptSimQuestions} soal${l.jlptSimCustom ? " · diatur" : ""}` : "tidak ada"
              : `${isPlacement ? l.placementQuestions : l.examQuestions} soal`
        }
      />
      {flash.node}

      {isTopLevel || noJlptSim ? (
        <section className={adminStyles.panel}>
          <p className={adminStyles.emptyState}>
            {noJlptSim
              ? "Simulasi JLPT hanya tersedia untuk level N5 sampai N1. Pilih salah satu level JLPT di atas."
              : `${level?.name} adalah level tertinggi, jadi tidak ada ujian naik level.`}
          </p>
        </section>
      ) : (
        <>
          <section className={adminStyles.panel}>
            <div className={styles.toolbar}>
              <h2 className={adminStyles.panelTitle}>
                {isWorkbook
                  ? `Aturan Gerbang Tulis ${level?.code ?? ""}`
                  : isJlptSim
                    ? `Aturan Simulasi JLPT ${level?.code ?? ""}`
                    : isPlacement
                    ? `Aturan tes penempatan untuk mulai di ${level?.code ?? ""}`
                    : `Aturan ujian ${level?.code ?? ""} → level berikutnya`}
              </h2>
              {config && !savedConfig && (
                <span className={styles.warn}>
                  {isJlptSim
                    ? "Memakai aturan bawaan (rasio JLPT asli)."
                    : isPlacement || isWorkbook
                      ? "Belum diatur, memakai aturan bawaan di bawah."
                      : "Belum diatur, siswa belum bisa ujian."}
                </span>
              )}
            </div>
            {isWorkbook && (
              <p className={styles.muted}>
                Syarat menulis tangan sebelum tes naik tahap (atau Mastery Gate untuk Pemula). Siswa menulis huruf acak dari ingatan di kertas (difoto,
                dinilai AI) atau di layar (urutan goresan ikut dinilai). Tidak memakai bank soal.
              </p>
            )}
            {isJlptSim && (
              <p className={styles.muted}>
                Latihan ujian penuh yang bisa diulang siswa kapan saja; hasilnya tidak mengubah level. Susunannya mengikuti JLPT resmi: sesi
                berwaktu sendiri-sendiri (total waktu di bawah dibagi ke sesi sesuai proporsi resmi), skor 0–180, dan kelompok skor dengan nilai
                minimal tetap: {JLPT_GROUPS[level?.code ?? ""] ?? "19/60 per kelompok"}. Bawaan nilai lulus total {JLPT_PASS[level?.code ?? ""] ?? 90}/180.
              </p>
            )}
            {isPlacement && (
              <p className={styles.muted}>
                Dikerjakan siswa yang memilih mulai di {level?.name} saat mendaftar. Atur apakah titik mulai ini wajib tes di tab{" "}
                <Link href="/admin/konten/pendaftaran">Pendaftaran</Link>.
              </p>
            )}
            {!config && (
              <SkeletonRegion label="Memuat aturan ujian…" className={styles.formGrid}>
                {configFields.map((f) => (
                  <div key={f.key} className={styles.field}>
                    <Skeleton width="60%" height="0.875rem" />
                    <Skeleton height="2.5rem" radius="8px" />
                  </div>
                ))}
              </SkeletonRegion>
            )}
            {config && (
              <div className={styles.formGrid}>
                {configFields.map((f) => (
                  <div key={f.key} className={styles.field}>
                    <label htmlFor={`cfg-${f.key}`} className={adminStyles.fieldLabel}>{f.label}</label>
                    <input
                      id={`cfg-${f.key}`}
                      type="number"
                      className={styles.input}
                      min={f.min}
                      max={f.max}
                      value={config[f.key]}
                      onChange={(e) => setConfig({ ...config, [f.key]: Number(e.target.value) })}
                    />
                    {f.hint && (
                      <span className={styles.hint}>
                        {!isJlptSim && rules && (f.key === "questionCount" || f.key === "sectionMinScore") ? "Diganti aturan per bagian di bawah." : f.hint}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {config && !isWorkbook && (
              <div className={styles.rulesBox}>
                {isJlptSim ? (
                  <span className={styles.rulesToggle}>Jumlah soal per bagian</span>
                ) : (
                  <label className={styles.rulesToggle}>
                    <input type="checkbox" checked={!!rules} onChange={(e) => toggleRules(e.target.checked)} />
                    Atur jumlah soal & nilai minimal per bagian
                  </label>
                )}
                {rules && (
                  <>
                    <div className={adminStyles.tableWrap}>
                    <table className={adminStyles.table}>
                      <thead>
                        <tr>
                          <th>Bagian</th>
                          <th>Jumlah soal</th>
                          {!isJlptSim && <th>Nilai minimal (%)</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {sections.map((s) => (
                          <tr key={s.value}>
                            <td>{s.label}</td>
                            <td>
                              <input
                                type="number"
                                className={styles.input}
                                min={0}
                                max={100}
                                aria-label={`Jumlah soal ${s.label}`}
                                value={rules[s.value]?.count ?? 0}
                                onChange={(e) => setRule(s.value, "count", Number(e.target.value))}
                              />
                            </td>
                            {!isJlptSim && (
                            <td>
                              <input
                                type="number"
                                className={styles.input}
                                min={0}
                                max={100}
                                aria-label={`Nilai minimal ${s.label}`}
                                value={rules[s.value]?.minScore ?? 0}
                                onChange={(e) => setRule(s.value, "minScore", Number(e.target.value))}
                              />
                            </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                    <span className={styles.hint}>
                      {isJlptSim
                        ? `Total ${rulesTotal} soal per simulasi. Soal tampil per sesi: Moji-Goi, lalu Bunpou & Dokkai, lalu Choukai.`
                        : `Total ${rulesTotal} soal per ujian. Siswa gagal jika satu bagian di bawah nilai minimalnya.`}
                    </span>
                  </>
                )}
              </div>
            )}
            <div className={styles.toolbar}>
              {(isJlptSim || isPlacement) && savedConfig ? (
                <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} onClick={resetConfig} disabled={resetting}>
                  {resetting ? "Mengembalikan…" : "Kembalikan ke bawaan"}
                </button>
              ) : (
                <span />
              )}
              <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={saveConfig} disabled={!configDirty || saving || loadedKey !== currentKey}>
                {saving ? "Menyimpan…" : "Simpan aturan"}
              </button>
            </div>
          </section>

          {!isWorkbook && (
          <section className={adminStyles.panel}>
            <h2 className={adminStyles.panelTitle}>Bank soal terbit per bagian</h2>
            <div className={styles.sectionStats}>
              {sections.map((s) => {
                const count = perSection[s.value] ?? 0;
                const extra = isJlptSim ? borrowed[s.value] ?? 0 : 0;
                const needed = neededFor(s.value);
                return (
                  <div key={s.value} className={styles.sectionStat}>
                    <span className={styles.muted}>{s.label}</span>
                    <strong>{count}</strong>
                    {isJlptSim && <span className={styles.muted}>+{extra} dari tes naik tahap</span>}
                    {count + extra < needed && <span className={styles.warn}>Kurang dari {needed} soal per ujian</span>}
                  </div>
                );
              })}
            </div>
            <p className={styles.muted}>
              {rules
                ? "Setiap tes mengambil soal acak sesuai jumlah per bagian di atas; kekurangan di satu bagian diisi dari bagian lain."
                : `Setiap tes mengambil ${neededFor("kosakata")} soal acak dari tiap bagian; kekurangan di satu bagian diisi dari bagian lain.`}
              {isJlptSim
                ? " Soal khusus simulasi di daftar bawah selalu didahulukan; kekurangannya diambil dari bank tes naik tahap level ini (diatur di tab Tes naik tahap). Soal tampil berurutan per bagian, dengan Mendengar di akhir."
                : isPlacement
                  ? " Selama bank soal penempatan masih kosong, tes memakai soal pilihan ganda dari bab level sebelumnya."
                  : " Selama bank soal belum cukup untuk satu ujian, ujian memakai soal pilihan ganda dari bab level ini."}
            </p>
          </section>
          )}
        </>
      )}

      {!isWorkbook && !isTopLevel && !noJlptSim && (
      <section className={adminStyles.panel}>
        <div className={styles.toolbar}>
          <h2 className={adminStyles.panelTitle}>
            Daftar soal <span className={styles.muted}>({total})</span>
          </h2>
          <div className={adminStyles.actionGroup}>
            {isJlptSim && (
              <>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importPackage(f);
                  }}
                />
                <button
                  type="button"
                  className={`${styles.btn} ${adminStyles.btnSecondary}`}
                  onClick={() => importRef.current?.click()}
                  disabled={!levelId || importing}
                >
                  {importing ? "Mengimpor…" : "Impor paket JSON"}
                </button>
              </>
            )}
            <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={() => setEditing("new")} disabled={!levelId}>
              + Soal Baru
            </button>
          </div>
        </div>
        <div className={adminStyles.filterBar}>
          <input className={adminStyles.searchInput} placeholder="Cari pertanyaan atau jawaban…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari soal" />
          <select
            className={adminStyles.selectInput}
            value={filter.section ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, section: (e.target.value || undefined) as ExamSection | undefined, page: 1 }))}
            aria-label="Filter bagian"
          >
            <option value="">Semua bagian</option>
            {sections.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {!config ? (
          <SkeletonRegion label="Memuat soal…" className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <tbody>
                <SkeletonTableRows rows={6} columns={3} />
              </tbody>
            </table>
          </SkeletonRegion>
        ) : questions.length === 0 ? (
          <p className={adminStyles.emptyState}>
            {isJlptSim ? "Belum ada soal khusus simulasi. Simulasi tetap jalan memakai bank tes naik tahap level ini." : "Belum ada soal."}
          </p>
        ) : (
          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Soal</th>
                  <th className={styles.hideMobile}>Bagian</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <ExerciseSummary item={q} />
                      {q.status !== "published" && <span className={`${adminStyles.badge} ${styles.status_draft}`}>{STATUS_LABEL[q.status]}</span>}
                    </td>
                    <td className={styles.hideMobile}>{sectionLabel(q.section)}</td>
                    <td style={{ width: 1 }}>
                      <div className={adminStyles.actionGroup} style={{ flexWrap: "nowrap" }}>
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => setEditing(q)}>Edit</button>
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnDanger}`} disabled={removingId !== null} onClick={() => remove(q)}>{removingId === q.id ? "Menghapus…" : "Hapus"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={filter.page} pageSize={pageSize} total={total} unit="soal" onPage={(page) => setFilter((f) => ({ ...f, page }))} />
      </section>
      )}

      {editing && levelId && (
        <ExamQuestionForm
          item={editing === "new" ? undefined : editing}
          defaultSection={filter.section ?? "kosakata"}
          sim={isJlptSim}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            if (editing === "new") await contentApi.createExamQuestion(levelId, examType, data);
            else await contentApi.updateExamQuestion(editing.id, data);
            setEditing(null);
            await load();
            flash.ok("Soal tersimpan.");
          }}
        />
      )}
    </>
  );
}

function ExamQuestionForm({
  item,
  defaultSection,
  sim,
  onSubmit,
  onClose,
}: {
  item?: ExamQuestionItem;
  defaultSection: ExamSection;
  sim: boolean;
  onSubmit: (data: Omit<ExamQuestionItem, "id">) => Promise<void>;
  onClose: () => void;
}) {
  const [meta, setMeta] = useState<FormValues>({
    section: item?.section ?? defaultSection,
    status: item?.status ?? "published",
    difficulty: item?.difficulty ?? 1,
    category: item?.category ?? "",
    passage: item?.passage ?? "",
  });
  const section = String(meta.section);
  return (
    <ExerciseForm
      item={item}
      noun="soal ujian"
      onClose={onClose}
      onSubmit={(data) =>
        onSubmit({
          ...data,
          section: meta.section as ExamSection,
          status: meta.status as ExamQuestionItem["status"],
          difficulty: Number(meta.difficulty) || 1,
          ...(sim
            ? {
                // Tipe soal yang tidak cocok lagi dengan bagian (bagian baru dipilih) dikosongkan
                category: JLPT_CATEGORIES.some((c) => c.value === meta.category && c.section === section) ? String(meta.category) : null,
                passage: String(meta.passage ?? "").trim() || null,
              }
            : {}),
        })
      }
    >
      {examFields(sim, section).map((def) => (
        <Field key={def.name} def={def} values={meta} set={(name, value) => setMeta((m) => ({ ...m, [name]: value }))} />
      ))}
    </ExerciseForm>
  );
}
