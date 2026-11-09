"use client";

import { LearnerMonitor } from "@/features/admin/ui/monitor/LearnerMonitor";
import { SuperAdminGate } from "@/features/admin/ui/monitor/SuperAdminGate";
import styles from "@/features/admin/ui/monitor/monitor.module.css";

export default function PantauBelajarPage() {
  return (
    <SuperAdminGate>
      <div className={styles.page}>
        <LearnerMonitor />
      </div>
    </SuperAdminGate>
  );
}
