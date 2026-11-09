"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasKana, toRomaji } from "@/shared/lib/kana";
import { speechMatches } from "../../domain/speechMatch";
import { NekoAvatar, type NekoEmotion, type NekoMode } from "@/shared/ui/neko/NekoAvatar";
import { AudioMeter } from "@/shared/lib/audioMeter";
import styles from "./exercises.module.css";
import { CheckIcon, MicIcon, StopIcon, VolumeIcon } from "@/shared/ui/icons";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const MAX_RECORDING_MS = 15000;
/** Diam selama ini setelah mulai bicara = selesai bicara, rekaman berhenti sendiri. */
const END_SILENCE_MS = 1100;
/** Tidak ada suara sama sekali selama ini sejak mic dibuka = berhenti dan beri tahu. */
const NO_SPEECH_MS = 7000;
const TICK_MS = 50;

type Status = "idle" | "recording" | "processing" | "unavailable";

async function transcribeJapanese(audio: Blob): Promise<string> {
  const res = await fetch("/api/ask/transcribe?lang=ja", {
    method: "POST",
    headers: { "content-type": audio.type || "audio/webm" },
    body: audio,
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: { code?: string; message?: string } };
  if (res.status === 503) throw Object.assign(new Error(data.error?.message ?? "Pengenalan suara belum tersedia."), { unavailable: true });
  if (!res.ok) throw new Error(data.error?.message ?? "Gagal mengenali suara.");
  return data.text?.trim() ?? "";
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
}: {
  text: string;
  variants?: string[];
  answer: string | null;
  onAnswer: (transcript: string) => void;
  onSkip: () => void;
  skipped: boolean;
  feedback?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  // Miu-chan Voice AI animation states
  const [nekoMode, setNekoMode] = useState<NekoMode>("idle");
  const [nekoEmotion, setNekoEmotion] = useState<NekoEmotion>("biasa");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const levelRef = useRef<HTMLSpanElement | null>(null);
  const startingRef = useRef(false);
  const aliveRef = useRef(true);
  const silentStopRef = useRef(false);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // AudioMeter untuk animasi Avatar gerak bibir & telinga reaktif
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

  const matched = answer ? speechMatches(answer, [text, ...variants]) : false;
  const showVerdict = feedback && !!answer && status === "idle";

  // Sinkronkan emosi saat ada teks atau jawaban berubah
  useEffect(() => {
    if (answer) {
      const ok = speechMatches(answer, [text, ...variants]);
      setNekoEmotion(ok ? "senang" : "bingung");
    } else {
      setNekoEmotion("biasa");
    }
  }, [answer, text, variants]);

  function stopMonitor() {
    clearInterval(tickRef.current);
    tickRef.current = undefined;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }

  function releaseMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  /** Pantau volume: ambang = derau ruangan × 2,5; diam setelah bicara atau tidak bicara sama sekali = berhenti. */
  function monitor(stream: MediaStream) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const startedAt = performance.now();
    let floor = 0;
    let floorSamples = 0;
    let loudTicks = 0;
    let speaking = false;
    let quietSince = 0;
    tickRef.current = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      if (levelRef.current) levelRef.current.style.setProperty("--level", Math.min(1, rms * 12).toFixed(2));
      if (now - startedAt < 300) {
        floor += rms;
        floorSamples++;
        return;
      }
      const threshold = Math.max(0.012, (floor / Math.max(1, floorSamples)) * 2.5);
      if (rms > threshold) {
        loudTicks++;
        quietSince = 0;
        if (loudTicks >= 3) speaking = true;
      } else {
        loudTicks = 0;
        if (speaking) {
          quietSince ||= now;
          if (now - quietSince >= END_SILENCE_MS) stop();
        } else if (now - startedAt >= NO_SPEECH_MS) {
          stop(true);
        }
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
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      meterRef.current?.detachMic();
      releaseMic();
      if (silentStopRef.current) {
        silentStopRef.current = false;
        setStatus("idle");
        setNekoMode("idle");
        setError("Belum terdengar suara. Ketuk mic lalu ucapkan kalimatnya.");
        return;
      }
      setStatus("processing");
      setNekoMode("processing");
      setNekoEmotion("berpikir");
      try {
        let transcript = "";
        try {
          const res = await transcribeJapanese(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
          transcript = res.trim();
        } catch {}

        // Jika transkripsi server kosong tapi speech recognition web menangkap teks
        if (!transcript && liveTranscript.trim()) {
          transcript = liveTranscript.trim();
        }

        if (!aliveRef.current) return;
        if (!transcript) {
          setError("Suara tidak terdengar jelas. Ketuk mic dan ucapkan lagi lebih dekat ke mikrofon.");
          setStatus("idle");
          setNekoMode("idle");
          setNekoEmotion("bingung");
        } else {
          onAnswer(transcript);
          setHeard(true);
          setStatus("idle");
          setNekoMode("idle");
          const ok = speechMatches(transcript, [text, ...variants]);
          if (ok) {
            setNekoEmotion("senang");
            void playPraise();
          } else {
            setNekoEmotion("bingung");
          }
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
    monitor(stream);
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
                {liveTranscript ? `"${liveTranscript}"` : "Mendengarkan ucapanmu…"}
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
              <div className={styles.resultSubtitleBadge}>
                {matched ? "✨ Tepat! Hebat!" : "🐾 Belum Pas"}
              </div>
              <p className={styles.resultSubtitleCaptured} lang="ja">
                "{answer}"
              </p>
              <p className={styles.resultSubtitleTip}>
                {matched
                  ? "Pelafalanmu sangat sesuai penutur asli!"
                  : "Dengarkan contohnya, lalu ketuk mic untuk mencoba lagi."}
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
              Mendengarkan…
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
      )}
      {status === "recording" && (
        <p className={styles.muted}>Rekaman berhenti sendiri saat kamu selesai bicara.</p>
      )}

      {error && <p className={styles.errorText}>{error}</p>}

      {status === "unavailable" && !skipped && (
        <button type="button" className={styles.linkBtn} onClick={onSkip}>
          Lewati soal ini (tidak dinilai)
        </button>
      )}
      {skipped && <p className={styles.muted}>Soal ini dilewati dan tidak ikut dinilai.</p>}
    </div>
  );
}
