"use client";

import { useCallback, useEffect, useState } from "react";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { contentApi, type ChapterRow, type ContentLevel, type ContentStatus, type ScenarioInput, type ScenarioRow } from "@/features/admin/data/contentApi";
import { SkeletonRegion, SkeletonTableRows } from "@/shared/ui/Skeleton";
import { Pagination, usePaged } from "../Pagination";
import { LevelPicker, useLevelParam } from "./ChapterManager";
import { STATUS_LABEL, useFlash } from "./ContentShell";
import { FormModal, type FieldDef, type FormValues } from "./FormModal";
import styles from "./content.module.css";
import { askConfirm } from "@/shared/ui/confirmDialog";

const PRESET_SCENARIO_IMAGES = [
  { value: "/images/scenarios/01_Misi_Pertama_di_Konbini.png", label: "01. Kasir Minimarket Konbini (Pre-N5 / N5)" },
  { value: "/images/scenarios/02_Tersesat_di_Stasiun_Shinjuku.png", label: "02. Tersesat di Stasiun Shinjuku (N5)" },
  { value: "/images/scenarios/03_Memesan_Ramen_dengan_Mesin_Tiket.png", label: "03. Pesan Ramen Mesin Tiket (N5)" },
  { value: "/images/scenarios/04_Check_in_di_Ryokan_Tradisional.png", label: "04. Check-in Ryokan Tradisional Kyoto (N5)" },
  { value: "/images/scenarios/05_Belanja_Baju_dan_Mencari_Ukuran.png", label: "05. Belanja Baju & Kamar Pas Shibuya (N5)" },
  { value: "/images/scenarios/06_Memilah_Sampah_di_Apartemen.png", label: "06. Aturan Pemilahan Sampah Apartemen (N4)" },
  { value: "/images/scenarios/07_Menerima_Paket_dari_Kurir.png", label: "07. Menerima Kiriman Paket Kurir Takkyubin (N4)" },
  { value: "/images/scenarios/08_Hari_Pertama_Kerja_Part_time.png", label: "08. Hari Pertama Arubaito Restoran (N4)" },
  { value: "/images/scenarios/09_Nongkrong_di_Izakaya_Bersama_Teman.png", label: "09. Sosialisasi & Toast Izakaya Shinjuku (N4)" },
  { value: "/images/scenarios/10_Masuk_Angin_Pergi_ke_Klinik_Lokal.png", label: "10. Berobat Masuk Angin di Klinik Lokal (N4)" },
  { value: "/images/scenarios/11_Melaporkan_Barang_Hilang_di_Koban.png", label: "11. Laporan Hilang di Pos Polisi Koban (N4)" },
  { value: "/images/scenarios/12_Potong_Rambut_di_Salon_Jepang.png", label: "12. Salon Potong Rambut Harajuku (N3)" },
  { value: "/images/scenarios/13_Nonton_Anime_dan_Bahas_Hobi_di_Akihabara.png", label: "13. Pop Culture & Anime Akihabara (N3)" },
  { value: "/images/scenarios/14_Menolak_Ajakan_dengan_Halus.png", label: "14. Menolak Ajakan Halus Etika Nuansa (N3)" },
  { value: "/images/scenarios/15_Wawancara_Kerja_di_Perusahaan_Jepang.png", label: "15. Wawancara Kerja Formal Perusahaan (N2)" },
];

