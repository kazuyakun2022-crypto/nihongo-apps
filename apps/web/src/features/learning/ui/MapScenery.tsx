"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./scenery.module.css";

/**
 * Pemandangan peta belajar. Latar (langit, matahari/bulan, gunung, bukit, siluet khas wilayah) menempel di layar
 * selama peta digulir; hiasan kecil (pohon, lentera, rumah) berdiri di samping node.
 * Warna langit mengikuti jam lokal pengguna (useTimeOfDay); level menentukan nama wilayah & bangunan khasnya.
 */

type Landmark = "village" | "pagoda" | "city" | "castle";

const REALMS: Record<string, { name: string; landmark: Landmark }> = {
  PEMULA: { name: "Desa Asal", landmark: "village" },
  N5: { name: "Lembah Pemula", landmark: "village" },
  N4: { name: "Kota Kecil", landmark: "pagoda" },
  N3: { name: "Kota Besar", landmark: "city" },
  N2: { name: "Distrik Bisnis", landmark: "city" },
  N1: { name: "Benteng Master", landmark: "castle" },
};

export function realmOf(code: string) {
  return REALMS[code] ?? REALMS.N5;
}

export type TimeOfDay = "pagi" | "siang" | "sore" | "senja" | "malam";

export const TIME_LABEL: Record<TimeOfDay, string> = { pagi: "Pagi", siang: "Siang", sore: "Sore", senja: "Senja", malam: "Malam" };

function timeOfDay(d: Date): TimeOfDay {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 10) return "pagi";
  if (h >= 10 && h < 15) return "siang";
  if (h >= 15 && h < 17.5) return "sore";
  if (h >= 17.5 && h < 19) return "senja";
  return "malam";
}

