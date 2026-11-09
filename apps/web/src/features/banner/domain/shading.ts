import type { CSSProperties } from "react";

export type ShadingPosition = "left" | "right" | "bottom" | "full";

export const SHADING_POSITIONS: { value: ShadingPosition; label: string; desc: string; icon: string }[] = [
  { value: "left", label: "Kiri (Standar)", desc: "Gelap di kiri untuk teks, cerah di kanan", icon: "◧" },
  { value: "right", label: "Kanan", desc: "Gelap di kanan, cerah di kiri", icon: "◨" },
  { value: "bottom", label: "Bawah", desc: "Gelap di bagian bawah, cerah di atas", icon: "⬓" },
  { value: "full", label: "Merata", desc: "Gelap merata di seluruh latar", icon: "◼" },
];

export const SHADING_PRESETS = [
  { value: 25, label: "Sangat Tipis (25%)", desc: "Foto sangat cerah & tembus pandang" },
  { value: 40, label: "Tipis (40%)", desc: "Foto terang, teks terbaca jelas" },
  { value: 60, label: "Sedang (60%)", desc: "Seimbang antara teks & foto (Standar)" },
  { value: 75, label: "Tegas (75%)", desc: "Kontras tegas untuk foto ramai" },
  { value: 90, label: "Pekat (90%)", desc: "Sangat gelap, teks tajam" },
];

/**
 * Menghitung gaya gradien bayangan (shading overlay) banner
 * berdasarkan posisi/arah dan ketebalan/opasitas (0 - 100%).
 * Dirancang agar foto latar belakang tetap terlihat estetis dan teks memiliki kontras tinggi (WCAG AAA).
 */
export function getBannerShadingStyle(
  position: ShadingPosition = "left",
  opacity: number = 60
): CSSProperties {
  const op = Math.max(5, Math.min(100, Number(opacity) || 60));
  const max = (op / 100).toFixed(2);
  const mid = ((op * 0.72) / 100).toFixed(2);
  const low = ((op * 0.15) / 100).toFixed(2);

  let bg = `linear-gradient(90deg, rgba(18, 4, 7, ${max}) 0%, rgba(18, 4, 7, ${mid}) 55%, rgba(18, 4, 7, ${low}) 88%, transparent 100%)`;

  if (position === "right") {
    bg = `linear-gradient(270deg, rgba(18, 4, 7, ${max}) 0%, rgba(18, 4, 7, ${mid}) 55%, rgba(18, 4, 7, ${low}) 88%, transparent 100%)`;
  } else if (position === "bottom") {
    bg = `linear-gradient(0deg, rgba(18, 4, 7, ${max}) 0%, rgba(18, 4, 7, ${mid}) 58%, rgba(18, 4, 7, ${low}) 88%, transparent 100%)`;
  } else if (position === "full") {
    bg = `radial-gradient(ellipse at center, rgba(18, 4, 7, ${mid}) 0%, rgba(18, 4, 7, ${max}) 100%)`;
  }

  return { background: bg };
}
