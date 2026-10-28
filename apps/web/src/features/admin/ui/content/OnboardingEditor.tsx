"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { contentApi, type ContentLevel, type OnboardingConfig } from "@/features/admin/data/contentApi";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { Skeleton, SkeletonRegion, SkeletonText } from "@/shared/ui/Skeleton";
import { useFlash } from "./ContentShell";
import styles from "./content.module.css";

type Start = OnboardingConfig["starts"][number];

const TEXT_FIELDS: { key: "title" | "goalQuestion" | "minutesQuestion" | "startQuestion"; label: string }[] = [
  { key: "title", label: "Judul sapaan" },
  { key: "goalQuestion", label: "Pertanyaan tujuan belajar" },
  { key: "minutesQuestion", label: "Pertanyaan menit per hari" },
  { key: "startQuestion", label: "Pertanyaan titik mulai" },
];

/** Kunci tujuan dibuat dari label sekali saja, supaya data tujuan siswa lama tetap cocok saat label diganti. */
function goalKey(label: string, taken: string[]): string {
  const base =
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "tujuan";
  let key = base;
  for (let i = 2; taken.includes(key); i++) key = `${base}-${i}`;
  return key;
}

/** Pengaturan layar pendaftaran awal (/mulai): teks, tujuan belajar, menit harian, dan titik mulai per level. */
export function OnboardingEditor() {
  const flash = useFlash();
  const [levels, setLevels] = useState<ContentLevel[]>([]);
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [saved, setSaved] = useState<OnboardingConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([contentApi.levels(), contentApi.onboarding()])
      .then(([l, o]) => {
        setLevels(l.levels);
        setConfig(o.config);
        setSaved(o.config);
      })
      .catch(flash.fail);
  }, [flash.fail]);

  if (!config) {
    return (
      <SkeletonRegion label="Memuat pengaturan pendaftaran…" style={{ display: "contents" }}>
        {[0, 1, 2].map((i) => (
          <section key={i} className={adminStyles.panel}>
            <Skeleton width="12rem" height="1.25rem" />
            <SkeletonText lines={3} />
          </section>
        ))}
      </SkeletonRegion>
    );
  }

  const dirty = JSON.stringify(config) !== JSON.stringify(saved);
  const update = (patch: Partial<OnboardingConfig>) => setConfig({ ...config, ...patch });
  const updateStart = (levelId: number, patch: Partial<Start>) =>
    update({ starts: config.starts.map((s) => (s.levelId === levelId ? { ...s, ...patch } : s)) });
  const levelOf = (id: number) => levels.find((l) => l.id === id);

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      // Tujuan baru dapat kunci dari labelnya
      const goals = config.goals.reduce<OnboardingConfig["goals"]>((acc, g) => {
        acc.push({ ...g, value: g.value || goalKey(g.label, acc.map((x) => x.value)) });
        return acc;
      }, []);
      const res = await contentApi.saveOnboarding({ ...config, goals });
      setConfig(res.config);
      setSaved(res.config);
      flash.ok("Pengaturan pendaftaran disimpan. Siswa baru langsung melihat perubahan ini.");
    } catch (err) {
      flash.fail(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {flash.node}

      <section className={adminStyles.panel}>
        <h2 className={adminStyles.panelTitle}>Teks layar</h2>
        <div className={styles.formGrid}>
          {TEXT_FIELDS.map((f) => (
            <div key={f.key} className={`${styles.field} ${styles.fieldWide}`}>
              <label htmlFor={`ob-${f.key}`} className={adminStyles.fieldLabel}>{f.label}</label>
              <input id={`ob-${f.key}`} className={styles.input} maxLength={120} value={config[f.key]} onChange={(e) => update({ [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
      </section>

      <section className={adminStyles.panel}>
        <div className={styles.toolbar}>
          <h2 className={adminStyles.panelTitle}>Pilihan tujuan belajar</h2>
          <button
            type="button"
            className={`${styles.btn} ${adminStyles.btnSecondary}`}
            disabled={config.goals.length >= 12}
            onClick={() => update({ goals: [...config.goals, { value: "", label: "" }] })}
          >
            + Tambah tujuan
          </button>
        </div>
        {config.goals.map((g, i) => (
          <div key={i} className={styles.choiceRow}>
            <input
              className={styles.input}
              placeholder="Contoh: Kuliah di Jepang"
              maxLength={80}
              value={g.label}
              aria-label={`Tujuan ${i + 1}`}
              onChange={(e) => update({ goals: config.goals.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
            />
            <button
              type="button"
              className={`${adminStyles.btnSm} ${adminStyles.btnDanger}`}
              disabled={config.goals.length <= 1}
              onClick={() => update({ goals: config.goals.filter((_, j) => j !== i) })}
            >
              Hapus
            </button>
          </div>
        ))}
      </section>

      <section className={adminStyles.panel}>
        <div className={styles.toolbar}>
          <h2 className={adminStyles.panelTitle}>Pilihan menit per hari</h2>
          <button
            type="button"
            className={`${styles.btn} ${adminStyles.btnSecondary}`}
            disabled={config.minuteOptions.length >= 6}
            onClick={() => update({ minuteOptions: [...config.minuteOptions, Math.max(...config.minuteOptions) + 5] })}
          >
            + Tambah pilihan
          </button>
        </div>
        <div className={styles.toolbarGroup} style={{ flexWrap: "wrap" }}>
          {config.minuteOptions.map((m, i) => (
            <div key={i} className={styles.minuteChip}>
              <input
                type="number"
                min={1}
                max={240}
                className={styles.input}
                value={m}
                aria-label={`Pilihan menit ${i + 1}`}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  update({
                    minuteOptions: config.minuteOptions.map((x, j) => (j === i ? value : x)),
                    defaultMinutes: config.defaultMinutes === m ? value : config.defaultMinutes,
                  });
                }}
              />
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={`Hapus ${m} menit`}
                disabled={config.minuteOptions.length <= 1}
                onClick={() => {
                  const rest = config.minuteOptions.filter((_, j) => j !== i);
                  update({ minuteOptions: rest, defaultMinutes: config.defaultMinutes === m ? rest[0] : config.defaultMinutes });
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className={styles.field} style={{ maxWidth: 240 }}>
          <label htmlFor="ob-default-min" className={adminStyles.fieldLabel}>Terpilih otomatis</label>
          <select id="ob-default-min" className={styles.select} value={config.defaultMinutes} onChange={(e) => update({ defaultMinutes: Number(e.target.value) })}>
            {config.minuteOptions.map((m, i) => (
              <option key={i} value={m}>{m} menit</option>
            ))}
          </select>
        </div>
      </section>

      <section className={adminStyles.panel}>
        <h2 className={adminStyles.panelTitle}>Titik mulai per level</h2>
        <p className={styles.muted}>
          Siswa hanya bisa memilih titik mulai yang aktif. Jika wajib tes, siswa harus lulus tes penempatan level itu dulu; soal dan aturannya
          diatur di tab Ujian. Siswa belajar di level yang dipilih dan level di bawahnya; level di atasnya terbuka lewat tes naik tahap.
        </p>
        <div className={styles.startList}>
          {config.starts.map((s) => {
            const level = levelOf(s.levelId);
            return (
              <div key={s.levelId} className={`${styles.startCard} ${s.enabled ? "" : styles.startCardOff}`}>
                <div className={styles.startHead}>
                  <strong>
                    {level?.code === "PEMULA" ? "Pemula (Pra-N5)" : level?.code ?? `Level ${s.levelId}`}
                    <span className={styles.muted}> · {level?.name}</span>
                  </strong>
                  <div className={styles.toolbarGroup}>
                    <label className={styles.check}>
                      <input type="checkbox" checked={s.enabled} onChange={(e) => updateStart(s.levelId, { enabled: e.target.checked })} />
                      Aktif
                    </label>
                    <label className={styles.check}>
                      <input type="checkbox" checked={s.requiresTest} onChange={(e) => updateStart(s.levelId, { requiresTest: e.target.checked })} />
                      Wajib tes penempatan
                    </label>
                    {s.requiresTest && (
                      <Link href={`/admin/konten/ujian?jenis=penempatan&level=${s.levelId}`} className={styles.inlineLink}>
                        Atur soal tes ({level?.placementQuestions ?? 0})
                      </Link>
                    )}
                  </div>
                </div>
                <div className={styles.startFields}>
                  <div className={styles.field}>
                    <label htmlFor={`ob-label-${s.levelId}`} className={adminStyles.fieldLabel}>Label</label>
                    <input id={`ob-label-${s.levelId}`} className={styles.input} maxLength={80} value={s.label} onChange={(e) => updateStart(s.levelId, { label: e.target.value })} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`ob-hint-${s.levelId}`} className={adminStyles.fieldLabel}>Keterangan</label>
                    <input id={`ob-hint-${s.levelId}`} className={styles.input} maxLength={120} value={s.hint} onChange={(e) => updateStart(s.levelId, { hint: e.target.value })} />
                  </div>
                </div>
                {s.enabled && s.requiresTest && level && level.placementQuestions === 0 && (
                  <span className={styles.warn}>Bank soal penempatan masih kosong; tes memakai soal pilihan ganda dari bab level sebelumnya.</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className={styles.toolbar}>
        <span className={styles.muted}>{dirty ? "Ada perubahan yang belum disimpan." : ""}</span>
        <button type="button" className={`${styles.btn} ${adminStyles.btnPrimary}`} onClick={save} disabled={!dirty || saving}>
          {saving ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
      </div>
    </>
  );
}