/** Waktu lokal pengguna, diperbarui tiap menit. null sampai terbaca di browser (hindari beda render server). */
export function useTimeOfDay(): TimeOfDay | null {
  const [time, setTime] = useState<TimeOfDay | null>(null);
  useEffect(() => {
    const sync = () => setTime(timeOfDay(new Date()));
    sync();
    const id = window.setInterval(sync, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return time;
}

/** Posisi matahari/bulan: rendah saat pagi & senja, tinggi saat siang. */
const SUN_Y: Record<TimeOfDay, number> = { pagi: 300, siang: 150, sore: 250, senja: 380, malam: 170 };

/** Atap genteng melengkung khas Jepang: ujung sayap terangkat. cx = tengah, y = garis bawah atap, w = lebar. */
function Roof({ cx, y, w, h, color = "#3b4250", lip = 10 }: { cx: number; y: number; w: number; h: number; color?: string; lip?: number }) {
  const l = cx - w / 2;
  const r = cx + w / 2;
  return (
    <g>
      <path d={`M${l - lip} ${y - 6} Q${l + w * 0.18} ${y + 2} ${l + w * 0.22} ${y - h} L${r - w * 0.22} ${y - h} Q${r - w * 0.18} ${y + 2} ${r + lip} ${y - 6} L${r} ${y + 2} L${l} ${y + 2} Z`} fill={color} />
      <path d={`M${l + 4} ${y - 2} L${r - 4} ${y - 2}`} stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1.5" />
      <path d={`M${l + w * 0.24} ${y - h + 2} L${r - w * 0.24} ${y - h + 2}`} stroke="#000" strokeOpacity="0.25" strokeWidth="2" />
    </g>
  );
}

function Landmark({ kind }: { kind: Landmark }) {
  switch (kind) {
    case "village":
      // Desa sepenuhnya dari sprite (lihat SCENES)
      return null;
    case "pagoda":
      return (
        <g className={styles.landmarkArt}>
          <ellipse cx="1010" cy="616" rx="90" ry="7" fill="#000" opacity="0.12" />
          <path d="M962 616 L966 602 L1054 602 L1058 616 Z" fill="#9b958a" />
          <path d="M966 602 L1054 602 L1052 598 L968 598 Z" fill="#b7b1a6" />
          {[0, 1, 2, 3, 4].map((i) => {
            const y = 598 - i * 30;
            const w = 64 - i * 6;
            return (
              <g key={i}>
                <rect x={1010 - w / 2 + 6} y={y - 20} width={w - 12} height={20} fill="#f4ecdc" />
                <rect x={1010 - w / 2 + 6} y={y - 20} width={4} height={20} fill="#c8402c" />
                <rect x={1010 + w / 2 - 10} y={y - 20} width={4} height={20} fill="#c8402c" />
                <rect x={1004} y={y - 16} width={12} height={16} fill="#c8402c" />
                <g className={styles.lamp}>
                  <rect x={1006} y={y - 14} width={8} height={10} fill="#ffe1a0" />
                </g>
                <Roof cx={1010} y={y - 20} w={w + 18} h={9} lip={8} />
              </g>
            );
          })}
          {/* Sorin: tiang finial bercincin emas */}
          <rect x="1008" y="420" width="4" height="30" fill="#c9a24a" />
          {[424, 430, 436, 442].map((y) => (
            <rect key={y} x="1004" y={y} width="12" height="2.5" rx="1" fill="#e2bf62" />
          ))}
          <circle cx="1010" cy="418" r="3.5" fill="#e2bf62" />
        </g>
      );
    case "city":
      return (
        <g className={styles.landmarkArt}>
          <ellipse cx="1000" cy="618" rx="170" ry="8" fill="#000" opacity="0.12" />
          {/* Menara kisi merah-putih */}
          <g>
            <path d="M868 616 L884 470 L892 470 L908 616 Z" fill="none" stroke="#d2452f" strokeWidth="4" />
            <path d="M872 590 L904 590 M876 550 L900 550 M880 510 L896 510" stroke="#d2452f" strokeWidth="3" />
            <path d="M870 616 L896 550 M906 616 L880 550 M874 590 L892 510 M902 590 L884 510" stroke="#d2452f" strokeWidth="1.6" opacity="0.8" />
            <rect x="876" y="526" width="24" height="8" fill="#f4f4f4" />
            <rect x="880" y="486" width="16" height="6" fill="#f4f4f4" />
            <rect x="886.5" y="430" width="3" height="40" fill="#d2452f" />
            <circle className={styles.beacon} cx="888" cy="428" r="3" fill="#ff3b30" />
          </g>
          {[
            { x: 918, y: 500, w: 48, h: 116, c: "#7c8aa5" },
            { x: 970, y: 452, w: 58, h: 164, c: "#5f6f8e" },
            { x: 1032, y: 520, w: 40, h: 96, c: "#93a0b8" },
            { x: 1076, y: 478, w: 60, h: 138, c: "#6c7a96" },
            { x: 1140, y: 540, w: 44, h: 76, c: "#8996ae" },
          ].map((b, bi) => {
            const cols = Math.floor((b.w - 10) / 12);
            const rows = Math.floor((b.h - 16) / 16);
            return (
              <g key={bi}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.c} />
                <rect x={b.x + b.w - 8} y={b.y} width={8} height={b.h} fill="#000" opacity="0.15" />
                <rect x={b.x - 2} y={b.y - 4} width={b.w + 4} height={5} fill="#000" opacity="0.2" />
                <g className={styles.windows}>
                  {Array.from({ length: rows * cols }, (_, i) => (
                    <rect key={i} x={b.x + 6 + (i % cols) * 12} y={b.y + 10 + Math.floor(i / cols) * 16} width="6" height="8" opacity={(i * 7 + bi) % 5 === 0 ? 0.25 : 1} />
                  ))}
                </g>
              </g>
            );
          })}
          <rect x="986" y="438" width="14" height="14" rx="2" fill="#4c5a75" />
          <rect x="1010" y="420" width="2.5" height="32" fill="#4c5a75" />
          <circle className={styles.beacon} cx="1011" cy="418" r="2.5" fill="#ff3b30" />
          <rect x="1090" y="466" width="22" height="12" fill="#55627e" />
        </g>
      );
    case "castle":
      return (
        <g className={styles.landmarkArt}>
          <ellipse cx="1020" cy="618" rx="130" ry="8" fill="#000" opacity="0.12" />
          {/* Dinding batu miring berpola blok */}
          <path d="M930 618 L948 566 L1092 566 L1110 618 Z" fill="#8d8578" />
          <path d="M930 618 L948 566 L956 566 L940 618 Z" fill="#000" opacity="0.12" />
          {[576, 588, 600, 612].map((y) => (
            <path key={y} d={`M${946 - (y - 566) * 0.35} ${y} L${1094 + (y - 566) * 0.35} ${y}`} stroke="#6f685d" strokeWidth="1.2" />
          ))}
          {Array.from({ length: 24 }, (_, i) => (
            <path key={i} d={`M${952 + (i % 6) * 26 + (Math.floor(i / 6) % 2) * 13} ${566 + Math.floor(i / 6) * 12} v12`} stroke="#6f685d" strokeWidth="1" />
          ))}
          <rect x="958" y="536" width="124" height="30" fill="#f7f4ec" />
          <g className={styles.lamp}>
            {[970, 996, 1022, 1048].map((x) => (
              <rect key={x} x={x} y="546" width="14" height="10" fill="#ffe1a0" />
            ))}
          </g>
          <Roof cx={1020} y={538} w={140} h={12} lip={12} />
          <rect x="972" y="500" width="96" height="26" fill="#f7f4ec" />
          <g className={styles.lamp}>
            {[984, 1012, 1040].map((x) => (
              <rect key={x} x={x} y="508" width="14" height="10" fill="#ffe1a0" />
            ))}
          </g>
          <Roof cx={1020} y={502} w={112} h={11} lip={10} />
          {/* Atap segitiga chidori hafu */}
          <path d="M1004 496 L1020 482 L1036 496 Z" fill="#3b4250" />
          <path d="M1009 495 L1020 486 L1031 495 Z" fill="#f7f4ec" />
          <rect x="988" y="462" width="64" height="22" fill="#f7f4ec" />
          <rect x="1012" y="468" width="16" height="10" fill="#3b4250" />
          <Roof cx={1020} y={464} w={82} h={12} lip={9} />
          {/* Shachihoko emas */}
          <path d="M998 451 q-6 -8 0 -12 q2 6 6 6 z" fill="#e2bf62" />
          <path d="M1042 451 q6 -8 0 -12 q-2 6 -6 6 z" fill="#e2bf62" />
        </g>
      );
  }
}

type Pt = [number, number];

/** Sampel kurva Bézier kubik berantai (format path: titik awal + [c1, c2, akhir]...) jadi tabel x→y. */
function surface(start: Pt, segs: [Pt, Pt, Pt][]): (x: number) => number {
  const pts: Pt[] = [];
  let p0 = start;
  for (const [c1, c2, p3] of segs) {
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const u = 1 - t;
      pts.push([
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1],
      ]);
    }
    p0 = p3;
  }
  return (x) => {
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][0] >= x) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
      }
    }
    return pts[pts.length - 1][1];
  };
}

