"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { contentApi, type ChapterDetail, type ContentStatus, type ItemKind, type QuizItem } from "@/features/admin/data/contentApi";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { Skeleton, SkeletonRegion, SkeletonTableRows } from "@/shared/ui/Skeleton";
import { EXERCISES, SKILLS, countBySkill, type SkillId } from "@/shared/lib/exercises";
import { ExerciseForm } from "./ExerciseForm";
import { FormModal, type FieldDef, type FormValues } from "./FormModal";
import { STATUS_LABEL, useFlash } from "./ContentShell";
import styles from "./content.module.css";

/** Definisi tiap jenis materi: field form, nilai awal, dan cara menampilkannya di daftar. */
const BLOCK_TYPES = [
  { value: "teks", label: "Teks penjelasan" },
  { value: "gambar", label: "Gambar / ilustrasi" },
  { value: "dialog", label: "Dialog contoh" },
  { value: "tips", label: "Tips / catatan penting" },
  { value: "huruf", label: "Kartu huruf (kana + mnemonik)" },
];
const BLOCK_ICON: Record<string, string> = { teks: "📝", gambar: "🖼️", dialog: "💬", tips: "💡", huruf: "あ" };

const KINDS: Record<ItemKind, { tab: string; label: string; fields: FieldDef[]; empty: FormValues; listKey: keyof ChapterDetail }> = {
  block: {
    tab: "Materi",
    label: "blok materi",
    listKey: "lessonBlocks",
    empty: { type: "teks", title: "", body: "", imageUrl: null, caption: "" },
    fields: [
      { name: "type", label: "Jenis blok", type: "select", options: BLOCK_TYPES },
      { name: "title", label: "Judul (opsional)", type: "text", wide: true },
      {
        name: "body",
        label: "Isi",
        type: "textarea",
        jp: true,
        hint: "Baris kosong memisahkan paragraf. Dialog: satu ucapan per baris, mis. \"A: おはようございます。\", lalu terjemahannya di baris berikutnya diawali \">\". Kartu huruf: satu huruf per baris, \"あ | a | mnemonik\".",
      },
      { name: "imageUrl", label: "Gambar (opsional)", type: "image", hint: "Mis. ilustrasi situasi, tabel huruf, papan tanda, atau bahan bacaan bergambar." },
      { name: "caption", label: "Keterangan gambar (opsional)", type: "text", wide: true },
    ],
  },
  vocab: {
    tab: "Kosakata",
    label: "kosakata",
    listKey: "vocabularies",
    empty: { word: "", reading: "", meaningId: "", exampleSentence: "", exampleTranslation: "", imageUrl: null },
    fields: [
      { name: "word", label: "Kata", type: "text", required: true, jp: true },
      { name: "reading", label: "Cara baca (hiragana)", type: "text", required: true, jp: true },
      { name: "meaningId", label: "Arti", type: "text", required: true, wide: true },
      { name: "exampleSentence", label: "Contoh kalimat", type: "text", wide: true, jp: true },
      { name: "exampleTranslation", label: "Terjemahan contoh", type: "text", wide: true },
      { name: "imageUrl", label: "Gambar (opsional)", type: "image", hint: "Tampil di kartu kosakata dan kamus." },
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
    empty: { pattern: "", explanation: "", exampleSentence: "", exampleTranslation: "", imageUrl: null },
    fields: [
      { name: "pattern", label: "Pola", type: "text", required: true, wide: true, jp: true },
      { name: "explanation", label: "Penjelasan", type: "textarea", required: true },
      { name: "exampleSentence", label: "Contoh kalimat", type: "text", wide: true, jp: true },
      { name: "exampleTranslation", label: "Terjemahan contoh", type: "text", wide: true },
      { name: "imageUrl", label: "Gambar (opsional)", type: "image", hint: "Mis. diagram pola kalimat atau ilustrasi contoh." },
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
const KIND_ORDER: ItemKind[] = ["block", "vocab", "kanji", "grammar", "quiz"];

type AnyItem = { id: string } & Record<string, unknown>;

function ItemSummary({ kind, item }: { kind: ItemKind; item: AnyItem }) {
  const s = (k: string) => (item[k] as string | null) ?? "";
  const image = typeof item.imageUrl === "string" && item.imageUrl ? item.imageUrl : null;
  return (
    <div className={styles.itemWithThumb}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {image && <img src={image} alt="" className={styles.thumb} />}
      <div style={{ minWidth: 0 }}>
        <ItemText kind={kind} item={item} s={s} />
      </div>
    </div>
  );
}

function ItemText({ kind, item, s }: { kind: ItemKind; item: AnyItem; s: (k: string) => string }) {
  if (kind === "block")
    return (
      <>
        <div className={styles.itemMain}>
          {BLOCK_ICON[s("type")] ?? "📝"} {s("title") || BLOCK_TYPES.find((t) => t.value === s("type"))?.label}
        </div>
        {s("body") && (
          <div className={`${styles.muted} ${styles.clamp3}`} lang="ja">
            {s("body")}
          </div>
        )}
        {s("caption") && <div className={styles.muted}>Keterangan: {s("caption")}</div>}
      </>
    );
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
  const [meta, setMeta] = useState({ title: "", explanation: "", moduleTitle: "", passScore: "", status: "draft" as ContentStatus });
  const [tab, setTab] = useState<ItemKind>("block");
  const [skill, setSkill] = useState<SkillId | "semua">("semua");
  const [editing, setEditing] = useState<{ kind: ItemKind; item?: AnyItem } | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);

  const load = useCallback(
    () =>
      contentApi
        .chapter(chapterId)
        .then(({ chapter }) => {
          setChapter(chapter);
          setMeta({
            title: chapter.title,
            explanation: chapter.explanation ?? "",
            moduleTitle: chapter.moduleTitle ?? "",
            passScore: chapter.passScore == null ? "" : String(chapter.passScore),
            status: chapter.status,
          });
        })
        .catch(flash.fail),
    [chapterId, flash.fail],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const backHref = `/admin/konten?level=${level ?? chapter?.levelId ?? ""}`;

  if (!chapter && flash.node) return <p className={adminStyles.emptyState}>{flash.node}</p>;
  if (!chapter) {
    return (
      <SkeletonRegion label="Memuat bab…" style={{ display: "contents" }}>
        <Skeleton width="10rem" />
        <section className={adminStyles.panel}>
          <div className={styles.toolbar}>
            <Skeleton width="6rem" height="1.25rem" />
            <Skeleton width="4rem" height="1.5rem" radius="var(--radius-pill)" />
          </div>
          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <Skeleton width="4rem" height="0.875rem" />
              <Skeleton height="2.5rem" radius="8px" />
            </div>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <Skeleton width="7rem" height="0.875rem" />
              <Skeleton height="6rem" radius="8px" />
            </div>
          </div>
        </section>
        <section className={adminStyles.panel}>
          <Skeleton width="60%" height="2.25rem" radius="8px" />
          <table className={adminStyles.table}>
            <tbody>
              <SkeletonTableRows rows={5} columns={3} />
            </tbody>
          </table>
        </section>
      </SkeletonRegion>
    );
  }

  const dirty =
    meta.title !== chapter.title ||
    meta.explanation !== (chapter.explanation ?? "") ||
    meta.moduleTitle !== (chapter.moduleTitle ?? "") ||
    meta.passScore !== (chapter.passScore == null ? "" : String(chapter.passScore)) ||
    meta.status !== chapter.status;

  async function saveMeta() {
    setSavingMeta(true);
    try {
      await contentApi.updateChapter(chapterId, {
        title: meta.title.trim(),
        explanation: meta.explanation.trim() || null,
        moduleTitle: meta.moduleTitle.trim() || null,
        passScore: meta.passScore ? Number(meta.passScore) : null,
        status: meta.status,
      });
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

  async function moveBlock(index: number, delta: -1 | 1) {
    if (!chapter) return;
    const ids = chapter.lessonBlocks.map((b) => b.id);
    const j = index + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    try {
      await contentApi.reorderBlocks(chapterId, ids);
      await load();
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
        {chapter.sourceKey && <span>· {chapter.sourceKey.startsWith("kurikulum:") ? "kurikulum utama" : "dari dataset impor"}</span>}
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
            <label htmlFor="ch-module" className={adminStyles.fieldLabel}>Modul (opsional)</label>
            <input
              id="ch-module"
              className={styles.input}
              value={meta.moduleTitle}
              maxLength={120}
              placeholder="Mis. Fonetik & Kana"
              onChange={(e) => setMeta({ ...meta, moduleTitle: e.target.value })}
            />
            <span className={styles.hint}>Bab berurutan dengan modul yang sama dikelompokkan di jalur belajar siswa.</span>
          </div>
          <div className={styles.field}>
            <label htmlFor="ch-pass" className={adminStyles.fieldLabel}>Nilai lulus kuis</label>
            <input
              id="ch-pass"
              type="number"
              min={1}
              max={100}
              className={styles.input}
              value={meta.passScore}
              placeholder="70"
              onChange={(e) => setMeta({ ...meta, passScore: e.target.value })}
            />
            <span className={styles.hint}>Kosongkan untuk nilai bawaan 70.</span>
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
              {tab === "quiz"
                ? "Siswa harus mendapat nilai minimal 70 untuk menyelesaikan bab."
                : tab === "block"
                  ? "Blok materi tampil paling awal saat siswa membuka bab, sesuai urutan di bawah."
                  : `Urutan tampil sesuai urutan dibuat.`}
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
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <ItemSummary kind={tab} item={item} />
                    </td>
                    <td style={{ width: 1 }}>
                      <div className={adminStyles.actionGroup} style={{ flexWrap: "nowrap" }}>
                        {tab === "block" && (
                          <>
                            <button type="button" className={styles.iconBtn} aria-label="Naikkan" disabled={index === 0} onClick={() => moveBlock(index, -1)}>
                              ↑
                            </button>
                            <button type="button" className={styles.iconBtn} aria-label="Turunkan" disabled={index === items.length - 1} onClick={() => moveBlock(index, 1)}>
                              ↓
                            </button>
                          </>
                        )}
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
