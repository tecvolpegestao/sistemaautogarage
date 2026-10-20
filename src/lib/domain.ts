export const ROLES = ["OWNER", "RECEPTION", "PRODUCTION", "FINANCE"] as const;
export type Role = (typeof ROLES)[number];

export const SERVICE_STATUSES = [
  "QUOTE",
  "AWAITING_APPROVAL",
  "APPROVED",
  "OS_GENERATED",
  "SCHEDULED",
  "IN_PROGRESS",
  "WAITING_PART",
  "READY",
  "DELIVERED",
  "REFUSED",
  "CANCELLED",
] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["PIX", "CASH", "CARD"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CLIENT_TYPES = ["INDIVIDUAL", "PARTNER"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const APPROVAL_CHANNELS = ["WHATSAPP", "PHONE", "IN_PERSON"] as const;
export type ApprovalChannel = (typeof APPROVAL_CHANNELS)[number];

export const STALE_DAYS = 7;

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  QUOTE: "Orçamento",
  AWAITING_APPROVAL: "Aguardando aprovação",
  APPROVED: "Aprovado",
  OS_GENERATED: "OS gerada",
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em execução",
  WAITING_PART: "Aguardando peça",
  READY: "Pronto",
  DELIVERED: "Entregue",
  REFUSED: "Recusado",
  CANCELLED: "Cancelada",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Sem pagamento",
  PARTIAL: "Pago em parte",
  PAID: "Pago",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CARD: "Cartão",
};

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Dono",
  RECEPTION: "Atendimento",
  PRODUCTION: "Produção",
  FINANCE: "Financeiro",
};

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  INDIVIDUAL: "Particular",
  PARTNER: "Parceiro",
};

export const APPROVAL_CHANNEL_LABEL: Record<ApprovalChannel, string> = {
  WHATSAPP: "WhatsApp",
  PHONE: "Telefone",
  IN_PERSON: "Presencial",
};

const TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  QUOTE: ["AWAITING_APPROVAL", "CANCELLED"],
  AWAITING_APPROVAL: ["APPROVED", "REFUSED", "CANCELLED"],
  APPROVED: ["OS_GENERATED", "CANCELLED"],
  OS_GENERATED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_PART", "READY", "CANCELLED"],
  WAITING_PART: ["IN_PROGRESS", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["CANCELLED"],
  REFUSED: [],
  CANCELLED: [],
};

export function canTransition(from: ServiceStatus, to: ServiceStatus) {
  return TRANSITIONS[from].includes(to);
}

export function isServiceStatus(value: string): value is ServiceStatus {
  return (SERVICE_STATUSES as readonly string[]).includes(value);
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

const EARLY_STATUSES: ServiceStatus[] = ["QUOTE", "AWAITING_APPROVAL", "APPROVED", "REFUSED"];

export function documentLabel(status: ServiceStatus, number: number) {
  const padded = String(number).padStart(4, "0");
  return EARLY_STATUSES.includes(status) ? `Orçamento ${padded}` : `OS ${padded}`;
}

const EDITABLE: ServiceStatus[] = ["QUOTE", "AWAITING_APPROVAL", "APPROVED", "OS_GENERATED", "SCHEDULED"];

export function canEditItems(status: ServiceStatus) {
  return EDITABLE.includes(status);
}

const TERMINAL: ServiceStatus[] = ["DELIVERED", "REFUSED", "CANCELLED"];

export function isStale(status: ServiceStatus, updatedAt: Date, now = new Date()) {
  if (TERMINAL.includes(status)) return false;
  return now.getTime() - updatedAt.getTime() > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export type TotalsInput = {
  services: { priceCents: number }[];
  parts: { quantity: number; unitPriceCents: number; unitCostCents: number }[];
  discountCents: number;
  paidCents: number;
};

export type Totals = {
  laborCents: number;
  partsCents: number;
  costCents: number;
  discountCents: number;
  subtotalCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  profitCents: number;
  paymentStatus: PaymentStatus;
};

export function computeTotals(input: TotalsInput): Totals {
  const laborCents = input.services.reduce((sum, item) => sum + item.priceCents, 0);
  const partsCents = input.parts.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
    0,
  );
  const costCents = input.parts.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitCostCents),
    0,
  );
  const discountCents = Math.max(0, input.discountCents);
  const subtotalCents = laborCents + partsCents;
  const totalCents = Math.max(0, subtotalCents - discountCents);
  const paidCents = Math.max(0, input.paidCents);
  const balanceCents = Math.max(0, totalCents - paidCents);
  let paymentStatus: PaymentStatus = "UNPAID";
  if (paidCents > 0 && balanceCents === 0) paymentStatus = "PAID";
  else if (paidCents > 0 && balanceCents > 0) paymentStatus = "PARTIAL";
  const profitCents = totalCents - costCents;
  return {
    laborCents,
    partsCents,
    costCents,
    discountCents,
    subtotalCents,
    totalCents,
    paidCents,
    balanceCents,
    profitCents,
    paymentStatus,
  };
}