/*
 * Harus sama dengan path di SceneBackdrop:
 *   hillFar  "M-20 640c160-60 300-70 460-30s300 30 460-20 260-40 320-20"
 *   hillNear "M-20 700c200-50 380-40 560 0s380 30 680-30"
 * (titik kontrol "s" = pantulan titik kontrol sebelumnya)
 */
const HILL_FAR_D = "M-20 640c160-60 300-70 460-30s300 30 460-20 260-40 320-20V800H-20z";
const HILL_NEAR_D = "M-20 700c200-50 380-40 560 0s380 30 680-30V800H-20z";
const hillFarY = surface([-20, 640], [
  [[140, 580], [280, 570], [440, 610]],
  [[600, 650], [740, 640], [900, 590]],
  [[1060, 540], [1160, 550], [1220, 570]],
]);
const hillNearY = surface([-20, 700], [
  [[180, 650], [360, 660], [540, 700]],
  [[720, 740], [920, 730], [1220, 670]],
]);
/** Seberapa dalam dasar sprite tertanam ke tanah supaya tidak terlihat mengambang. */
const SINK = 7;

/** Ukuran asli sprite (px) untuk menjaga rasio. */
const SIZE: Record<string, [number, number]> = {
  "minka-a": [192, 139], "minka-b": [192, 138], "minka-c": [193, 139], nouka: [210, 143],
  "machiya-biru": [210, 141], "machiya-merah": [192, 141], "toko-onigiri": [193, 142], "toko-roti": [167, 141],
  torii: [154, 133], menara: [102, 204], jembatan: [188, 85], "sakura-a": [119, 133], "sakura-besar": [150, 142],
  "pinus-besar": [128, 148], "pinus-a": [115, 142], "lentera-a": [45, 87], "lentera-b": [47, 90], "umbul-merah": [41, 120],
  "bambu-a": [89, 142], sumur: [90, 111],
};
/** Rumah yang punya lapisan cahaya malam (<nama>-cahaya.webp). */
const LIT = new Set(["minka-a", "minka-b", "minka-c", "nouka", "machiya-biru", "machiya-merah", "toko-onigiri", "toko-roti"]);

