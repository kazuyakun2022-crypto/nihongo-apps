import type { ReactNode } from "react";
import styles from "./icons.module.css";

export interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Isi penuh (mis. bintang nilai yang sudah didapat). */
  filled?: boolean;
  /** Label untuk pembaca layar bila ikon berdiri sendiri tanpa teks. */
  title?: string;
  /** Status aktif khusus ikon taktil navigasi */
  active?: boolean;
}

function Svg({ size = 16, className, strokeWidth = 2, filled = false, title, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className ? `${styles.icon} ${className}` : styles.icon}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function SakuraIcon(props: IconProps) {
  const petal = "M12 3.2 C 13.8 5 14 7.4 12 8.8 C 10 7.4 10.2 5 12 3.2 Z";
  return (
    <Svg {...props}>
      <path d={petal} />
      <path d={petal} transform="rotate(72 12 12)" />
      <path d={petal} transform="rotate(144 12 12)" />
      <path d={petal} transform="rotate(216 12 12)" />
      <path d={petal} transform="rotate(288 12 12)" />
      <circle cx="12" cy="12" r="1.2" />
    </Svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 3 L11.3 7.7 L16 9.5 L11.3 11.3 L9.5 16 L7.7 11.3 L3 9.5 L7.7 7.7 Z" />
      <path d="M17.5 14.3 L18.2 16.8 L20.7 17.5 L18.2 18.2 L17.5 20.7 L16.8 18.2 L14.3 17.5 L16.8 16.8 Z" />
    </Svg>
  );
}

export function BrainIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11.9 5 C 11 3.7 9.2 3.3 7.9 4.1 C 6.4 4.3 5.4 5.5 5.6 7 C 4.2 7.7 3.6 9.3 4.2 10.7 C 3.3 12 3.6 13.7 4.8 14.7 C 4.9 16.5 6.3 18 8.1 18.1 C 9 19.2 10.6 19.4 11.9 18.7" />
      <path d="M12.1 5 C 13 3.7 14.8 3.3 16.1 4.1 C 17.6 4.3 18.6 5.5 18.4 7 C 19.8 7.7 20.4 9.3 19.8 10.7 C 20.7 12 20.4 13.7 19.2 14.7 C 19.1 16.5 17.7 18 15.9 18.1 C 15 19.2 13.4 19.4 12.1 18.7" />
      <path d="M12 4.6 L12 19" />
      <path d="M8.9 8.2 C 9.9 8.5 10.5 9.3 10.6 10.3" />
      <path d="M15.1 8.2 C 14.1 8.5 13.5 9.3 13.4 10.3" />
      <path d="M7.6 13.2 C 8.6 12.8 9.5 13.1 10.1 13.9" />
      <path d="M16.4 13.2 C 15.4 12.8 14.5 13.1 13.9 13.9" />
    </Svg>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

export function PawIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 14.2 C 14.3 14.2 16.3 15.7 16.3 17.2 C 16.3 18.4 15.2 19.3 13.9 19.3 C 13.3 19.3 12.8 19.1 12 19.1 C 11.2 19.1 10.7 19.3 10.1 19.3 C 8.8 19.3 7.7 18.4 7.7 17.2 C 7.7 15.7 9.7 14.2 12 14.2 Z" />
      <ellipse cx="5.2" cy="11.6" rx="1.25" ry="1.6" transform="rotate(-30 5.2 11.6)" />
      <ellipse cx="9.8" cy="8.3" rx="1.25" ry="1.6" transform="rotate(-8 9.8 8.3)" />
      <ellipse cx="14.2" cy="8.3" rx="1.25" ry="1.6" transform="rotate(8 14.2 8.3)" />
      <ellipse cx="18.8" cy="11.6" rx="1.25" ry="1.6" transform="rotate(30 18.8 11.6)" />
    </Svg>
  );
}

export function GraduationCapIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 8.5 L12 3.5 L22 8.5 L12 13.5 Z" />
      <path d="M6.5 10.4 L6.5 15.5 C6.5 17.4 9 19 12 19 C15 19 17.5 17.4 17.5 15.5 L17.5 10.4" />
      <path d="M22 8.5 L22 14" />
      <circle cx="22" cy="15" r="1.1" />
    </Svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" />
    </Svg>
  );
}

export function LightbulbIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </Svg>
  );
}

