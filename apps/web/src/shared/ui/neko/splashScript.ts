import type { MiuMeshEngine } from "./MiuMeshEngine";

export interface SplashFx {
  /** Percikan bintang dari mata yang wink. */
  stars: () => void;
  /** Hati melayang dari atas kepala. */
  hearts: () => void;
}

/** [waktu ms sejak engine siap, aksi]. */
export type SplashStep = [at: number, run: () => void];

/** Saat wink dimulai (ms sejak engine siap): setelah pop-in (0,35 s) selesai supaya tidak bertabrakan. */
export const WINK_AT = 350;

export function createSplashScript(e: MiuMeshEngine, fx: SplashFx): SplashStep[] {
  return [
    // 0ms: Miu-chan muncul, pipi mulai merona dan kepala pelan-pelan miring
    [0, () => {
      e.setTilt(-0.05);
      e.setMouth(0.5);
      e.setBlush(0.8);
    }],

    // 350ms: WINK + percikan bintang + hati melayang (ditahan sampai fade-out)
    [WINK_AT, () => {
      e.setEyes("wink");
      fx.stars();
      fx.hearts();
      e.bounce(2);
      e.setTilt(-0.09);
      e.setMouth(0.75);
      e.setBlush(1);
      e.flickEar("right", 1.5);
    }],

    // 650ms: percikan bintang tambahan
    [WINK_AT + 300, () => {
      fx.stars();
    }],
  ];
}

/** Durasi splash sebelum fade-out (ms); + fade 350ms ≈ 1,6 detik total. */
export const SPLASH_DURATION = 1250;
