"use client";
import type { ReactNode } from "react";
import { useConfirm } from "./ConfirmDialog";

export function ConfirmForm({
  action,
  message,
  children,
  className,
  confirmLabel,
}: {
  action: (form: FormData) => void | Promise<void>;
  message: string;
  children: ReactNode;
  className?: string;
  confirmLabel?: string;
}) {
  const [dialog, guard] = useConfirm();
  return (
    <form action={action} className={className} onSubmit={guard({ message, confirmLabel })}>
      {children}
      {dialog}
    </form>
  );
}
