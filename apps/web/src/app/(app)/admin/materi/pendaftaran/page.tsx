"use client";

import { MateriShell } from "@/features/admin/ui/content/MateriShell";
import { OnboardingEditor } from "@/features/admin/ui/content/OnboardingEditor";

export default function AdminMateriPendaftaranPage() {
  return (
    <MateriShell
      title="Pendaftaran Awal"
      subtitle="Atur pertanyaan dan titik mulai yang dipilih siswa baru, termasuk level mana yang wajib tes penempatan."
    >
      <OnboardingEditor />
    </MateriShell>
  );
}

