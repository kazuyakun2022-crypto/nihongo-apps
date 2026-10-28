"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { contentApi, type ChapterDetail, type ContentStatus, type ItemKind, type QuizItem } from "@/features/admin/data/contentApi";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { EXERCISES, SKILLS, countBySkill, type SkillId } from "@/shared/lib/exercises";
import { ExerciseForm } from "./ExerciseForm";
import { FormModal, type FieldDef, type FormValues } from "./FormModal";
import { STATUS_LABEL, useFlash } from "./ContentShell";
import styles from "./content.module.css";

/** Definisi tiap jenis materi: field form, nilai awal, dan cara menampilkannya di daftar. */
const KINDS: Record<ItemKind, { tab: string; label: string; fields: FieldDef[]; empty: FormValues; listKey: keyof ChapterDetail }> = {
  vocab: {
    tab: "Kosakata",
    label: "kosakata",
    listKey: "vocabularies",
    empty: { word: "", reading: "", meaningId: "", exampleSentence: "", exampleTranslation: "" },
    fields: [
      { name: "word", label: "Kata", type: "text", required: true, jp: true },
      { name: "reading", label: "Cara baca (hiragana)", type: "text", required: true, jp: true },
      { name: "meaningId", label: "Arti", type: "text", required: true, wide: true },
      { name: "exampleSentence", label: "Contoh kalimat", type: "text", wide: true, jp: true },
      { name: "exampleTranslation", label: "Terjemahan contoh", type: "text", wide: true },
    ],
  },
  kanji: {
    tab: "Kanji",
    label: "kanji",
    listKey: "kanji",
    empty: { character: "", onyomi: "", kunyomi: "", meaningId: "" },
    fields: [
      { name: "character", label: "Kanji", type: "text", required: true, jp: true, hint: "Satu karakter." },
      { name: "meaningId", label: "Arti", type: "text", required: true },
      { name: "onyomi", label: "Onyomi", type: "text", jp: true, hint: "Pisahkan dengan 、" },
      { name: "kunyomi", label: "Kunyomi", type: "text", jp: true, hint: "Pisahkan dengan 、" },
    ],
  },
  grammar: {
    tab: "Tata Bahasa",
    label: "pola tata bahasa",
    listKey: "grammarPoints",
    empty: { pattern: "", explanation: "", exampleSentence: "", exampleTranslation: "" },
    fields: [
      { name: "pattern", label: "Pola", type: "text", required: true, wide: true, jp: true },
      { name: "explanation", label: "Penjelasan", type: "textarea", required: true },
      { name: "exampleSentence", label: "Contoh kalimat", type: "text", wide: true, jp: true },
      { name: "exampleTranslation", label: "Terjemahan contoh", type: "text", wide: true },
    ],
  },
  // Latihan memakai ExerciseForm karena isiannya berbeda per jenis latihan.
  quiz: {
    tab: "Latihan",
    label: "latihan",
    listKey: "quizQuestions",
    empty: {},
    fields: [],
  },
};
const KIND_ORDER: ItemKind[] = ["vocab", "kanji", "grammar", "quiz"];

type AnyItem = { id: string } & Record<string, unknown>;

function ItemSummary({ kind, item }: { kind: ItemKind; item: AnyItem }) {
  const s = (k: string) => (item[k] as string | null) ?? "";
  if (kind === "vocab")
    return (
      <>
        <div className={styles.itemMain} lang="ja">
          {s("word")} <span className={styles.muted}>{s("reading") !== s("word") ? s("reading") : ""}</span>
        </div>
        <div>{s("meaningId")}</div>
        {s("exampleSentence") && <div className={styles.muted} lang="ja">{s("exampleSentence")}</div>}
      </>
    );
  if (kind === "kanji")
    return (
      <>
        <div className={styles.itemMain} lang="ja">{s("character")}</div>
        <div>{s("meaningId")}</div>
        <div className={styles.muted} lang="ja">
          {[s("onyomi") && `On: ${s("onyomi")}`, s("kunyomi") && `Kun: ${s("kunyomi")}`].filter(Boolean).join(" · ")}
        </div>
      </>
    );
  if (kind === "grammar")
    return (
      <>
        <div className={styles.itemMain} lang="ja">{s("pattern")}</div>
        <div className={styles.muted}>{s("explanation")}</div>
      </>
    );
  return <ExerciseSummary item={item as unknown as QuizItem} />;
}

