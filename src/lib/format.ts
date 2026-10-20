export function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function formatMoneyInput(cents: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

export function parseMoney(input: string): number | null {
  let value = input.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!value) return 0;
  if (!/^[\d.,]+$/.test(value)) return null;
  if (value.includes(",")) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if ((value.match(/\./g) ?? []).length > 1) {
    value = value.replace(/\./g, "");
  } else if (value.includes(".")) {
    const decimals = value.split(".")[1] ?? "";
    if (decimals.length === 3) value = value.replace(".", "");
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100);
}

export function parseQty(input: string): number | null {
  const value = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!value) return null;
  if (!/^\d+(\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 999) return null;
  return Math.round(number * 1000) / 1000;
}

export function formatQty(quantity: number) {
  return quantity.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export function normalizePlate(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatPlate(plate: string) {
  const normalized = normalizePlate(plate);
  if (normalized.length === 7) return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  return normalized;
}

export function normalizePhone(input: string) {
  return input.replace(/\D/g, "");
}

export function formatPhone(phone: string) {
  const digits = normalizePhone(phone);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

export function whatsappHref(phone: string, text?: string) {
  const digits = normalizePhone(phone);
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  const url = new URL(`https://wa.me/${full}`);
  if (text) url.searchParams.set("text", text);
  return url.toString();
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function daysSince(date: Date, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)));
}

export function toDateTimeLocal(date: Date | null | undefined) {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function parseDateTimeLocal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDateInput(value: string | undefined, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const iso = `${value}T${end ? "23:59:59.999" : "00:00:00.000"}-03:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function one(sp: Record<string, string | string[] | undefined>, key: string) {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
}
