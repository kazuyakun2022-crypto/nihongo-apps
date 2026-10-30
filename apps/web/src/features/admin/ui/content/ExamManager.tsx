"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { contentApi, type ContentLevel, type ExamConfig, type ExamQuestionItem, type ExamSection, type ExamType } from "@/features/admin/data/contentApi";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { Skeleton, SkeletonRegion, SkeletonTableRows } from "@/shared/ui/Skeleton";
import { Field, type FieldDef, type FormValues } from "./FormModal";
import { ExerciseSummary } from "./ChapterEditor";
import { ExerciseForm } from "./ExerciseForm";
import { LevelPicker, useLevelParam } from "./ChapterManager";
import { STATUS_LABEL, useFlash } from "./ContentShell";
import styles from "./content.module.css";

const SECTIONS: { value: ExamSection; label: string }[] = [
  { value: "kosakata", label: "Kosakata" },
  { value: "tata_bahasa", label: "Tata Bahasa" },
  { value: "membaca", label: "Membaca" },
  { value: "mendengar", label: "Mendengar" },
];
const sectionLabel = (s: ExamSection) => SECTIONS.find((x) => x.value === s)?.label ?? s;

/** Aturan awal di formulir sebelum admin menyimpan; aturan penempatan sama dengan bawaan server. */
const DEFAULT_CONFIG: Record<ExamType, ExamConfig> = {
  level_up: { questionCount: 30, timeLimitMin: 25, passScore: 75, sectionMinScore: 60, cooldownHours: 24, minChapterCompletion: 80 },
  placement: { questionCount: 20, timeLimitMin: 20, passScore: 70, sectionMinScore: 0, cooldownHours: 0, minChapterCompletion: 0 },
};

const EXAM_TYPES: { value: ExamType; param: string; label: string }[] = [
  { value: "level_up", param: "naik-tahap", label: "Tes naik tahap" },
  { value: "placement", param: "penempatan", label: "Tes penempatan (saat daftar)" },
];

const CONFIG_FIELDS: { key: Exclude<keyof ExamConfig, "sectionRules">; label: string; hint: string; min: number; max: number }[] = [
  { key: "questionCount", label: "Jumlah soal", hint: "Dibagi rata ke 4 bagian.", min: 4, max: 200 },
  { key: "timeLimitMin", label: "Batas waktu (menit)", hint: "", min: 1, max: 300 },
  { key: "passScore", label: "Nilai lulus total (%)", hint: "", min: 1, max: 100 },
  { key: "sectionMinScore", label: "Nilai minimal per bagian (%)", hint: "Gagal jika satu bagian di bawah ini.", min: 0, max: 100 },
  { key: "cooldownHours", label: "Jeda ulang setelah gagal (jam)", hint: "0 = boleh langsung mengulang.", min: 0, max: 720 },
  { key: "minChapterCompletion", label: "Syarat bab selesai (%)", hint: "Persentase bab level ini yang harus selesai.", min: 0, max: 100 },
];

/** Isian khusus ujian; isi soalnya (jenis, pertanyaan, jawaban) diatur ExerciseForm. */
const EXAM_FIELDS: FieldDef[] = [
  { name: "section", label: "Bagian", type: "select", options: SECTIONS },
  { name: "status", label: "Status", type: "select", options: [{ value: "published", label: "Terbit (dipakai di ujian)" }, { value: "draft", label: "Draft (tidak dipakai)" }] },
  { name: "difficulty", label: "Tingkat kesulitan (1–5)", type: "number", min: 1, max: 5 },
];