export function ExerciseSummary({ item }: { item: Omit<QuizItem, "id"> }) {
  const meta = EXERCISES[item.type];
  const options = item.options ?? [];
  return (
    <>
      <span className={styles.typeTag}>
        {SKILLS[meta.skill].icon} {meta.label}
      </span>
      <div style={{ fontWeight: 600 }} lang="ja">
        {item.type === "berbicara" ? item.correctAnswer : item.question}
        {item.hint && <span className={styles.muted}> · {item.hint}</span>}
      </div>
      {(item.type === "pilihan_ganda" || item.type === "mendengar") && (
        <div className={styles.counts} lang="ja">
          {options.map((o) => (
            <span key={o} className={o === item.correctAnswer ? styles.correct : undefined}>
              {o === item.correctAnswer ? "✓ " : ""}
              {o}
            </span>
          ))}
        </div>
      )}
      {(item.type === "susun_huruf" || item.type === "susun_kalimat" || item.type === "menulis") && (
        <div className={styles.muted} lang="ja">
          Jawaban: <span className={styles.correct}>{item.correctAnswer}</span>
          {item.type !== "menulis" && options.length > 0 && ` · ${options.length} kepingan`}
        </div>
      )}
      {item.type === "berbicara" && options.length > 0 && (
        <div className={styles.muted} lang="ja">
          Juga diterima: {options.join(" / ")}
        </div>
      )}
    </>
  );
}

