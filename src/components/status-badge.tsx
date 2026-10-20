import {
  PAYMENT_STATUS_LABEL,
  SERVICE_STATUS_LABEL,
  type PaymentStatus,
  type ServiceStatus,
} from "@/lib/domain";

const serviceTone: Record<ServiceStatus, string> = {
  QUOTE: "border-line text-muted",
  AWAITING_APPROVAL: "border-warn/40 bg-warn-bg text-warn",
  APPROVED: "border-ok/40 bg-ok-bg text-ok",
  OS_GENERATED: "border-line text-ink",
  SCHEDULED: "border-line text-ink",
  IN_PROGRESS: "border-line text-ink",
  WAITING_PART: "border-warn/40 bg-warn-bg text-warn",
  READY: "border-ok/40 bg-ok-bg text-ok",
  DELIVERED: "border-line text-muted",
  REFUSED: "border-danger/40 bg-danger-bg text-danger",
  CANCELLED: "border-danger/40 bg-danger-bg text-danger",
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${serviceTone[status]}`}>
      {status === "IN_PROGRESS" ? <span className="h-1.5 w-1.5 rounded-full bg-brand" /> : null}
      {SERVICE_STATUS_LABEL[status]}
    </span>
  );
}

const paymentTone: Record<PaymentStatus, string> = {
  UNPAID: "border-line text-muted",
  PARTIAL: "border-warn/40 bg-warn-bg text-warn",
  PAID: "border-ok/40 bg-ok-bg text-ok",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${paymentTone[status]}`}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}
