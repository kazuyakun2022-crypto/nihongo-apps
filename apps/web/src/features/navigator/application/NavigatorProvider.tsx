"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { postAssistant, type AskMessage } from "@/features/ask/data/askApi";
import { AudioMeter } from "@/shared/lib/audioMeter";
import { EXAM_ROUTES, OWN_MASCOT_ROUTES, bandForLevel, matchIntent, type LevelBand } from "../domain/intents";
import { TOURS, isTourKey, pageTourFor, type TourKey, type TourStep } from "../domain/tours";

/** Nama layar untuk konteks AI; detail (bab, huruf, kartu) ditambahkan halaman lewat useScreenContext. */
function screenName(path: string): string {
  if (path === "/beranda") return "Beranda (bab berikutnya, progres, streak, kesiapan naik level, latihan lain)";
  if (path === "/belajar") return "Peta belajar (daftar bab per level dan Gerbang Tulis)";
  if (path === "/belajar/tulis-buku") return "Tulis di Buku (cetak lembar, tulis pensil, foto untuk dinilai)";
  if (/^\/belajar\/[^/]+$/.test(path)) return "Halaman pelajaran sebuah bab (pemanasan, materi, praktik, kuis, hasil)";
  if (path === "/huruf") return "Tabel huruf (hiragana, katakana, kanji, latihan menulis, kuis huruf)";
  if (path === "/review") return "Review kartu hafalan kosakata";
  if (path === "/kamus") return "Kamus (bergambar, kosakata, kanji, tata bahasa, ungkapan)";
  if (path.startsWith("/ngobrol")) return "Ngobrol dengan Miu-chan (Tanya AI, Suara, Skenario role-play)";
  if (path === "/profil") return "Profil pengguna";
  return path;
}

const EXAM_REFUSAL: Caption = {
  ja: "いまは テスト中だよ。がんばって！",
  id: "Sekarang sedang ujian, jadi Miu-chan tidak boleh membantu dulu ya. Kamu pasti bisa! Setelah selesai, tanya aku lagi.",
};

export type VoiceState = "IDLE_FLOATING" | "LISTENING" | "THINKING" | "SPEAKING" | "NAVIGATING" | "SPOTLIGHT_POINT";

export interface Caption {
  ja?: string;
  romaji?: string;
  id?: string;
  /** Jawaban AI: gelembung menampilkan kolom "tanya lagi". */
  reply?: boolean;
  /** Penolakan saat ujian. */
  refusal?: boolean;
}

export interface ActiveTour {
  key: TourKey;
  title: string;
  steps: TourStep[];
  index: number;
  /** Langkah yang sudah dilewati, untuk tombol Kembali. */
  history: number[];
  /** Naik setiap pindah langkah; dipakai untuk memicu animasi & suara. */
  seq: number;
}

interface NavigatorContextValue {
  /** false saat ujian (dibekukan total), di halaman yang punya Miu-chan sendiri, atau untuk admin. */
  isWidgetVisible: boolean;
  examLocked: boolean;
  isMuted: boolean;
  captionsOn: boolean;
  voiceState: VoiceState;
  caption: Caption | null;
  micError: string | null;
  band: LevelBand;
  tour: ActiveTour | null;
  toggleListening: () => void;
  sendCommand: (text: string) => Promise<void>;
  setMuted: (v: boolean) => void;
  setCaptionsOn: (v: boolean) => void;
  dismissCaption: () => void;
  startTour: (key: TourKey) => void;
  tourNext: () => void;
  tourBack: () => void;
  endTour: (completed?: boolean) => void;
  /** Bacakan satu kalimat langkah tur (memotong suara sebelumnya). */
  speakLine: (text: string) => void;
  /** Muat lebih awal audio ucapan ke cache browser agar pemutaran instan tanpa jeda. */
  prefetchSpeak: (text: string) => void;
  /** Dipanggil komponen ujian di dalam halaman biasa (mis. kuis bab) selama ujian berlangsung. */
  lockForExam: (key: string, locked: boolean) => void;
  /** Detail layar saat ini (mis. bab & langkah) untuk konteks jawaban Miu-chan. */
  setScreenDetail: (key: string, detail: string | null) => void;
  /** Sedang latihan/kuis: Miu-chan menjelaskan & memberi petunjuk, tapi tidak memberi jawaban. */
  assessment: Assessment | null;
  setAssessment: (key: string, kind: Assessment | null, questionId?: string) => void;
  /** Panggung: Miu-chan besar di tengah layar saat diajak bicara. origin = titik asal terbang (pusat widget). */
  stage: { open: boolean; origin: { x: number; y: number } | null };
  openStage: (origin?: { x: number; y: number }) => void;
  closeStage: () => void;
  /** Sambutan pengguna baru (sekali per akun di perangkat ini). */
  welcome: boolean;
  acceptWelcome: () => void;
  skipWelcome: () => void;
  /** Volume mikrofon & suara Miu-chan 0..1 untuk animasi kepala (gerak bibir, telinga mendengar). */
  getMicLevel: () => number;
  getVoiceLevel: () => number;
}

