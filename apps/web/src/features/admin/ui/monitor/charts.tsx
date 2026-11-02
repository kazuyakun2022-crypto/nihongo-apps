"use client";

import { useState } from "react";
import styles from "./monitor.module.css";

export const fmt = (n: number) => n.toLocaleString("id-ID");

export function levelLabel(code: string | null | undefined): string {
  if (!code) return "Belum ditempatkan";
  return code === "PEMULA" ? "Pemula" : code;
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** "Hari ini", "3 hari lalu", dst. dari tanggal (YYYY-MM-DD atau ISO). */
export function daysAgoLabel(iso: string | null | undefined): string {
  if (!iso) return "Belum pernah";
  const day = new Date(iso.slice(0, 10) + "T00:00:00Z").getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  const diff = Math.round((today - day) / 86_400_000);
  if (diff <= 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  if (diff < 30) return `${diff} hari lalu`;
  if (diff < 365) return `${Math.floor(diff / 30)} bulan lalu`;
  return `${Math.floor(diff / 365)} tahun lalu`;
}

const shortDate = (date: string) => new Date(date + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

export function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{typeof value === "number" ? fmt(value) : value}</span>
      {sub && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={styles.progressCell}>
      <div className={styles.progress} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={styles.progressFill} style={{ width: `${v}%` }} />
      </div>
      <span>{label ?? `${v}%`}</span>
    </div>
  );
}

/** Kolom harian satu deret (satu warna), dengan tooltip per kolom dan tabel data di bawahnya. */
export function DailyColumns({ title, data, unit }: { title: string; data: { date: string; value: number }[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  const hovered = hover === null ? null : data[hover];

  return (
    <div>
      <div className={styles.miniHeader}>
        <span className={styles.miniTitle}>{title}</span>
        <span className={styles.miniTotal}>
          {fmt(total)} {unit}
        </span>
      </div>
      <div className={styles.chartWrap}>
        <div className={styles.columns} onMouseLeave={() => setHover(null)} role="img" aria-label={`${title}: ${fmt(total)} ${unit} dalam ${data.length} hari terakhir`}>
          {data.map((d, i) => (
            <div key={d.date} className={styles.column} onMouseEnter={() => setHover(i)}>
              <div
                className={`${styles.columnFill} ${d.value === 0 ? styles.columnEmpty : ""}`}
                style={{ height: d.value === 0 ? 2 : `${(d.value / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
        {hovered && hover !== null && (
          <div className={styles.tooltip} style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}>
            {shortDate(hovered.date)}: <strong>{fmt(hovered.value)}</strong> {unit}
          </div>
        )}
      </div>
      <div className={styles.axis}>
        <span>{data[0] && shortDate(data[0].date)}</span>
        <span>{data.at(-1) && shortDate(data.at(-1)!.date)}</span>
      </div>
      <details className={styles.dataTable}>
        <summary>Lihat sebagai tabel</summary>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th className={styles.num}>{unit}</th>
            </tr>
          </thead>
          <tbody>
            {data.filter((d) => d.value > 0).map((d) => (
              <tr key={d.date}>
                <td>{shortDate(d.date)}</td>
                <td className={styles.num}>{fmt(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Batang horizontal untuk perbandingan antarkategori (mis. jumlah pelajar per level). */
export function HBarList({ items, suffix = "" }: { items: { label: string; value: number; display?: string }[]; suffix?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={styles.hbars}>
      {items.map((i) => (
        <li key={i.label} className={styles.hbarRow} title={`${i.label}: ${i.display ?? fmt(i.value)}${suffix}`}>
          <span className={styles.hbarLabel}>{i.label}</span>
          <span className={styles.hbarTrack}>
            <span className={styles.hbarFill} style={{ width: `${(i.value / max) * 100}%`, display: "block" }} />
          </span>
          <span className={styles.hbarValue}>
            {i.display ?? fmt(i.value)}
            {suffix}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Peta aktivitas harian (kolom = minggu, baris = hari), satu warna dengan 4 tingkat intensitas. */
export function ActivityHeatmap({ days }: { days: { date: string; total: number; detail: string }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...days.map((d) => d.total));
  const level = (n: number) => (n === 0 ? "" : styles[`heat${Math.min(4, Math.ceil((n / max) * 4))}`]);
  // Isi awal supaya kolom pertama mulai hari Senin
  const firstDow = (new Date(days[0]?.date + "T00:00:00Z").getUTCDay() + 6) % 7;
  const hovered = days.find((d) => d.date === hover);
  const activeDays = days.filter((d) => d.total > 0).length;

  return (
    <div>
      <div className={styles.heatmap} role="img" aria-label={`Aktif ${activeDays} dari ${days.length} hari terakhir`} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: firstDow }, (_, i) => (
          <span key={`pad${i}`} />
        ))}
        {days.map((d) => (
          <span key={d.date} className={`${styles.heatCell} ${level(d.total)}`} onMouseEnter={() => setHover(d.date)} />
        ))}
      </div>
      <div className={styles.heatLegend}>
        <span style={{ marginRight: 6 }}>
          {hovered ? `${shortDate(hovered.date)}: ${hovered.total ? hovered.detail : "tidak ada aktivitas"}` : `Aktif ${activeDays} dari ${days.length} hari`}
        </span>
        <span style={{ marginLeft: "auto" }}>sedikit</span>
        <span className={styles.heatCell} />
        <span className={`${styles.heatCell} ${styles.heat1}`} />
        <span className={`${styles.heatCell} ${styles.heat2}`} />
        <span className={`${styles.heatCell} ${styles.heat3}`} />
        <span className={`${styles.heatCell} ${styles.heat4}`} />
        <span>banyak</span>
      </div>
    </div>
  );
}

export function Avatar({ name, url, large }: { name: string; url: string | null; large?: boolean }) {
  const cls = `${styles.avatar} ${large ? styles.avatarLg : ""}`;
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" className={cls} />;
  return (
    <span className={cls} aria-hidden>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
