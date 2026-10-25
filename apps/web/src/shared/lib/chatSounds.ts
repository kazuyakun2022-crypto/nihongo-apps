"use client";

// Efek suara chat disintesis via Web Audio API — tanpa file audio tambahan
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  // Browser menahan AudioContext sampai ada interaksi user
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, freq: number, start: number, duration: number, volume: number, endFreq?: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** "Pop" pendek naik — pesan terkirim */
export function playSendSound() {
  const ac = getContext();
  if (!ac) return;
  tone(ac, 520, ac.currentTime, 0.12, 0.12, 880);
}

/** Chime dua nada — pesan dari AI masuk */
export function playReceiveSound() {
  const ac = getContext();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 784, t, 0.18, 0.1);        // G5
  tone(ac, 1175, t + 0.09, 0.28, 0.1); // D6
}
