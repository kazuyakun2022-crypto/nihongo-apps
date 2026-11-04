"use client";

import { useEffect, useState } from "react";
import { ConfirmModal } from "./ConfirmModal";

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  /** "danger" (bawaan) untuk hapus/tindakan permanen. */
  tone?: "danger" | "primary";
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

let show: ((p: Pending) => void) | null = null;

/**
 * Pengganti `window.confirm()` bergaya aplikasi: `if (!(await askConfirm({...}))) return;`.
 * Butuh <ConfirmHost /> terpasang sekali (di AppShell). Tanpa host, jatuh ke dialog bawaan browser.
 */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  if (!show) return Promise.resolve(typeof window !== "undefined" && window.confirm(`${options.title}\n\n${options.description}`));
  return new Promise((resolve) => show!({ ...options, resolve }));
}

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    show = (p) =>
      setPending((cur) => {
        cur?.resolve(false); // dialog sebelumnya dianggap dibatalkan
        return p;
      });
    return () => {
      show = null;
    };
  }, []);

  const finish = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <ConfirmModal
      isOpen={!!pending}
      title={pending?.title ?? ""}
      description={pending?.description ?? ""}
      confirmText={pending?.confirmText ?? "Ya, hapus"}
      cancelText={pending?.cancelText ?? "Batal"}
      confirmVariant={pending?.tone ?? "danger"}
      iconType={pending?.tone === "primary" ? "info" : "warning"}
      onClose={() => finish(false)}
      onConfirm={() => finish(true)}
    />
  );
}
