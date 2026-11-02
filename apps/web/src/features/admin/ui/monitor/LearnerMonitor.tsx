"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  monitorApi,
  type LearnerFilter,
  type LearnerRow,
  type LearnerSort,
  type LeaderItem,
  type MonitorOverview,
} from "@/features/admin/data/monitorApi";
import { Skeleton, SkeletonTableRows } from "@/shared/ui/Skeleton";
import { Pagination } from "../Pagination";
import { Avatar, DailyColumns, HBarList, KpiCard, ProgressBar, daysAgoLabel, fmt, formatDate, levelLabel } from "./charts";
import styles from "./monitor.module.css";

type Tab = "ringkasan" | "pelajar";

const ACTIVITY_OPTIONS: { value: NonNullable<LearnerFilter["activity"]>; label: string }[] = [
  { value: "today", label: "Aktif hari ini" },
  { value: "7d", label: "Aktif 7 hari terakhir" },
  { value: "30d", label: "Aktif 30 hari terakhir" },
  { value: "inactive7", label: "Tidak aktif > 7 hari" },
  { value: "inactive30", label: "Tidak aktif > 30 hari" },
  { value: "never", label: "Belum pernah belajar" },
];

const STATUS_LABEL: Record<LearnerRow["status"], string> = {
  active: "Aktif",
  suspended: "Ditangguhkan",
  pending_deletion: "Menunggu hapus",
};

export function LearnerMonitor() {
  const [tab, setTab] = useState<Tab>("ringkasan");
  const [overview, setOverview] = useState<MonitorOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LearnerFilter>({ sort: "lastActive", order: "desc", page: 1, pageSize: 20 });

  useEffect(() => {
    monitorApi.overview().then(setOverview).catch((e: Error) => setOverviewError(e.message));
  }, []);

  const openList = (patch: LearnerFilter) => {
    setFilter({ sort: "lastActive", order: "desc", pageSize: 20, ...patch, page: 1 });
    setTab("pelajar");
  };

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Tampilan pemantauan">
        <button type="button" role="tab" className={styles.tab} aria-selected={tab === "ringkasan"} onClick={() => setTab("ringkasan")}>
          Ringkasan
        </button>
        <button type="button" role="tab" className={styles.tab} aria-selected={tab === "pelajar"} onClick={() => setTab("pelajar")}>
          Daftar Pelajar{overview ? ` (${fmt(overview.totals.learners)})` : ""}
        </button>
      </div>

      {tab === "ringkasan" ? (
        overviewError ? (
          <p className={`${styles.notice} ${styles.noticeError}`}>{overviewError}</p>
        ) : overview ? (
          <OverviewPanel data={overview} onOpenList={openList} />
        ) : (
          <OverviewSkeleton />
        )
      ) : (
        <LearnerTable filter={filter} onFilter={setFilter} levels={overview?.levels ?? []} />
      )}
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className={styles.kpiGrid} aria-busy="true" aria-label="Memuat ringkasan">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} height="5.5rem" radius="var(--radius-md)" />
      ))}
    </div>
  );
}