export function BotIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 8 L12 4.6" />
      <circle cx="12" cy="3.2" r="1.3" />
      <circle cx="9.6" cy="13.4" r="1.1" />
      <circle cx="14.4" cy="13.4" r="1.1" />
      <path d="M9.9 17.2 L14.1 17.2" />
      <path d="M2.4 12.6 L2.4 15.4" />
      <path d="M21.6 12.6 L21.6 15.4" />
    </Svg>
  );
}

export function BookOpenIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Svg>
  );
}

export function SmartphoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2.5" />
      <path d="M12 18h.01" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 6 L9 17 L4 12" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </Svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
    </Svg>
  );
}

/* ── Ikon pengganti emoji: gaya garis seragam di semua perangkat ── */

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </Svg>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </Svg>
  );
}

export function VolumeOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="m22 9-6 6" />
      <path d="m16 9 6 6" />
    </Svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
    </Svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

export function PuzzleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19.44 7.85c-.05.32.06.65.29.88l1.57 1.57a2.41 2.41 0 0 1 0 3.41l-1.61 1.61a.98.98 0 0 1-.84.28c-.47-.07-.8-.48-.97-.93a2.5 2.5 0 1 0-3.21 3.21c.45.17.86.5.93.97a.98.98 0 0 1-.28.84l-1.61 1.61a2.41 2.41 0 0 1-3.41 0l-1.57-1.57a1.03 1.03 0 0 0-.88-.29c-.49.07-.84.5-1.02.97a2.5 2.5 0 1 1-3.24-3.24c.46-.18.89-.53.97-1.02a1.03 1.03 0 0 0-.29-.88l-1.57-1.57a2.41 2.41 0 0 1 0-3.41L4.23 8.77c.24-.24.58-.35.92-.3.51.08.88.53 1.07 1.01a2.5 2.5 0 1 0 3.26-3.26c-.48-.2-.93-.56-1.01-1.07-.05-.34.06-.68.3-.92l1.53-1.53a2.41 2.41 0 0 1 3.41 0l1.57 1.57c.23.23.56.34.88.29.49-.07.84-.5 1.02-.97a2.5 2.5 0 1 1 3.24 3.24c-.46.18-.89.53-.97 1.02Z" />
    </Svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </Svg>
  );
}

export function PenLineIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

export function CrownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <path d="M5 20h14" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  );
}

export function HourglassIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22" />
      <path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Svg>
  );
}

export function PrinterIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </Svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </Svg>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </Svg>
  );
}

export function NotebookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M2 6h4" />
      <path d="M2 10h4" />
      <path d="M2 14h4" />
      <path d="M2 18h4" />
      <path d="M16 2v20" />
    </Svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </Svg>
  );
}

export function ArrowDownToLineIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 17V3" />
      <path d="m6 11 6 6 6-6" />
      <path d="M19 21H5" />
    </Svg>
  );
}

export function ScanFrameIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    </Svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </Svg>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </Svg>
  );
}

export function HeadphonesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </Svg>
  );
}

export function RepeatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Svg>
  );
}

export function TrendingUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </Svg>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 2h4" />
      <path d="m12 14 3-3" />
      <circle cx="12" cy="14" r="8" />
    </Svg>
  );
}

export function ZapIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </Svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </Svg>
  );
}

export function FrownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </Svg>
  );
}

export function ThumbsUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </Svg>
  );
}

export function DeleteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 5a2 2 0 0 0-1.34.52l-6.33 5.74a1 1 0 0 0 0 1.48l6.33 5.74A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
      <path d="m12 9 6 6" />
      <path d="m18 9-6 6" />
    </Svg>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.01" />
      <path d="M10 8h.01" />
      <path d="M14 8h.01" />
      <path d="M18 8h.01" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
      <path d="M7 16h10" />
    </Svg>
  );
}

export function PointerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M22 14a8 8 0 0 1-8 8" />
      <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
      <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
      <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
      <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </Svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </Svg>
  );
}

export function TypeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </Svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </Svg>
  );
}

export function CircleCheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

export function CircleXIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

/** Penanda soal yang masih ragu (Simulasi JLPT). */
export function FlagIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 22V4" />
      <path d="M4 4h12l-2 4 2 4H4" />
    </Svg>
  );
}

export function ListChecksIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3 7 2 2 4-4" />
      <path d="m3 17 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </Svg>
  );
}

