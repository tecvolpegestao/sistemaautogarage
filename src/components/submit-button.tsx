"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui";

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={buttonClass(variant, size)} disabled={pending}>
      {pending ? "Salvando…" : children}
    </button>
  );
}
