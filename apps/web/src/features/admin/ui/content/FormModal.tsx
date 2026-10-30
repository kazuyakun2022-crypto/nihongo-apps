"use client";

import { useState } from "react";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { ImageField } from "./ImageField";
import styles from "./content.module.css";

export type FieldDef =
  | { name: string; label: string; type: "text" | "textarea"; required?: boolean; hint?: string; wide?: boolean; jp?: boolean }
  | { name: string; label: string; type: "number"; min?: number; max?: number; hint?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; hint?: string }
  | { name: string; label: string; type: "choices"; answerName: string; hint?: string }
  | { name: string; label: string; type: "image"; hint?: string };

export type FormValues = Record<string, unknown>;

/**
 * Modal form serbaguna untuk menambah/mengubah materi dan soal.
 * Field "choices" = daftar pilihan jawaban + tombol radio untuk menandai jawaban benar.
 */
export function FormModal({
  title,
  fields,
  initial,
  onSubmit,
  onClose,
}: {
  title: string;
  fields: FieldDef[];
  initial: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<FormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (name: string, value: unknown) => setValues((v) => ({ ...v, [name]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cleaned: FormValues = { ...values };
      for (const f of fields) {
        if (f.type === "choices") cleaned[f.name] = ((values[f.name] as string[]) ?? []).map((o) => o.trim()).filter(Boolean);
        if ((f.type === "text" || f.type === "textarea") && typeof cleaned[f.name] === "string") cleaned[f.name] = (cleaned[f.name] as string).trim();
      }
      await onSubmit(cleaned);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      setSaving(false);
    }
  }

  return (
    <div className={adminStyles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`${adminStyles.modalContent} ${styles.modalWide}`} onSubmit={submit} role="dialog" aria-modal="true" aria-label={title}>
        <h2 className={adminStyles.modalTitle}>{title}</h2>
        <div className={styles.formGrid}>
          {fields.map((f) => (
            <Field key={f.name} def={f} values={values} set={set} />
          ))}
        </div>
        {error && <div className={`${styles.message} ${styles.messageError}`}>{error}</div>}
        <div className={adminStyles.modalButtons}>
          <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} onClick={onClose}>
            Batal
          </button>
          <button type="submit" className={`${styles.btn} ${adminStyles.btnPrimary}`} disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Field({ def, values, set }: { def: FieldDef; values: FormValues; set: (name: string, value: unknown) => void }) {
  const id = `f-${def.name}`;
  const value = values[def.name];

  if (def.type === "choices") {
    const options = (value as string[] | undefined)?.length ? (value as string[]) : ["", "", "", ""];
    const answer = values[def.answerName] as string | undefined;
    const update = (i: number, text: string) => {
      const next = [...options];
      const wasAnswer = answer !== undefined && options[i] === answer;
      next[i] = text;
      set(def.name, next);
      if (wasAnswer) set(def.answerName, text);
    };
    return (
      <fieldset className={`${styles.field} ${styles.fieldWide}`} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className={adminStyles.fieldLabel}>{def.label}</legend>
        {options.map((opt, i) => (
          <div key={i} className={styles.choiceRow}>
            <input
              type="radio"
              name={def.answerName}
              aria-label={`Tandai pilihan ${i + 1} sebagai jawaban benar`}
              checked={!!opt && opt === answer}
              onChange={() => set(def.answerName, opt)}
              disabled={!opt.trim()}
            />
            <input
              className={`${styles.input} ${opt && opt === answer ? styles.choiceCorrect : ""}`}
              value={opt}
              placeholder={`Pilihan ${i + 1}`}
              onChange={(e) => update(i, e.target.value)}
              lang="ja"
            />
            {options.length > 2 && (
              <button type="button" className={styles.iconBtn} aria-label={`Hapus pilihan ${i + 1}`} onClick={() => set(def.name, options.filter((_, j) => j !== i))}>
                ✕
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} style={{ alignSelf: "flex-start" }} onClick={() => set(def.name, [...options, ""])}>
            + Pilihan
          </button>
        )}
        <span className={styles.hint}>{def.hint ?? "Klik bulatan di kiri untuk menandai jawaban yang benar."}</span>
      </fieldset>
    );
  }

  if (def.type === "image") {
    return <ImageField id={id} label={def.label} hint={def.hint} value={value as string | null} onChange={(url) => set(def.name, url)} />;
  }

  const wide = def.type === "textarea" || (def.type === "text" && def.wide);
  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ""}`}>
      <label htmlFor={id} className={adminStyles.fieldLabel}>
        {def.label}
      </label>
      {def.type === "textarea" ? (
        <textarea id={id} className={styles.textarea} value={(value as string) ?? ""} required={def.required} lang={def.jp ? "ja" : undefined} onChange={(e) => set(def.name, e.target.value)} />
      ) : def.type === "select" ? (
        <select id={id} className={styles.select} value={(value as string) ?? ""} onChange={(e) => set(def.name, e.target.value)}>
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : def.type === "number" ? (
        <input id={id} type="number" className={styles.input} min={def.min} max={def.max} value={(value as number) ?? ""} onChange={(e) => set(def.name, e.target.value === "" ? "" : Number(e.target.value))} />
      ) : (
        <input id={id} className={styles.input} value={(value as string) ?? ""} required={def.required} lang={def.jp ? "ja" : undefined} onChange={(e) => set(def.name, e.target.value)} />
      )}
      {def.hint && <span className={styles.hint}>{def.hint}</span>}
    </div>
  );
}
