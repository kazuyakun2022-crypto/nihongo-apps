import type { Metadata } from "next";
import { ScannerScreen } from "@/features/scanner/ui/ScannerScreen";

export const metadata: Metadata = {
  title: "Kamera Scanner AI & Audio Reader",
  description:
    "Pindai teks aksara Jepang secara langsung, dapatkan furigana, transliterasi romaji, terjemahan Indonesia, analisis tata bahasa, dan dengarkan pelafalan penutur asli.",
};

export default function ScanPage() {
  return <ScannerScreen />;
}

