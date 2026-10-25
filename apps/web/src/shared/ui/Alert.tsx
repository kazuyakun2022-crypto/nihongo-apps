import styles from "./ui.module.css";

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success" | "info"; children: React.ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`${styles.alert} ${styles[`alert_${tone}`]}`}>
      {children}
    </div>
  );
}