/** x = tepi kiri, w = lebar (tinggi dari rasio), flip = dicerminkan. base: garis dasar; kosong = menapak di bukit. */
type Placed = { src: string; x: number; w: number; base?: number; flip?: boolean };

/**
 * Sprite tersebar di dua kedalaman: far (kecil, di bukit jauh) dan near (besar, di bukit depan, sebagian terpotong
 * tepi bawah). Ponsel hanya melihat x ≈ 410–790, jadi tiap wilayah menaruh satu-dua elemen di rentang itu.
 */
const SCENES: Record<Landmark, { far: Placed[]; near: Placed[] }> = {
  village: {
    far: [
      { src: "minka-b", x: 30, w: 104 },
      { src: "nouka", x: 290, w: 100, flip: true },
      { src: "torii", x: 612, w: 78 },
      { src: "sakura-a", x: 880, w: 58 },
      { src: "minka-c", x: 960, w: 110 },
    ],
    near: [
      { src: "minka-a", x: -60, base: 812, w: 270 },
      { src: "pinus-besar", x: 230, base: 790, w: 120 },
      { src: "jembatan", x: 440, base: 772, w: 190 },
      { src: "sakura-besar", x: 780, base: 800, w: 170 },
      { src: "nouka", x: 930, base: 820, w: 290, flip: true },
    ],
  },
  pagoda: {
    far: [
      { src: "machiya-biru", x: 40, w: 116 },
      { src: "toko-roti", x: 330, w: 92 },
      { src: "umbul-merah", x: 440, w: 18 },
      { src: "machiya-merah", x: 920, w: 116, flip: true },
    ],
    near: [
      { src: "toko-onigiri", x: -50, base: 816, w: 270 },
      { src: "sakura-besar", x: 250, base: 796, w: 150 },
      { src: "lentera-a", x: 640, base: 780, w: 40 },
      { src: "machiya-biru", x: 940, base: 818, w: 280, flip: true },
    ],
  },
  city: {
    far: [],
    near: [
      { src: "pinus-besar", x: -10, base: 806, w: 150 },
      { src: "sakura-besar", x: 1040, base: 806, w: 170 },
    ],
  },
  castle: {
    far: [
      { src: "menara", x: 900, w: 58 },
      { src: "minka-b", x: 60, w: 96 },
    ],
    near: [
      { src: "pinus-besar", x: -30, base: 806, w: 180 },
      { src: "lentera-b", x: 660, base: 784, w: 44 },
      { src: "bambu-a", x: 1080, base: 806, w: 110 },
    ],
  },
};

/** Rentang x absolut landmark SVG (setelah digeser -250). Desa tanpa landmark SVG. */
const LANDMARK_SPAN: Record<Landmark, [number, number]> = {
  village: [0, 0],
  pagoda: [700, 820],
  city: [610, 940],
  castle: [670, 870],
};

/** Satu lapisan sprite + lapisan cahaya jendela (tidak ikut diredupkan) yang menyala saat gelap. */
function SpriteLayer({ items, ground }: { items: Placed[]; ground: (x: number) => number }) {
  const geo = items.map((it) => {
    const [nw, nh] = SIZE[it.src];
    const h = Math.round((it.w * nh) / nw);
    // Menapak di titik terendah permukaan di bawah sprite, supaya tidak ada sisi yang melayang
    const surfaceY = Math.max(ground(it.x + it.w * 0.2), ground(it.x + it.w * 0.5), ground(it.x + it.w * 0.8));
    const base = it.base ?? surfaceY + SINK;
    const y = base - h;
    const flip = it.flip ? `translate(${it.x * 2 + it.w} 0) scale(-1 1)` : undefined;
    return { ...it, h, y, base, flip };
  });
  return (
    <>
      <g className={styles.groundShadow}>
        {geo.map((g, i) => (
          <ellipse key={i} cx={g.x + g.w / 2} cy={g.base - 2} rx={g.w * 0.48} ry={Math.max(3, g.w * 0.05)} />
        ))}
      </g>
      <g className={styles.landmarkArt}>
        {geo.map((g, i) => (
          <image key={i} href={`/scenery/${g.src}.webp`} x={g.x} y={g.y} width={g.w} height={g.h} transform={g.flip} />
        ))}
      </g>
      <g className={styles.houseGlow}>
        {geo
          .filter((g) => LIT.has(g.src))
          .map((g, i) => (
            <image key={i} href={`/scenery/${g.src}-cahaya.webp`} x={g.x} y={g.y} width={g.w} height={g.h} transform={g.flip} />
          ))}
      </g>
    </>
  );
}

