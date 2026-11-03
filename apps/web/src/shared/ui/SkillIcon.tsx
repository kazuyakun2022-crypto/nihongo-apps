import type { SkillId } from "@/shared/lib/exercises";
import { BookOpenIcon, HeadphonesIcon, MicIcon, PenLineIcon, PuzzleIcon, type IconProps } from "./icons";

const ICONS: Record<SkillId, (props: IconProps) => JSX.Element> = {
  pemahaman: BookOpenIcon,
  mendengar: HeadphonesIcon,
  menyusun: PuzzleIcon,
  menulis: PenLineIcon,
  berbicara: MicIcon,
};

/** Ikon keterampilan latihan (pengganti emoji), dipakai di kuis bab dan editor bab admin. */
export function SkillIcon({ skill, size = 14, ...props }: IconProps & { skill: SkillId }) {
  const Icon = ICONS[skill];
  return <Icon size={size} {...props} />;
}