function OverviewPanel({ data, onOpenList }: { data: MonitorOverview; onOpenList: (f: LearnerFilter) => void }) {
  const t = data.totals;
  const pct = (n: number) => (t.learners ? `${Math.round((100 * n) / t.learners)}% dari pelajar` : undefined);

  return (
    <>
      <section aria-label="Angka utama">
        <div className={styles.kpiGrid}>
          <KpiCard label="Total pelajar" value={t.learners} sub={`${fmt(t.premium)} premium · ${fmt(t.newThisWeek)} baru minggu ini`} />
          <KpiCard label="Aktif hari ini" value={t.activeToday} sub={pct(t.activeToday)} />
          <KpiCard label="Aktif 7 hari" value={t.active7d} sub={`${fmt(t.active30d)} aktif 30 hari`} />
          <KpiCard label="Belum ditempatkan" value={t.withoutLevel} sub="Belum ikut tes penempatan" />
          <KpiCard label="Bab selesai" value={t.chaptersCompleted} sub={`${fmt(t.chaptersCompleted7d)} dalam 7 hari`} />
          <KpiCard label="Rata-rata nilai bab" value={t.avgChapterScore ?? "—"} sub="Nilai terbaik kuis per bab" />
          <KpiCard
            label="Ujian dikerjakan"
            value={t.examAttempts}
            sub={t.examPassRate === null ? "Belum ada ujian" : `${t.examPassRate}% lulus`}
          />
          <KpiCard label="Naik level (30 hari)" value={t.levelUps30d} sub="Lulus ujian naik level" />
          <KpiCard label="Sesi ngobrol" value={t.conversations} sub={`${fmt(t.conversations7d)} minggu ini · ${fmt(t.voiceConversations)} suara`} />
          <KpiCard label="Rata-rata streak" value={`${t.avgStreak} hari`} sub={`Terpanjang ${fmt(t.maxStreak)} hari`} />
          <KpiCard label="Total XP" value={t.totalXp} sub={`Rata-rata ${fmt(t.avgXp)} per pelajar`} />
          <KpiCard label="Kartu hafalan (SRS)" value={t.srsCards} sub={`${fmt(t.weakCards)} ditandai lemah`} />
          <KpiCard label="Pencapaian diraih" value={t.achievementsEarned} />
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Aktivitas 30 hari terakhir</h2>
        <div className={styles.grid4}>
          <DailyColumns title="Bab selesai" unit="bab" data={data.daily.map((d) => ({ date: d.date, value: d.chapters }))} />
          <DailyColumns title="Sesi ngobrol" unit="sesi" data={data.daily.map((d) => ({ date: d.date, value: d.conversations }))} />
          <DailyColumns title="Ujian dikerjakan" unit="ujian" data={data.daily.map((d) => ({ date: d.date, value: d.exams }))} />
          <DailyColumns title="Pelajar baru" unit="orang" data={data.daily.map((d) => ({ date: d.date, value: d.signups }))} />
        </div>
      </section>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Sebaran level saat ini</h2>
          <p className={styles.sectionHint}>Jumlah pelajar di tiap tingkat. Klik level untuk melihat daftarnya.</p>
          <HBarList
            items={[
              ...data.levels.map((l) => ({ label: levelLabel(l.code), value: l.learners })),
              ...(t.withoutLevel ? [{ label: "Belum", value: t.withoutLevel }] : []),
            ]}
          />
          <div className={styles.chips} style={{ marginTop: "var(--space-3)" }}>
            {data.levels.map((l) => (
              <button key={l.id} type="button" className={styles.btn} onClick={() => onOpenList({ levelId: l.id, sort: "progress" })}>
                Pelajar {levelLabel(l.code)}
              </button>
            ))}
            {t.withoutLevel > 0 && (
              <button type="button" className={styles.btn} onClick={() => onOpenList({ levelId: "none", sort: "newest" })}>
                Belum ditempatkan
              </button>
            )}
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Naik level terbaru</h2>
          {data.recentLevelUps.length === 0 ? (
            <p className={styles.empty}>Belum ada yang lulus ujian naik level.</p>
          ) : (
            <ul className={styles.list}>
              {data.recentLevelUps.map((e) => (
                <li key={e.id} className={styles.listItem}>
                  <span>
                    <Link href={`/admin/pantau/${e.userId}`} className={styles.userName}>
                      {e.displayName}
                    </Link>
                    <span className={styles.userEmail}>
                      {levelLabel(e.fromLevel)} → {levelLabel(e.toLevel)} · nilai {e.score}
                    </span>
                  </span>
                  <span className={styles.muted}>{formatDate(e.takenAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Progres & kelulusan per level</h2>
        <p className={styles.sectionHint}>Progres = rata-rata bab terbit yang sudah diselesaikan pelajar di level yang sedang ditempatinya.</p>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Level</th>
                <th className={styles.num}>Pelajar</th>
                <th className={styles.num}>Siap ujian</th>
                <th className={styles.num}>Bab terbit</th>
                <th>Rata-rata progres</th>
                <th className={styles.num}>Ujian naik level</th>
                <th className={styles.num}>Kelulusan</th>
                <th className={styles.num}>Rata-rata nilai ujian</th>
              </tr>
            </thead>
            <tbody>
              {data.levels.map((l) => (
                <tr key={l.id}>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeLevel}`}>{levelLabel(l.code)}</span> <span className={styles.muted}>{l.name}</span>
                  </td>
                  <td className={styles.num}>{fmt(l.learners)}</td>
                  <td className={styles.num}>{fmt(l.pendingExam)}</td>
                  <td className={styles.num}>{fmt(l.publishedChapters)}</td>
                  <td>{l.avgProgress === null ? <span className={styles.muted}>—</span> : <ProgressBar value={l.avgProgress} />}</td>
                  <td className={styles.num}>
                    {fmt(l.levelUpPassed)} / {fmt(l.levelUpAttempts)}
                  </td>
                  <td className={styles.num}>{l.passRate === null ? "—" : `${l.passRate}%`}</td>
                  <td className={styles.num}>{l.avgExamScore ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.grid3}>
        <LeaderCard title="XP tertinggi" items={data.topXp} value={(u) => `${fmt(u.xpTotal)} XP`} />
        <LeaderCard title="Streak terpanjang" items={data.topStreak} value={(u) => `${fmt(u.streakCount)} hari`} empty="Belum ada pelajar dengan streak aktif." />
        <LeaderCard
          title="Perlu perhatian"
          hint="Pernah belajar, tapi tidak aktif lebih dari 7 hari."
          items={data.atRisk}
          value={(u) => daysAgoLabel(u.lastActiveDate)}
          empty="Semua pelajar yang pernah belajar masih aktif."
          action={{ label: "Lihat semua", onClick: () => onOpenList({ activity: "inactive7", sort: "xp" }) }}
        />
      </div>
    </>
  );
}

function LeaderCard({
  title,
  hint,
  items,
  value,
  empty = "Belum ada data.",
  action,
}: {
  title: string;
  hint?: string;
  items: LeaderItem[];
  value: (u: LeaderItem) => string;
  empty?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {hint && <p className={styles.sectionHint}>{hint}</p>}
      {items.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ol className={styles.list}>
          {items.map((u, i) => (
            <li key={u.id} className={styles.listItem}>
              <span style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                <span className={styles.rank}>{i + 1}</span>
                <Link href={`/admin/pantau/${u.id}`} className={styles.userName}>
                  {u.displayName}
                </Link>
                <span className={styles.badge}>{levelLabel(u.levelCode)}</span>
              </span>
              <span className={styles.muted}>{value(u)}</span>
            </li>
          ))}
        </ol>
      )}
      {action && items.length > 0 && (
        <button type="button" className={styles.btn} style={{ marginTop: "var(--space-3)" }} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </section>
  );
}

const COLUMNS: { key: LearnerSort | null; label: string; num?: boolean }[] = [
  { key: "name", label: "Pelajar" },
  { key: "level", label: "Level" },
  { key: "progress", label: "Progres level" },
  { key: "chapters", label: "Bab selesai", num: true },
  { key: "score", label: "Rata nilai", num: true },
  { key: null, label: "Ujian lulus", num: true },
  { key: null, label: "Ngobrol", num: true },
  { key: "xp", label: "XP", num: true },
  { key: "streak", label: "Streak", num: true },
  { key: "lastActive", label: "Terakhir aktif" },
  { key: "newest", label: "Bergabung" },
  { key: null, label: "Status" },
  { key: null, label: "Detail" },
];

function LearnerTable({
  filter,
  onFilter,
  levels,
}: {
  filter: LearnerFilter;
  onFilter: (f: LearnerFilter) => void;
  levels: MonitorOverview["levels"];
}) {
  const [rows, setRows] = useState<LearnerRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(filter.q ?? "");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    monitorApi
      .list(filter)
      .then((res) => {
        if (cancelled) return;
        setRows(res.items);
        setTotal(res.total);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  // Pencarian dijalankan setelah berhenti mengetik
  useEffect(() => {
    if ((filter.q ?? "") === search) return;
    const id = setTimeout(() => onFilter({ ...filter, q: search || undefined, page: 1 }), 350);
    return () => clearTimeout(id);
  }, [search, filter, onFilter]);

  const set = (patch: LearnerFilter) => onFilter({ ...filter, ...patch, page: 1 });
  const sortBy = (key: LearnerSort) =>
    onFilter({ ...filter, sort: key, order: filter.sort === key && filter.order === "desc" ? "asc" : "desc", page: 1 });

  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 20;

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const { items } = await monitorApi.exportAll(filter);
      downloadCsv(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengekspor data.");
    } finally {
      setExporting(false);
    }
  }, [filter]);

  const hasFilter = !!(filter.q || filter.levelId || filter.activity || filter.plan || filter.status);

  return (
    <section>
      <div className={styles.filters}>
        <input
          className={styles.input}
          type="search"
          placeholder="Cari nama atau email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari pelajar"
        />
        <select
          className={styles.select}
          aria-label="Filter level"
          value={filter.levelId === undefined ? "" : String(filter.levelId)}
          onChange={(e) => set({ levelId: e.target.value === "" ? undefined : e.target.value === "none" ? "none" : Number(e.target.value) })}
        >
          <option value="">Semua level</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {levelLabel(l.code)}
            </option>
          ))}
          <option value="none">Belum ditempatkan</option>
        </select>
        <select
          className={styles.select}
          aria-label="Filter keaktifan"
          value={filter.activity ?? ""}
          onChange={(e) => set({ activity: (e.target.value || undefined) as LearnerFilter["activity"] })}
        >
          <option value="">Semua keaktifan</option>
          {ACTIVITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="Filter paket"
          value={filter.plan ?? ""}
          onChange={(e) => set({ plan: (e.target.value || undefined) as LearnerFilter["plan"] })}
        >
          <option value="">Semua paket</option>
          <option value="premium">Premium</option>
          <option value="free">Gratis</option>
        </select>
        <select
          className={styles.select}
          aria-label="Filter status akun"
          value={filter.status ?? ""}
          onChange={(e) => set({ status: (e.target.value || undefined) as LearnerFilter["status"] })}
        >
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="suspended">Ditangguhkan</option>
          <option value="pending_deletion">Menunggu hapus</option>
        </select>
        {hasFilter && (
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              setSearch("");
              onFilter({ sort: filter.sort, order: filter.order, page: 1, pageSize });
            }}
          >
            Hapus filter
          </button>
        )}
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={exportCsv} disabled={exporting || total === 0}>
          {exporting ? "Mengekspor…" : "Unduh CSV"}
        </button>
      </div>

      {error && <p className={`${styles.notice} ${styles.noticeError}`}>{error}</p>}

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.label}
                  className={c.label === "Detail" ? styles.actionCell : c.num ? styles.num : undefined}
                  aria-sort={c.key && filter.sort === c.key ? (filter.order === "asc" ? "ascending" : "descending") : undefined}
                >
                  {c.key ? (
                    <button type="button" className={styles.sortBtn} data-active={filter.sort === c.key} onClick={() => sortBy(c.key!)}>
                      {c.label}
                      {filter.sort === c.key ? (filter.order === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <SkeletonTableRows rows={8} columns={COLUMNS.length} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className={styles.empty} style={{ textAlign: "center" }}>
                  Tidak ada pelajar yang cocok dengan filter ini.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className={styles.userCell}>
                      <Avatar name={r.displayName} url={r.avatarUrl} />
                      <span>
                        <Link href={`/admin/pantau/${r.id}`} className={styles.userName}>
                          {r.displayName}
                        </Link>
                        {r.isPremium && (
                          <span className={`${styles.badge} ${styles.badgeWarn}`} style={{ marginLeft: 6 }}>
                            Premium
                          </span>
                        )}
                        <span className={styles.userEmail}>{r.email ?? "—"}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    {r.level ? (
                      <span className={`${styles.badge} ${styles.badgeLevel}`}>{levelLabel(r.level.code)}</span>
                    ) : (
                      <span className={styles.badge}>Belum</span>
                    )}
                    {r.pendingLevelCode && (
                      <span className={styles.userEmail}>Siap ujian ke {levelLabel(r.pendingLevelCode)}</span>
                    )}
                  </td>
                  <td>
                    {r.level ? (
                      <ProgressBar value={r.levelProgress} label={`${r.levelChaptersDone}/${r.levelChaptersTotal} bab · ${r.levelProgress}%`} />
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.num}>{fmt(r.chaptersCompleted)}</td>
                  <td className={styles.num}>{r.avgScore ?? "—"}</td>
                  <td className={styles.num}>
                    {fmt(r.examsPassed)}
                    <span className={styles.muted}> / {fmt(r.examsTaken)}</span>
                  </td>
                  <td className={styles.num}>{fmt(r.conversations)}</td>
                  <td className={styles.num}>{fmt(r.xpTotal)}</td>
                  <td className={styles.num}>{fmt(r.streakCount)}</td>
                  <td>{daysAgoLabel(r.lastActiveDate)}</td>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>
                    <span className={`${styles.badge} ${r.status === "active" ? styles.badgeGood : styles.badgeBad}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                  <td className={styles.actionCell}>
                    <Link href={`/admin/pantau/${r.id}`} className={styles.eyeBtn} aria-label={`Lihat detail ${r.displayName}`} title="Lihat detail">
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        unit="pelajar"
        onPage={(p) => onFilter({ ...filter, page: p })}
        onPageSize={(size) => onFilter({ ...filter, pageSize: size, page: 1 })}
      />
    </section>
  );
}

function downloadCsv(items: LearnerRow[]) {
  const header = [
    "Nama",
    "Email",
    "Level",
    "Siap ujian ke",
    "Bab level selesai",
    "Bab level total",
    "Progres level (%)",
    "Total bab selesai",
    "Rata-rata nilai",
    "Ujian dikerjakan",
    "Ujian lulus",
    "Sesi ngobrol",
    "Pencapaian",
    "XP",
    "Streak",
    "Premium",
    "Status",
    "Terakhir aktif",
    "Login terakhir",
    "Bergabung",
  ];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Cegah formula injection saat dibuka di spreadsheet
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = items.map((r) =>
    [
      r.displayName,
      r.email,
      r.level ? levelLabel(r.level.code) : "Belum ditempatkan",
      r.pendingLevelCode ? levelLabel(r.pendingLevelCode) : "",
      r.levelChaptersDone,
      r.levelChaptersTotal,
      r.levelProgress,
      r.chaptersCompleted,
      r.avgScore,
      r.examsTaken,
      r.examsPassed,
      r.conversations,
      r.achievements,
      r.xpTotal,
      r.streakCount,
      r.isPremium ? "Ya" : "Tidak",
      STATUS_LABEL[r.status],
      r.lastActiveDate?.slice(0, 10),
      r.lastLoginAt?.slice(0, 10),
      r.createdAt.slice(0, 10),
    ]
      .map(cell)
      .join(","),
  );
  const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pantau-belajar-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