/** Paket acak (Simulasi JLPT). */
export function ShuffleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
      <path d="m18 14 4 4-4 4" />
    </Svg>
  );
}

/** Panah kiri untuk pegangan menu samping; arah dibalik lewat CSS (rotate) supaya pergantiannya beranimasi. */
export function SidebarToggleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </Svg>
  );
}

/** Ikon Beranda bernuansa Jepang hangat: atap lengkung lembut (sori) & pintu shoji */
export function NavHomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9.5" />
      <path d="M9.5 21v-7a2.5 2.5 0 0 1 5 0v7" />
    </Svg>
  );
}

/** Ikon Belajar: buku terbuka elegan bernuansa studi bahasa Jepang dengan tekstur halaman */
export function NavLearnIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      <path d="M6 8h2.5" />
      <path d="M6 11.5h2.5" />
      <path d="M15.5 8H18" />
      <path d="M15.5 11.5H18" />
    </Svg>
  );
}

/** Ikon Ngobrol bersama Miu-chan: gelembung dialog membulat ramah dengan 3 titik percakapan */
export function NavChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
    </Svg>
  );
}

/** Ikon Profil: siluet pengguna proporsional dan elegan */
export function NavProfileIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="7" r="4" />
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    </Svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   1.2 SISTEM IKONOGRAFI NAVIGASI TEBAL (CHUNKY & BOLD TACTILE ICONS)
   Bobot garis tebal (2.5px - 3px), ujung membulat, micro-fill & animasi taktil
   ────────────────────────────────────────────────────────────────────────── */

