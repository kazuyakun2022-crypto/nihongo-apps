import type { ButtonHTMLAttributes } from "react";
import styles from "./ui.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  block = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }) {
  const cls = [styles.button, styles[variant], block ? styles.block : "", className ?? ""].join(" ");
  return <button className={cls} {...props} />;
}