/**
 * Latar layar penuh di belakang halaman Belajar (dari tepi sidebar sampai tepi kanan layar).
 * Lewat portal ke body: .page punya transform (animasi masuk) yang mematahkan position: fixed.
 */
export function SceneBackdrop({ code, time }: { code: string; time: TimeOfDay | null }) {
  const realm = realmOf(code);
  const scene = SCENES[realm.landmark];
  const t = time ?? "pagi";
  const night = t === "malam";
  const sunY = SUN_Y[t];
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className={`${styles.realm} ${styles.backdrop}`} data-realm={code} data-time={time ?? undefined} aria-hidden>
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" className={styles.backdropSvg}>
        <defs>
          <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--sky-top)" }} />
            <stop offset="1" style={{ stopColor: "var(--sky-bottom)" }} />
          </linearGradient>
          {/* Bulan sabit: bagian tertutup dipotong lewat mask, bukan ditimpa lingkaran warna langit */}
          <mask id="scene-moon-mask">
            <rect width="1200" height="800" fill="#fff" />
            <circle cx="752" cy={sunY - 16} r="50" fill="#000" />
          </mask>
          <radialGradient id="scene-sun-glow">
            <stop offset="0" style={{ stopColor: "var(--sun)", stopOpacity: 0.55 }} />
            <stop offset="1" style={{ stopColor: "var(--sun)", stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#scene-sky)" />

        {night && (
          <g className={styles.stars}>
            {Array.from({ length: 40 }, (_, i) => (
              <circle key={i} cx={(i * 137) % 1200} cy={(i * 71) % 380} r={i % 5 === 0 ? 2.2 : 1.3} style={{ "--d": `${(i % 7) * 0.6}s` } as React.CSSProperties} />
            ))}
          </g>
        )}

        {/* Dekat tengah: di ponsel latar terpotong ke bagian tengah (x ±190 dari 600) */}
        <circle cx="730" cy={sunY} r={night ? 120 : 170} fill="url(#scene-sun-glow)" opacity={night ? 0.6 : 1} />
        <circle cx="730" cy={sunY} r="56" className={styles.sun} mask={night ? "url(#scene-moon-mask)" : undefined} />

        <g className={styles.clouds}>
          {[
            { cls: styles.cloudA, x: 200, y: 170, s: 1.1 },
            { cls: styles.cloudB, x: 690, y: 110, s: 0.85 },
            { cls: styles.cloudC, x: 1040, y: 320, s: 0.75 },
            { cls: styles.cloudB, x: 430, y: 380, s: 0.6 },
          ].map((c, i) => (
            <g key={i} className={c.cls}>
              <g transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
                {/* Dasar awan sedikit gelap, puncak membulat terang */}
                <ellipse cx="0" cy="16" rx="84" ry="14" className={styles.cloudShade} />
                <circle cx="-44" cy="2" r="24" />
                <circle cx="-8" cy="-12" r="34" />
                <circle cx="30" cy="-2" r="26" />
                <circle cx="56" cy="8" r="16" />
                <ellipse cx="0" cy="12" rx="80" ry="14" />
              </g>
            </g>
          ))}
        </g>

        {!night && (
          <g className={styles.birds} fill="none" strokeWidth="2.5" strokeLinecap="round">
            <path d="M560 200 q8 -8 16 0 q8 -8 16 0" />
            <path d="M600 226 q6 -6 12 0 q6 -6 12 0" />
            <path d="M530 236 q5 -5 10 0 q5 -5 10 0" />
          </g>
        )}

        {/* Gunung bersalju: sisi kiri terang, sisi kanan bayangan, salju bertingkat */}
        <path className={styles.mountFar} d="M110 650 L470 268 Q520 228 570 268 L930 650 Z" />
        <path className={styles.mountShade} d="M520 248 Q545 248 570 268 L930 650 L640 650 Q600 520 560 420 Q536 330 520 248 Z" />
        <path className={styles.snow} d="M404 338 L470 268 Q520 228 570 268 L636 340 L610 330 L594 356 L572 334 L552 366 L530 338 L506 370 L486 340 L462 360 L444 334 L424 352 Z" />
        <path className={styles.snowShade} d="M520 248 Q545 248 570 268 L636 340 L610 330 L594 356 L572 334 L552 366 L540 350 Q534 296 520 248 Z" />
        <path className={styles.ridge} d="M470 420 L486 380 M560 450 L548 400 M410 480 L436 440 M620 470 L604 430" />
        <path className={styles.mountFar2} d="M-40 668 L210 440 Q222 432 234 440 L300 498 L420 404 Q432 396 444 404 L700 668 Z" />
        <path className={styles.mountShade2} d="M222 436 Q230 438 234 440 L300 498 L280 668 L180 668 Q230 560 222 436 Z M432 400 Q440 402 444 404 L700 668 L560 668 Q480 520 432 400 Z" />

        <path className={styles.hillFar} d={HILL_FAR_D} />
        {/* Pepohonan di bukit jauh */}
        <g className={styles.hillTrees}>
          {[40, 80, 120, 200, 330, 365, 400, 520, 830, 870, 1110, 1150, 1185]
            .filter((x) => !scene.far.some((f) => x > f.x - 16 && x < f.x + f.w + 16) && !(x > LANDMARK_SPAN[realm.landmark][0] && x < LANDMARK_SPAN[realm.landmark][1]))
            .map((x, i) => (
            <g key={x} transform={`translate(${x} ${hillFarY(x) + 4 + (i % 3) * 3})`}>
              <rect x="-2" y="0" width="4" height="12" className={styles.trunk} />
              <ellipse cx="0" cy="-6" rx="12" ry="16" />
              <ellipse cx="-3" cy="-10" rx="6" ry="9" className={styles.treeLight} />
            </g>
          ))}
        </g>
        {/* Landmark SVG digambar dengan dasar y≈618 di koordinat lokal; turunkan ke permukaan bukit di tengahnya */}
        <g transform={`translate(-250 ${Math.round(hillFarY((LANDMARK_SPAN[realm.landmark][0] + LANDMARK_SPAN[realm.landmark][1]) / 2) + SINK - 618)})`}>
          <Landmark kind={realm.landmark} />
        </g>
        <SpriteLayer items={scene.far} ground={hillFarY} />
        <path className={styles.hillNear} d={HILL_NEAR_D} />
        {/* Jalan setapak & rumput di bukit dekat */}
        <path className={styles.trail} d="M540 800 C 560 760, 620 735, 700 712" />
        <g className={styles.grass}>
          {[60, 150, 260, 380, 470, 760, 860, 960, 1060, 1150].map((x, i) => (
            <path key={x} d={`M${x} ${730 + (i % 3) * 12} l4 -12 l3 12 l4 -9 l2 9`} />
          ))}
        </g>
        {/* Sungai kecil di bawah jembatan desa */}
        {realm.landmark === "village" && (
          <path className={styles.stream} d="M498 706 C 520 728, 470 752, 506 800 L 612 800 C 580 756, 622 726, 566 708 Z" />
        )}
        <SpriteLayer items={scene.near} ground={hillNearY} />
      </svg>
    </div>,
    document.body,
  );
}

