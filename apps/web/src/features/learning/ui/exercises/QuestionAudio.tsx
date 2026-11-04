"use client";

import { useEffect, useRef, useState } from "react";
import { versionedAudioUrl } from "@/shared/lib/useSpeech";
import { VolumeIcon } from "@/shared/ui/icons";

/**
 * Audio soal mendengar: langsung berbunyi saat soal tampil, tombolnya hanya untuk memutar ulang.
 * Pasang dengan key={soal.id} agar tiap soal baru berbunyi sendiri; audio berhenti saat pindah soal.
 */
export function QuestionAudio({ url, className }: { url: string; className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  /** Browser memblokir putar otomatis (mis. belum ada ketukan di halaman): tombol jadi "Putar audio". */
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const audio = new Audio(versionedAudioUrl(url));
    audioRef.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onended = audio.onpause = () => setPlaying(false);
    // Jeda singkat supaya animasi kartu soal selesai dulu
    const t = setTimeout(() => {
      void audio.play().catch(() => setBlocked(true));
    }, 250);
    return () => {
      clearTimeout(t);
      audio.pause();
      audio.onplay = audio.onended = audio.onpause = null;
      audioRef.current = null;
    };
  }, [url]);

  function replay() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().then(() => setBlocked(false)).catch(() => {});
  }

  return (
    <button type="button" className={className} onClick={replay} aria-label={blocked ? "Putar audio soal" : "Putar ulang audio soal"}>
      <VolumeIcon size={16} /> {playing ? "Sedang diputar…" : blocked ? "Putar audio" : "Putar ulang"}
    </button>
  );
}