export function ExamManager() {
  const flash = useFlash();
  const params = useSearchParams();
  const router = useRouter();
  const examType: ExamType = params.get("jenis") === "penempatan" ? "placement" : "level_up";
  const [levels, setLevels] = useState<ContentLevel[]>([]);
  const [levelId, selectLevel] = useLevelParam(levels);
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<ExamConfig | null>(null);
  const [questions, setQuestions] = useState<ExamQuestionItem[]>([]);
  const [perSection, setPerSection] = useState<Partial<Record<ExamSection, number>>>({});
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [filter, setFilter] = useState<{ section?: ExamSection; search: string; page: number }>({ search: "", page: 1 });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ExamQuestionItem | "new" | null>(null);

  useEffect(() => {
    contentApi.levels().then((r) => setLevels(r.levels)).catch(flash.fail);
  }, [flash.fail]);

  const load = useCallback(async () => {
    if (!levelId) return;
    try {
      const r = await contentApi.exam(levelId, examType, filter);
      setConfig(r.config ?? DEFAULT_CONFIG[examType]);
      setSavedConfig(r.config);
      setQuestions(r.questions.map((q) => ({ ...q, options: q.options as string[] })));
      setPerSection(r.publishedPerSection);
      setTotal(r.total);
      setPageSize(r.pageSize);
    } catch (err) {
      flash.fail(err);
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
  // Level tertinggi tidak punya ujian naik level; tes penempatan tetap bisa diatur untuk semua level
  const isTopLevel = !isPlacement && !!level && level.id === Math.max(...levels.map((l) => l.id));
  const configFields = isPlacement ? CONFIG_FIELDS.filter((f) => f.key !== "minChapterCompletion") : CONFIG_FIELDS;
  const configDirty = JSON.stringify(config) !== JSON.stringify(savedConfig);
  const rules = config?.sectionRules ?? null;
  const neededFor = (s: ExamSection) => (rules ? rules[s]?.count ?? 0 : config ? Math.floor(config.questionCount / SECTIONS.length) : 0);
  const rulesTotal = rules ? Object.values(rules).reduce((n, r) => n + (r?.count ?? 0), 0) : 0;

  function toggleRules(on: boolean) {
    if (!config) return;
    const even = Math.floor(config.questionCount / SECTIONS.length);
    setConfig({
      ...config,
      sectionRules: on ? Object.fromEntries(SECTIONS.map((s) => [s.value, { count: even, minScore: config.sectionMinScore }])) : null,
    });
  }

  function setRule(s: ExamSection, key: "count" | "minScore", value: number) {
    if (!config?.sectionRules) return;
    const current = config.sectionRules[s] ?? { count: 0, minScore: config.sectionMinScore };
    setConfig({ ...config, sectionRules: { ...config.sectionRules, [s]: { ...current, [key]: value } } });
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));

  async function saveConfig() {
    if (!levelId || !config) return;
    try {
      await contentApi.saveExamConfig(levelId, examType, config);
      setSavedConfig(config);
      flash.ok("Pengaturan ujian disimpan.");
    } catch (err) {
      flash.fail(err);
    }
  }

  async function remove(q: ExamQuestionItem) {
    if (!confirm("Hapus soal ini?")) return;
    try {
      const res = await contentApi.deleteExamQuestion(q.id);
      flash.ok(res?.archived ? "Soal ini sudah pernah dijawab siswa, jadi diubah ke draft (tidak dipakai lagi)." : "Soal dihapus.");
      await load();
    } catch (err) {
      flash.fail(err);
    }
  }

  function selectType(type: ExamType) {
    const sp = new URLSearchParams(params.toString());
    sp.set("jenis", EXAM_TYPES.find((t) => t.value === type)!.param);
    setConfig(null);
    setSavedConfig(null);
    setFilter({ search: "", page: 1 });
    setSearch("");
    router.replace(`?${sp}`, { scroll: false });
  }

  return (
    <>
      <div className={adminStyles.tabs} role="tablist" aria-label="Jenis tes">
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
        meta={(l) => `${isPlacement ? l.placementQuestions : l.examQuestions} soal`}
      />
      {flash.node}

      {isTopLevel ? (
        <section className={adminStyles.panel}>
          <p className={adminStyles.emptyState}>{level?.name} adalah level tertinggi, jadi tidak ada ujian naik level.</p>
        </section>
      ) : (
        <>
          <section className={adminStyles.panel}>
            <div className={styles.toolbar}>
              <h2 className={adminStyles.panelTitle}>
                {isPlacement ? `Aturan tes penempatan untuk mulai di ${level?.code ?? ""}` : `Aturan ujian ${level?.code ?? ""} → level berikutnya`}
              </h2>
              {config && !savedConfig && (
                <span className={styles.warn}>
                  {isPlacement ? "Belum diatur, tes memakai aturan bawaan di bawah." : "Belum diatur, siswa belum bisa ujian."}
                </span>
              )}
            </div>
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
                        {rules && (f.key === "questionCount" || f.key === "sectionMinScore") ? "Diganti aturan per bagian di bawah." : f.hint}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {config && (
              <div className={styles.rulesBox}>
                <label className={styles.rulesToggle}>
                  <input type="checkbox" checked={!!rules} onChange={(e) => toggleRules(e.target.checked)} />
                  Atur jumlah soal & nilai minimal per bagian
                </label>
                {rules && (
                  <>
                    <table className={adminStyles.table}>
                      <thead>
                        <tr>
                          <th>Bagian</th>
                          <th>Jumlah soal</th>
                          <th>Nilai minimal (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SECTIONS.map((s) => (
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <span className={styles.hint}>Total {rulesTotal} soal per ujian. Siswa gagal jika satu bagian di bawah nilai minimalnya.</span>
                  </>
                )}
              </div>
            )}
            <div className={styles.toolbar}>
              <span />
              <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={saveConfig} disabled={!configDirty}>
                Simpan aturan
              </button>
            </div>
          </section>

          <section className={adminStyles.panel}>
            <h2 className={adminStyles.panelTitle}>Bank soal terbit per bagian</h2>
            <div className={styles.sectionStats}>
              {SECTIONS.map((s) => {
                const count = perSection[s.value] ?? 0;
                const needed = neededFor(s.value);
                return (
                  <div key={s.value} className={styles.sectionStat}>
                    <span className={styles.muted}>{s.label}</span>
                    <strong>{count}</strong>
                    {count < needed && <span className={styles.warn}>Kurang dari {needed} soal per ujian</span>}
                  </div>
                );
              })}
            </div>
            <p className={styles.muted}>
              {rules
                ? "Setiap tes mengambil soal acak sesuai jumlah per bagian di atas; kekurangan di satu bagian diisi dari bagian lain."
                : `Setiap tes mengambil ${neededFor("kosakata")} soal acak dari tiap bagian; kekurangan di satu bagian diisi dari bagian lain.`}
              {isPlacement
                ? " Selama bank soal penempatan masih kosong, tes memakai soal pilihan ganda dari bab level sebelumnya."
                : " Selama bank soal belum cukup untuk satu ujian, ujian memakai soal pilihan ganda dari bab level ini."}
            </p>
          </section>
        </>
      )}

      <section className={adminStyles.panel}>
        <div className={styles.toolbar}>
          <h2 className={adminStyles.panelTitle}>
            Daftar soal <span className={styles.muted}>({total})</span>
          </h2>
          <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={() => setEditing("new")} disabled={!levelId}>
            + Soal Baru
          </button>
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
            {SECTIONS.map((s) => (
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
          <p className={adminStyles.emptyState}>Belum ada soal.</p>
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
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnDanger}`} onClick={() => remove(q)}>Hapus</button>
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
            <span>Halaman {filter.page} dari {pages}</span>
            <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} disabled={filter.page >= pages} onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))}>
              Berikutnya →
            </button>
          </div>
        )}
      </section>

      {editing && levelId && (
        <ExamQuestionForm
          item={editing === "new" ? undefined : editing}
          defaultSection={filter.section ?? "kosakata"}
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
  onSubmit,
  onClose,
}: {
  item?: ExamQuestionItem;
  defaultSection: ExamSection;
  onSubmit: (data: Omit<ExamQuestionItem, "id">) => Promise<void>;
  onClose: () => void;
}) {
  const [meta, setMeta] = useState<FormValues>({
    section: item?.section ?? defaultSection,
    status: item?.status ?? "published",
    difficulty: item?.difficulty ?? 1,
  });
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
        })
      }
    >
      {EXAM_FIELDS.map((def) => (
        <Field key={def.name} def={def} values={meta} set={(name, value) => setMeta((m) => ({ ...m, [name]: value }))} />
      ))}
    </ExerciseForm>
  );
}
