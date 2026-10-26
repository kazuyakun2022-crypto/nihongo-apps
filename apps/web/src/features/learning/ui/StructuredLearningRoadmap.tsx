"use client";

import { useState, useRef } from "react";
import styles from "./learningRoadmap.module.css";
import {
  CURRICULUM_BLUEPRINT_DATA,
  CurriculumLevel,
  CurriculumModule,
  StageUnit,
  LevelGatewayExam,
} from "../domain/curriculumBlueprint";

interface SubCategoryScoreBreakdown {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  passingMark: number;
  passed: boolean;
}

interface EvaluationResult {
  passed: boolean;
  totalScore: number;
  maxTotalScore: number;
  passingTotalScore: number;
  subCategoryResults: SubCategoryScoreBreakdown[];
  failedCategories: string[];
}

export function StructuredLearningRoadmap() {
  const [levels, setLevels] = useState<CurriculumLevel[]>(CURRICULUM_BLUEPRINT_DATA);
  const [currentLevelCode, setCurrentLevelCode] = useState<string>("Pra-N5");
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [activeModalStage, setActiveModalStage] = useState<StageUnit | null>(null);
  const [lockAlertMessage, setLockAlertMessage] = useState<string | null>(null);

  // Mouse & touch drag gestures
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = useRef<number>(0);

  // Gateway Exam Modal States
  const [gatewayExamModalLevel, setGatewayExamModalLevel] = useState<CurriculumLevel | null>(null);
  const [examUserAnswers, setExamUserAnswers] = useState<Record<string, string>>({});
  const [examEvaluationResult, setExamEvaluationResult] = useState<EvaluationResult | null>(null);

  // Level aktif saat ini
  const activeLevel = levels.find((l) => l.code === currentLevelCode) || levels[0];
  const activeModules = activeLevel.modules;
  const featuredModule = activeModules[currentSlideIndex] || activeModules[0];
  const activeModule = activeModules.find((m) => m.id === selectedModuleId) || null;

  // Total progres level aktif
  const totalStagesInLevel = activeModules.reduce((acc, m) => acc + m.stages.length, 0);
  const completedStagesInLevel = activeModules.reduce(
    (acc, m) => acc + m.stages.filter((s) => s.status === "completed").length,
    0
  );
  const overallPercent = totalStagesInLevel > 0
    ? Math.min(100, Math.max(1, Math.round((completedStagesInLevel / totalStagesInLevel) * 100)))
    : 0;

  // Ganti level (Pra-N5, N5, N4, N3, N2, N1)
  function handleSelectLevel(level: CurriculumLevel) {
    if (level.isLocked) {
      setLockAlertMessage(`Tingkatan "${level.name}" masih terkunci. Anda harus lulus Ujian Kenaikan Tingkat pada level sebelumnya terlebih dahulu.`);
      return;
    }
    setLockAlertMessage(null);
    setCurrentLevelCode(level.code);
    setCurrentSlideIndex(0);
    setSelectedModuleId(null);
  }

  function nextSlide() {
    if (currentSlideIndex < activeModules.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
      setLockAlertMessage(null);
    }
  }

  function prevSlide() {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
      setLockAlertMessage(null);
    }
  }

  // Pointer & Touch handlers untuk geser kartu
  function handlePointerDown(clientX: number) {
    setIsDragging(true);
    startXRef.current = clientX;
    setDragOffset(0);
  }

  function handlePointerMove(clientX: number) {
    if (!isDragging) return;
    const diff = clientX - startXRef.current;
    if (Math.abs(diff) < 140) {
      setDragOffset(diff);
    }
  }

  function handlePointerUp() {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset < -45) {
      nextSlide();
    } else if (dragOffset > 45) {
      prevSlide();
    }
    setDragOffset(0);
  }

  function handleModuleClick(mod: CurriculumModule) {
    if (isDragging || Math.abs(dragOffset) > 5) return;
    if (mod.isLocked) {
      setLockAlertMessage(`Modul "${mod.title}" terkunci. ${mod.lockRequirement}`);
      return;
    }
    setLockAlertMessage(null);
    setSelectedModuleId(mod.id);
  }

  function handleCompleteStage(stageId: string) {
    if (!activeModule) return;

    setLevels((prevLevels) =>
      prevLevels.map((lvl) => {
        if (lvl.id !== activeLevel.id) return lvl;
        const nextModules = lvl.modules.map((m) => {
          if (m.id !== activeModule.id) return m;
          const stageIndex = m.stages.findIndex((s) => s.id === stageId);
          if (stageIndex === -1) return m;

          const updatedStages = m.stages.map((s, idx) => {
            if (idx === stageIndex) {
              return { ...s, status: "completed" as const, score: 100 };
            }
            if (idx === stageIndex + 1 && s.status === "locked") {
              return { ...s, status: "active" as const };
            }
            return s;
          });
          return { ...m, stages: updatedStages };
        });

        return { ...lvl, modules: nextModules };
      })
    );
    setActiveModalStage(null);
  }

  // Buka Modal Ujian Kenaikan Tingkat
  function handleOpenGatewayExam(level: CurriculumLevel) {
    setGatewayExamModalLevel(level);
    setExamUserAnswers({});
    setExamEvaluationResult(null);
  }

  // Simulasi tuntaskan semua unit (demo developer)
  function handleSimulateCompleteAllUnits(levelId: string) {
    setLevels((prev) =>
      prev.map((lvl) => {
        if (lvl.id !== levelId) return lvl;
        const allCompletedModules = lvl.modules.map((m) => ({
          ...m,
          isLocked: false,
          stages: m.stages.map((s) => ({ ...s, status: "completed" as const, score: 100 })),
        }));
        return { ...lvl, modules: allCompletedModules };
      })
    );
  }

  // Evaluasi Jawaban Ujian Gateway (Strict Gatekeeping Rules)
  function handleSubmitGatewayExam() {
    if (!gatewayExamModalLevel) return;
    const exam = gatewayExamModalLevel.gatewayExam;
    const questions = exam.questions;

    // Hitung per sub-kategori
    const categoryScores: Record<string, number> = {
      pengetahuan_bahasa: 0,
      bunpou_dokkai: 0,
      choukai: 0,
    };

    questions.forEach((q) => {
      if (examUserAnswers[q.id] === q.correctAnswer) {
        categoryScores[q.category] = (categoryScores[q.category] || 0) + q.point;
      }
    });

    const subCategoryResults: SubCategoryScoreBreakdown[] = exam.rules.map((rule) => {
      const score = categoryScores[rule.id] || 0;
      const passed = score >= rule.passingMark;
      return {
        id: rule.id,
        name: rule.name,
        score,
        maxScore: rule.maxScore,
        passingMark: rule.passingMark,
        passed,
      };
    });

    const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
    const failedCategories = subCategoryResults.filter((r) => !r.passed).map((r) => r.name);

    // GATEKEEPING RULE: Lulus total skor DAN lulus passing mark di SEMUA sub-kategori!
    const allCategoriesPassed = failedCategories.length === 0;
    const totalScorePassed = totalScore >= exam.passingTotalScore;
    const passed = allCategoriesPassed && totalScorePassed;

    setExamEvaluationResult({
      passed,
      totalScore,
      maxTotalScore: exam.maxTotalScore,
      passingTotalScore: exam.passingTotalScore,
      subCategoryResults,
      failedCategories,
    });
  }

  // Eksekusi Naik Tingkat (Buka Level Berikutnya & Geser)
  function handleAdvanceToNextLevel(passedLevelCode: string) {
    const currentIndex = levels.findIndex((l) => l.code === passedLevelCode);
    const nextLevel = levels[currentIndex + 1];

    if (!nextLevel) return;

    setLevels((prev) =>
      prev.map((lvl, idx) => {
        if (idx === currentIndex + 1) {
          // Buka level berikutnya
          const unlockedModules = lvl.modules.map((m, mIdx) => {
            if (mIdx === 0) {
              const unlockedStages = m.stages.map((st, sIdx) =>
                sIdx === 0 ? { ...st, status: "active" as const } : st
              );
              return { ...m, isLocked: false, stages: unlockedStages };
            }
            return m;
          });
          return { ...lvl, isLocked: false, modules: unlockedModules };
        }
        return lvl;
      })
    );

    setGatewayExamModalLevel(null);
    setCurrentLevelCode(nextLevel.code);
    setCurrentSlideIndex(0);
    setSelectedModuleId(null);
  }

  return (
    <div className={styles.roadmapWrap}>
      {/* ── TOP BAR: LEVEL SELECTOR & PROGRES GLOBAL ── */}
      <div className={styles.topBar}>
        <div className={styles.titleSection}>
          <h1 className={styles.pageTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Layar Belajar
          </h1>

          {/* 6 Level Resmi Sesuai Blueprint JLPT */}
          <div className={styles.levelPills}>
            {levels.map((lvl) => {
              const isActive = lvl.code === currentLevelCode;
              const isLock = lvl.isLocked;

              return (
                <button
                  key={lvl.id}
                  type="button"
                  className={`${styles.levelPillBtn} ${isActive ? styles.levelPillBtnActive : ""} ${isLock ? styles.levelPillBtnLocked : ""}`}
                  onClick={() => handleSelectLevel(lvl)}
                  title={isLock ? `Tingkatan ${lvl.name} terkunci` : lvl.name}
                >
                  {isLock && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                  {lvl.code}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progres Tingkatan Saat Ini */}
        <div className={styles.progressBox}>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>Progres {activeLevel.code}</span>
            <span className={styles.progressDetail}>
              {completedStagesInLevel} dari {totalStagesInLevel} Unit Selesai
            </span>
          </div>
          <div className={styles.progressGauge}>
            <div className={styles.progressBar}>
              <div className={styles.progressBarFill} style={{ width: `${overallPercent}%` }} />
            </div>
            <span className={styles.progressPercentText}>{overallPercent}%</span>
          </div>
        </div>
      </div>

      {/* ── MATRIKS STANDAR KEMAMPUAN (TARGET DASHBOARD) SESUAI BLUEPRINT HALAMAN 1 ── */}
      <section className={styles.matriksBanner}>
        <div className={styles.matriksTopRow}>
          <div className={styles.matriksLevelBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{activeLevel.name} · {activeLevel.japaneseLabel}</span>
          </div>

          <div className={styles.matriksMetricsList}>
            <div className={styles.matriksPill}>
              <span>Target Kanji:</span>
              <span className={styles.matriksPillStrong}>{activeLevel.targetKanji}</span>
            </div>
            <div className={styles.matriksPill}>
              <span>Target Kosakata:</span>
              <span className={styles.matriksPillStrong}>{activeLevel.targetKosakata}</span>
            </div>
          </div>
        </div>

        <div className={styles.matriksFokusRow}>
          <div className={styles.matriksFokusText}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span><strong>Fokus Pembelajaran:</strong> {activeLevel.fokusPembelajaran}</span>
          </div>

          <div className={styles.matriksGatekeepingTag}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Gatekeeping: Lulus Passing Mark Tiap Sub-Kategori</span>
          </div>
        </div>
      </section>

      {/* Alert Warning */}
      {lockAlertMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#991b1b",
            fontSize: "0.84rem",
            fontWeight: "600",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>{lockAlertMessage}</span>
          <button
            type="button"
            onClick={() => setLockAlertMessage(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#991b1b", cursor: "pointer", fontSize: "1rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── KONDISI 1: SLIDER CARD BESAR MUNCUL SENDIRI (GESER KE SAMPING) ── */}
      {!selectedModuleId && featuredModule && (
        <div className={styles.sliderSection}>
          <div className={styles.sliderHintRow}>
            <span>Geser kartu ke samping untuk melihat modul silabus berikutnya</span>
            <span className={styles.sliderCounter}>
              Modul {currentSlideIndex + 1} dari {activeModules.length}
            </span>
          </div>

          <div
            className={styles.sliderContainer}
            onMouseDown={(e) => handlePointerDown(e.clientX)}
            onMouseMove={(e) => handlePointerMove(e.clientX)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
            onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
            onTouchEnd={handlePointerUp}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            {/* Tombol Geser Kiri */}
            <button
              type="button"
              className={`${styles.navArrowBtn} ${styles.navArrowLeft}`}
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              disabled={currentSlideIndex === 0}
              aria-label="Modul Sebelumnya"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Card Besar Utama dengan Real-time Gesture Drag */}
            <div
              key={featuredModule.id}
              className={styles.featuredCardWrap}
              style={{
                transform: `translateX(${dragOffset}px)`,
                transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <div
                className={`${styles.featuredCard} ${featuredModule.isLocked ? styles.featuredCardLocked : styles.featuredCardActive}`}
                onClick={() => handleModuleClick(featuredModule)}
              >
                {/* Gembok Watermark untuk Modul Terkunci */}
                {featuredModule.isLocked && (
                  <svg className={styles.bigLockWatermark} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}

                <div className={styles.cardTopRow}>
                  <div className={styles.themeBadgeWrap}>
                    <div className={`${styles.themeIconBox} ${featuredModule.isLocked ? styles.themeIconBoxLocked : styles.themeIconBoxActive}`}>
                      {featuredModule.isLocked ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                      )}
                    </div>
                    <div className={styles.themeLabelArea}>
                      <span className={styles.themeSubtitleJp}>Modul 0{featuredModule.moduleNumber} · {featuredModule.japaneseTitle}</span>
                      <h2 className={styles.themeMainTitle}>{featuredModule.title}</h2>
                    </div>
                  </div>

                  <span className={featuredModule.isLocked ? styles.statusPillLocked : styles.statusPillActive}>
                    {featuredModule.isLocked ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Terkunci
                      </>
                    ) : (
                      "Terbuka · Siap Belajar"
                    )}
                  </span>
                </div>

                <div className={styles.cardBodyArea}>
                  <p className={styles.cardDesc}>{featuredModule.description}</p>

                  {/* Keterangan Syarat jika Modul Terkunci */}
                  {featuredModule.isLocked && (
                    <div className={styles.lockedNoticeBox}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>{featuredModule.lockRequirement}</span>
                    </div>
                  )}

                  {/* ── URUTAN TAHAP UNIT DI DALAM CARD BESAR (SCROLLER HORIZONTAL) ── */}
                  <div className={styles.cardStagesWrapper}>
                    <div className={styles.cardStagesHeader}>
                      <span>Urutan Tahap Unit Modul:</span>
                      <span className={styles.cardStagesSwipeHint}>Geser samping ⇄</span>
                    </div>

                    <div
                      className={styles.cardStagesScroller}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {featuredModule.stages.map((st) => (
                        <div
                          key={st.id}
                          className={`${styles.cardStageMiniCard} ${
                            st.status === "completed"
                              ? styles.stageMiniCompleted
                              : st.status === "active"
                              ? styles.stageMiniActive
                              : styles.stageMiniLocked
                          }`}
                        >
                          <div className={styles.stageMiniTop}>
                            <span className={styles.stageMiniNum}>Unit 0{st.unitNumber}</span>
                            <span className={styles.stageMiniStatus}>
                              {st.status === "completed"
                                ? "Selesai"
                                : st.status === "active"
                                ? "Aktif"
                                : "Terkunci"}
                            </span>
                          </div>
                          <div className={styles.stageMiniTitle}>{st.title}</div>
                          <div className={styles.stageMiniSubtitle}>{st.subtitle}</div>
                        </div>
                      ))}

                      {/* ★ KARTU GATEWAY UJIAN KENAIKAN TINGKAT SAAT INI UNTUK NAIK LEVEL ★ */}
                      <div
                        className={`${styles.cardFinalExamMini} ${
                          activeLevel.gatewayExam.questions.length > 0
                            ? styles.finalExamMiniReady
                            : styles.finalExamMiniLocked
                        }`}
                        onClick={() => handleOpenGatewayExam(activeLevel)}
                        title="Klik untuk melihat Ujian Kenaikan Tingkat"
                      >
                        <div className={styles.finalExamMiniBadge}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                            <path d="M4 22h16" />
                            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                          </svg>
                          Gateway Ujian
                        </div>
                        <div className={styles.finalExamMiniTitle}>
                          {activeLevel.gatewayExam.title}
                        </div>
                        <div className={styles.finalExamMiniTarget}>
                          Syarat Mutlak Naik ke: {activeLevel.gatewayExam.targetLevelName}
                        </div>
                        <div className={styles.finalExamMiniBtn}>
                          Mulai Ujian Kenaikan Tingkat →
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.cardBottomArea}>
                  <span className={styles.cardProgressText}>
                    {featuredModule.isLocked
                      ? "Terkunci: selesaikan modul sebelumnya"
                      : `${featuredModule.stages.filter((s) => s.status === "completed").length} dari ${featuredModule.stages.length} Unit Selesai`}
                  </span>

                  <button
                    type="button"
                    className={`${styles.enterThemeBtn} ${featuredModule.isLocked ? styles.enterThemeBtnLocked : styles.enterThemeBtnActive}`}
                  >
                    {featuredModule.isLocked ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Terkunci
                      </>
                    ) : (
                      <>
                        Masuk Pelajari Modul Ini
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Tombol Geser Kanan */}
            <button
              type="button"
              className={`${styles.navArrowBtn} ${styles.navArrowRight}`}
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              disabled={currentSlideIndex === activeModules.length - 1}
              aria-label="Modul Berikutnya"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Dots Pagination Indikator */}
          <div className={styles.sliderDots}>
            {activeModules.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                className={`${styles.sliderDot} ${idx === currentSlideIndex ? styles.sliderDotActive : styles.sliderDotInactive}`}
                onClick={() => {
                  setCurrentSlideIndex(idx);
                  setLockAlertMessage(null);
                }}
                aria-label={`Slide Modul ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── KONDISI 2: TAMPILAN DETAIL MODUL (URUTAN UNIT & UJIAN GATEWAY) ── */}
      {selectedModuleId && activeModule && (
        <>
          <div className={styles.backBar}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setSelectedModuleId(null)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Kembali ke Pilihan Modul
            </button>
            <span className={styles.themeDetailBadge}>
              Sedang Mempelajari: Modul 0{activeModule.moduleNumber} ({activeModule.title})
            </span>
          </div>

          <section className={styles.pipelineSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Urutan Unit: {activeModule.title}
              </h2>
              <span className={styles.levelBadge}>
                {activeModule.stages.filter((s) => s.status === "completed").length} dari {activeModule.stages.length} Unit Selesai
              </span>
            </div>

            {/* Pipeline Unit Row */}
            <div className={styles.stagesRow}>
              {activeModule.stages.map((stage) => {
                const isDone = stage.status === "completed";
                const isActive = stage.status === "active";
                const isLock = stage.status === "locked";

                return (
                  <div
                    key={stage.id}
                    className={`${styles.stageCard} ${isDone ? styles.stageCardCompleted : ""} ${isActive ? styles.stageCardActive : ""} ${isLock ? styles.stageCardLocked : ""}`}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.stepNum}>Unit 0{stage.unitNumber}</span>
                      <span
                        className={`${styles.statusTag} ${isDone ? styles.statusTagDone : ""} ${isActive ? styles.statusTagActive : ""} ${isLock ? styles.statusTagLocked : ""}`}
                      >
                        {isDone ? "Selesai ✓" : isActive ? "Aktif ▶" : "Kunci 🔒"}
                      </span>
                    </div>

                    <div className={styles.cardBody}>
                      <h3 className={styles.cardTitle}>{stage.title}</h3>
                      <p className={styles.cardSubtitle}>{stage.subtitle}</p>

                      {isLock && stage.requiredNote && (
                        <div className={styles.lockNoticeBadge}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span>{stage.requiredNote}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.cardFooter}>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${isActive ? styles.actionBtnPrimary : styles.actionBtnSecondary}`}
                        onClick={() => setActiveModalStage(stage)}
                      >
                        {isDone ? "Buka Materi" : isActive ? "Mulai Belajar" : "Lihat Syarat"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* KARTU SPESIAL GATEWAY UJIAN KENAIKAN TINGKAT */}
              <div
                className={`${styles.stageCard} ${styles.stageCardActive}`}
                style={{
                  border: "1.5px solid #f59e0b",
                  background: "#fffbeb",
                }}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.stepNum} style={{ color: "#b45309", fontWeight: "900" }}>
                    Gateway
                  </span>
                  <span
                    className={styles.statusTag}
                    style={{ background: "#fef3c7", color: "#b45309" }}
                  >
                    Ujian Akhir
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle} style={{ color: "#92400e" }}>
                    {activeLevel.gatewayExam.title}
                  </h3>
                  <p className={styles.cardSubtitle}>
                    Syarat Mutlak Naik ke: {activeLevel.gatewayExam.targetLevelName}
                  </p>
                </div>

                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    onClick={() => handleOpenGatewayExam(activeLevel)}
                  >
                    Mulai Ujian
                  </button>
                </div>
              </div>
            </div>

            {/* Banner Parameter Ujian Kenaikan Tingkat */}
            <div className={styles.finalExamBanner}>
              <div className={styles.finalExamLeft}>
                <div className={styles.finalExamIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div>
                  <h4 className={styles.finalExamTitle}>{activeLevel.gatewayExam.title}</h4>
                  <p className={styles.finalExamDesc}>{activeLevel.gatewayExam.description}</p>
                </div>
              </div>

              <button
                type="button"
                className={styles.finalExamBtn}
                onClick={() => handleOpenGatewayExam(activeLevel)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Ambil Ujian Kenaikan Tingkat →
              </button>
            </div>
          </section>
        </>
      )}

      {/* ── MODAL PRATINJAU MATERI UNIT ── */}
      {activeModalStage && (
        <div className={styles.modalBackdrop} onClick={() => setActiveModalStage(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Unit 0{activeModalStage.unitNumber}: {activeModalStage.title}</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActiveModalStage(null)}
                aria-label="Tutup"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: "0.86rem", color: "#475569" }}>
                {activeModalStage.subtitle}
              </p>

              {activeModalStage.status === "locked" && activeModalStage.requiredNote && (
                <div style={{ padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "0.82rem", fontWeight: "600" }}>
                  Perhatian: {activeModalStage.requiredNote}
                </div>
              )}

              {activeModalStage.sampleItems && activeModalStage.sampleItems.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "0.82rem", color: "#0f172a" }}>
                    Contoh Materi:
                  </h4>
                  <div className={styles.sampleWordList}>
                    {activeModalStage.sampleItems.map((item, i) => (
                      <div key={i} className={styles.sampleWordCard}>
                        <span className={styles.wordJp}>{item.jp}</span>
                        <span className={styles.wordRomaji}>{item.romaji}</span>
                        <span className={styles.wordMeaning}>{item.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                style={{ width: "auto" }}
                onClick={() => setActiveModalStage(null)}
              >
                Tutup
              </button>
              {activeModalStage.status !== "completed" && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  style={{ width: "auto" }}
                  onClick={() => handleCompleteStage(activeModalStage.id)}
                >
                  Simulasikan Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL UJIAN GATEWAY KENAIKAN TINGKAT DENGAN ATURAN GATEKEEPING MUTLAK ── */}
      {gatewayExamModalLevel && (
        <div className={styles.modalBackdrop} onClick={() => setGatewayExamModalLevel(null)}>
          <div className={styles.examModalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.examModalHeader}>
              <div className={styles.examHeaderTitleArea}>
                <span className={styles.examHeaderBadge}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Gateway Exam · Syarat Mutlak
                </span>
                <h3 className={styles.examHeaderTitle}>{gatewayExamModalLevel.gatewayExam.title}</h3>
                <p className={styles.examHeaderSubtitle}>
                  Syarat Buka Kunci: <strong>{gatewayExamModalLevel.gatewayExam.targetLevelName}</strong>
                </p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setGatewayExamModalLevel(null)}
                aria-label="Tutup"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.examModalBody}>
              {/* Parameter & Passing Mark Box (Sesuai Blueprint Halaman 1 & 2) */}
              <div className={styles.gatekeepingRulesBox}>
                <div className={styles.gatekeepingTitle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Aturan Gatekeeping Mutlak: Wajib Lulus Setiap Sub-Kategori</span>
                </div>

                <div className={styles.gatekeepingRulesGrid}>
                  {gatewayExamModalLevel.gatewayExam.rules.map((rule) => (
                    <div key={rule.id} className={styles.ruleBadge}>
                      <span className={styles.ruleBadgeCategory}>{rule.name}</span>
                      <span className={styles.ruleBadgeMark}>
                        Min. Lulus: {rule.passingMark} / {rule.maxScore} Poin
                      </span>
                    </div>
                  ))}
                  <div className={styles.ruleBadge} style={{ borderColor: "#b45309", background: "#fef3c7" }}>
                    <span className={styles.ruleBadgeCategory}>Total Keseluruhan</span>
                    <span className={styles.ruleBadgeMark}>
                      Min. {gatewayExamModalLevel.gatewayExam.passingTotalScore} / {gatewayExamModalLevel.gatewayExam.maxTotalScore} Poin ({gatewayExamModalLevel.gatewayExam.passingPercentage}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* KONDISI A: BELUM TUNTAS SEMUA UNIT DI LEVEL INI */}
              {completedStagesInLevel < totalStagesInLevel && !examEvaluationResult && (
                <div style={{ padding: "12px 14px", background: "#fff7ed", border: "1px dashed #fdba74", borderRadius: "10px", color: "#9a3412", fontSize: "0.82rem" }}>
                  <p style={{ margin: "0 0 8px 0", fontWeight: "700" }}>
                    Catatan: Sangat disarankan menuntaskan seluruh {totalStagesInLevel} unit materi sebelum mengambil Ujian Gateway ini.
                  </p>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    style={{ width: "auto", fontSize: "0.76rem", padding: "6px 14px" }}
                    onClick={() => handleSimulateCompleteAllUnits(gatewayExamModalLevel.id)}
                  >
                    Simulasikan Selesaikan Semua Unit (Mode Cepat)
                  </button>
                </div>
              )}

              {/* KONDISI B: MENGERJAKAN SOAL UJIAN */}
              {!examEvaluationResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {gatewayExamModalLevel.gatewayExam.questions.map((q, idx) => (
                    <div key={q.id} className={styles.examQuestionCard}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: "800", color: "#b45309", textTransform: "uppercase" }}>
                          Seksi: {q.categoryLabel} ({q.point} Poin)
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Soal {idx + 1} dari {gatewayExamModalLevel.gatewayExam.questions.length}</span>
                      </div>

                      <p className={styles.examQuestionText}>
                        {q.question}
                      </p>

                      {q.subText && (
                        <span style={{ fontSize: "0.74rem", color: "#64748b", fontStyle: "italic" }}>
                          {q.subText}
                        </span>
                      )}

                      <div className={styles.examOptionsGrid}>
                        {q.options.map((opt) => {
                          const isSelected = examUserAnswers[q.id] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              className={`${styles.examOptionBtn} ${isSelected ? styles.examOptionBtnSelected : ""}`}
                              onClick={() =>
                                setExamUserAnswers((prev) => ({ ...prev, [q.id]: opt }))
                              }
                            >
                              <div className={styles.examOptionRadioCircle}>
                                {isSelected && <div className={styles.examOptionRadioInner} />}
                              </div>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* KONDISI C: HASIL UJIAN LULUS (SEMUA SUB-KATEGORI MENCAPAI PASSING MARK) */}
              {examEvaluationResult && examEvaluationResult.passed && (
                <div className={styles.celebrateBox}>
                  <div className={styles.celebrateIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4 className={styles.celebrateTitle}>Selamat! Anda Lulus Ujian Kenaikan Tingkat!</h4>
                  <div className={styles.celebrateScore}>
                    Total Skor: {examEvaluationResult.totalScore} / {examEvaluationResult.maxTotalScore} Poin (Memenuhi Syarat)
                  </div>

                  {/* Rincian Sub-Kategori */}
                  <div className={styles.remedialScoresList}>
                    {examEvaluationResult.subCategoryResults.map((sub) => (
                      <div key={sub.id} className={styles.remedialScoreRow} style={{ borderColor: "#bbf7d0", background: "#f0fdf4" }}>
                        <span style={{ fontWeight: "700", color: "#166534" }}>{sub.name}</span>
                        <span style={{ fontWeight: "800", color: "#15803d" }}>
                          {sub.score} / {sub.maxScore} Poin (Lulus ✓)
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className={styles.celebrateDesc}>
                    Semua sub-kategori memenuhi syarat kelulusan mutlak (*Gatekeeping Rules*). Anda resmi naik tingkat ke <strong>{gatewayExamModalLevel.gatewayExam.targetLevelName}</strong>!
                  </p>
                  <button
                    type="button"
                    className={styles.celebrateBtn}
                    onClick={() => handleAdvanceToNextLevel(gatewayExamModalLevel.code)}
                  >
                    Naik Tingkat ke {gatewayExamModalLevel.gatewayExam.targetLevelName} Sekarang →
                  </button>
                </div>
              )}

              {/* KONDISI D: HASIL UJIAN GAGAL KARENA SUB-KATEGORI TIDAK CAPAI PASSING MARK (REMEDIAL DIWAJIBKAN) */}
              {examEvaluationResult && !examEvaluationResult.passed && (
                <div className={styles.remedialBox}>
                  <div className={styles.remedialIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>

                  <h4 className={styles.remedialTitle}>Remedial Diperlukan (Gatekeeping Rule)</h4>
                  <p className={styles.remedialDetail}>
                    Sesuai *Gatekeeping Rules*, meskipun skor total Anda mungkin cukup, Anda <strong>wajib mencapai nilai minimal di setiap sub-kategori</strong>. Anda belum dapat naik tingkat sampai remedial diselesaikan.
                  </p>

                  <div className={styles.remedialScoresList}>
                    {examEvaluationResult.subCategoryResults.map((sub) => (
                      <div
                        key={sub.id}
                        className={styles.remedialScoreRow}
                        style={{
                          borderColor: sub.passed ? "#bbf7d0" : "#fca5a5",
                          background: sub.passed ? "#f0fdf4" : "#fff1f2",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: "700", color: sub.passed ? "#166534" : "#991b1b" }}>
                            {sub.name}
                          </span>
                          <span style={{ display: "block", fontSize: "0.68rem", color: "#64748b" }}>
                            Syarat Minimal: {sub.passingMark} Poin
                          </span>
                        </div>
                        <span style={{ fontWeight: "800", color: sub.passed ? "#15803d" : "#dc2626" }}>
                          {sub.score} / {sub.maxScore} Poin {sub.passed ? "(Lulus ✓)" : "(Gagal ✗)"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    style={{ width: "auto", padding: "10px 22px", marginTop: "4px" }}
                    onClick={() => {
                      setExamEvaluationResult(null);
                      setExamUserAnswers({});
                    }}
                  >
                    Ikuti Sesi Remedial Sekarang
                  </button>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                style={{ width: "auto" }}
                onClick={() => setGatewayExamModalLevel(null)}
              >
                Tutup
              </button>

              {!examEvaluationResult && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  style={{ width: "auto" }}
                  disabled={
                    Object.keys(examUserAnswers).length <
                    gatewayExamModalLevel.gatewayExam.questions.length
                  }
                  onClick={handleSubmitGatewayExam}
                >
                  Kirim Jawaban & Evaluasi Kelulusan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
