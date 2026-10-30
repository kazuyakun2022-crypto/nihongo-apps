"use client";

import { useCallback, useEffect, useState } from "react";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { contentApi, type ChapterRow, type ContentLevel, type ContentStatus, type ScenarioInput, type ScenarioRow } from "@/features/admin/data/contentApi";
import { SkeletonRegion, SkeletonTableRows } from "@/shared/ui/Skeleton";
import { LevelPicker, useLevelParam } from "./ChapterManager";
import { STATUS_LABEL, useFlash } from "./ContentShell";
import { FormModal, type FieldDef, type FormValues } from "./FormModal";
import styles from "./content.module.css";

function fields(chapters: ChapterRow[]): FieldDef[] {
  return [
    { name: "title", label: "Judul skenario", type: "text", required: true, wide: true },
    { name: "goal", label: "Tujuan siswa", type: "textarea", required: true, hint: "Tampil ke siswa sebelum mulai, mis. \"Tanyakan harga dan minta barang dengan sopan.\"" },
    { name: "mascotRole", label: "Peran Miu-chan", type: "text", required: true, wide: true, hint: "Mis. kasir konbini yang ramah, pelayan restoran, teman sekelas." },
    {
      name: "initialMessage",
      label: "Kalimat pembuka (opsional)",
      type: "textarea",
      jp: true,
      hint: "Furigana pakai format 漢字(かんじ). {{user_name}} diganti nama siswa. Kosongkan agar Miu-chan membuka percakapan sendiri.",
    },
    { name: "targetGrammar", label: "Pola target (opsional)", type: "text", wide: true, jp: true, hint: "Pisahkan dengan titik koma (;), mis. 〜をください; 〜はいくらですか" },
    {
      name: "chapterId",
      label: "Bab terkait (opsional)",
      type: "select",
      options: [{ value: "", label: "Tanpa bab" }, ...chapters.map((c) => ({ value: c.id, label: c.title }))],
      hint: "Tombol latihan ngobrol muncul di akhir bab ini.",
    },
    { name: "maxTurns", label: "Maksimal giliran", type: "number", min: 4, max: 50 },
    { name: "sortOrder", label: "Urutan", type: "number", min: 0, max: 1000 },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft (tersembunyi)" },
        { value: "review", label: "Review (tersembunyi)" },
        { value: "published", label: "Terbit (tampil ke siswa)" },
      ],
    },
  ];
}

const EMPTY: FormValues = { title: "", goal: "", mascotRole: "", initialMessage: "", targetGrammar: "", chapterId: "", maxTurns: 20, sortOrder: 0, status: "draft" };

function toInput(v: FormValues): ScenarioInput {
  const str = (k: string) => String(v[k] ?? "").trim();
  return {
    title: str("title"),
    goal: str("goal"),
    mascotRole: str("mascotRole"),
    initialMessage: str("initialMessage") || null,
    targetGrammar: str("targetGrammar")
      .split(/[;；\n]/)
      .map((g) => g.trim())
      .filter(Boolean),
    chapterId: str("chapterId") || null,
    maxTurns: Number(v.maxTurns) || 20,
    sortOrder: Number(v.sortOrder) || 0,
    status: (str("status") || "draft") as ContentStatus,
  };
}

