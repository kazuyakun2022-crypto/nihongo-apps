"use client";

import { useId } from "react";
import styles from "./achievementBadge.module.css";

export interface AchievementBadgeProps {
  code: string;
  earned: boolean;
  size?: number;
  className?: string;
}

export function AchievementBadge({ code, earned, size = 64, className }: AchievementBadgeProps) {
  const idPrefix = useId().replace(/:/g, "_");

  return (
    <div
      className={`${styles.badgeWrapper} ${earned ? styles.badgeEarned : styles.badgeLocked} ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.badgeSvg}
      >
        <defs>
          {/* Base Rim Gradients */}
          <linearGradient id={`${idPrefix}_goldRim`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff3bf" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          <linearGradient id={`${idPrefix}_lockedRim`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#71717a" />
            <stop offset="50%" stopColor="#3f3f46" />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>

          {/* Core Inner Background Gradients */}
          <radialGradient id={`${idPrefix}_goldCore`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="60%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fcd34d" />
          </radialGradient>

          <radialGradient id={`${idPrefix}_rubyCore`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#fff1f2" />
            <stop offset="60%" stopColor="#ffe4e6" />
            <stop offset="100%" stopColor="#f43f5e" />
          </radialGradient>

          <radialGradient id={`${idPrefix}_sapphireCore`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#eff6ff" />
            <stop offset="60%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>

          <radialGradient id={`${idPrefix}_emeraldCore`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ecfdf5" />
            <stop offset="60%" stopColor="#d1fae5" />
            <stop offset="100%" stopColor="#10b981" />
          </radialGradient>

          <radialGradient id={`${idPrefix}_purpleCore`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#faf5ff" />
            <stop offset="60%" stopColor="#f3e8ff" />
            <stop offset="100%" stopColor="#a855f7" />
          </radialGradient>

          <radialGradient id={`${idPrefix}_lockedCore`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#3f3f46" />
            <stop offset="70%" stopColor="#27272a" />
            <stop offset="100%" stopColor="#18181b" />
          </radialGradient>

          {/* Shading & Specular filters */}
          <filter id={`${idPrefix}_drop`} x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity={earned ? "0.3" : "0.2"} />
          </filter>
        </defs>

        {/* Outer Ribbon / Aura */}
        {earned && (
          <circle cx="50" cy="50" r="48" fill="none" stroke="url(#${idPrefix}_goldRim)" strokeWidth="1" opacity="0.6" strokeDasharray="3 3" />
        )}

        {/* Outer Medal Base */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill={earned ? `url(#${idPrefix}_goldRim)` : `url(#${idPrefix}_lockedRim)`}
          filter={`url(#${idPrefix}_drop)`}
        />

        {/* Bezel Inset */}
        <circle
          cx="50"
          cy="50"
          r="41"
          fill={earned ? (
            code.includes("streak") ? `url(#${idPrefix}_rubyCore)` :
            code.includes("xp") ? `url(#${idPrefix}_emeraldCore)` :
            code.includes("chat") ? `url(#${idPrefix}_purpleCore)` :
            code.includes("srs") ? `url(#${idPrefix}_sapphireCore)` :
            `url(#${idPrefix}_goldCore)`
          ) : `url(#${idPrefix}_lockedCore)`}
          stroke={earned ? "#fef08a" : "#52525b"}
          strokeWidth="1.5"
        />

        {/* Inner Engraved Ring */}
        <circle cx="50" cy="50" r="37" fill="none" stroke={earned ? "rgba(180, 83, 9, 0.25)" : "rgba(255, 255, 255, 0.08)"} strokeWidth="1" strokeDasharray="2 2" />

        {/* ── EMBLEM ARTWORK BASED ON CODE ── */}
        {renderBadgeArt(code, earned)}

        {/* Glass Reflection Highlight */}
        <path
          d="M20 30 C30 18, 70 18, 80 30 C72 23, 28 23, 20 30 Z"
          fill="#ffffff"
          opacity={earned ? "0.45" : "0.15"}
        />

        {/* Lock Overlay on Locked Badges */}
        {!earned && (
          <g transform="translate(36, 36) scale(1.15)">
            <rect x="3" y="10" width="18" height="13" rx="2.5" fill="#e4e4e7" stroke="#27272a" strokeWidth="1.2" />
            <path d="M7 10 V6 A5 5 0 0 1 17 6 V10" fill="none" stroke="#e4e4e7" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.8" fill="#18181b" />
            <path d="M12 17.5 V20" stroke="#18181b" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
}

function renderBadgeArt(code: string, earned: boolean) {
  const fg = earned ? "#92400e" : "rgba(255, 255, 255, 0.4)";
  const accent = earned ? "#dc2626" : "rgba(255, 255, 255, 0.3)";
  const gold = earned ? "#d97706" : "rgba(255, 255, 255, 0.35)";

  switch (code) {
    case "first_chapter":
      // Torii Gate + Sakura
      return (
        <g id="art-torii">
          {/* Top Bar */}
          <path d="M28 32 C38 30, 62 30, 72 32 L70 36 C60 34, 40 34, 30 36 Z" fill={accent} />
          <path d="M32 38 H68 V41 H32 Z" fill={accent} />
          {/* Pillars */}
          <path d="M37 41 L35 68 H39 L40 41 Z" fill={accent} />
          <path d="M63 41 L65 68 H61 L60 41 Z" fill={accent} />
          {/* Sakura Petal */}
          <circle cx="50" cy="52" r="3.5" fill="#f43f5e" />
          <path d="M50 45 C47 48, 53 48, 50 45 Z" fill="#fda4af" />
        </g>
      );

    case "chapters_10":
      // Book with Rising Star
      return (
        <g id="art-book-10">
          <path d="M30 42 C38 38, 48 40, 50 45 C52 40, 62 38, 70 42 V65 C62 61, 52 63, 50 67 C48 63, 38 61, 30 65 Z" fill={fg} />
          <path d="M50 45 V67" stroke={gold} strokeWidth="1.5" />
          <polygon points="50,30 53,37 60,37 54,41 56,48 50,44 44,48 46,41 40,37 47,37" fill={gold} />
        </g>
      );

    case "chapters_30":
      // Japanese Five-Story Pagoda
      return (
        <g id="art-pagoda-30">
          <polygon points="50,26 53,30 47,30" fill={gold} />
          {/* Roof 1 */}
          <path d="M36 36 C42 34, 58 34, 64 36 L62 39 H38 Z" fill={accent} />
          {/* Roof 2 */}
          <path d="M32 46 C40 43, 60 43, 68 46 L65 50 H35 Z" fill={accent} />
          {/* Roof 3 */}
          <path d="M28 58 C38 54, 62 54, 72 58 L69 63 H31 Z" fill={accent} />
          {/* Base */}
          <rect x="42" y="63" width="16" height="7" fill={fg} />
        </g>
      );

    case "first_chat":
      // Miu Cat Paw
      return (
        <g id="art-paw">
          {/* Main Pad */}
          <ellipse cx="50" cy="56" rx="11" ry="8.5" fill="#ec4899" />
          {/* 4 Toe Pads */}
          <circle cx="37" cy="45" r="3.8" fill="#ec4899" />
          <circle cx="45" cy="40" r="4.2" fill="#ec4899" />
          <circle cx="55" cy="40" r="4.2" fill="#ec4899" />
          <circle cx="63" cy="45" r="3.8" fill="#ec4899" />
        </g>
      );

    case "chat_10":
      // Two Speech Bubbles
      return (
        <g id="art-chat-10">
          <path d="M30 40 C30 34, 46 34, 56 34 C64 34, 68 38, 68 44 C68 49, 62 53, 54 53 L47 57 L48 53 H38 C32 53, 30 48, 30 40 Z" fill="#8b5cf6" />
          <circle cx="43" cy="43" r="2" fill="#ffffff" />
          <circle cx="49" cy="43" r="2" fill="#ffffff" />
          <circle cx="55" cy="43" r="2" fill="#ffffff" />
        </g>
      );

    case "srs_50":
      // Memory Gem Crystal
      return (
        <g id="art-gem">
          <polygon points="50,28 66,40 50,70 34,40" fill="#3b82f6" opacity="0.9" />
          <polygon points="50,28 50,70 42,40" fill="#60a5fa" />
          <polygon points="50,28 66,40 50,40" fill="#93c5fd" />
          <circle cx="50" cy="48" r="1.5" fill="#ffffff" />
        </g>
      );

    case "srs_200":
      // Golden Treasury Chest
      return (
        <g id="art-treasury">
          <path d="M32 44 C32 38, 68 38, 68 44 V48 H32 Z" fill="#eab308" />
          <rect x="32" y="48" width="36" height="20" rx="2" fill="#ca8a04" />
          <rect x="46" y="46" width="8" height="10" rx="1.5" fill="#fef08a" stroke="#713f12" strokeWidth="1" />
          <circle cx="50" cy="50" r="1.5" fill="#713f12" />
        </g>
      );

    case "first_handwriting":
      // Fude Brush & Ink
      return (
        <g id="art-fude">
          <path d="M62 28 L42 56 L38 58 L40 54 L60 26 Z" fill="#92400e" />
          <path d="M38 58 C35 62, 34 66, 32 68 C35 66, 38 64, 40 60 Z" fill="#18181b" />
          <ellipse cx="61" cy="27" rx="3" ry="1.5" fill="#d97706" />
        </g>
      );

    case "hiragana_master":
      // Red Hanko Seal with "あ"
      return (
        <g id="art-hanko">
          <rect x="31" y="31" width="38" height="38" rx="6" fill="#dc2626" />
          <rect x="34" y="34" width="32" height="32" rx="4" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          <text x="50" y="58" textAnchor="middle" fontSize="22" fontWeight="900" fontFamily="sans-serif" fill="#ffffff">
            あ
          </text>
        </g>
      );

    case "workbook_pass":
      // Calligraphy Scroll
      return (
        <g id="art-scroll">
          <rect x="32" y="34" width="36" height="32" rx="2" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
          <line x1="37" y1="42" x2="63" y2="42" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="37" y1="48" x2="58" y2="48" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="37" y1="54" x2="63" y2="54" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="60" cy="58" r="3" fill="#dc2626" />
        </g>
      );

    case "level_up":
      // Mount Fuji + Rising Sun
      return (
        <g id="art-fuji">
          {/* Sun */}
          <circle cx="50" cy="36" r="10" fill="#ef4444" />
          {/* Fuji Mountain */}
          <polygon points="50,38 72,66 28,66" fill="#1e3a8a" />
          {/* Snow Cap */}
          <polygon points="50,38 58,49 53,47 50,51 47,47 42,49" fill="#ffffff" />
        </g>
      );

    case "jlpt_sim_pass":
      // Red Daruma Doll
      return (
        <g id="art-daruma">
          <ellipse cx="50" cy="52" rx="16" ry="17" fill="#dc2626" />
          <ellipse cx="50" cy="46" rx="10" ry="9" fill="#ffffff" />
          {/* Eyes */}
          <circle cx="45" cy="45" r="2.5" fill="#18181b" />
          <circle cx="55" cy="45" r="2.5" fill="#18181b" />
          {/* Eyebrows */}
          <path d="M42 41 C44 39, 47 40, 48 42" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M58 41 C56 39, 53 40, 52 42" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Mustache */}
          <path d="M45 49 C47 51, 53 51, 55 49" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          {/* Gold Belt */}
          <path d="M38 58 C44 61, 56 61, 62 58" stroke="#fef08a" strokeWidth="2.5" fill="none" />
        </g>
      );

    case "streak_3":
      // Bronze Flame
      return (
        <g id="art-flame-3">
          <path d="M50 28 C56 38, 64 45, 64 54 C64 62, 58 68, 50 68 C42 68, 36 62, 36 54 C36 44, 46 38, 50 28 Z" fill="#f97316" />
          <path d="M50 42 C53 48, 57 51, 57 56 C57 60, 54 64, 50 64 C46 64, 43 60, 43 56 C43 50, 48 46, 50 42 Z" fill="#fde047" />
        </g>
      );

    case "streak_7":
      // Twin Silver Flames
      return (
        <g id="art-flame-7">
          <path d="M46 26 C53 36, 62 44, 62 54 C62 62, 55 68, 46 68 C37 68, 30 62, 30 54 C30 42, 42 36, 46 26 Z" fill="#ef4444" />
          <path d="M56 36 C61 43, 67 48, 67 56 C67 62, 62 67, 56 67 C50 67, 45 62, 45 56 C45 47, 53 43, 56 36 Z" fill="#f97316" opacity="0.85" />
          <path d="M46 44 C49 49, 53 52, 53 57 C53 61, 50 64, 46 64 C42 64, 39 61, 39 57 C39 51, 44 48, 46 44 Z" fill="#fef08a" />
        </g>
      );

    case "streak_30":
      // Radiant Solar Phoenix
      return (
        <g id="art-flame-30">
          <circle cx="50" cy="50" r="14" fill="#f59e0b" />
          <path d="M50 24 L53 34 H47 Z" fill="#ea580c" />
          <path d="M50 76 L53 66 H47 Z" fill="#ea580c" />
          <path d="M24 50 L34 53 V47 Z" fill="#ea580c" />
          <path d="M76 50 L66 53 V47 Z" fill="#ea580c" />
          <circle cx="50" cy="50" r="9" fill="#fef08a" />
          <circle cx="50" cy="50" r="5" fill="#ffffff" />
        </g>
      );

    case "xp_500":
      // Lightning Spark
      return (
        <g id="art-xp-500">
          <polygon points="52,26 38,48 48,48 44,70 62,44 50,44" fill="#10b981" />
          <polygon points="51,32 42,47 49,47 46,62 57,45 50,45" fill="#a7f3d0" />
        </g>
      );

    case "xp_2000":
      // Royal Crown
      return (
        <g id="art-crown-2000">
          <path d="M30 45 L36 62 H64 L70 45 L58 52 L50 34 L42 52 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
          <rect x="36" y="62" width="28" height="5" rx="1.5" fill="#d97706" />
          <circle cx="30" cy="44" r="2" fill="#ef4444" />
          <circle cx="50" cy="33" r="2.5" fill="#3b82f6" />
          <circle cx="70" cy="44" r="2" fill="#10b981" />
          <circle cx="50" cy="55" r="2" fill="#ffffff" />
        </g>
      );

    default:
      // Default Trophy Medal
      return (
        <g id="art-default">
          <path d="M38 34 H62 V48 C62 55, 56 60, 50 60 C44 60, 38 55, 38 48 Z" fill={gold} />
          <path d="M38 38 H32 C30 38, 28 40, 28 44 C28 48, 32 50, 38 50 Z" fill="none" stroke={gold} strokeWidth="2" />
          <path d="M62 38 H68 C70 38, 72 40, 72 44 C72 48, 68 50, 62 50 Z" fill="none" stroke={gold} strokeWidth="2" />
          <rect x="47" y="60" width="6" height="7" fill={gold} />
          <rect x="40" y="67" width="20" height="4" rx="1" fill={gold} />
        </g>
      );
  }
}

