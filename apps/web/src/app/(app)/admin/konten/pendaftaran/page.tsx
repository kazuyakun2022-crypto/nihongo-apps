"use client";

import { ContentShell } from "@/features/admin/ui/content/ContentShell";
import { OnboardingEditor } from "@/features/admin/ui/content/OnboardingEditor";

export default function AdminPendaftaranPage() {
  return (
    <ContentShell title="Pendaftaran Awal" subtitle="Atur pertanyaan dan titik mulai yang dipilih siswa baru, termasuk level mana yang wajib tes penempatan.">
      <OnboardingEditor />
    </ContentShell>
  );
}