/** Pengelolaan skenario role-play Miu-chan per level. */
export function ScenarioManager() {
  const flash = useFlash();
  const [levels, setLevels] = useState<ContentLevel[]>([]);
  const [levelId, selectLevel] = useLevelParam(levels);
  const [scenarios, setScenarios] = useState<ScenarioRow[] | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [editing, setEditing] = useState<ScenarioRow | "new" | null>(null);

  useEffect(() => {
    contentApi.levels().then((r) => setLevels(r.levels)).catch(flash.fail);
  }, [flash.fail]);

  const load = useCallback(async () => {
    if (!levelId) return;
    try {
      const [s, c] = await Promise.all([contentApi.scenarios(levelId), contentApi.chapters(levelId)]);
      setScenarios(s.scenarios);
      setChapters(c.chapters);
    } catch (err) {
      flash.fail(err);
    }
  }, [levelId, flash.fail]);

  useEffect(() => {
    setScenarios(null);
    void load();
  }, [load]);

  async function remove(s: ScenarioRow) {
    if (!confirm(`Hapus skenario "${s.title}"?`)) return;
    try {
      const res = await contentApi.deleteScenario(s.id);
      await load();
      flash.ok(res?.archived ? "Skenario sudah pernah dipakai siswa, jadi disembunyikan (draft)." : "Skenario dihapus.");
    } catch (err) {
      flash.fail(err);
    }
  }

  async function toggle(s: ScenarioRow) {
    try {
      await contentApi.updateScenario(s.id, { status: s.status === "published" ? "draft" : "published" });
      await load();
    } catch (err) {
      flash.fail(err);
    }
  }

  return (
    <>
      {flash.node}
      <LevelPicker levels={levels} value={levelId} onChange={selectLevel} meta={(l) => l.name} />

      <section className={adminStyles.panel}>
        <div className={styles.toolbar}>
          <h2 className={adminStyles.panelTitle}>
            Skenario ngobrol <span className={styles.muted}>({scenarios?.length ?? "…"})</span>
          </h2>
          <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={() => setEditing("new")} disabled={!levelId}>
            + Skenario baru
          </button>
        </div>
        <p className={styles.muted}>
          Siswa memilih skenario di Ngobrol → Skenario. Miu-chan memainkan peran, memancing pola target, dan mengoreksi kesalahan di setiap balasan.
        </p>

        {!scenarios ? (
          <SkeletonRegion label="Memuat skenario…" className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <tbody>
                <SkeletonTableRows rows={5} columns={2} />
              </tbody>
            </table>
          </SkeletonRegion>
        ) : scenarios.length === 0 ? (
          <p className={adminStyles.emptyState}>Belum ada skenario di level ini.</p>
        ) : (
          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className={styles.itemMain}>
                        {s.title}{" "}
                        {s.status !== "published" && <span className={`${adminStyles.badge} ${styles.status_draft}`}>{STATUS_LABEL[s.status]}</span>}
                      </div>
                      <div className={styles.muted}>
                        Peran: {s.mascotRole}
                        {s.chapter && ` · Bab: ${s.chapter.title}`} · dipakai {s._count.conversations}×
                      </div>
                      {s.targetGrammar && s.targetGrammar.length > 0 && (
                        <div className={styles.muted} lang="ja">
                          Pola: {s.targetGrammar.join(" ; ")}
                        </div>
                      )}
                    </td>
                    <td style={{ width: 1 }}>
                      <div className={adminStyles.actionGroup} style={{ flexWrap: "nowrap" }}>
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => setEditing(s)}>
                          Edit
                        </button>
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnSecondary}`} onClick={() => toggle(s)}>
                          {s.status === "published" ? "Sembunyikan" : "Terbitkan"}
                        </button>
                        <button type="button" className={`${adminStyles.btnSm} ${adminStyles.btnDanger}`} onClick={() => remove(s)}>
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

      {editing && levelId && (
        <FormModal
          title={editing === "new" ? "Tambah skenario" : "Ubah skenario"}
          fields={fields(chapters)}
          initial={
            editing === "new"
              ? { ...EMPTY, sortOrder: (scenarios?.length ?? 0) + 1 }
              : {
                  ...EMPTY,
                  ...editing,
                  initialMessage: editing.initialMessage ?? "",
                  targetGrammar: (editing.targetGrammar ?? []).join("; "),
                  chapterId: editing.chapterId ?? "",
                }
          }
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            const data = toInput(values);
            if (editing === "new") await contentApi.createScenario(levelId, data);
            else await contentApi.updateScenario(editing.id, data);
            setEditing(null);
            await load();
            flash.ok("Skenario tersimpan.");
          }}
        />
      )}
    </>
  );
}