export type Assessment = "latihan" | "kuis";

const NavigatorContext = createContext<NavigatorContextValue | null>(null);

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const MAX_RECORD_MS = 8000;
const PREFS_KEY = "nihongo:navigator-prefs";
const AUDIO_CACHE_MAX = 40;
const WELCOME_KEY = "nihongo:navigator-welcomed";

function readPrefs(): { muted: boolean; captions: boolean } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { muted: false, captions: true, ...JSON.parse(raw) };
  } catch {
    /* penyimpanan tidak tersedia */
  }
  return { muted: false, captions: true };
}

async function transcribe(audio: Blob): Promise<string> {
  const res = await fetch("/api/ask/transcribe", { method: "POST", headers: { "content-type": audio.type || "audio/webm" }, body: audio });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? "Suaramu belum bisa dikenali.");
  return data.text?.trim() ?? "";
}

/** Teks jawaban AI bisa memuat tanda tempo (<pelan>…); buang sebelum ditampilkan/dibacakan. */
const stripTags = (s: string) => s.replace(/<\/?[a-z]+>/gi, "").replace(/\s+/g, " ").trim();

/** Indeks langkah pertama mulai `from` yang tidak dilewati karena pengguna sudah di rutenya. */
function firstActive(steps: TourStep[], from: number): number {
  const path = window.location.pathname;
  let i = from;
  while (i < steps.length && steps[i].skipOn?.includes(path)) i++;
  return i;
}

