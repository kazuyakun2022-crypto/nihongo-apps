"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot, type MascotMood } from "@/shared/ui/Mascot";
import { ArrowRightIcon } from "@/shared/ui/icons";
import { useConversation } from "../application/useConversation";
import type { ConversationEmotion, DialogueStep, ScenarioItem } from "../domain/types";
import { FuriganaText } from "./FuriganaText";
import { MicroFeedbackCard } from "./MicroFeedbackCard";
import styles from "./chat.module.css";

/** Emosi balasan AI dipetakan ke ekspresi maskot yang tersedia. */
const MOOD: Record<ConversationEmotion, MascotMood> = {
  playful: "senang",
  encouraging: "semangat",
  thinking: "berpikir",
  excited: "semangat",
};

/** Layar ngobrol dengan koreksi mikro; dengan `scenario` menjadi latihan skenario interaktif situasi nyata. */
export function ChatScreen({ scenario = null }: { scenario?: ScenarioItem | null }) {
  const { phase, session, messages, turnsLeft, report, error, emotion, start, send, end } = useConversation();
  const scenarioId = scenario?.id ?? null;
  const [draft, setDraft] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [showInChatGuide, setShowInChatGuide] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const script: DialogueStep[] = Array.isArray(scenario?.dialogueScript)
    ? (scenario?.dialogueScript as DialogueStep[])
    : [];

  if (phase === "idle" || phase === "starting") {
    if (scenario) {
      const imgUrl = scenario.imageUrl || "/images/scenarios/01_Misi_Pertama_di_Konbini.png";
      return (
        <section className={styles.scenarioIntroWrap} aria-label={`Skenario: ${scenario.title}`}>
          <div className={styles.scenarioCard}>
            <div className={styles.scenarioCover}>
              <img src={imgUrl} alt={scenario.title} className={styles.scenarioCoverImg} />
              <div className={styles.scenarioCoverOverlay} />
              <div className={styles.scenarioCoverBadges}>
                <span className={styles.scenarioCoverLevel}>{scenario.levelCode}</span>
                {scenario.location && (
                  <span className={styles.scenarioCoverLoc}>📍 {scenario.location}</span>
                )}
              </div>
            </div>

            <div className={styles.scenarioCardBody}>
              <h1 className={styles.scenarioTitle}>{scenario.title}</h1>

              <div className={styles.scenarioMetaRow}>
                <span>
                  <strong>Peran:</strong> {scenario.userRole || "Siswa"} ⇄ {scenario.mascotRole || "Miu-chan"}
                </span>
                {scenario.keigoType && (
                  <span>
                    · <strong>Gaya:</strong> {scenario.keigoType}
                  </span>
                )}
              </div>

              <div className={styles.scenarioGoalBox}>
                <span className={styles.scenarioGoalLabel}>Target Misi Percakapan</span>
                <p className={styles.scenarioGoalText}>{scenario.goal}</p>
              </div>

              {scenario.targetGrammar && scenario.targetGrammar.length > 0 && (
                <div className={styles.scenarioGrammarWrap}>
                  <span className={styles.scenarioGrammarLabel}>Pola Tata Bahasa:</span>
                  {scenario.targetGrammar.map((g) => (
                    <span key={g} className={styles.grammarChip} lang="ja">
                      <FuriganaText text={g} />
                    </span>
                  ))}
                </div>
              )}

              {script.length > 0 && (
                <div className={styles.scenarioGuideAccordion}>
                  <button
                    type="button"
                    className={styles.scenarioGuideToggle}
                    onClick={() => setShowGuide((prev) => !prev)}
                    aria-expanded={showGuide}
                  >
                    <span>Panduan Alur Dialog ({script.length} Langkah)</span>
                    <span style={{ fontSize: "0.75rem" }}>{showGuide ? "▲ Tutup" : "▼ Lihat"}</span>
                  </button>

                  {showGuide && (
                    <ol className={styles.scenarioGuideList}>
                      {script.map((step, idx) => (
                        <li key={idx} className={styles.dialogueStepItem}>
                          <span
                            className={`${styles.dialogueStepRole} ${
                              step.speaker === "USER" ? styles.dialogueStepRoleUser : ""
                            }`}
                          >
                            {step.speaker === "AI"
                              ? scenario.mascotRole || "Miu-chan"
                              : scenario.userRole || "Anda"}
                          </span>
                          {step.japaneseText && (
                            <p className={styles.dialogueStepJa} lang="ja">
                              <FuriganaText text={step.japaneseText} />
                            </p>
                          )}
                          {step.romaji && (
                            <p style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", margin: 0 }}>
                              {step.romaji}
                            </p>
                          )}
                          {step.indonesianText && (
                            <p className={styles.dialogueStepId}>{step.indonesianText}</p>
                          )}
                          {step.hintText && (
                            <div className={styles.dialogueStepHint}>Tips: {step.hintText}</div>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              {error && <Alert>{error}</Alert>}

              <div className={styles.scenarioActions}>
                <button
                  type="button"
                  className={styles.startBtn}
                  onClick={() => start(scenarioId)}
                  disabled={phase === "starting"}
                >
                  {phase === "starting" ? "Menyiapkan percakapan…" : "Mulai Percakapan"}
                </button>

                <div className={styles.backLinkRow}>
                  <Link href="/ngobrol?tab=skenario">← Pilih skenario lain</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    // Default non-scenario chat intro
    return (
      <section className={styles.intro}>
        <Mascot mood="semangat" size={120} />
        <h1 className={styles.introTitle}>Ngobrol Santai dengan Miu-chan</h1>
        <p className={styles.muted}>
          Miu-chan memakai kata-kata sesuai levelmu. Jangan takut salah, setiap kalimatmu dikoreksi dengan lembut.
        </p>
        {error && <Alert>{error}</Alert>}
        <Button onClick={() => start(null)} disabled={phase === "starting"}>
          {phase === "starting" ? "Memanggil Miu-chan…" : "Mulai Ngobrol Bebas"}
        </Button>
      </section>
    );
  }

  if (phase === "ended" && report) {
    return (
      <section className={styles.intro}>
        <Mascot mood="senang" size={120} />
        <h1 className={styles.introTitle}>
          {scenario ? `Selesai: ${scenario.title}` : "Kerja Bagus!"}
        </h1>
        <p className={styles.muted}>
          Kamu menyelesaikan {report.turns} giliran dialog dengan {report.corrections.length} koreksi tata bahasa.
        </p>
        {report.corrections.length > 0 && (
          <ul className={styles.reportList}>
            {report.corrections.map((c, i) => (
              <li key={i}>
                <span lang="ja">
                  <s>{c.original}</s> <ArrowRightIcon size={14} /> {c.corrected}
                </span>
                <p className={styles.muted}>{c.explanation}</p>
              </li>
            ))}
          </ul>
        )}
        <Button onClick={() => start(scenarioId)}>
          {scenario ? "Ulangi skenario ini" : "Ngobrol lagi"}
        </Button>
        {scenario && (
          <Link href="/ngobrol?tab=skenario" className={styles.backLink}>
            ← Pilih skenario lain
          </Link>
        )}
      </section>
    );
  }

  return (
    <section className={styles.chat}>
      <header className={styles.chatHeader}>
        <Mascot mood={phase === "waiting" ? "berpikir" : MOOD[emotion]} size={44} />
        <div>
          <strong>
            {scenario?.mascotRole || session?.mascot.name?.replace("Neko-sensei", "Miu-chan") || "Miu-chan"}
          </strong>
          <p className={styles.meta}>
            {scenario ? `${scenario.title} · ` : ""}Level {session?.level}
            {turnsLeft !== null && ` · sisa ${turnsLeft} giliran`}
          </p>
        </div>
        <Button variant="ghost" onClick={end} className={styles.endButton}>
          Selesai
        </Button>
      </header>

      {scenario && (
        <>
          <div className={styles.inChatBar}>
            <span className={styles.inChatGoal} title={scenario.goal}>
              <strong>Misi:</strong> {scenario.goal}
            </span>
            {script.length > 0 && (
              <button
                type="button"
                className={styles.inChatGuideToggle}
                onClick={() => setShowInChatGuide((prev) => !prev)}
              >
                {showInChatGuide ? "Tutup Panduan" : "Panduan Alur"}
              </button>
            )}
          </div>

          {showInChatGuide && script.length > 0 && (
            <div className={styles.inChatGuideDrawer}>
              <ol className={styles.scenarioGuideList} style={{ border: "none", padding: 0 }}>
                {script.map((step, idx) => (
                  <li key={idx} className={styles.dialogueStepItem}>
                    <span
                      className={`${styles.dialogueStepRole} ${
                        step.speaker === "USER" ? styles.dialogueStepRoleUser : ""
                      }`}
                    >
                      {step.speaker === "AI"
                        ? scenario.mascotRole || "Miu-chan"
                        : scenario.userRole || "Anda"}
                    </span>
                    {step.japaneseText && (
                      <p className={styles.dialogueStepJa} lang="ja">
                        <FuriganaText text={step.japaneseText} />
                      </p>
                    )}
                    {step.romaji && (
                      <p style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", margin: 0 }}>
                        {step.romaji}
                      </p>
                    )}
                    {step.indonesianText && (
                      <p className={styles.dialogueStepId}>{step.indonesianText}</p>
                    )}
                    {step.hintText && (
                      <div className={styles.dialogueStepHint}>Tips: {step.hintText}</div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      <ol ref={listRef} className={styles.messages} aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={m.sender === "user" ? styles.userRow : styles.mascotRow}>
            {m.sender === "mascot" ? (
              <p className={styles.mascotBubble}>
                <FuriganaText text={m.text} />
              </p>
            ) : (
              <p lang="ja" className={styles.userBubble}>
                {m.text}
              </p>
            )}
            {m.correction && <MicroFeedbackCard correction={m.correction} />}
          </li>
        ))}
        {phase === "waiting" && (
          <li className={styles.mascotRow}>
            <p className={`${styles.mascotBubble} ${styles.typing}`} aria-label="Miu-chan sedang mengetik">
              …
            </p>
          </li>
        )}
      </ol>

      {error && <Alert>{error}</Alert>}

      <form
        className={styles.composer}
        onSubmit={async (e) => {
          e.preventDefault();
          const text = draft;
          if (await send(text)) setDraft((d) => (d === text ? "" : d));
        }}
      >
        <label htmlFor="chat-input" className="visually-hidden">
          Balasanmu
        </label>
        <input
          id="chat-input"
          lang="ja"
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            turnsLeft === 0
              ? "Giliran habis, akhiri percakapan untuk melihat laporan"
              : `Balas sebagai ${scenario?.userRole || "siswa"} dalam bahasa Jepang…`
          }
          autoComplete="off"
          disabled={phase === "waiting" || turnsLeft === 0}
        />
        <Button type="submit" disabled={phase === "waiting" || !draft.trim() || turnsLeft === 0}>
          Kirim
        </Button>
      </form>
    </section>
  );
}