/** 1. Belajar (Learn Path): Buku kubus taktil tebal dengan aksen daun bambu */
export function ChunkyLearnIcon({ size = 26, strokeWidth = 2.6, active = false, filled = false, className = '', title }: IconProps) {
  const isSelected = active || filled;
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      className={`${styles.icon} ${isSelected ? styles.animLearn : ''} ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {/* Bayangan taktil bawah */}
      {isSelected && (
        <path d="M3 21 C 7 19.5 11 20 14 22 C 17 20 21 19.5 25 21 L 25 24 C 21 22.5 17 23 14 25 C 11 23 7 22.5 3 24 Z" fill="#1E293B" opacity="0.3" />
      )}
      {/* Kubus Buku Terbuka */}
      <path
        d="M3 6.5 C 7 5 11 5.5 14 7.5 C 17 5.5 21 5 25 6.5 V 21 C 21 19.5 17 20 14 22 C 11 20 7 19.5 3 21 Z"
        fill={isSelected ? "#14B8A6" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth}
      />
      {/* Lipatan Halaman Tengah */}
      <path d="M14 7.5 V 22" stroke={isSelected ? "#1E293B" : "currentColor"} strokeWidth={strokeWidth} />
      {/* Garis tekstur halaman taktil */}
      <path d="M6 10 C 8.5 9.2 11 9.5 12 10" stroke={isSelected ? "#CCFBF1" : "currentColor"} strokeWidth={strokeWidth - 0.6} />
      <path d="M6 14 C 8.5 13.2 11 13.5 12 14" stroke={isSelected ? "#CCFBF1" : "currentColor"} strokeWidth={strokeWidth - 0.6} />
      {/* Aksen Daun Bambu Taktil di Pojok Kanan */}
      <path
        d="M17 11.5 C 19 9.5 22.5 10 22.5 10 C 22.5 10 22 13.5 20 14.5 C 18 15.5 17 11.5 17 11.5 Z"
        fill={isSelected ? "#58CC02" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth - 0.8}
      />
    </svg>
  );
}

/** 2. Review Harian (SRS): Kartu kilat bertumpuk dengan simbol petir menyala */
export function ChunkyReviewIcon({ size = 26, strokeWidth = 2.6, active = false, filled = false, className = '', title }: IconProps) {
  const isSelected = active || filled;
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      className={`${styles.icon} ${isSelected ? styles.animReview : ''} ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {/* Kartu Dasar (Tumpukan Bawah) */}
      <rect
        x="3"
        y="7"
        width="18"
        height="18"
        rx="4"
        fill={isSelected ? "#FED7AA" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth}
      />
      {/* Kartu Teratas Bergeser Sedikit ke Kanan */}
      <rect
        x={isSelected ? "7" : "6"}
        y={isSelected ? "3" : "4"}
        width="18"
        height="18"
        rx="4"
        fill={isSelected ? "#FF9600" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth}
        style={{ transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      />
      {/* Simbol Petir Tebal Menyala */}
      <path
        d={isSelected ? "M17 6 L12.5 12 H16 L14 18 L19.5 11.5 H16 Z" : "M16 7 L12 12.5 H15 L13 18 L18.5 12 H15 Z"}
        fill={isSelected ? "#FFFFFF" : "currentColor"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={isSelected ? 1.5 : 0}
        strokeLinejoin="miter"
      />
    </svg>
  );
}

/** 3. Kamus (Dictionary): Torii tebal berpadu dengan kaca pembesar & aksen kilau */
export function ChunkyDictionaryIcon({ size = 26, strokeWidth = 2.6, active = false, filled = false, className = '', title }: IconProps) {
  const isSelected = active || filled;
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      className={`${styles.icon} ${isSelected ? styles.animDictionary : ''} ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {/* Balok Atas Torii (Kasagi) melengkung */}
      <path
        d="M2 7 C 6 5.5 12 5.5 18 7"
        stroke={isSelected ? "#DC2626" : "currentColor"}
        strokeWidth={strokeWidth + 0.5}
      />
      {/* Balok Kedua (Shimaki) */}
      <path d="M4 9.5 H 16" stroke={isSelected ? "#DC2626" : "currentColor"} strokeWidth={strokeWidth} />
      {/* Tiang Torii Kiri & Kanan */}
      <path d="M6 9.5 V 22" stroke={isSelected ? "#DC2626" : "currentColor"} strokeWidth={strokeWidth} />
      <path d="M14 9.5 V 15" stroke={isSelected ? "#DC2626" : "currentColor"} strokeWidth={strokeWidth} />

      {/* Lensa Kaca Pembesar Taktil */}
      <circle
        cx="18"
        cy="17"
        r="6.5"
        fill={isSelected ? "#BAE6FD" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth}
      />
      {/* Gagang Kaca Pembesar Tebal */}
      <path d="M22.8 21.8 L 26 25" stroke={isSelected ? "#1E293B" : "currentColor"} strokeWidth={strokeWidth + 0.8} />
      {/* Kilau Halus Lensa */}
      {isSelected && (
        <path d="M15 15 C 16 13.5 18.5 13.5 19.5 14.5" stroke="#FFFFFF" strokeWidth={1.8} />
      )}
    </svg>
  );
}

/** 4. Simulasi JLPT: Jam pasir digital tebal berpadu pita gulungan emas */
export function ChunkySimulasiIcon({ size = 26, strokeWidth = 2.6, active = false, filled = false, className = '', title }: IconProps) {
  const isSelected = active || filled;
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      className={`${styles.icon} ${isSelected ? styles.animSimulasi : ''} ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {/* Jam Pasir Kobalt Tebal */}
      <path
        d="M6 4 H 22 M6 24 H 22 M7 4 C 7 12 11 13 14 14 C 17 13 21 12 21 4 M7 24 C 7 16 11 15 14 14 C 17 15 21 16 21 24"
        fill={isSelected ? "#1E40AF" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth}
      />
      {/* Pasir di dalam & Pita Gulungan Emas di Pinggang */}
      {isSelected ? (
        <>
          <path d="M9 22 C 9 18 12 17.5 14 17.5 C 16 17.5 19 18 19 22 Z" fill="#FDE047" />
          <circle cx="14" cy="15.5" r="1" fill="#FDE047" />
          {/* Pita Emas Resmi */}
          <rect x="11.5" y="12.5" width="5" height="3" rx="1" fill="#FFC800" stroke="#1E293B" strokeWidth="1" />
        </>
      ) : (
        <path d="M10 20 H 18 M12 14 H 16" stroke="currentColor" strokeWidth={strokeWidth - 0.8} />
      )}
    </svg>
  );
}

/** 5. Buku Tulis (Workbook): Kuas kaligrafi (Fude) tebal bersilang di kotak Juuji Grid */
export function ChunkyWorkbookIcon({ size = 26, strokeWidth = 2.6, active = false, filled = false, className = '', title }: IconProps) {
  const isSelected = active || filled;
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      className={`${styles.icon} ${isSelected ? styles.animWorkbook : ''} ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {/* Kotak Naskah Juuji Grid (Grid Palang) */}
      <rect
        x="3"
        y="4"
        width="20"
        height="20"
        rx="3"
        fill={isSelected ? "#EDE9FE" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth}
      />
      {/* Garis Palang Putus-Putus Grid */}
      <path d="M13 4 V 24 M3 14 H 23" stroke={isSelected ? "#A78BFA" : "currentColor"} strokeWidth={1.5} strokeDasharray="2.5 2.5" />
      {/* Batang Kuas Kaligrafi (Fude) Diagonal */}
      <path
        d="M20 5 L 25 10 L 14 21 L 9 16 Z"
        fill={isSelected ? "#A855F7" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth}
      />
      {/* Bulu Kuas Kaligrafi Bergradasi Merah Bata */}
      <path
        d="M9 16 L 14 21 C 12 23.5 7 24.5 5.5 24 C 5 22.5 6.5 18 9 16 Z"
        fill={isSelected ? "#DC2626" : "currentColor"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={1.2}
      />
    </svg>
  );
}

/** 6. Profil & Prestasi: Karakter maskot Miu-chan berbentuk helm kucing bulat tebal */
export function ChunkyProfileIcon({ size = 26, strokeWidth = 2.6, active = false, filled = false, className = '', title }: IconProps) {
  const isSelected = active || filled;
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      className={`${styles.icon} ${isSelected ? styles.animProfileEar : ''} ${className}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {/* Telinga Kucing Kiri & Kanan */}
      <path
        d="M5 11 L 3 4 L 10 7 Z"
        fill={isSelected ? "#FF5A79" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth}
      />
      <path
        d="M23 11 L 25 4 L 18 7 Z"
        fill={isSelected ? "#FF5A79" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth}
      />
      {/* Helm Kucing Bulat Tebal */}
      <circle
        cx="14"
        cy="15"
        r="10"
        fill={isSelected ? "#FEF3C7" : "none"}
        stroke={isSelected ? "#1E293B" : "currentColor"}
        strokeWidth={strokeWidth}
      />
      {/* Mata Berkedip & Pipi Merona Merah */}
      {isSelected ? (
        <>
          {/* Mata Miu-chan (Animasi Kedip) */}
          <g className={styles.animProfileEye}>
            <circle cx="10.5" cy="14" r="1.5" fill="#1E293B" />
            <circle cx="17.5" cy="14" r="1.5" fill="#1E293B" />
          </g>
          {/* Pipi Merona Merah */}
          <ellipse cx="8.5" cy="16.5" rx="1.5" ry="0.8" fill="#FF5A79" opacity="0.8" />
          <ellipse cx="19.5" cy="16.5" rx="1.5" ry="0.8" fill="#FF5A79" opacity="0.8" />
          {/* Hidung & Senyum Imut */}
          <path d="M13 16 L 14 17 L 15 16 M14 17 V 18.5" stroke="#1E293B" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <circle cx="10.5" cy="14" r="1" fill="currentColor" />
          <circle cx="17.5" cy="14" r="1" fill="currentColor" />
          <path d="M12 17 Q 14 19 16 17" stroke="currentColor" strokeWidth={strokeWidth - 0.8} />
        </>
      )}
    </svg>
  );
}


/** Ikon Dasbor admin */
export function DashboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect width="7" height="9" x="3" y="3" rx="1.5" />
      <rect width="7" height="5" x="14" y="3" rx="1.5" />
      <rect width="7" height="9" x="14" y="12" rx="1.5" />
      <rect width="7" height="5" x="3" y="16" rx="1.5" />
    </Svg>
  );
}

/** Ikon Kamera Scanner Penterjemah AI */
export function ScanCameraIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8V5a1 1 0 0 1 1-1h3" />
      <path d="M20 8V5a1 1 0 0 0-1-1h-3" />
      <path d="M4 16v3a1 1 0 0 0 1 1h3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M7 12h1M16 12h1M12 7v1M12 16v1" />
    </Svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
    </Svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="4" width="4" height="16" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" fill="currentColor" />
    </Svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="9 18 15 12 9 6" />
    </Svg>
  );
}

export function RotateCwIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </Svg>
  );
}

export function Volume2Icon(props: IconProps) {
  return (
    <Svg {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </Svg>
  );
}

export function SettingsIcon(props: IconProps) {
  const { size = 20, strokeWidth = 2, className } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  );
}
