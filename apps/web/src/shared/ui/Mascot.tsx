import Image from "next/image";

/** Miu-chan: maskot gadis bertelinga kucing. Ekspresi mengikuti mood. */
export type MascotMood = "senang" | "berpikir" | "semangat";

const SRC: Record<MascotMood, string> = {
  senang: "/neko/maskot-senang.webp",
  berpikir: "/neko/maskot-berpikir.webp",
  semangat: "/neko/maskot-semangat.webp",
};

export function Mascot({
  mood = "senang",
  size = 96,
  title = "Miu-chan",
  className,
}: {
  mood?: MascotMood;
  size?: number;
  title?: string;
  className?: string;
}) {
  return (
    <Image
      src={SRC[mood]}
      alt={title}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block" }}
      priority={size >= 120}
    />
  );
}
