"use client";

import { useCallback, useEffect, useState } from "react";
import { contentApi, type ContentLevel, type ExamConfig, type ExamQuestionItem, type ExamSection } from "@/features/admin/data/contentApi";
import adminStyles from "@/app/(app)/admin/admin.module.css";
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

const DEFAULT_CONFIG: ExamConfig = { questionCount: 30, timeLimitMin: 25, passScore: 75, sectionMinScore: 60, cooldownHours: 24, minChapterCompletion: 80 };

const CONFIG_FIELDS: { key: keyof ExamConfig; label: string; hint: string; min: number; max: number }[] = [
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
      const r = await contentApi.exam(levelId, filter);
      setConfig(r.config ?? DEFAULT_CONFIG);
      setSavedConfig(r.config);
      setQuestions(r.questions.map((q) => ({ ...q, options: q.options as string[] })));
      setPerSection(r.publishedPerSection);
      setTotal(r.total);
      setPageSize(r.pageSize);
    } catch (err) {
      flash.fail(err);
    }
  }, [levelId, filter, flash.fail]);
  useEffect(() => {
    void load();
  }, [load]);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setFilter((f) => (f.search === search ? f : { ...f, search, page: 1 })), 350);
    return () => clearTimeout(t);
  }, [search]);

  const level = levels.find((l) => l.id === levelId);
  const isTopLevel = !!level && level.id === Math.max(...levels.map((l) => l.id));
  const configDirty = JSON.stringify(config) !== JSON.stringify(savedConfig);
  const neededPerSection = config ? Math.floor(config.questionCount / SECTIONS.length) : 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  async function saveConfig() {
    if (!levelId || !config) return;
    try {
      await contentApi.saveExamConfig(levelId, config);
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

  return (
    <>
      <LevelPicker levels={levels} value={levelId} onChange={(id) => { selectLevel(id); setFilter({ search: "", page: 1 }); setSearch(""); }} meta={(l) => `${l.examQuestions} soal`} />
      {flash.node}

      {isTopLevel ? (
        <section className={adminStyles.panel}>
          <p className={adminStyles.emptyState}>{level?.name} adalah level tertinggi, jadi tidak ada ujian naik level.</p>
        </section>
      ) : (
        <>
          <section className={adminStyles.panel}>
            <div className={styles.toolbar}>
              <h2 className={adminStyles.panelTitle}>Aturan ujian {level?.code} → level berikutnya</h2>
              {!savedConfig && <span className={styles.warn}>Belum diatur, siswa belum bisa ujian.</span>}
            </div>
            {config && (
              <div className={styles.formGrid}>
                {CONFIG_FIELDS.map((f) => (
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
                    {f.hint && <span className={styles.hint}>{f.hint}</span>}
                  </div>
                ))}
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
                return (
                  <div key={s.value} className={styles.sectionStat}>
                    <span className={styles.muted}>{s.label}</span>
                    <strong>{count}</strong>
                    {count < neededPerSection && <span className={styles.warn}>Kurang dari {neededPerSection} soal per ujian</span>}
                  </div>
                );
              })}
            </div>
            <p className={styles.muted}>Setiap ujian mengambil {neededPerSection} soal acak dari tiap bagian. Semakin banyak soal, semakin bervariasi ujiannya.</p>
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

        {questions.length === 0 ? (
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
            if (editing === "new") await contentApi.createExamQuestion(levelId, data);
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
