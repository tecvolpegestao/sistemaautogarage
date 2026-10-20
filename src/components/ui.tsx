import Link from "next/link";
import type { ReactNode } from "react";

export function buttonClass(variant: "primary" | "secondary" | "ghost" | "danger" = "primary", size: "md" | "sm" = "md") {
  const sizes = size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm";
  const variants = {
    primary: "bg-brand text-on-brand hover:bg-brand-hover",
    secondary: "border border-line bg-card text-ink hover:bg-elevated",
    ghost: "text-ink hover:bg-card",
    danger: "border border-danger text-danger hover:bg-danger-bg",
  };
  return `inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${sizes} ${variants[variant]}`;
}

export function inputClass() {
  return "h-10 w-full rounded-md border border-line bg-elevated px-3 text-sm text-ink outline-none placeholder:text-muted";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="display mb-1 text-xs text-muted">{eyebrow}</p> : null}
        <h1 className="display text-3xl leading-none text-ink md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line bg-card ${className}`}>{children}</section>;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Alert({ tone, children }: { tone: "ok" | "warn" | "danger"; children: ReactNode }) {
  const tones = {
    ok: "border-ok/40 bg-ok-bg text-ok",
    warn: "border-warn/40 bg-warn-bg text-warn",
    danger: "border-danger/40 bg-danger-bg text-danger",
  };
  return <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  if (ok) return <Alert tone="ok">{ok}</Alert>;
  if (erro) return <Alert tone="danger">{erro}</Alert>;
  return null;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center">
      <p className="display text-lg text-ink">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Money({ cents }: { cents: number | null }) {
  if (cents == null) return <span className="text-muted">—</span>;
  const negative = cents < 0;
  return (
    <span className={`num ${negative ? "text-danger" : ""}`}>
      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)}
    </span>
  );
}

export function Plate({ plate }: { plate: string }) {
  const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const label = normalized.length === 7 ? `${normalized.slice(0, 3)}-${normalized.slice(3)}` : normalized;
  return (
    <span className="inline-flex items-center rounded-[3px] border border-[#0A0A0A] bg-white px-1.5 py-0.5 font-display text-[13px] font-semibold tracking-wide text-[#0A0A0A]">
      {label}
    </span>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-link underline decoration-transparent underline-offset-2 hover:decoration-current">
      {children}
    </Link>
  );
}
