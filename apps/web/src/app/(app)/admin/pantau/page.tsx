"use client";

import { AdminHeaderNav } from "@/features/admin/ui/AdminHeaderNav";
import { LearnerMonitor } from "@/features/admin/ui/monitor/LearnerMonitor";
import { SuperAdminGate } from "@/features/admin/ui/monitor/SuperAdminGate";
import styles from "@/features/admin/ui/monitor/monitor.module.css";

export default function PantauBelajarPage() {
  return (
    <SuperAdminGate>
      <div className={styles.page}>
        <AdminHeaderNav
          title="Pantau Belajar"
          subtitle="Level yang ditempati, progres bab, ujian, percakapan, dan pencapaian seluruh pelajar."
        />
        <LearnerMonitor />
      </div>
    </SuperAdminGate>
  );
}
