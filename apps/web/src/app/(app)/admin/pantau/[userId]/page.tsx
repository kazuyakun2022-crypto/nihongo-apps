"use client";

import { LearnerDetailView } from "@/features/admin/ui/monitor/LearnerDetailView";
import { SuperAdminGate } from "@/features/admin/ui/monitor/SuperAdminGate";
import styles from "@/features/admin/ui/monitor/monitor.module.css";

export default function PantauPelajarPage({ params }: { params: { userId: string } }) {
  return (
    <SuperAdminGate>
      <div className={styles.page}>
        <LearnerDetailView userId={params.userId} />
      </div>
    </SuperAdminGate>
  );
}
