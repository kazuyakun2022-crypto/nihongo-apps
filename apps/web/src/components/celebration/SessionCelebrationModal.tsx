// components/celebration/SessionCelebrationModal.tsx
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { soundFX } from '@/lib/audio/SoundFXManager';

export interface CelebrationProps {
  xpEarned: number;
  currentStreakDays: number;
  levelProgressPct: number;
  onContinue: () => void;
  title?: string;
  subtitle?: string;
  levelName?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  scale: number;
  type: 'sakura' | 'star' | 'ribbon';
  color: string;
  alpha: number;
}

export const SessionCelebrationModal: React.FC<CelebrationProps> = ({
  xpEarned,
  currentStreakDays,
  levelProgressPct,
  onContinue,
  title = 'Luar Biasa!',
  subtitle = 'Sesi latihan harian berhasil diselesaikan',
  levelName = 'N5 Menuju N4',
}) => {
  const [phase, setPhase] = useState<number>(1);
  const [displayedXP, setDisplayedXP] = useState<number>(0);
  const [coinPulse, setCoinPulse] = useState<boolean>(false);
  const [stamped, setStamped] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Inisialisasi Audio FX Orchestration & Phase Sequencing
  useEffect(() => {
    // Tahap 1: Mascot Fanfare & Confetti (0.0s)
    const tFanfare = setTimeout(() => {
      soundFX.play('fanfare_triumphant', 0.75);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch {}
      }
    }, 50);

    // Tahap 2: XP Rolling Counter & Ticker Pulse (0.8s - 1.8s)
    const tPhase2 = setTimeout(() => {
      setPhase(2);
      const target = Math.max(1, xpEarned);
      const duration = 900;
      const intervalMs = Math.max(18, Math.floor(duration / target));
      let currentVal = 0;

      const ticker = setInterval(() => {
        currentVal += 1;
        setDisplayedXP(currentVal);

        if (currentVal % 5 === 0 || currentVal === target) {
          setCoinPulse(true);
          setTimeout(() => setCoinPulse(false), 120);
          soundFX.play('coin_tick', 0.28);
        }

        if (currentVal >= target) {
          clearInterval(ticker);
        }
      }, intervalMs);
    }, 800);

    // Tahap 3: Streak Flame Surge & Calendar Stamping (1.8s - 2.8s)
    const tPhase3 = setTimeout(() => {
      setPhase(3);
      soundFX.play('fire_surge', 0.65);
      // Neko Paw Stamp hits at 2.3s
      setTimeout(() => {
        setStamped(true);
        soundFX.play('tap', 0.45);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(25);
          } catch {}
        }
      }, 500);
    }, 1800);

    // Tahap 4: Level Mastery Radial Progress Fill (2.8s - 3.5s)
    const tPhase4 = setTimeout(() => {
      setPhase(4);
      soundFX.play('glockenspiel_chime', 0.55);
    }, 2800);

    // Tahap 5: Claim Reward & Solid Continue Action (3.5s+)
    const tPhase5 = setTimeout(() => {
      setPhase(5);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(35);
        } catch {}
      }
    }, 3500);

    return () => {
      clearTimeout(tFanfare);
      clearTimeout(tPhase2);
      clearTimeout(tPhase3);
      clearTimeout(tPhase4);
      clearTimeout(tPhase5);
    };
  }, [xpEarned]);

  // 2. Confetti Canvas 2D Engine (60 partikel: sakura, bintang emas, pita kertas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const originX = width / 2;
    const originY = height / 2;

    const colors = ['#FF5A79', '#FFC800', '#58CC02', '#38BDF8', '#F472B6', '#A855F7', '#FF9600'];
    const particles: Particle[] = [];

    // Tepat 60 partikel presisi
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.4;
      const speed = 7 + Math.random() * 11;
      const types: ('sakura' | 'star' | 'ribbon')[] = ['sakura', 'star', 'ribbon'];
      const type = types[i % 3];

      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        scale: 0.7 + Math.random() * 0.6,
        type,
        color: type === 'sakura' ? '#FF5A79' : type === 'star' ? '#FFC800' : colors[i % colors.length],
        alpha: 1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // Gravitasi halus
        p.vx *= 0.98; // Hambatan udara
        p.rotation += p.vRot;
        p.alpha -= 0.007;

        if (p.alpha > 0.01) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.scale(p.scale, p.scale);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;

          if (p.type === 'sakura') {
            // Gambar kelopak sakura organik
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.bezierCurveTo(7, -10, 10, -2, 6, 8);
            ctx.bezierCurveTo(2, 12, -2, 12, -6, 8);
            ctx.bezierCurveTo(-10, -2, -7, -10, 0, -10);
            ctx.fill();
          } else if (p.type === 'star') {
            // Gambar bintang emas 5 sudut
            ctx.beginPath();
            for (let s = 0; s < 5; s++) {
              ctx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * 9, -Math.sin(((18 + s * 72) * Math.PI) / 180) * 9);
              ctx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * 4.5, -Math.sin(((54 + s * 72) * Math.PI) / 180) * 4.5);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            // Potongan pita kertas berwarna-warni
            ctx.fillRect(-6, -3, 12, 6);
          }

          ctx.restore();
        }
      }

      if (alive) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Kalender mingguan mini
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const todayIndex = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // 0=Senin .. 6=Minggu
  }, []);

  // Perhitungan Radial Progress (Tahap 4)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (levelProgressPct / 100) * circumference;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md select-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        userSelect: 'none',
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* 2D Canvas Confetti Layer */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Kartu Selebrasi Utama (Warm Tactile Neubrutalism-Lite) */}
      <motion.div
        initial={{ scale: 0.82, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 260 }}
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          padding: '24px 20px',
          border: '4px solid #1E293B',
          boxShadow: '0 12px 0 0 #1E293B, 0 20px 40px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Tahap 1: Mascot Fanfare Spring Bounce (Miu-chan Selebrasi) */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{
            position: 'relative',
            width: '104px',
            height: '104px',
            borderRadius: '9999px',
            backgroundColor: '#FEF3C7',
            border: '3.5px solid #1E293B',
            boxShadow: '0 4px 0 0 #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            overflow: 'visible',
          }}
        >
          {/* Miu-chan Karakter Asli */}
          <div
            style={{
              position: 'relative',
              width: '94px',
              height: '94px',
              borderRadius: '9999px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              src="/neko/maskot-senang.webp"
              alt="Miu-chan Selebrasi"
              width={94}
              height={94}
              priority
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: 'scale(1.08)',
              }}
            />
          </div>

          {/* Aksentuasi Terompet Pesta / Sparkle Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #1E293B',
              boxShadow: '0 2px 0 0 #1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            🎉
          </motion.div>
        </motion.div>

        <h2
          className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-1"
          style={{
            fontSize: '1.65rem',
            fontWeight: 900,
            color: '#1E293B',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            margin: '0 0 4px 0',
          }}
        >
          {title}
        </h2>
        <p
          className="text-xs font-semibold text-slate-500 mb-5"
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#64748B',
            margin: '0 0 18px 0',
          }}
        >
          {subtitle}
        </p>

        {/* Tahap 2 & 3: XP Rolling Counter & Streak Flame Surge Cards */}
        <div
          className="w-full grid grid-cols-2 gap-3 mb-4"
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {/* Kartu XP dengan Ticker Animation & Coin Glow */}
          <motion.div
            animate={coinPulse ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.15 }}
            style={{
              backgroundColor: '#FEF9C3',
              borderRadius: '18px',
              padding: '12px 10px',
              border: '2.5px solid #FACC15',
              boxShadow: '0 4px 0 0 #CA8A04',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#854D0E',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Total XP
            </span>
            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                color: '#CA8A04',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              🪙 +{displayedXP}
            </span>
          </motion.div>

          {/* Kartu Streak dengan Kobaran Api Vektor */}
          <div
            style={{
              backgroundColor: '#FFF7ED',
              borderRadius: '18px',
              padding: '12px 10px',
              border: '2.5px solid #FB923C',
              boxShadow: '0 4px 0 0 #EA580C',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#9A3412',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Streak
            </span>
            <span
              style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: '#EA580C',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              🔥 {currentStreakDays} Hari
            </span>
          </div>
        </div>

        {/* Kalender Mingguan Mini dengan Cap Stempel Cakar Kucing */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#F8FAFC',
            border: '2px solid #E2E8F0',
            borderRadius: '16px',
            padding: '10px 8px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 4px',
            }}
          >
            {days.map((dayName, idx) => {
              const isToday = idx === todayIndex;
              return (
                <div
                  key={dayName}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: isToday ? '#EA580C' : '#94A3B8',
                    }}
                  >
                    {dayName}
                  </span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: isToday ? '#FED7AA' : '#FFFFFF',
                      border: isToday ? '2px solid #F97316' : '1.5px solid #CBD5E1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {isToday ? (
                      stamped ? (
                        <motion.span
                          initial={{ scale: 2.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', damping: 12, stiffness: 350 }}
                          style={{ fontSize: '14px', lineHeight: 1 }}
                        >
                          🐾
                        </motion.span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#EA580C', fontWeight: 800 }}>•</span>
                      )
                    ) : idx < todayIndex ? (
                      <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 900 }}>✓</span>
                    ) : (
                      <span style={{ fontSize: '10px', color: '#CBD5E1' }}>-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tahap 4: Level Mastery Radial Progress Fill */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#F0FDF4',
            border: '2.5px solid #86EFAC',
            borderRadius: '18px',
            padding: '12px 14px',
            marginBottom: '18px',
            boxShadow: '0 3px 0 0 #22C55E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#15803D',
                textTransform: 'uppercase',
                display: 'block',
              }}
            >
              Kemajuan Gerbang Level
            </span>
            <span
              style={{
                fontSize: '1.05rem',
                fontWeight: 900,
                color: '#166534',
                display: 'block',
                marginTop: '2px',
              }}
            >
              {levelName}
            </span>
          </div>

          <div style={{ position: 'relative', width: '56px', height: '56px' }}>
            <svg width="56" height="56" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r={radius}
                stroke="#DCFCE7"
                strokeWidth="8"
                fill="none"
              />
              <motion.circle
                cx="45"
                cy="45"
                r={radius}
                stroke="#22C55E"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: strokeDashoffset }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 1.0 }}
                transform="rotate(-90 45 45)"
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 900,
                color: '#15803D',
              }}
            >
              {levelProgressPct}%
            </div>
          </div>
        </div>

        {/* Tahap 5: Claim Reward & Solid Continue Action Button */}
        <motion.button
          type="button"
          onClick={() => {
            soundFX.play('button_click', 0.5);
            onContinue();
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 220, delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ y: 3 }}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '18px',
            fontWeight: 900,
            color: '#FFFFFF',
            fontSize: '1rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            backgroundColor: '#58CC02',
            border: 'none',
            boxShadow: '0 5px 0 0 #15803D, 0 8px 18px rgba(88, 204, 2, 0.35)',
            cursor: 'pointer',
            outline: 'none',
            transition: 'background-color 0.15s ease',
          }}
        >
          Lanjutkan Belajar →
        </motion.button>
      </motion.div>
    </div>
  );
};