function fields(chapters: ChapterRow[]): FieldDef[] {
  return [
    { name: "title", label: "Judul skenario", type: "text", required: true, wide: true },
    {
      name: "imageUrl",
      label: "Gambar Situasi (Preset 12 Situasi Jepang)",
      type: "select",
      options: PRESET_SCENARIO_IMAGES,
      wide: true,
      hint: "Pilih salah satu dari 12 situasi ilustrasi khas Jepang.",
    },
    {
      name: "location",
      label: "Lokasi / Latar Situasi",
      type: "text",
      wide: true,
      hint: "Mis. Kasir Konbini di Tokyo, Ryokan Tradisional Kyoto.",
    },
    {
      name: "userRole",
      label: "Peran Siswa",
      type: "text",
      hint: "Mis. Pembeli (Siswa), Tamu Ryokan, Pelamar Kerja.",
    },
    {
      name: "mascotRole",
      label: "Peran Miu-chan",
      type: "text",
      required: true,
      hint: "Mis. Kasir Konbini yang ramah, Pelayan Izakaya, Pewawancara.",
    },
    {
      name: "keigoType",
      label: "Ragam Bahasa / Tingkat Keigo",
      type: "text",
      hint: "Mis. Teineigo / Desu-Masu, Sonkeigo & Kenjougo, Futsuukei (Kasual).",
    },
    {
      name: "goal",
      label: "Target Misi Siswa",
      type: "textarea",
      required: true,
      hint: 'Tampil ke siswa sebelum mulai, mis. "Membeli bento, minta dipanaskan, dan menolak kantong plastik."',
    },
    {
      name: "initialMessage",
      label: "Kalimat pembuka (opsional)",
      type: "textarea",
      jp: true,
      hint: "Furigana pakai format 漢字(かんじ). {{user_name}} diganti nama siswa. Kosongkan agar Miu-chan membuka percakapan sendiri.",
    },
    {
      name: "targetGrammar",
      label: "Pola target (opsional)",
      type: "text",
      wide: true,
      jp: true,
      hint: "Pisahkan dengan titik koma (;), mis. 〜をください; 〜はいくらですか",
    },
    {
      name: "chapterId",
      label: "Bab terkait (opsional)",
      type: "select",
      options: [{ value: "", label: "Tanpa bab" }, ...chapters.map((c) => ({ value: c.id, label: c.title }))],
      hint: "Tombol latihan ngobrol muncul di akhir bab ini.",
    },
    {
      name: "systemPrompt",
      label: "Instruksi Khusus AI (System Prompt)",
      type: "textarea",
      hint: "Instruksi prompt tambahan untuk Neko-sensei dalam mengarahkan skenario ini.",
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

const EMPTY: FormValues = {
  title: "",
  imageUrl: "",
  location: "",
  userRole: "",
  mascotRole: "",
  keigoType: "",
  goal: "",
  initialMessage: "",
  targetGrammar: "",
  chapterId: "",
  systemPrompt: "",
  maxTurns: 20,
  sortOrder: 0,
  status: "draft",
};

function toInput(v: FormValues): ScenarioInput {
  const str = (k: string) => String(v[k] ?? "").trim();
  return {
    title: str("title"),
    imageUrl: str("imageUrl") || null,
    location: str("location") || null,
    userRole: str("userRole") || null,
    mascotRole: str("mascotRole"),
    keigoType: str("keigoType") || null,
    goal: str("goal"),
    initialMessage: str("initialMessage") || null,
    systemPrompt: str("systemPrompt") || null,
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
    if (
      !(await askConfirm({
        title: `Hapus skenario "${s.title}"?`,
        description: "Skenario ini tidak akan bisa dipilih pelajar lagi.",
      }))
    )
      return;
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

  const { pageItems, pagerProps } = usePaged(scenarios ?? [], levelId, 20);

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
          Siswa memilih skenario di Ngobrol → Skenario. Miu-chan memainkan peran sesuai situasi (kasir, resepsionis, dokter, teman), memancing pola target, dan mengoreksi kesalahan di setiap balasan.
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
                {pageItems.map((s) => (
                  <tr key={s.id}>
                    <td style={{ width: 68, verticalAlign: "top", paddingRight: 4 }}>
                      {s.imageUrl ? (
                        <img
                          src={s.imageUrl}
                          alt={s.title}
                          style={{
                            width: 60,
                            height: 44,
                            objectFit: "cover",
                            borderRadius: 6,
                            border: "1px solid var(--color-border)",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 60,
                            height: 44,
                            background: "var(--color-bg)",
                            borderRadius: 6,
                            border: "1px dashed var(--color-border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.68rem",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          No img
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={styles.itemMain}>
                        {s.title}{" "}
                        {s.status !== "published" && (
                          <span className={`${adminStyles.badge} ${styles.status_draft}`}>
                            {STATUS_LABEL[s.status]}
                          </span>
                        )}
                      </div>
                      <div className={styles.muted} style={{ fontSize: "0.82rem", marginTop: 2 }}>
                        {s.location && <span>📍 {s.location} · </span>}
                        <span>👤 {s.userRole || "Siswa"} ⇄ 🐱 {s.mascotRole}</span>
                        {s.keigoType && <span> · 🗣️ {s.keigoType}</span>}
                        {s.chapter && <span> · Bab: {s.chapter.title}</span>}
                        <span> · dipakai {s._count.conversations}×</span>
                      </div>
                      {s.targetGrammar && s.targetGrammar.length > 0 && (
                        <div className={styles.muted} lang="ja" style={{ fontSize: "0.78rem" }}>
                          Pola: {s.targetGrammar.join(" ; ")}
                        </div>
                      )}
                    </td>
                    <td style={{ width: 1, verticalAlign: "middle" }}>
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
        <Pagination {...pagerProps} unit="skenario" />
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
                  imageUrl: editing.imageUrl ?? "",
                  location: editing.location ?? "",
                  userRole: editing.userRole ?? "",
                  keigoType: editing.keigoType ?? "",
                  systemPrompt: editing.systemPrompt ?? "",
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