export function suggestPriceCents(costCents: number, marginPercent: number) {
  return Math.round(costCents * (1 + marginPercent / 100));
}

export type PeriodKey = "semana" | "quinzena" | "mes";

export function isPeriodKey(value: string | undefined): value is PeriodKey {
  return value === "semana" || value === "quinzena" || value === "mes";
}

type Ymd = { y: number; m: number; d: number };

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function saoPauloYmd(date: Date): Ymd & { weekday: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    weekday: get("weekday"),
  };
}

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function addCalendarDays(ymd: Ymd, delta: number): Ymd {
  const date = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + delta));
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

export function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function spStart(ymd: Ymd) {
  return new Date(`${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}T00:00:00.000-03:00`);
}

export function spEnd(ymd: Ymd) {
  return new Date(`${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}T23:59:59.999-03:00`);
}

export function formatShortDate(ymd: Ymd) {
  return `${pad(ymd.d)}/${pad(ymd.m)}`;
}

export function periodRange(key: PeriodKey, now = new Date()) {
  const today = saoPauloYmd(now);
  if (key === "mes") {
    const start = { y: today.y, m: today.m, d: 1 };
    const end = { y: today.y, m: today.m, d: daysInMonth(today.y, today.m) };
    return { start: spStart(start), end: spEnd(end), label: `${formatShortDate(start)} a ${formatShortDate(end)}` };
  }
  if (key === "quinzena") {
    const start = { y: today.y, m: today.m, d: today.d <= 15 ? 1 : 16 };
    const end = {
      y: today.y,
      m: today.m,
      d: today.d <= 15 ? 15 : daysInMonth(today.y, today.m),
    };
    return { start: spStart(start), end: spEnd(end), label: `${formatShortDate(start)} a ${formatShortDate(end)}` };
  }
  const index = WEEKDAY_INDEX[today.weekday] ?? 1;
  const start = addCalendarDays(today, -(index - 1));
  const end = addCalendarDays(start, 6);
  return { start: spStart(start), end: spEnd(end), label: `${formatShortDate(start)} a ${formatShortDate(end)}` };
}

export function recentWeeks(count = 8, now = new Date()) {
  const current = periodRange("semana", now);
  const monday = saoPauloYmd(current.start);
  const weeks: { label: string; start: Date; end: Date }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = addCalendarDays(monday, -7 * i);
    const end = addCalendarDays(start, 6);
    weeks.push({ label: formatShortDate(start), start: spStart(start), end: spEnd(end) });
  }
  return weeks;
}

export function inRange(date: Date, start: Date, end: Date) {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export type SummaryInput = {
  tradeName: string;
  label: string;
  clientName: string;
  vehicle: string;
  mileageIn: number | null;
  services: { description: string; priceCents: number }[];
  parts: { description: string; quantity: number; unitPriceCents: number }[];
  discountCents: number;
  totalCents: number;
  pixKey: string;
};

export function buildWhatsappSummary(input: SummaryInput) {
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const brl = (cents: number) => money.format(cents / 100);
  const lines = [
    `*${input.tradeName} — ${input.label}*`,
    `Cliente: ${input.clientName}`,
    `Veículo: ${input.vehicle}`,
  ];
  if (input.mileageIn != null) lines.push(`Quilometragem: ${input.mileageIn.toLocaleString("pt-BR")} km`);
  if (input.services.length) {
    lines.push("", "Mão de obra");
    for (const item of input.services) lines.push(`• ${item.description}: ${brl(item.priceCents)}`);
  }
  if (input.parts.length) {
    lines.push("", "Peças");
    for (const item of input.parts) {
      const qty = Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toLocaleString("pt-BR");
      lines.push(`• ${qty}× ${item.description}: ${brl(Math.round(item.quantity * item.unitPriceCents))}`);
    }
  }
  if (input.discountCents > 0) lines.push("", `Desconto: ${brl(input.discountCents)}`);
  lines.push("", `Total: ${brl(input.totalCents)}`);
  if (input.pixKey) lines.push(`Chave Pix: ${input.pixKey}`);
  return lines.join("\n");
}
