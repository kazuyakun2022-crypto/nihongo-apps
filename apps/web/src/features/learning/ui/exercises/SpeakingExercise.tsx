"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hasKana, toRomaji } from "@/shared/lib/kana";
import {
  createSpeakingTarget,
  hasKanji,
  scorePronunciation,
  speechMatches,
  type SpeakingTarget,
} from "../../domain/speechMatch";
import { NekoAvatar, type NekoEmotion, type NekoMode } from "@/shared/ui/neko/NekoAvatar";
import { AudioMeter } from "@/shared/lib/audioMeter";
import { VoiceActivityTracker } from "@/shared/lib/audioNoiseGate";
import { soundFX } from "@/lib/audio/SoundFXManager";
import styles from "./exercises.module.css";
import { CheckIcon, MicIcon, StopIcon, VolumeIcon } from "@/shared/ui/icons";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const MAX_RECORDING_MS = 15000;
const NO_SPEECH_MS = 7000;
const TICK_MS = 50;

type Status = "idle" | "recording" | "processing" | "unavailable";

async function transcribeJapanese(audio: Blob, target?: string): Promise<{ text: string; status?: string; confidence?: number }> {
  const url = target ? `/api/ask/transcribe?lang=ja&target=${encodeURIComponent(target)}` : "/api/ask/transcribe?lang=ja";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": audio.type || "audio/webm" },
    body: audio,
  });
  const data = (await res.json().catch(() => ({}))) as {
    text?: string;
    status?: string;
    confidence?: number;
    error?: { code?: string; message?: string };
  };
  if (res.status === 503) throw Object.assign(new Error(data.error?.message ?? "Pengenalan suara belum tersedia."), { unavailable: true });
  if (!res.ok) throw new Error(data.error?.message ?? "Gagal mengenali suara.");
  return {
    text: data.text?.trim() ?? "",
    status: data.status,
    confidence: data.confidence,
  };
}

/**
 * Berbicara: ketuk mic sekali lalu bicara. Rekaman berhenti sendiri saat siswa diam, transkrip langsung
 * dinilai di layar (aturan sama dengan server), dan bila belum pas cukup ketuk sekali lagi.
 * `feedback={false}` (ujian) hanya menampilkan transkrip tanpa penilaian.
 *
 * Miu-chan Avatar terintegrasi penuh dengan animasi Voice AI:
 * - Idle: bernapas alami, berkedip ramah
 * - Dengarkan contoh: berbicara dengan sinkronisasi bibir real-time
 * - Mendengarkan: telinga bergerak reaktif mengikuti volume mikrofon siswa
 * - Memeriksa: ekspresi berpikir dengan gelembung pikiran
 * - Benar: ekspresi senang bersinar dan pujian suara
 * - Belum pas: ekspresi bingung memotivasi untuk mencoba kembali
 */
