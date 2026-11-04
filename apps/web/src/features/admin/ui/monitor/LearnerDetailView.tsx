"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { monitorApi, type ChapterProgressItem, type LearnerDetail } from "@/features/admin/data/monitorApi";
import { Skeleton, SkeletonTableRows } from "@/shared/ui/Skeleton";
import { Paged, Pagination, usePaged } from "../Pagination";
import { ActivityHeatmap, Avatar, KpiCard, ProgressBar, daysAgoLabel, fmt, formatDate, levelLabel } from "./charts";
import styles from "./monitor.module.css";
import { CheckIcon } from "@/shared/ui/icons";

const EXAM_TYPE: Record<LearnerDetail["exams"][number]["type"], string> = {
  placement: "Tes penempatan",
  level_up: "Ujian naik level",
  jlpt_sim: "Simulasi JLPT",
};

const SECTION: Record<string, string> = {
  kosakata: "Kosakata",
  tata_bahasa: "Tata bahasa",
  membaca: "Membaca",
  mendengar: "Mendengar",
};

const CHAPTER_STATUS: Record<ChapterProgressItem["status"], { label: string; cls: string }> = {
  completed: { label: "Selesai", cls: styles.badgeGood },
  open: { label: "Sedang dipelajari", cls: styles.badgeWarn },
  locked: { label: "Belum dibuka", cls: "" },
};

const STAGE_STATE = {
  passed: { label: "Sudah dilewati", cls: styles.badgeGood },
  current: { label: "Level saat ini", cls: styles.badgeLevel },
  locked: { label: "Terkunci", cls: "" },
} as const;

const TIMELINE_KIND: Record<LearnerDetail["timeline"][number]["kind"], string> = {
  chapter: "Bab",
  exam: "Ujian",
  conversation: "Ngobrol",
  achievement: "Pencapaian",
};

