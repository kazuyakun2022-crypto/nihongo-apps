import type { ReactNode } from "react";
import styles from "./icons.module.css";

export interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function Svg({ size = 16, className, strokeWidth = 2, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className ? `${styles.icon} ${className}` : styles.icon}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
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