export function ChapterEditor({ chapterId }: { chapterId: string }) {
  const router = useRouter();
  const level = useSearchParams().get("level");
  const flash = useFlash();
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [meta, setMeta] = useState({ title: "", explanation: "", status: "draft" as ContentStatus });
  const [tab, setTab] = useState<ItemKind>("vocab");
  const [skill, setSkill] = useState<SkillId | "semua">("semua");
  const [editing, setEditing] = useState<{ kind: ItemKind; item?: AnyItem } | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);

  const load = useCallback(
    () =>
      contentApi
        .chapter(chapterId)
        .then(({ chapter }) => {
          setChapter(chapter);
          setMeta({ title: chapter.title, explanation: chapter.explanation ?? "", status: chapter.status });
        })
        .catch(flash.fail),
    [chapterId, flash.fail],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const backHref = `/admin/konten?level=${level ?? chapter?.levelId ?? ""}`;

  if (!chapter) return <p className={adminStyles.emptyState}>{flash.node ?? "Memuat bab…"}</p>;

  const dirty = meta.title !== chapter.title || meta.explanation !== (chapter.explanation ?? "") || meta.status !== chapter.status;

  async function saveMeta() {
    setSavingMeta(true);
    try {
      await contentApi.updateChapter(chapterId, { title: meta.title.trim(), explanation: meta.explanation.trim() || null, status: meta.status });
      await load();
      flash.ok("Info bab disimpan.");
    } catch (err) {
      flash.fail(err);
    } finally {
      setSavingMeta(false);
    }
  }

  async function removeChapter() {
    if (!chapter || !confirm(`Hapus bab "${chapter.title}" beserta seluruh isinya?`)) return;
    try {
      await contentApi.deleteChapter(chapterId);
      router.push(backHref);
    } catch (err) {
      flash.fail(err);
    }
  }

  async function removeItem(kind: ItemKind, item: AnyItem) {
    if (!confirm(`Hapus ${KINDS[kind].label} ini?`)) return;
    try {
      await contentApi.deleteItem(kind, item.id);
      await load();
      flash.ok("Dihapus.");
    } catch (err) {
      flash.fail(err);
    }
  }

  const def = KINDS[tab];
  const allItems = (chapter[def.listKey] as unknown as AnyItem[]) ?? [];
  const skillCounts = countBySkill(chapter.quizQuestions.map((q) => q.type));
  const items =
    tab === "quiz" && skill !== "semua" ? allItems.filter((i) => EXERCISES[(i as unknown as QuizItem).type]?.skill === skill) : allItems;

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href={backHref}>← Daftar bab {chapter.level.code}</Link>
        {chapter.sourceKey && <span>· dari dataset impor</span>}
      </div>
      {flash.node}

      <section className={adminStyles.panel}>
        <div className={styles.toolbar}>
          <h2 className={adminStyles.panelTitle}>Info bab</h2>
          <span className={`${adminStyles.badge} ${styles[`status_${chapter.status}`]}`}>{STATUS_LABEL[chapter.status]}</span>
        </div>
        <div className={styles.formGrid}>
          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label htmlFor="ch-title" className={adminStyles.fieldLabel}>Judul</label>
            <input id="ch-title" className={styles.input} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </div>
          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label htmlFor="ch-exp" className={adminStyles.fieldLabel}>Pengantar bab</label>
            <textarea id="ch-exp" className={styles.textarea} value={meta.explanation} onChange={(e) => setMeta({ ...meta, explanation: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label htmlFor="ch-status" className={adminStyles.fieldLabel}>Status</label>
            <select id="ch-status" className={styles.select} value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value as ContentStatus })}>
              <option value="draft">Draft (tersembunyi)</option>
              <option value="review">Review (tersembunyi)</option>
              <option value="published">Terbit (tampil ke siswa)</option>
            </select>
          </div>
        </div>
        <div className={styles.toolbar}>
          <button type="button" className={`${styles.btn} ${adminStyles.btnDanger}`} onClick={removeChapter}>
            Hapus bab
          </button>
          <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={saveMeta} disabled={!dirty || !meta.title.trim() || savingMeta}>
            {savingMeta ? "Menyimpan…" : "Simpan info bab"}
          </button>
        </div>
      </section>

      <section className={adminStyles.panel}>
        <div className={adminStyles.tabs} role="tablist" aria-label="Isi bab">
          {KIND_ORDER.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={`${adminStyles.tabBtn} ${tab === k ? adminStyles.tabBtnActive : ""}`} onClick={() => setTab(k)}>
              {KINDS[k].tab} <span className={styles.muted}>({(chapter[KINDS[k].listKey] as unknown[]).length})</span>
            </button>
          ))}
        </div>
        <div className={styles.toolbar}>
          {tab === "quiz" && allItems.length > 0 ? (
            <div className={styles.skillFilter} role="group" aria-label="Saring menurut keterampilan">
              <button type="button" className={styles.skillFilterBtn} aria-pressed={skill === "semua"} onClick={() => setSkill("semua")}>
                Semua ({allItems.length})
              </button>
              {skillCounts.map(({ skill: s, count }) => (
                <button key={s} type="button" className={styles.skillFilterBtn} aria-pressed={skill === s} onClick={() => setSkill(s)}>
                  {SKILLS[s].icon} {SKILLS[s].label} ({count})
                </button>
              ))}
            </div>
          ) : (
            <span className={styles.muted}>
              {tab === "quiz" ? "Siswa harus mendapat nilai minimal 70 untuk menyelesaikan bab." : `Urutan tampil sesuai urutan dibuat.`}
            </span>
          )}
          <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={() => setEditing({ kind: tab })}>
            + Tambah {def.label}
          </button>
        </div>

        {items.length === 0 ? (
          <p className={adminStyles.emptyState}>
            Belum ada {def.label}
            {tab === "quiz" && skill !== "semua" ? ` ${SKILLS[skill].label.toLowerCase()}` : ""}.
          </p>
        ) : (
          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <ItemSummary kind={tab} item={item} />
                    </td>
                    <td style={{ width: 1 }}>
                      <div className={adminStyles.actionGroup} style={{ flexWrap: "nowrap" }}>
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => setEditing({ kind: tab, item })}>
                          Edit
                        </button>
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnDanger}`} onClick={() => removeItem(tab, item)}>
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
      </section>

      {editing?.kind === "quiz" && (
        <ExerciseForm
          item={editing.item as unknown as QuizItem | undefined}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            if (editing.item) await contentApi.updateItem("quiz", editing.item.id, data);
            else await contentApi.createItem(chapterId, "quiz", data);
            setEditing(null);
            await load();
            flash.ok("Latihan tersimpan.");
          }}
        />
      )}

      {editing && editing.kind !== "quiz" && (
        <FormModal
          title={`${editing.item ? "Ubah" : "Tambah"} ${KINDS[editing.kind].label}`}
          fields={KINDS[editing.kind].fields}
          initial={editing.item ? { ...KINDS[editing.kind].empty, ...nullsToEmpty(editing.item) } : KINDS[editing.kind].empty}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            const data = pick(values, KINDS[editing.kind].fields);
            if (editing.item) await contentApi.updateItem(editing.kind, editing.item.id, data);
            else await contentApi.createItem(chapterId, editing.kind, data);
            setEditing(null);
            await load();
            flash.ok("Tersimpan.");
          }}
        />
      )}
    </>
  );
}

function nullsToEmpty(item: AnyItem): FormValues {
  return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v ?? ""]));
}

/** Hanya kirim field yang ada di form (plus jawaban benar untuk field pilihan). */
function pick(values: FormValues, fields: FieldDef[]): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    out[f.name] = values[f.name];
    if (f.type === "choices") out[f.answerName] = values[f.answerName];
  }
  return out;
}