export function LearnerDetailView({ userId }: { userId: string }) {
  const [data, setData] = useState<LearnerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [levelModal, setLevelModal] = useState(false);

  const load = useCallback(() => {
    monitorApi
      .detail(userId)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [userId]);

  useEffect(load, [load]);

  if (error) return <p className={`${styles.notice} ${styles.noticeError}`}>{error}</p>;
  if (!data) {
    return (
      <div aria-busy="true" aria-label="Memuat data pelajar" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Skeleton height="5rem" radius="var(--radius-md)" />
        <Skeleton height="10rem" radius="var(--radius-md)" />
        <Skeleton height="16rem" radius="var(--radius-md)" />
      </div>
    );
  }

  const p = data.profile;
  const totalDone = data.journey.reduce((a, j) => a + j.chaptersDone, 0);
  const examsPassed = data.exams.filter((e) => e.passed).length;
  const earned = data.achievements.filter((a) => a.earnedAt).length;

  return (
    <>
      <Link href="/admin/pantau" className={styles.backLink}>
        ← Kembali ke Pantau Belajar
      </Link>

      <section className={styles.card}>
        <div className={styles.profileHead}>
          <Avatar name={p.displayName} url={p.avatarUrl} large />
          <div style={{ minWidth: 0 }}>
            <h1 className={styles.profileName}>{p.displayName}</h1>
            <div className={styles.profileMeta}>
              {p.currentLevel ? (
                <span className={`${styles.badge} ${styles.badgeLevel}`}>
                  {levelLabel(p.currentLevel.code)} · {p.currentLevel.name}
                </span>
              ) : (
                <span className={styles.badge}>Belum ditempatkan</span>
              )}
              {p.pendingLevel && <span className={`${styles.badge} ${styles.badgeWarn}`}>Siap ujian ke {levelLabel(p.pendingLevel.code)}</span>}
              {p.premium.active && <span className={`${styles.badge} ${styles.badgeWarn}`}>Premium</span>}
              <span className={`${styles.badge} ${p.status === "active" ? styles.badgeGood : styles.badgeBad}`}>
                {p.status === "active" ? "Akun aktif" : p.status === "suspended" ? "Ditangguhkan" : "Menunggu hapus"}
              </span>
            </div>
            <div className={styles.profileMeta}>
              <span>{p.email ?? "Tanpa email"}</span>
              <span>· Bergabung {formatDate(p.createdAt)}</span>
              <span>· Terakhir belajar: {daysAgoLabel(p.lastActiveDate)}</span>
            </div>
          </div>
          <div className={styles.profileActions}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setLevelModal(true)}>
              Atur level
            </button>
            <Link href="/admin/pengguna" className={styles.btn}>
              Kelola akun
            </Link>
          </div>
        </div>
      </section>

      {notice && <p className={styles.notice}>{notice}</p>}

      <section aria-label="Ringkasan pelajar" className={styles.kpiGrid}>
        <KpiCard label="Total XP" value={p.xpTotal} />
        <KpiCard label="Streak" value={`${fmt(p.streakCount)} hari`} sub={p.dailyTargetMin ? `Target ${p.dailyTargetMin} menit/hari` : undefined} />
        <KpiCard label="Bab selesai" value={totalDone} sub="Di semua level" />
        <KpiCard label="Ujian lulus" value={`${examsPassed} / ${data.exams.length}`} />
        <KpiCard label="Sesi ngobrol" value={data.conversations.total} sub={`${fmt(data.conversations.totalTurns)} giliran bicara`} />
        <KpiCard label="Kartu hafalan" value={data.srs.total} sub={`${fmt(data.srs.mastered)} dikuasai · ${fmt(data.srs.due)} jatuh tempo`} />
        <KpiCard label="Pencapaian" value={`${earned} / ${data.achievements.length}`} />
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Perjalanan level</h2>
        <div className={styles.journey}>
          {data.journey.map((j) => (
            <div
              key={j.id}
              className={`${styles.stage} ${j.state === "current" ? styles.stageCurrent : ""} ${j.state === "locked" && j.chaptersDone === 0 ? styles.stageLocked : ""}`}
            >
              <div className={styles.stageHead}>
                <span className={styles.stageCode}>{levelLabel(j.code)}</span>
                <span className={`${styles.badge} ${STAGE_STATE[j.state].cls}`}>{STAGE_STATE[j.state].label}</span>
              </div>
              <ProgressBar value={j.progress} label={`${j.chaptersDone}/${j.publishedChapters} bab`} />
              <span className={styles.stageStat}>Rata-rata nilai: {j.avgScore ?? "—"}</span>
              <span className={styles.stageStat}>
                Ujian naik level: {j.levelUpAttempts ? `${j.levelUpAttempts}× · terbaik ${j.bestExamScore}` : "belum"}
              </span>
              {j.passedAt && <span className={styles.stageStat}>Lulus {formatDate(j.passedAt)}</span>}
            </div>
          ))}
        </div>
      </section>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Aktivitas 12 minggu terakhir</h2>
          <p className={styles.sectionHint}>Bab selesai, sesi ngobrol, dan ujian per hari.</p>
          <ActivityHeatmap
            days={data.activity.map((d) => ({
              date: d.date,
              total: d.chapters + d.conversations + d.exams,
              detail: [d.chapters && `${d.chapters} bab`, d.conversations && `${d.conversations} ngobrol`, d.exams && `${d.exams} ujian`].filter(Boolean).join(", "),
            }))}
          />
        </section>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Profil belajar</h2>
          <dl className={styles.facts}>
            <dt>Tujuan belajar</dt>
            <dd>{p.learningGoal ?? "—"}</dd>
            <dt>Target harian</dt>
            <dd>{p.dailyTargetMin ? `${p.dailyTargetMin} menit` : "—"}</dd>
            <dt>Paket</dt>
            <dd>
              {p.premium.active ? `Premium${p.premium.plan ? ` (${p.premium.plan === "yearly" ? "tahunan" : "bulanan"})` : ""}` : "Gratis"}
              {p.premium.expiresAt && p.premium.active ? ` · s.d. ${formatDate(p.premium.expiresAt)}` : ""}
            </dd>
            <dt>Role</dt>
            <dd>{p.role}</dd>
            <dt>Email terverifikasi</dt>
            <dd>{p.emailVerified ? "Ya" : "Belum"}</dd>
            <dt>Login terakhir</dt>
            <dd>{formatDate(p.lastLoginAt, true)}</dd>
            <dt>Minat (dari AI)</dt>
            <dd>{data.memories.interests.length ? data.memories.interests.join(", ") : "—"}</dd>
          </dl>
        </section>
      </div>

      <ChapterSection key={p.currentLevel?.id ?? "none"} userId={userId} journey={data.journey} initial={data.currentChapters} initialLevelId={p.currentLevel?.id ?? null} />

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Riwayat ujian</h2>
        {data.exams.length === 0 ? (
          <p className={styles.empty}>Belum pernah mengerjakan ujian.</p>
        ) : (
          <Paged items={data.exams} unit="ujian">
            {(rows) => (
<div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jenis</th>
                  <th>Level</th>
                  <th className={styles.num}>Nilai</th>
                  <th>Hasil</th>
                  <th>Nilai per bagian</th>
                  <th className={styles.num}>Durasi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.takenAt, true)}</td>
                    <td>{EXAM_TYPE[e.type]}</td>
                    <td>
                      {levelLabel(e.levelCode)}
                      {e.passed && e.resultLevelCode && e.resultLevelCode !== e.levelCode && (
                        <span className={styles.muted}> → {levelLabel(e.resultLevelCode)}</span>
                      )}
                    </td>
                    <td className={styles.num}>{e.score}</td>
                    <td>
                      <span className={`${styles.badge} ${e.passed ? styles.badgeGood : styles.badgeBad}`}>{e.passed ? "Lulus" : "Belum lulus"}</span>
                    </td>
                    <td>
                      {e.sectionScores ? (
                        <span className={styles.chips}>
                          {Object.entries(e.sectionScores).map(([k, v]) => (
                            <span key={k} className={styles.badge}>
                              {SECTION[k] ?? k}: {v}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td className={styles.num}>{e.durationMin ? `${e.durationMin} mnt` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </Paged>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Percakapan dengan Miu-chan</h2>
        <p className={styles.sectionHint}>
          {fmt(data.conversations.total)} sesi · {fmt(data.conversations.totalTurns)} giliran bicara
          {data.conversations.avgPronunciation !== null ? ` · rata-rata pelafalan ${data.conversations.avgPronunciation}` : ""}
        </p>
        {data.conversations.recent.length === 0 ? (
          <p className={styles.empty}>Belum pernah ngobrol dengan Miu-chan.</p>
        ) : (
          <Paged items={data.conversations.recent} unit="sesi">
            {(rows) => (
<div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Jenis</th>
                  <th>Level</th>
                  <th className={styles.num}>Giliran</th>
                  <th className={styles.num}>Pelafalan</th>
                  <th className={styles.num}>Durasi</th>
                  <th>Ringkasan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>{formatDate(c.startedAt, true)}</td>
                    <td>
                      {c.scenarioTitle ? `Skenario: ${c.scenarioTitle}` : "Ngobrol bebas"}
                      <span className={styles.userEmail}>{c.inputMode === "voice" ? "Suara" : "Teks"}</span>
                    </td>
                    <td>{levelLabel(c.levelCode)}</td>
                    <td className={styles.num}>{c.turnCount}</td>
                    <td className={styles.num}>{c.pronunciationScore ?? "—"}</td>
                    <td className={styles.num}>{c.durationMin ? `${c.durationMin} mnt` : "—"}</td>
                    <td style={{ whiteSpace: "normal", minWidth: 220 }}>{c.summary ?? <span className={styles.muted}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </Paged>
        )}
      </section>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Hafalan (SRS)</h2>
          {data.srs.total === 0 ? (
            <p className={styles.empty}>Belum punya kartu hafalan.</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Jenis</th>
                    <th className={styles.num}>Kartu</th>
                    <th className={styles.num}>Dikuasai</th>
                    <th className={styles.num}>Jatuh tempo</th>
                    <th className={styles.num}>Lemah</th>
                  </tr>
                </thead>
                <tbody>
                  {data.srs.byType.map((s) => (
                    <tr key={s.type}>
                      <td>{s.type === "vocab" ? "Kosakata" : s.type === "kanji" ? "Kanji" : s.type}</td>
                      <td className={styles.num}>{fmt(s.total)}</td>
                      <td className={styles.num}>{fmt(s.mastered)}</td>
                      <td className={styles.num}>{fmt(s.due)}</td>
                      <td className={styles.num}>{fmt(s.weak)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.sectionHint} style={{ marginTop: "var(--space-2)" }}>
            Dikuasai = interval ulang ≥ 21 hari.
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Kesalahan yang sering muncul</h2>
          <p className={styles.sectionHint}>Dicatat Miu-chan dari percakapan; makin besar bobot, makin sering terulang.</p>
          {data.memories.mistakes.length === 0 ? (
            <p className={styles.empty}>Belum ada catatan kesalahan.</p>
          ) : (
            <ul className={styles.list}>
              {data.memories.mistakes.map((m, i) => (
                <li key={i} className={styles.listItem}>
                  <span>{m.content}</span>
                  <span className={styles.badge}>bobot {m.weight}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>
          Pencapaian ({earned}/{data.achievements.length})
        </h2>
        {data.achievements.length === 0 ? (
          <p className={styles.empty}>Belum ada pencapaian yang didefinisikan.</p>
        ) : (
          <div className={styles.achGrid}>
            {data.achievements.map((a) => (
              <div key={a.id} className={`${styles.ach} ${a.earnedAt ? "" : styles.achLocked}`}>
                <strong>
                  {a.earnedAt && <CheckIcon size={13} strokeWidth={3} />} {a.name}
                </strong>
                <span className={styles.userEmail}>{a.description ?? ""}</span>
                <span className={styles.userEmail}>{a.earnedAt ? `Diraih ${formatDate(a.earnedAt)}` : "Belum diraih"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Linimasa terbaru</h2>
        {data.timeline.length === 0 ? (
          <p className={styles.empty}>Belum ada aktivitas.</p>
        ) : (
          <Paged items={data.timeline} unit="aktivitas">
            {(rows) => (
<ol className={styles.timeline}>
            {rows.map((t, i) => (
              <li key={i} className={styles.timelineItem}>
                <span className={styles.timelineDot} aria-hidden />
                <span>
                  <span className={styles.badge} style={{ marginRight: 6 }}>
                    {TIMELINE_KIND[t.kind]}
                  </span>
                  {t.title}
                  <span className={styles.timelineDetail}>{t.detail}</span>
                </span>
                <span className={styles.muted}>{formatDate(t.at, true)}</span>
              </li>
            ))}
          </ol>
            )}
          </Paged>
        )}
      </section>

      {levelModal && (
        <SetLevelModal
          detail={data}
          onClose={() => setLevelModal(false)}
          onSaved={(code) => {
            setLevelModal(false);
            setNotice(`Level ${p.displayName} diubah ke ${levelLabel(code)}. Perubahan tercatat di log sistem.`);
            load();
          }}
        />
      )}
    </>
  );
}

function ChapterSection({
  userId,
  journey,
  initial,
  initialLevelId,
}: {
  userId: string;
  journey: LearnerDetail["journey"];
  initial: ChapterProgressItem[];
  initialLevelId: number | null;
}) {
  const [levelId, setLevelId] = useState<number | null>(initialLevelId ?? journey[0]?.id ?? null);
  const [chapters, setChapters] = useState<ChapterProgressItem[] | null>(initialLevelId ? initial : null);
  const [statusFilter, setStatusFilter] = useState<"" | ChapterProgressItem["status"]>("");

  useEffect(() => {
    if (levelId === null || levelId === initialLevelId) {
      setChapters(initialLevelId ? initial : []);
      return;
    }
    let cancelled = false;
    setChapters(null);
    monitorApi
      .chapters(userId, levelId)
      .then((c) => !cancelled && setChapters(c))
      .catch(() => !cancelled && setChapters([]));
    return () => {
      cancelled = true;
    };
  }, [userId, levelId, initial, initialLevelId]);

  const shown = useMemo(() => (chapters ?? []).filter((c) => !statusFilter || c.status === statusFilter), [chapters, statusFilter]);
  const done = (chapters ?? []).filter((c) => c.status === "completed").length;
  const { pageItems, offset, pagerProps } = usePaged(shown, `${levelId}|${statusFilter}`, 20);

  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>Progres bab</h2>
      <div className={styles.filters}>
        <select className={styles.select} aria-label="Pilih level" value={levelId ?? ""} onChange={(e) => setLevelId(Number(e.target.value))}>
          {journey.map((j) => (
            <option key={j.id} value={j.id}>
              {levelLabel(j.code)} ({j.chaptersDone}/{j.publishedChapters} bab)
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="Filter status bab"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="">Semua status</option>
          <option value="completed">Selesai</option>
          <option value="open">Sedang dipelajari</option>
          <option value="locked">Belum dibuka</option>
        </select>
        {chapters && <span className={styles.muted}>{done} dari {chapters.length} bab selesai</span>}
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.num}>#</th>
              <th>Modul</th>
              <th>Bab</th>
              <th>Status</th>
              <th className={styles.num}>Nilai terbaik</th>
              <th>Selesai pada</th>
            </tr>
          </thead>
          <tbody>
            {chapters === null ? (
              <SkeletonTableRows rows={6} columns={6} />
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty} style={{ textAlign: "center" }}>
                  Tidak ada bab.
                </td>
              </tr>
            ) : (
              pageItems.map((c, i) => (
                <tr key={c.id}>
                  <td className={styles.num}>{offset + i + 1}</td>
                  <td className={styles.muted}>{c.moduleTitle ?? "—"}</td>
                  <td style={{ whiteSpace: "normal", minWidth: 200 }}>{c.title}</td>
                  <td>
                    <span className={`${styles.badge} ${CHAPTER_STATUS[c.status].cls}`}>{CHAPTER_STATUS[c.status].label}</span>
                  </td>
                  <td className={styles.num}>
                    {c.bestScore === null ? (
                      "—"
                    ) : (
                      <>
                        {c.bestScore}
                        <span className={styles.muted}> / lulus {c.passScore}</span>
                      </>
                    )}
                  </td>
                  <td>{formatDate(c.completedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination {...pagerProps} unit="bab" />
    </section>
  );
}

function SetLevelModal({ detail, onClose, onSaved }: { detail: LearnerDetail; onClose: () => void; onSaved: (code: string) => void }) {
  const [levelId, setLevelId] = useState(detail.profile.currentLevel?.id ?? detail.journey[0]?.id);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    if (!levelId) return;
    setSaving(true);
    setError(null);
    try {
      await monitorApi.setLevel(detail.profile.id, levelId, reason.trim());
      onSaved(detail.journey.find((j) => j.id === levelId)?.code ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah level.");
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="set-level-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="set-level-title">Atur level {detail.profile.displayName}</h2>
        <p className={styles.muted} style={{ margin: 0, fontSize: "var(--font-size-sm)" }}>
          Pelajar langsung ditempatkan di level ini dan status &quot;siap ujian&quot; dihapus. Progres bab yang sudah ada tetap tersimpan.
        </p>
        <label>
          Level baru
          <select className={styles.select} value={levelId} onChange={(e) => setLevelId(Number(e.target.value))}>
            {detail.journey.map((j) => (
              <option key={j.id} value={j.id}>
                {levelLabel(j.code)} · {j.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Alasan (wajib, tercatat di log)
          <input className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. hasil tes penempatan keliru" maxLength={300} />
        </label>
        {error && <p className={`${styles.notice} ${styles.noticeError}`}>{error}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.btn} onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={save}
            disabled={saving || reason.trim().length < 3 || levelId === detail.profile.currentLevel?.id}
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
