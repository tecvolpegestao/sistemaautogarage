import type { Role } from "@/lib/domain";

export function canSeeCosts(role: Role) {
  return role === "OWNER" || role === "FINANCE";
}

export function canSeePrices(role: Role) {
  return role !== "PRODUCTION";
}

export function canManageClients(role: Role) {
  return role === "OWNER" || role === "RECEPTION";
}

export function canEditOrderItems(role: Role) {
  return role === "OWNER" || role === "RECEPTION";
}

export function canRegisterPayment(role: Role) {
  return role === "OWNER" || role === "RECEPTION" || role === "FINANCE";
}

export function canOperateProduction(role: Role) {
  return role === "OWNER" || role === "PRODUCTION";
}

export function canSchedule(role: Role) {
  return role === "OWNER" || role === "RECEPTION" || role === "PRODUCTION";
}

export function canApprove(role: Role) {
  return role === "OWNER" || role === "RECEPTION";
}

export function canDeliver(role: Role) {
  return role === "OWNER" || role === "RECEPTION";
}

export function canManageSettings(role: Role) {
  return role === "OWNER";
}

export function canViewClients(role: Role) {
  return role !== "PRODUCTION";
}

export function canViewFinance(role: Role) {
  return role === "OWNER" || role === "RECEPTION" || role === "FINANCE";
}