export function SpeakingExercise({
  text,
  variants = [],
  answer,
  onAnswer,
  onSkip,
  skipped,
  feedback = true,
  target,
}: {
  text: string;
  variants?: string[];
  answer: string | null;
  onAnswer: (transcript: string) => void;
  onSkip: () => void;
  skipped: boolean;
  feedback?: boolean;
  target?: SpeakingTarget;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isVoiced, setIsVoiced] = useState(false);
  const [visualScale, setVisualScale] = useState(0);

  // Miu-chan Voice AI animation states
  const [nekoMode, setNekoMode] = useState<NekoMode>("idle");
  const [nekoEmotion, setNekoEmotion] = useState<NekoEmotion>("biasa");

  // Dual-Field Schema Target Pembelajaran
  const speakingTarget = useMemo(() => {
    return (
      target ??
      createSpeakingTarget({
        displayText: text,
        phoneticTarget: text,
        romaji: hasKana(text) ? toRomaji(text) : undefined,
        acceptedReadings: [text, ...variants],
        lessonLevel: "PRE_N5",
        itemType: "VOCABULARY",
      })
    );
  }, [target, text, variants]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const levelRef = useRef<HTMLSpanElement | null>(null);
  const startingRef = useRef(false);
  const aliveRef = useRef(true);
  const silentStopRef = useRef(false);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const vadTrackerRef = useRef<VoiceActivityTracker>(new VoiceActivityTracker());

  // AudioMeter untuk animasi Avatar gerak bibir & telinga reaktif serta RMS meter
  const meterRef = useRef<AudioMeter | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const getMicLevel = useCallback(() => meterRef.current?.micLevel() ?? 0, []);
  const getVoiceLevel = useCallback(() => meterRef.current?.voiceLevel() ?? 0, []);

  useEffect(() => {
    aliveRef.current = true;
    meterRef.current = new AudioMeter();
    if (typeof window !== "undefined" && (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")) {
      setStatus("unavailable");
    }
    return () => {
      aliveRef.current = false;
      clearTimeout(maxTimerRef.current);
      stopMonitor();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      releaseMic();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      meterRef.current?.dispose();
      meterRef.current = null;
    };
  }, []);

  const scoreResult = answer ? scorePronunciation(answer, speakingTarget) : null;
  const matched = scoreResult ? scoreResult.isCorrect : false;
  const showVerdict = feedback && !!answer && status === "idle";

  // Sinkronkan emosi saat ada teks atau jawaban berubah
  useEffect(() => {
    if (answer) {
      const res = scorePronunciation(answer, speakingTarget);
      setNekoEmotion(res.isCorrect ? "senang" : "bingung");
    } else {
      setNekoEmotion("biasa");
    }
  }, [answer, speakingTarget]);

  function stopMonitor() {
    clearInterval(tickRef.current);
    tickRef.current = undefined;
  }

  function releaseMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  /**
   * Lapis 1 Proteksi: RMS Noise Gate (-42 dBFS) + VAD Hangover Time (800ms)
   * Menyaring desis ruangan dan mematikan mic secara deterministic saat selesai bicara.
   * Menggunakan AudioMeter yang sudah aktif agar tidak terjadi suspensi AudioContext di mobile.
   */
  function monitor() {
    const tracker = vadTrackerRef.current;
    tracker.start();
    setIsVoiced(false);
    setVisualScale(0);

    tickRef.current = setInterval(() => {
      const rms = meterRef.current?.micRms() ?? 0;
      const vad = tracker.feedRms(rms, TICK_MS);
      setIsVoiced(vad.isAboveNoiseFloor);
      setVisualScale(vad.visualScale);

      if (levelRef.current) {
        levelRef.current.style.setProperty("--level", Math.min(1, vad.visualScale * 1.5).toFixed(2));
      }

      // Hangover Time: jeda 800ms hening setelah berbicara menghentikan rekaman otomatis
      if (tracker.shouldAutoStopAfterSpeech()) {
        stop();
      } else if (tracker.isTimedOutSilent(NO_SPEECH_MS)) {
        stop(true);
      }
    }, TICK_MS);
  }

  // ── Miu-chan mencontohkan pelafalan ──
  const playSample = useCallback(async () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    meterRef.current?.resume();
    setNekoMode("speaking");
    setNekoEmotion("senang");
    try {
      const url = `/api/tts?v=13&text=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      meterRef.current?.attachVoice(audio);

      audio.onended = () => {
        setNekoMode("idle");
        setNekoEmotion("biasa");
        meterRef.current?.detachVoice();
        activeAudioRef.current = null;
      };
      audio.onerror = () => {
        setNekoMode("idle");
        setNekoEmotion("biasa");
        meterRef.current?.detachVoice();
        activeAudioRef.current = null;
      };
      await audio.play();
    } catch {
      setNekoMode("idle");
      setNekoEmotion("biasa");
      meterRef.current?.detachVoice();
    }
  }, [text]);

  // ── Miu-chan memuji saat jawaban benar ──
  const playPraise = useCallback(async () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    meterRef.current?.resume();
    setNekoMode("speaking");
    setNekoEmotion("senang");
    try {
      const praises = ["すごい！", "よくできました！", "すばらしい！", "その調子！"];
      const randomPraise = praises[Math.floor(Math.random() * praises.length)];
      const url = `/api/tts?v=13&text=${encodeURIComponent(randomPraise)}`;
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      meterRef.current?.attachVoice(audio);

      audio.onended = () => {
        setNekoMode("idle");
        setNekoEmotion("senang");
        meterRef.current?.detachVoice();
        activeAudioRef.current = null;
      };
      audio.onerror = () => {
        setNekoMode("idle");
        setNekoEmotion("senang");
        meterRef.current?.detachVoice();
        activeAudioRef.current = null;
      };
      await audio.play();
    } catch {
      setNekoMode("idle");
      setNekoEmotion("senang");
      meterRef.current?.detachVoice();
    }
  }, []);

  async function start() {
    if (startingRef.current || recorderRef.current?.state === "recording") return;
    startingRef.current = true;
    setError(null);
    setHeard(false);
    setLiveTranscript("");

    try {
      streamRef.current ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      setError("Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser.");
      setStatus("unavailable");
      setNekoMode("idle");
      return;
    } finally {
      startingRef.current = false;
    }
    if (!aliveRef.current) return releaseMic();
    const stream = streamRef.current;

    // Hubungkan AudioMeter ke aliran mikrofon untuk mendeteksi suara bicara
    meterRef.current?.resume();
    meterRef.current?.attachMic(stream);
    setNekoMode("listening");
    setNekoEmotion("biasa");
    soundFX.play("mic_start", 0.6);

    // Setup streaming speech recognition via Web Speech API jika didukung browser
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        recognitionRef.current = rec;
        rec.lang = "ja-JP";
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.onresult = (ev: any) => {
          let interim = "";
          let final = "";
          for (let i = ev.resultIndex; i < ev.results.length; ++i) {
            if (ev.results[i].isFinal) final += ev.results[i][0].transcript;
            else interim += ev.results[i][0].transcript;
          }
          const spoken = (final || interim).trim();
          if (spoken) setLiveTranscript(spoken);
        };
        rec.onerror = () => {};
        rec.start();
      } catch {}
    }

    const mimeType = MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = async () => {
      stopMonitor();
      setIsVoiced(false);
      setVisualScale(0);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      meterRef.current?.detachMic();
      releaseMic();

      const hadSpeech = vadTrackerRef.current.hasDetectedSpeech;
      if (silentStopRef.current || !hadSpeech) {
        silentStopRef.current = false;
        setStatus("idle");
        setNekoMode("idle");
        setNekoEmotion("bingung");
        setError("Suasana terlalu hening. Dekatkan mikrofon lalu ucapkan kalimatnya.");
        return;
      }
      setStatus("processing");
      setNekoMode("processing");
      setNekoEmotion("berpikir");
      try {
        let transcript = "";
        let statusResp = "";
        try {
          const res = await transcribeJapanese(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }), text);
          transcript = res.text;
          statusResp = res.status ?? "";
        } catch {}

        // Jika transkripsi server kosong tapi speech recognition web menangkap teks
        if (!transcript && liveTranscript.trim() && statusResp !== "NO_MATCH_JAPANESE") {
          transcript = liveTranscript.trim();
        }

        if (!aliveRef.current) return;

        if (statusResp === "NO_MATCH_JAPANESE") {
          setError("Gunakan bahasa Jepang ya! Neko-sensei menunggu pelafalan bahasa Jepang.");
          setStatus("idle");
          setNekoMode("idle");
          setNekoEmotion("bingung");
          return;
        }

        if (!transcript || statusResp === "SILENT") {
          setError("Suasana terlalu hening atau suara tidak terdengar jelas. Ketuk mic dan ucapkan lagi lebih dekat ke mikrofon.");
          setStatus("idle");
          setNekoMode("idle");
          setNekoEmotion("bingung");
          return;
        }

        const score = scorePronunciation(transcript, speakingTarget);
        onAnswer(transcript);
        setHeard(true);
        setStatus("idle");
        setNekoMode("idle");

        if (score.isCorrect) {
          setNekoEmotion("senang");
          soundFX.play("correct", 0.6);
          void playPraise();
        } else {
          setNekoEmotion("bingung");
          soundFX.play("wrong", 0.4);
        }
      } catch (err) {
        if (!aliveRef.current) return;
        setError(err instanceof Error ? err.message : "Gagal mengenali suara.");
        setStatus((err as { unavailable?: boolean }).unavailable ? "unavailable" : "idle");
        setNekoMode("idle");
        setNekoEmotion("bingung");
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
    monitor();
    maxTimerRef.current = setTimeout(() => stop(), MAX_RECORDING_MS);
  }

  function stop(noSpeech = false) {
    clearTimeout(maxTimerRef.current);
    stopMonitor();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    silentStopRef.current = noSpeech;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  return (
    <div className={styles.speakWrap}>
      {/* ── MIU-CHAN VOICE AI INTERACTIVE STAGE ── */}
      <div className={styles.nekoStage}>
        <div
          className={styles.nekoStageAura}
          data-mode={nekoMode}
          data-emotion={nekoEmotion}
          aria-hidden="true"
        />
        <NekoAvatar
          mode={nekoMode}
          emotion={nekoEmotion}
          micLevel={getMicLevel}
          voiceLevel={getVoiceLevel}
          size={140}
          className={styles.nekoAvatarInExercise}
          onTap={() => void playSample()}
        />

        {/* ── SUBTITLE LANGSUNG DI BAWAH MIU-CHAN (VOICE AI SUBTITLE) ── */}
        <div className={styles.subtitleWrapper}>
          {status === "recording" ? (
            <div className={styles.listeningSubtitle}>
              <span className={styles.livePulseDot} aria-hidden="true" />
              <span className={styles.subtitleText} lang="ja">
                {liveTranscript
                  ? `"${liveTranscript}"`
                  : isVoiced
                    ? "Mendeteksi bahasa Jepang…"
                    : "Mendengarkan ucapanmu…"}
              </span>
            </div>
          ) : status === "processing" ? (
            <div className={styles.processingSubtitle}>
              <span aria-hidden="true">💭</span>
              <span className={styles.subtitleText}>Miu-chan memeriksa ucapanmu…</span>
            </div>
          ) : nekoMode === "speaking" ? (
            <div className={styles.speakingSubtitle}>
              <span aria-hidden="true">🔊</span>
              <span className={styles.subtitleText} lang="ja">
                "{text}"
              </span>
            </div>
          ) : showVerdict && answer ? (
            <div
              className={`${styles.resultSubtitle} ${
                matched ? styles.resultSubtitleCorrect : styles.resultSubtitleWrong
              }`}
            >
              <div className={styles.resultHeaderRow}>
                <span className={styles.resultSubtitleBadge}>
                  {scoreResult?.tier === "perfect"
                    ? "✨ Sempurna!"
                    : scoreResult?.tier === "good"
                    ? "👍 Bagus!"
                    : "🐾 Belum Pas"}
                </span>
                <span className={styles.resultSubtitleCaptured} lang="ja">
                  "{matched && (scoreResult?.isKanjiMatch || !hasKanji(speakingTarget.displayText))
                    ? speakingTarget.displayText
                    : answer}"
                </span>
              </div>
              <p className={styles.resultSubtitleTip}>
                {matched && scoreResult?.displayFeedbackText
                  ? scoreResult.displayFeedbackText
                  : (scoreResult?.tip ?? (matched
                    ? "Pelafalanmu sangat sesuai penutur asli!"
                    : "Dengarkan contohnya, lalu ketuk mic untuk mencoba lagi."))}
              </p>
            </div>
          ) : (
            <div className={styles.idleSubtitle}>
              <span>🐾 Ketuk mic lalu ucapkan kalimat di bawah</span>
            </div>
          )}
        </div>
      </div>

      {/* ── TARGET SENTENCE CARD ── */}
      <div className={styles.speakTarget}>
        <p className={styles.speakText} lang="ja">{text}</p>
        {hasKana(text) && <p className={styles.romaji}>{toRomaji(text)}</p>}
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => void playSample()}
          disabled={status === "recording" || nekoMode === "speaking"}
        >
          <VolumeIcon size={16} /> Dengarkan contoh
        </button>
      </div>

      {/* ── MIC ACTION BUTTON ── */}
      {status !== "unavailable" && (
        <div className={styles.micBtnWrapper}>
          {status === "recording" && (
            <div
              className={styles.waveformRing}
              style={{
                transform: `scale(${1 + visualScale * 0.35})`,
                opacity: isVoiced ? 0.85 : 0.25,
                borderColor: isVoiced ? "#0284c7" : "#94a3b8",
                boxShadow: isVoiced ? `0 0 14px rgba(2, 132, 199, ${0.3 + visualScale * 0.4})` : "none",
              }}
              aria-hidden="true"
            />
          )}
          <button
            type="button"
            className={styles.micBtn}
            data-recording={status === "recording"}
            onClick={status === "recording" ? () => stop() : start}
            disabled={status === "processing"}
            aria-label={status === "recording" ? "Berhenti merekam" : "Mulai bicara"}
          >
            <span aria-hidden className={styles.micIcon}>
              {status === "recording" ? <StopIcon size={18} /> : <MicIcon size={18} />}
            </span>
            {status === "recording" ? (
              <>
                {isVoiced ? "Mendeteksi…" : "Mendengarkan…"}
                <span ref={levelRef} className={styles.micLevel} aria-hidden />
              </>
            ) : status === "processing" ? (
              "Memeriksa ucapan…"
            ) : answer ? (
              "Ketuk untuk coba lagi"
            ) : (
              "Ketuk lalu bicara"
            )}
          </button>
        </div>
      )}
      {/* ── STATUS FEEDBACK SLOT TERKUNCI (ANTI-SLOP ZERO-LAYOUT-SHIFT) ── */}
      <div className={styles.speakingStatusSlot}>
        {error ? (
          <p className={styles.errorText}>{error}</p>
        ) : status === "recording" ? (
          <p className={styles.muted}>Rekaman berhenti sendiri saat kamu selesai bicara.</p>
        ) : (
          <span className={styles.statusSlotPlaceholder} aria-hidden="true" />
        )}
      </div>

      {status === "unavailable" && !skipped && (
        <button type="button" className={styles.linkBtn} onClick={onSkip}>
          Lewati soal ini (tidak dinilai)
        </button>
      )}
      {skipped && <p className={styles.muted}>Soal ini dilewati dan tidak ikut dinilai.</p>}
    </div>
  );
}
