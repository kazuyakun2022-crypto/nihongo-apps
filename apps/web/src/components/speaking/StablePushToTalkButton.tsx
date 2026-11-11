// components/speaking/StablePushToTalkButton.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundFX } from '@/lib/audio/SoundFXManager';

export interface PushToTalkProps {
  onRecordingStart: () => void;
  onRecordingEnd: (durationMs: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  activeLabel?: string;
  className?: string;
  isVoiced?: boolean;
  visualScale?: number;
}

export const StablePushToTalkButton: React.FC<PushToTalkProps> = ({
  onRecordingStart,
  onRecordingEnd,
  disabled = false,
  size = 'md',
  label = 'Tahan',
  activeLabel = 'Merekam...',
  className = '',
  isVoiced = false,
  visualScale = 0,
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const startTimeRef = useRef<number>(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const activePointerIdRef = useRef<number | null>(null);

  // Bersihkan capture saat unmount jika masih merekam
  useEffect(() => {
    return () => {
      if (buttonRef.current && activePointerIdRef.current !== null) {
        try {
          if (buttonRef.current.hasPointerCapture(activePointerIdRef.current)) {
            buttonRef.current.releasePointerCapture(activePointerIdRef.current);
          }
        } catch {}
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || isPressing) return;
    e.preventDefault();

    // KUNCI UTAMA ANTI-SLIP: Ambil alih seluruh koordinat pointer ke tombol ini
    try {
      if (buttonRef.current) {
        buttonRef.current.setPointerCapture(e.pointerId);
        activePointerIdRef.current = e.pointerId;
      }
    } catch (err) {
      console.warn('Pointer capture error:', err);
    }

    setIsPressing(true);
    startTimeRef.current = Date.now();
    soundFX.play('mic_start', 0.6);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch {}
    }
    onRecordingStart();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPressing) return;
    e.preventDefault();

    // Lepaskan pointer capture dengan aman
    if (buttonRef.current && activePointerIdRef.current !== null) {
      try {
        if (buttonRef.current.hasPointerCapture(e.pointerId)) {
          buttonRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {}
      activePointerIdRef.current = null;
    }

    const duration = Date.now() - startTimeRef.current;
    setIsPressing(false);
    soundFX.play('mic_end', 0.5);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(20);
      } catch {}
    }
    onRecordingEnd(duration);
  };

  // Dimensi berdasarkan ukuran
  const sizeMap = {
    sm: {
      wrapper: 'w-24 h-24',
      button: 'w-20 h-20',
      icon: 'w-7 h-7',
      text: 'text-[10px]',
      btnStyle: { width: '80px', height: '80px' },
      wrapStyle: { width: '96px', height: '96px' },
    },
    md: {
      wrapper: 'w-32 h-32',
      button: 'w-24 h-24',
      icon: 'w-9 h-9',
      text: 'text-[11px]',
      btnStyle: { width: '96px', height: '96px' },
      wrapStyle: { width: '128px', height: '128px' },
    },
    lg: {
      wrapper: 'w-36 h-36',
      button: 'w-28 h-28',
      icon: 'w-10 h-10',
      text: 'text-xs',
      btnStyle: { width: '112px', height: '112px' },
      wrapStyle: { width: '144px', height: '144px' },
    },
  }[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none touch-none ${sizeMap.wrapper} ${className}`}
      style={{
        ...sizeMap.wrapStyle,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Ripple Wave Effect pada lapisan GPU komposit (Waveform Ring adaptif terhadap suara manusia) */}
      <AnimatePresence>
        {isPressing && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0.4 }}
            animate={{
              scale: isVoiced ? [1, 1.35 + visualScale * 0.4, 1.6 + visualScale * 0.5] : [1, 1.08, 1.15],
              opacity: isVoiced ? [0.65, 0.35, 0] : [0.2, 0.08, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: isVoiced ? 1.0 : 1.8, ease: "easeOut" }}
            className="absolute inset-0 rounded-full pointer-events-none transform-gpu will-change-transform"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "9999px",
              backgroundColor: isVoiced ? "rgba(251, 113, 133, 0.55)" : "rgba(148, 163, 184, 0.3)",
              pointerEvents: "none",
              transform: "translateZ(0)",
              willChange: "transform, opacity",
            }}
          />
        )}
      </AnimatePresence>

      {/* Tombol Fisik Taktil yang Terkunci Stabil (Hardware-Locked) */}
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        disabled={disabled}
        aria-label={isPressing ? 'Merekam suara...' : 'Tahan untuk Berbicara'}
        className={`relative z-10 rounded-full flex flex-col items-center justify-center font-bold text-white transition-all transform-gpu select-none cursor-pointer outline-none focus:outline-none ${sizeMap.button} ${
          isPressing
            ? 'bg-rose-600 translate-y-1 shadow-[0_2px_0_0_#9F1239]'
            : 'bg-rose-500 shadow-[0_6px_0_0_#BE123C] hover:bg-rose-400 active:translate-y-1 active:shadow-[0_2px_0_0_#9F1239]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          ...sizeMap.btnStyle,
          touchAction: 'none',
          position: 'relative',
          zIndex: 10,
          borderRadius: '9999px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          color: '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          border: 'none',
          backgroundColor: isPressing ? '#e11d48' : '#f43f5e',
          transform: isPressing ? 'translateY(4px) translateZ(0)' : 'translateY(0) translateZ(0)',
          boxShadow: isPressing
            ? '0 2px 0 0 #9f1239, 0 4px 12px rgba(225, 29, 72, 0.4)'
            : '0 6px 0 0 #be123c, 0 8px 18px rgba(244, 63, 94, 0.35)',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease, background-color 0.15s ease',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <svg
          className={`transition-transform duration-150 ${sizeMap.icon} ${isPressing ? 'scale-110' : 'scale-100'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
          style={{
            width: size === 'sm' ? '28px' : size === 'lg' ? '38px' : '34px',
            height: size === 'sm' ? '28px' : size === 'lg' ? '38px' : '34px',
            transform: isPressing ? 'scale(1.12)' : 'scale(1)',
            transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          aria-hidden="true"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
        <span
          className={`font-black uppercase tracking-wider mt-1 ${sizeMap.text}`}
          style={{
            fontSize: size === 'sm' ? '10px' : '11px',
            fontWeight: 800,
            letterSpacing: '0.05em',
            marginTop: '2px',
          }}
        >
          {isPressing ? activeLabel : label}
        </span>
      </button>
    </div>
  );
};

