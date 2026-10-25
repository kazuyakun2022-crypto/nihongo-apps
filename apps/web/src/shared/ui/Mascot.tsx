import Image from "next/image";

/**
 * Neko-sensei: maskot kucing berkacamata bulat.
 * Mendukung varian gambar resmi (uploaded) dan vektor SVG.
 */
export type MascotMood = "senang" | "berpikir" | "semangat";

export function Mascot({
  mood = "senang",
  size = 96,
  title = "Neko-sensei",
  variant = "image",
  className,
}: {
  mood?: MascotMood;
  size?: number;
  title?: string;
  variant?: "image" | "svg";
  className?: string;
}) {
  if (variant === "image") {
    return (
      <Image
        src="/neko-sensei.png"
        alt={title}
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: "contain", display: "inline-block" }}
        priority={size >= 120}
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={title}>
      {/* telinga */}
      <path d="M22 46 L30 12 L52 32 Z" fill="var(--color-accent)" stroke="var(--color-text)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M98 46 L90 12 L68 32 Z" fill="var(--color-accent)" stroke="var(--color-text)" strokeWidth="3" strokeLinejoin="round" />
      {/* kepala */}
      <ellipse cx="60" cy="66" rx="44" ry="40" fill="var(--color-accent)" stroke="var(--color-text)" strokeWidth="3" />
      {/* belang dahi */}
      <path d="M52 30 Q60 40 68 30" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round" />
      {/* kacamata */}
      <circle cx="42" cy="62" r="13" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="3" />
      <circle cx="78" cy="62" r="13" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="3" />
      <path d="M55 62 H65" stroke="var(--color-primary)" strokeWidth="3" />
      {/* mata */}
      {mood === "senang" && (
        <>
          <path d="M36 64 Q42 57 48 64" fill="none" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" />
          <path d="M72 64 Q78 57 84 64" fill="none" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {mood === "berpikir" && (
        <>
          <circle cx="44" cy="60" r="3.5" fill="var(--color-text)" />
          <circle cx="80" cy="60" r="3.5" fill="var(--color-text)" />
        </>
      )}
      {mood === "semangat" && (
        <>
          <circle cx="42" cy="62" r="4.5" fill="var(--color-text)" />
          <circle cx="78" cy="62" r="4.5" fill="var(--color-text)" />
          <circle cx="43.5" cy="60.5" r="1.5" fill="var(--color-surface)" />
          <circle cx="79.5" cy="60.5" r="1.5" fill="var(--color-surface)" />
        </>
      )}
      {/* hidung dan mulut */}
      <path d="M57 80 L63 80 L60 84 Z" fill="var(--color-text)" />
      {mood === "berpikir" ? (
        <path d="M54 92 H66" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M50 88 Q55 94 60 88 Q65 94 70 88" fill="none" stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" />
      )}
      {/* kumis */}
      <path d="M18 78 L36 80 M18 88 L36 86 M102 78 L84 80 M102 88 L84 86" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