export function NavigatorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname() ?? "";

  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE_FLOATING");
  const [caption, setCaption] = useState<Caption | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [isMuted, setMutedState] = useState(false);
  const [captionsOn, setCaptionsState] = useState(true);
  const [locks, setLocks] = useState<Set<string>>(new Set());
  const [tour, setTour] = useState<ActiveTour | null>(null);
  const detailsRef = useRef(new Map<string, string>());
  const [assessments, setAssessments] = useState<Map<string, { kind: Assessment; questionId?: string }>>(new Map());
  const assessmentList = [...assessments.values()];
  const assessment: Assessment | null = assessmentList.length ? (assessmentList.some((a) => a.kind === "kuis") ? "kuis" : "latihan") : null;
  /** Soal yang sedang dikerjakan: server memakainya untuk memastikan petunjuk tidak membocorkan kunci jawaban. */
  const questionId = assessmentList.find((a) => a.questionId)?.questionId;
  /** Riwayat tanya-jawab widget supaya pertanyaan lanjutan ("terus yang ini?") tetap nyambung. */
  const historyRef = useRef<AskMessage[]>([]);
  /** Isi layar saat pertanyaan terakhir; berubah (pindah huruf/kartu/soal) = riwayat lama dibuang. */
  const historyScreenRef = useRef<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef(new Map<string, string>());
  const runRef = useRef(0);
  const meterRef = useRef<AudioMeter | null>(null);
  const [stage, setStage] = useState<{ open: boolean; origin: { x: number; y: number } | null }>({ open: false, origin: null });
  const [welcome, setWelcome] = useState(false);
  const tourRef = useRef<ActiveTour | null>(null);
  tourRef.current = tour;
  const mutedRef = useRef(false);
  mutedRef.current = isMuted;

  useEffect(() => {
    const p = readPrefs();
    setMutedState(p.muted);
    setCaptionsState(p.captions);
  }, []);
  const savePrefs = (muted: boolean, captions: boolean) => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ muted, captions }));
    } catch {
      /* abaikan */
    }
  };

  const band = bandForLevel(user?.currentLevelId);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const examLocked = EXAM_ROUTES.some((r) => r.test(pathname)) || locks.size > 0;
  // Saat ujian widget tetap terlihat tapi menolak membantu (mikrofon & AI tidak dipakai)
  const isWidgetVisible = !!user && !isAdmin && !OWN_MASCOT_ROUTES.some((r) => r.test(pathname));

  /** Hentikan semuanya: rekaman, mikrofon, suara, dan proses yang sedang berjalan. */
  const haltAll = useCallback(() => {
    runRef.current++;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setVoiceState("IDLE_FLOATING");
  }, []);

  // Exam Mode Lock: mikrofon & suara dihentikan, tur dibatalkan, gelembung diganti penolakan bila ditanya
  useEffect(() => {
    if (!examLocked) return;
    haltAll();
    setTour(null);
    setCaption(null);
    setMicError(null);
    setStage({ open: false, origin: null });
    setWelcome(false);
  }, [examLocked, haltAll]);

  // Halaman yang punya Miu-chan sendiri (layar suara dsb.): widget diam, tapi tur yang dimulai dari sana tetap jalan
  useEffect(() => {
    if (!isWidgetVisible && !tourRef.current) haltAll();
  }, [isWidgetVisible, haltAll]);

  // Pindah layar: riwayat lama tidak relevan lagi untuk "soal ini"
  useEffect(() => {
    historyRef.current = [];
  }, [pathname]);

  const setScreenDetail = useCallback((key: string, detail: string | null) => {
    if (detail) detailsRef.current.set(key, detail);
    else detailsRef.current.delete(key);
  }, []);

  const setAssessment = useCallback((key: string, kind: Assessment | null, qid?: string) => {
    setAssessments((prev) => {
      const cur = prev.get(key);
      if ((cur?.kind ?? null) === kind && cur?.questionId === qid) return prev;
      const next = new Map(prev);
      if (kind) next.set(key, { kind, questionId: qid });
      else next.delete(key);
      return next;
    });
  }, []);

  // Masuk latihan/kuis: tur dihentikan supaya pengguna tidak terbawa pindah layar di tengah soal
  useEffect(() => {
    if (assessment) setTour(null);
  }, [assessment]);

  const refuse = useCallback(() => {
    setVoiceState("IDLE_FLOATING");
    setCaption({ ...EXAM_REFUSAL, refusal: true });
  }, []);

  /** Bacakan teks dengan suara Miu-chan; audio disimpan supaya langkah yang diulang tidak meminta suara lagi. */
  const speak = useCallback(async (text: string, run: number, after: VoiceState, engine: "auto" | "edge" = "edge") => {
    audioRef.current?.pause();
    if (mutedRef.current || !text) {
      setVoiceState(after);
      return;
    }
    setVoiceState("SPEAKING");
    try {
      let url = audioCache.current.get(text);
      if (!url) {
        const res = await fetch("/api/ask/speak", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, emotion: "senang", rate: 1, engine }),
        });
        if (!res.ok) throw new Error("tts");
        url = URL.createObjectURL(await res.blob());
        const cache = audioCache.current;
        if (cache.size >= AUDIO_CACHE_MAX) {
          const oldest = cache.keys().next().value as string;
          URL.revokeObjectURL(cache.get(oldest)!);
          cache.delete(oldest);
        }
        cache.set(text, url);
      }
      if (run !== runRef.current) return;
      const audio = new Audio(url);
      audioRef.current = audio;
      meterRef.current?.attachVoice(audio);
      // Selesai saat audio habis, gagal, atau dihentikan (pause dari haltAll)
      const done = new Promise<void>((resolve) => {
        audio.onended = audio.onerror = audio.onpause = () => resolve();
      });
      await audio.play();
      await done;
      if (run === runRef.current) setVoiceState(after);
    } catch {
      if (run === runRef.current) setVoiceState(after);
    }
  }, []);

  /** Prefetch audio langkah selanjutnya ke cache browser agar bicara seketika tanpa jeda. */
  const prefetchSpeak = useCallback((text: string) => {
    if (!text || audioCache.current.has(text) || mutedRef.current) return;
    void fetch("/api/ask/speak", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, emotion: "senang", rate: 1, engine: "edge" }),
    })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const cache = audioCache.current;
        if (cache.size >= AUDIO_CACHE_MAX) {
          const oldest = cache.keys().next().value as string;
          URL.revokeObjectURL(cache.get(oldest)!);
          cache.delete(oldest);
        }
        cache.set(text, url);
      })
      .catch(() => {});
  }, []);

  /* ── Tur ── */

  const startTour = useCallback(
    (key: TourKey) => {
      const def = TOURS[key];
      const index = firstActive(def.steps, 0);
      if (index >= def.steps.length) return;
      haltAll();
      setCaption(null);
      setMicError(null);
      setStage({ open: false, origin: null });
      setVoiceState("SPOTLIGHT_POINT");
      setTour((prev) => ({ key, title: def.title, steps: def.steps, index, history: [], seq: (prev?.seq ?? 0) + 1 }));
    },
    [haltAll],
  );

  const endTour = useCallback(
    (completed = false) => {
      haltAll();
      setTour(null);
      if (completed) {
        setCaption({ ja: "よくできました！", id: "Turnya selesai. Kalau butuh lagi, ketuk aku dan bilang \"jelaskan halaman ini\" ya!" });
      }
    },
    [haltAll],
  );

  const tourNext = useCallback(() => {
    const t = tourRef.current;
    if (!t) return;
    const index = firstActive(t.steps, t.index + 1);
    if (index >= t.steps.length) {
      endTour(true);
      return;
    }
    setTour({ ...t, index, history: [...t.history, t.index], seq: t.seq + 1 });
  }, [endTour]);

  const tourBack = useCallback(() => {
    const t = tourRef.current;
    if (!t || t.history.length === 0) return;
    const index = t.history[t.history.length - 1];
    setTour({ ...t, index, history: t.history.slice(0, -1), seq: t.seq + 1 });
  }, []);

  const speakLine = useCallback(
    (text: string) => {
      const run = ++runRef.current;
      void speak(text, run, "SPOTLIGHT_POINT");
    },
    [speak],
  );

  // Gelembung "tur selesai" hilang sendiri
  useEffect(() => {
    // Jawaban AI tetap terbuka (pengguna mungkin sedang mengetik pertanyaan lanjutan)
    if (!caption || caption.reply || tour || voiceState !== "IDLE_FLOATING") return;
    const id = window.setTimeout(() => setCaption(null), 9000);
    return () => window.clearTimeout(id);
  }, [caption, tour, voiceState]);

  /* ── Perintah ── */

  const sendCommand = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      if (examLocked) {
        refuse();
        return;
      }
      const run = ++runRef.current;
      setMicError(null);
      setVoiceState("THINKING");
      setCaption({ id: `“${text}”` });

      // Saat latihan/kuis semua pertanyaan ke AI (mode petunjuk), tanpa tunjuk jalan
      const intent = assessment ? null : matchIntent(text);
      if (intent) {
        const key = intent.tour === "page" ? pageTourFor(window.location.pathname) : intent.tour;
        if (!key) {
          setCaption({ id: "Halaman ini belum punya tur. Coba bilang mau ke mana, misalnya \"latihan menulis\" atau \"kamus\"." });
          setVoiceState("IDLE_FLOATING");
          return;
        }
        // Sebentar "berangkat" dulu supaya peralihan ke tur tidak terasa tiba-tiba
        setVoiceState("NAVIGATING");
        await new Promise((r) => setTimeout(r, 450));
        if (run !== runRef.current) return;
        startTour(key);
        return;
      }

      // Bukan kata kunci tunjuk jalan: Miu-chan menjawab sebagai asisten belajar, tahu layar yang sedang dibuka,
      // dan boleh memilih tur sendiri kalau ternyata user minta ditunjukkan suatu fitur
      const details = [...detailsRef.current.values()].join("; ");
      const screen = screenName(window.location.pathname) + (details ? ` — ${details}` : "");
      // Riwayat yang membahas huruf/kartu/soal sebelumnya membuat AI tetap menjawab tentang layar lama
      // (uji: pindah dari と ke た, "cara nulisnya gimana?" tetap dijawab と)
      if (historyScreenRef.current !== screen) {
        historyRef.current = [];
        historyScreenRef.current = screen;
      }
      try {
        const res = await postAssistant(text, historyRef.current, assessment ? { screen, widget: true, assessment, questionId } : { screen, guide: true, widget: true });
        if (run !== runRef.current) return;
        const answer = stripTags(res.answer);
        historyRef.current = [...historyRef.current, { role: "user" as const, content: text }, { role: "assistant" as const, content: answer }].slice(-8);
        const guide = isTourKey(res.guide) ? res.guide : null;
        setCaption({ id: answer, reply: !guide });
        if (guide) {
          await speak(answer.length > 220 ? answer.slice(0, 220) : answer, run, "NAVIGATING");
          if (run !== runRef.current) return;
          startTour(guide);
          return;
        }
        void speak(answer.length > 320 ? answer.slice(0, 320) : answer, run, "IDLE_FLOATING");
      } catch {
        if (run !== runRef.current) return;
        setCaption({ id: "Maaf, Miu-chan belum bisa menjawab sekarang. Coba lagi sebentar ya." });
        setVoiceState("IDLE_FLOATING");
      }
    },
    [examLocked, assessment, questionId, refuse, speak, startTour],
  );

  const startListening = useCallback(async () => {
    if (examLocked) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicError("Perangkat ini tidak mendukung mikrofon. Ketik perintahmu lewat menu ⋯");
      return;
    }
    haltAll();
    setMicError(null);
    // Dibuat & dilanjutkan di dalam aksi pengguna (ketukan), syarat browser untuk AudioContext
    (meterRef.current ??= new AudioMeter()).resume();
    const run = runRef.current;
    try {
      // Peredam bising + penguat otomatis: mikrofon laptop yang pelan atau ruangan ramai membuat Whisper salah bahasa
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      if (run !== runRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      meterRef.current?.attachMic(stream);
      const mimeType = MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (run !== runRef.current) return;
        setVoiceState("THINKING");
        try {
          const text = await transcribe(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
          if (run !== runRef.current) return;
          if (!text) {
            setCaption({ id: "Miu-chan belum mendengar apa-apa. Coba ketuk lalu bicara lagi ya." });
            setVoiceState("IDLE_FLOATING");
            return;
          }
          await sendCommand(text);
        } catch (e) {
          if (run !== runRef.current) return;
          setMicError(e instanceof Error ? e.message : "Suaramu belum bisa dikenali.");
          setVoiceState("IDLE_FLOATING");
        }
      };
      recorderRef.current = rec;
      rec.start();
      setVoiceState("LISTENING");
      setCaption({ id: "Miu-chan mendengarkan… ketuk lagi kalau sudah selesai." });
      window.setTimeout(() => rec.state === "recording" && rec.stop(), MAX_RECORD_MS);
    } catch {
      setMicError("Izin mikrofon ditolak. Ketik perintahmu lewat menu ⋯");
      setVoiceState("IDLE_FLOATING");
    }
  }, [examLocked, haltAll, sendCommand]);

  const toggleListening = useCallback(() => {
    if (examLocked) {
      refuse();
      return;
    }
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") rec.stop();
    else void startListening();
  }, [examLocked, refuse, startListening]);

  const lockForExam = useCallback((key: string, locked: boolean) => {
    setLocks((prev) => {
      if (prev.has(key) === locked) return prev;
      const next = new Set(prev);
      if (locked) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const setMuted = useCallback(
    (v: boolean) => {
      setMutedState(v);
      savePrefs(v, captionsOn);
      if (v) audioRef.current?.pause();
    },
    [captionsOn],
  );
  const setCaptionsOn = useCallback(
    (v: boolean) => {
      setCaptionsState(v);
      savePrefs(isMuted, v);
    },
    [isMuted],
  );
  const dismissCaption = useCallback(() => setCaption(null), []);

  /* ── Panggung & sambutan ── */

  const markWelcomed = useCallback(() => {
    try {
      localStorage.setItem(`${WELCOME_KEY}:${user?.id ?? "tamu"}`, "1");
    } catch {
      /* abaikan */
    }
  }, [user?.id]);

  const openStage = useCallback(
    (origin?: { x: number; y: number }) => {
      if (examLocked) {
        refuse();
        return;
      }
      setCaption(null);
      setStage({ open: true, origin: origin ?? null });
      void startListening();
    },
    [examLocked, refuse, startListening],
  );

  const closeStage = useCallback(() => {
    haltAll();
    setStage((s) => ({ ...s, open: false }));
    setCaption(null);
    setMicError(null);
    if (welcome) {
      // Menutup sambutan = melewatinya
      markWelcomed();
      setWelcome(false);
    }
  }, [haltAll, welcome, markWelcomed]);

  const acceptWelcome = useCallback(() => {
    markWelcomed();
    setWelcome(false);
    startTour("welcome");
  }, [markWelcomed, startTour]);

  const skipWelcome = useCallback(() => {
    markWelcomed();
    setWelcome(false);
    haltAll();
    setStage((s) => ({ ...s, open: false }));
    setCaption({ ja: "またね！", id: "Oke! Kalau butuh bantuan, ketuk aku di pojok layar ya." });
  }, [markWelcomed, haltAll]);

  // Pengguna baru: disambut sekali di tengah layar, lalu ditawari keliling aplikasi
  useEffect(() => {
    if (!user || !isWidgetVisible || examLocked || assessment || tour || stage.open) return;
    let seen = true;
    try {
      seen = localStorage.getItem(`${WELCOME_KEY}:${user.id}`) === "1";
    } catch {
      /* penyimpanan tidak tersedia: jangan ganggu */
    }
    if (seen) return;
    const id = window.setTimeout(() => {
      const name = user.displayName?.trim().split(/\s+/)[0];
      const greeting = `Hai${name ? ` ${name}` : ""}! Aku Miu-chan, teman belajarmu di sini. Mau aku ajak keliling aplikasi sebentar? Cuma satu menit kok.`;
      setWelcome(true);
      setStage({ open: true, origin: null });
      setCaption({ ja: "はじめまして！ミウだよ。", id: greeting });
      const run = ++runRef.current;
      // Browser bisa menolak memutar suara sebelum ada ketukan; teks tetap tampil
      void speak(greeting, run, "IDLE_FLOATING");
    }, 1200);
    return () => window.clearTimeout(id);
    // Hanya saat akun/rute siap; jangan muncul ulang saat state lain berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isWidgetVisible, examLocked]);

  const getMicLevel = useCallback(() => meterRef.current?.micLevel() ?? 0, []);
  const getVoiceLevel = useCallback(() => meterRef.current?.voiceLevel() ?? 0, []);

  const value = useMemo<NavigatorContextValue>(
    () => ({
      isWidgetVisible,
      examLocked,
      isMuted,
      captionsOn,
      voiceState,
      caption,
      micError,
      band,
      tour,
      toggleListening,
      sendCommand,
      setMuted,
      setCaptionsOn,
      dismissCaption,
      startTour,
      tourNext,
      tourBack,
      endTour,
      speakLine,
      prefetchSpeak,
      lockForExam,
      setScreenDetail,
      assessment,
      setAssessment,
      stage,
      openStage,
      closeStage,
      welcome,
      acceptWelcome,
      skipWelcome,
      getMicLevel,
      getVoiceLevel,
    }),
    [isWidgetVisible, examLocked, isMuted, captionsOn, voiceState, caption, micError, band, tour, toggleListening, sendCommand, setMuted, setCaptionsOn, dismissCaption, startTour, tourNext, tourBack, endTour, speakLine, prefetchSpeak, lockForExam, setScreenDetail, assessment, setAssessment, stage, openStage, closeStage, welcome, acceptWelcome, skipWelcome, getMicLevel, getVoiceLevel],
  );

  return <NavigatorContext.Provider value={value}>{children}</NavigatorContext.Provider>;
}

export function useNavigator() {
  const ctx = useContext(NavigatorContext);
  if (!ctx) throw new Error("useNavigator harus di dalam NavigatorProvider");
  return ctx;
}

/** Dipakai layar di luar widget (mis. layar suara) untuk memulai tur; null di luar provider. */
export function useOptionalNavigator() {
  return useContext(NavigatorContext);
}

/** Beri tahu Miu-chan isi layar saat ini (mis. "Bab: Salam, langkah Kuis") supaya bantuannya nyambung. */
export function useScreenContext(key: string, detail: string | null) {
  const set = useContext(NavigatorContext)?.setScreenDetail;
  useEffect(() => {
    if (!set) return;
    set(key, detail);
    return () => set(key, null);
  }, [set, key, detail]);
}

/** Tandai layar sebagai latihan/kuis (null = tidak): Miu-chan beralih ke mode petunjuk tanpa jawaban. */
export function useAssessment(key: string, kind: Assessment | null, questionId?: string) {
  const set = useContext(NavigatorContext)?.setAssessment;
  useEffect(() => {
    if (!set) return;
    set(key, kind, questionId);
    return () => set(key, null);
  }, [set, key, kind, questionId]);
}

/** Bekukan navigator selama `active` (ujian resmi). Aman dipakai di luar provider. */
export function useExamLock(key: string, active: boolean) {
  const ctx = useContext(NavigatorContext);
  const lock = ctx?.lockForExam;
  useEffect(() => {
    if (!lock) return;
    lock(key, active);
    return () => lock(key, false);
  }, [lock, key, active]);
}