/**
 * Sprite hiasan di samping node (public/scenery, dipotong dari lembar aset).
 * h = tinggi relatif terhadap --prop; dasar gambar menapak sejajar dasar node.
 */
const PROPS: { src: string; h: number }[] = [
  { src: "sakura-a", h: 1.5 },
  { src: "lentera-a", h: 1 },
  { src: "pinus-a", h: 1.45 },
  { src: "semak-bulat", h: 0.6 },
  { src: "bambu-b", h: 1.25 },
  { src: "sumur", h: 1.15 },
  { src: "sakura-b", h: 1.5 },
  { src: "batu", h: 0.75 },
  { src: "umbul-merah", h: 1.45 },
  { src: "bonsai", h: 0.95 },
  { src: "plum", h: 1.5 },
  { src: "gerobak", h: 0.7 },
  { src: "pinus-besar", h: 1.55 },
  { src: "tong", h: 0.6 },
  { src: "lentera-b", h: 1 },
  { src: "payung-bangku", h: 1.25 },
  { src: "bambu-a", h: 1.5 },
  { src: "kayu-bakar", h: 0.55 },
  { src: "sakura-besar", h: 1.45 },
  { src: "umbul-biru", h: 1.45 },
  { src: "semak-c", h: 0.65 },
];

export function SceneProp({ index }: { index: number }) {
  const p = PROPS[index % PROPS.length];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/scenery/${p.src}.webp`}
      alt=""
      className={styles.prop}
      style={{ "--ph": p.h } as React.CSSProperties}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
