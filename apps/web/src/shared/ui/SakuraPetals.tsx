"use client";

import { useEffect, useRef } from "react";
import styles from "./sakuraPetals.module.css";

interface Petal {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  driftPhase: number;
  driftSpeed: number;
  angle: number;
  spin: number;
  flipPhase: number;
  flipSpeed: number;
  opacity: number;
  color: string;
}

const COLORS = ["#f9bccd", "#f7a7bf", "#ffd1de", "#f287a0", "#ffe3ea"];
const DEFAULT_COUNT = 26;

function makePetal(width: number, height: number, spread: boolean): Petal {
  const size = 9 + Math.random() * 13;
  return {
    x: Math.random() * width,
    y: spread ? Math.random() * height : -size * 2 - Math.random() * height * 0.15,
    size,
    speed: 22 + Math.random() * 38,
    drift: 14 + Math.random() * 34,
    driftPhase: Math.random() * Math.PI * 2,
    driftSpeed: 0.4 + Math.random() * 0.7,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.2,
    flipPhase: Math.random() * Math.PI * 2,
    flipSpeed: 0.6 + Math.random() * 1.4,
    opacity: 0.35 + Math.random() * 0.4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

/** Kelopak sakura: lebar di ujung atas dengan lekukan, menyempit ke pangkal. */
function tracePetal(ctx: CanvasRenderingContext2D, size: number) {
  const w = size;
  const h = size * 1.35;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.bezierCurveTo(-w * 0.62, h * 0.24, -w * 0.6, -h * 0.34, -w * 0.16, -h * 0.5);
  ctx.quadraticCurveTo(-w * 0.05, -h * 0.36, 0, -h * 0.4);
  ctx.quadraticCurveTo(w * 0.05, -h * 0.36, w * 0.16, -h * 0.5);
  ctx.bezierCurveTo(w * 0.6, -h * 0.34, w * 0.62, h * 0.24, 0, h * 0.5);
  ctx.closePath();
}

/** Latar kelopak sakura yang jatuh perlahan. Tanpa animasi bila pengguna memilih reduced-motion. */
export function SakuraPetals({ count = DEFAULT_COUNT }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let width = 0;
    let height = 0;
    let petals: Petal[] = [];
    let raf = 0;
    let last = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (petals.length === 0) {
        petals = Array.from({ length: count }, () => makePetal(width, height, true));
      }
    };

    const frame = (now: number) => {
      if (!running) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      ctx.clearRect(0, 0, width, height);

      for (const p of petals) {
        p.driftPhase += p.driftSpeed * dt;
        p.flipPhase += p.flipSpeed * dt;
        p.angle += p.spin * dt;
        p.y += p.speed * dt;
        p.x += Math.sin(p.driftPhase) * p.drift * dt;

        if (p.y - p.size * 2 > height) Object.assign(p, makePetal(width, height, false));
        if (p.x < -40) p.x = width + 40;
        else if (p.x > width + 40) p.x = -40;

        const flipScale = Math.max(0.18, Math.abs(Math.cos(p.flipPhase)));

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(flipScale, 1);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        tracePetal(ctx, p.size);
        ctx.fill();
        ctx.globalAlpha = p.opacity * 0.35;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(0.6, p.size * 0.04);
        ctx.stroke();
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
