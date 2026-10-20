import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  computeTotals,
  documentLabel,
  inRange,
  isPaymentStatus,
  isServiceStatus,
  isStale,
  periodRange,
  recentWeeks,
  type PaymentStatus,
  type PeriodKey,
  type ServiceStatus,
} from "@/lib/domain";
import { canSeeCosts, canSeePrices } from "@/lib/permissions";

const orderInclude = {
  client: true,
  vehicle: true,
  mechanic: true,
  services: { include: { mechanic: true } },
  parts: true,
  payments: { include: { createdBy: true }, orderBy: { paidAt: "desc" as const } },
  events: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.ServiceOrderInclude;

type OrderRecord = Prisma.ServiceOrderGetPayload<{ include: typeof orderInclude }>;

const moneyInclude = {
  services: true,
  parts: true,
  payments: true,
} satisfies Prisma.ServiceOrderInclude;

function totalsOf(order: {
  services: { priceCents: number }[];
  parts: { quantity: number; unitPriceCents: number; unitCostCents: number }[];
  payments: { amountCents: number }[];
  discountCents: number;
}) {
  return computeTotals({
    services: order.services,
    parts: order.parts,
    discountCents: order.discountCents,
    paidCents: order.payments.reduce((sum, payment) => sum + payment.amountCents, 0),
  });
}

export type OrderView = {
  id: string;
  number: number;
  label: string;
  serviceStatus: ServiceStatus;
  paymentStatus: PaymentStatus;
  enteredAt: Date;
  updatedAt: Date;
  stale: boolean;
  mileageIn: number | null;
  problemReport: string;
  notes: string;
  approvalAt: Date | null;
  approvalChannel: string | null;
  scheduledAt: Date | null;
  readyAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  client: { id: string; name: string; phone: string; type: string };
  vehicle: { id: string; plate: string; brand: string; model: string; year: number | null; color: string };
  mechanic: { id: string; name: string } | null;
  services: {
    id: string;
    description: string;
    priceCents: number | null;
    mechanicId: string | null;
    mechanicName: string | null;
  }[];
  parts: {
    id: string;
    description: string;
    quantity: number;
    unitCostCents: number | null;
    unitPriceCents: number | null;
    missingCost: boolean;
  }[];
  payments: {
    id: string;
    amountCents: number;
    paidAt: Date;
    method: string;
    installments: number;
    notes: string;
    createdBy: string;
  }[];
  events: { id: string; message: string; createdAt: Date; userName: string | null }[];
  showPrices: boolean;
  showCosts: boolean;
  totals: {
    laborCents: number | null;
    partsCents: number | null;
    discountCents: number | null;
    subtotalCents: number | null;
    totalCents: number | null;
    paidCents: number | null;
    balanceCents: number | null;
    costCents: number | null;
    profitCents: number | null;
  };
};

function presentOrder(order: OrderRecord, user: CurrentUser): OrderView {
  const showPrices = canSeePrices(user.role);
  const showCosts = canSeeCosts(user.role);
  const totals = totalsOf(order);
  const status = isServiceStatus(order.serviceStatus) ? order.serviceStatus : "QUOTE";
  const payment = isPaymentStatus(order.paymentStatus) ? order.paymentStatus : "UNPAID";
  return {
    id: order.id,
    number: order.number,
    label: documentLabel(status, order.number),
    serviceStatus: status,
    paymentStatus: payment,
    enteredAt: order.enteredAt,
    updatedAt: order.updatedAt,
    stale: isStale(status, order.updatedAt),
    mileageIn: order.mileageIn,
    problemReport: order.problemReport,
    notes: order.notes,
    approvalAt: order.approvalAt,
    approvalChannel: order.approvalChannel,
    scheduledAt: order.scheduledAt,
    readyAt: order.readyAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    cancelReason: order.cancelReason,
    client: {
      id: order.client.id,
      name: order.client.name,
      phone: order.client.phone,
      type: order.client.type,
    },
    vehicle: {
      id: order.vehicle.id,
      plate: order.vehicle.plate,
      brand: order.vehicle.brand,
      model: order.vehicle.model,
      year: order.vehicle.year,
      color: order.vehicle.color,
    },
    mechanic: order.mechanic ? { id: order.mechanic.id, name: order.mechanic.name } : null,
    services: order.services.map((item) => ({
      id: item.id,
      description: item.description,
      priceCents: showPrices ? item.priceCents : null,
      mechanicId: item.mechanicId,
      mechanicName: item.mechanic?.name ?? null,
    })),
    parts: order.parts.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitCostCents: showCosts ? item.unitCostCents : null,
      unitPriceCents: showPrices ? item.unitPriceCents : null,
      missingCost: showCosts && item.unitCostCents === 0,
    })),
    payments: showPrices
      ? order.payments.map((payment) => ({
          id: payment.id,
          amountCents: payment.amountCents,
          paidAt: payment.paidAt,
          method: payment.method,
          installments: payment.installments,
          notes: payment.notes,
          createdBy: payment.createdBy?.name ?? "—",
        }))
      : [],
    events: order.events.map((event) => ({
      id: event.id,
      message: event.message,
      createdAt: event.createdAt,
      userName: event.userName,
    })),
    showPrices,
    showCosts,
    totals: {
      laborCents: showPrices ? totals.laborCents : null,
      partsCents: showPrices ? totals.partsCents : null,
      discountCents: showPrices ? totals.discountCents : null,
      subtotalCents: showPrices ? totals.subtotalCents : null,
      totalCents: showPrices ? totals.totalCents : null,
      paidCents: showPrices ? totals.paidCents : null,
      balanceCents: showPrices ? totals.balanceCents : null,
      costCents: showCosts ? totals.costCents : null,
      profitCents: showCosts ? totals.profitCents : null,
    },
  };
}

export async function getOrder(id: string, user: CurrentUser) {
  const order = await prisma.serviceOrder.findUnique({ where: { id }, include: orderInclude });
  if (!order) return null;
  if (user.role === "PRODUCTION" && order.mechanicId !== user.id) return null;
  return presentOrder(order, user);
}

export type OrderFilters = {
  status?: string;
  payment?: string;
  q?: string;
  partner?: boolean;
  stale?: boolean;
  from?: Date | null;
  to?: Date | null;
};

export async function listOrders(user: CurrentUser, filters: OrderFilters) {
  const where: Prisma.ServiceOrderWhereInput = {};
  if (user.role === "PRODUCTION") where.mechanicId = user.id;
  if (filters.status && isServiceStatus(filters.status)) where.serviceStatus = filters.status;
  if (filters.payment && isPaymentStatus(filters.payment) && canSeePrices(user.role)) {
    where.paymentStatus = filters.payment;
  }
  if (filters.partner) where.client = { type: "PARTNER" };
  if (filters.from || filters.to) {
    where.enteredAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  if (filters.stale) {
    where.updatedAt = { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    where.serviceStatus = filters.status && isServiceStatus(filters.status)
      ? filters.status
      : { notIn: ["DELIVERED", "REFUSED", "CANCELLED"] };
  }
  if (filters.q) {
    const q = filters.q.trim();
    const plate = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const number = Number(q.replace(/\D/g, ""));
    where.OR = [
      { client: { name: { contains: q } } },
      { vehicle: { model: { contains: q } } },
      { vehicle: { brand: { contains: q } } },
      ...(plate ? [{ vehicle: { plate: { contains: plate } } }] : []),
      ...(Number.isInteger(number) && number > 0 ? [{ number }] : []),
    ];
  }
  const orders = await prisma.serviceOrder.findMany({
    where,
    include: orderInclude,
    orderBy: { enteredAt: "desc" },
  });
  return orders.map((order) => presentOrder(order, user));
}

export async function listClientOptions() {
  const clients = await prisma.client.findMany({
    include: { vehicles: { orderBy: { plate: "asc" } } },
    orderBy: { name: "asc" },
  });
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    phone: client.phone,
    type: client.type,
    vehicles: client.vehicles.map((vehicle) => ({
      id: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
    })),
  }));
}

export async function listMechanics() {
  return prisma.user.findMany({
    where: { active: true, role: { in: ["OWNER", "PRODUCTION"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function getSettings() {
  return prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      tradeName: "Autogarage",
      legalName: "Autogarage",
      address: "Endereço em atualização",
      marginPercent: 40,
    },
  });
}

export async function listClients(user: CurrentUser, filters: { q?: string; type?: string; open?: boolean }) {
  const clients = await prisma.client.findMany({
    include: {
      vehicles: true,
      orders: {
        where: { serviceStatus: { notIn: ["CANCELLED", "REFUSED"] } },
        include: moneyInclude,
      },
    },
    orderBy: { name: "asc" },
  });
  const showPrices = canSeePrices(user.role);
  const q = filters.q?.trim().toLowerCase();
  const plateQ = filters.q?.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clients
    .map((client) => {
      const openCents = client.orders.reduce((sum, order) => sum + totalsOf(order).balanceCents, 0);
      const spentCents = client.orders.reduce((sum, order) => sum + totalsOf(order).totalCents, 0);
      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        document: client.document,
        type: client.type,
        notes: client.notes,
        vehicles: client.vehicles,
        openCents: showPrices ? openCents : null,
        spentCents: showPrices ? spentCents : null,
        orderCount: client.orders.length,
      };
    })
    .filter((client) => {
      if (filters.type && client.type !== filters.type) return false;
      if (filters.open && !(client.openCents && client.openCents > 0)) return false;
      if (!q) return true;
      const hay = `${client.name} ${client.phone}`.toLowerCase();
      const plateHit = plateQ
        ? client.vehicles.some((vehicle) => vehicle.plate.includes(plateQ))
        : false;
      return hay.includes(q) || plateHit;
    });
}

export async function getClient(id: string, user: CurrentUser) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      vehicles: { orderBy: { plate: "asc" } },
      orders: {
        include: { ...orderInclude },
        orderBy: { enteredAt: "desc" },
      },
    },
  });
  if (!client) return null;
  const showPrices = canSeePrices(user.role);
  const active = client.orders.filter((order) => !["CANCELLED", "REFUSED"].includes(order.serviceStatus));
  const openCents = active.reduce((sum, order) => sum + totalsOf(order).balanceCents, 0);
  const spentCents = active.reduce((sum, order) => sum + totalsOf(order).totalCents, 0);
  return {
    ...client,
    openCents: showPrices ? openCents : null,
    spentCents: showPrices ? spentCents : null,
    orders: client.orders.map((order) => presentOrder(order, user)),
  };
}

export async function getVehicle(id: string, user: CurrentUser) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      client: true,
      orders: { include: orderInclude, orderBy: { enteredAt: "desc" } },
    },
  });
  if (!vehicle) return null;
  if (user.role === "PRODUCTION") return null;
  return {
    ...vehicle,
    orders: vehicle.orders.map((order) => presentOrder(order, user)),
  };
}

export async function getDashboard(user: CurrentUser, period: PeriodKey) {
  const range = periodRange(period);
  const weeks = recentWeeks(8);
  const production = user.role === "PRODUCTION";
  const orders = await prisma.serviceOrder.findMany({
    where: production ? { mechanicId: user.id } : undefined,
    include: {
      services: true,
      parts: true,
      payments: true,
      client: true,
      vehicle: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  const showPrices = canSeePrices(user.role);
  const showCosts = canSeeCosts(user.role);
  const active = orders.filter((order) => !["REFUSED", "CANCELLED"].includes(order.serviceStatus));
  const inPeriod = active.filter((order) => inRange(order.enteredAt, range.start, range.end));
  const chargedCents = inPeriod.reduce((sum, order) => sum + totalsOf(order).totalCents, 0);
  const costCents = inPeriod.reduce((sum, order) => sum + totalsOf(order).costCents, 0);
  const receivableCents = active.reduce((sum, order) => sum + totalsOf(order).balanceCents, 0);
  const receivedCents = orders
    .flatMap((order) => order.payments)
    .filter((payment) => inRange(payment.paidAt, range.start, range.end))
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  const yardStatuses: ServiceStatus[] = [
    "QUOTE",
    "AWAITING_APPROVAL",
    "APPROVED",
    "OS_GENERATED",
    "SCHEDULED",
    "IN_PROGRESS",
    "WAITING_PART",
    "READY",
  ];
  const yard = yardStatuses.map((status) => ({
    status,
    count: orders.filter((order) => order.serviceStatus === status).length,
  }));

  const brief = (order: (typeof orders)[number]) => {
    const status = isServiceStatus(order.serviceStatus) ? order.serviceStatus : "QUOTE";
    return {
      id: order.id,
      label: documentLabel(status, order.number),
      plate: order.vehicle.plate,
      model: `${order.vehicle.brand} ${order.vehicle.model}`,
      client: order.client.name,
      status,
      updatedAt: order.updatedAt,
      deliveredAt: order.deliveredAt,
      balanceCents: showPrices ? totalsOf(order).balanceCents : null,
    };
  };

  const pendingReady = orders.filter((order) => order.serviceStatus === "READY").map(brief);
  const pendingPay = orders
    .filter((order) => order.serviceStatus === "DELIVERED" && totalsOf(order).balanceCents > 0)
    .map(brief);
  const pendingParts = orders.filter((order) => order.serviceStatus === "WAITING_PART").map(brief);
  const pendingStale = orders
    .filter((order) => isServiceStatus(order.serviceStatus) && isStale(order.serviceStatus, order.updatedAt))
    .map(brief);

  const chart = weeks.map((week) => {
    const charged = active
      .filter((order) => inRange(order.enteredAt, week.start, week.end))
      .reduce((sum, order) => sum + totalsOf(order).totalCents, 0);
    const received = orders
      .flatMap((order) => order.payments)
      .filter((payment) => inRange(payment.paidAt, week.start, week.end))
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    return { label: week.label, charged, received };
  });

  const activity = showCosts
    ? await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 })
    : [];

  return {
    range,
    showPrices,
    showCosts,
    production,
    chargedCents: showPrices ? chargedCents : null,
    receivedCents: showPrices ? receivedCents : null,
    receivableCents: showPrices ? receivableCents : null,
    costCents: showCosts ? costCents : null,
    profitCents: showCosts ? chargedCents - costCents : null,
    yard,
    pendingReady,
    pendingPay: showPrices ? pendingPay : [],
    pendingParts,
    pendingStale,
    chart: showPrices ? chart : [],
    activity,
  };
}

export async function listPayments(filters: { method?: string; from?: Date | null; to?: Date | null }) {
  const where: Prisma.PaymentWhereInput = {};
  if (filters.method) where.method = filters.method;
  if (filters.from || filters.to) {
    where.paidAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  const payments = await prisma.payment.findMany({
    where,
    include: { order: { include: { client: true, vehicle: true } }, createdBy: true },
    orderBy: { paidAt: "desc" },
  });
  const totalCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  return {
    totalCents,
    payments: payments.map((payment) => ({
      id: payment.id,
      amountCents: payment.amountCents,
      paidAt: payment.paidAt,
      method: payment.method,
      installments: payment.installments,
      notes: payment.notes,
      createdBy: payment.createdBy?.name ?? "—",
      orderId: payment.orderId,
      orderNumber: payment.order.number,
      orderStatus: payment.order.serviceStatus,
      client: payment.order.client.name,
      plate: payment.order.vehicle.plate,
    })),
  };
}

export async function listReceivables() {
  const orders = await prisma.serviceOrder.findMany({
    where: { serviceStatus: "DELIVERED", paymentStatus: { not: "PAID" } },
    include: { client: true, vehicle: true, services: true, parts: true, payments: true },
    orderBy: { deliveredAt: "asc" },
  });
  const rows = orders
    .map((order) => {
      const totals = totalsOf(order);
      return {
        id: order.id,
        number: order.number,
        label: documentLabel("DELIVERED", order.number),
        clientId: order.clientId,
        client: order.client.name,
        phone: order.client.phone,
        plate: order.vehicle.plate,
        model: `${order.vehicle.brand} ${order.vehicle.model}`,
        deliveredAt: order.deliveredAt,
        balanceCents: totals.balanceCents,
        totalCents: totals.totalCents,
      };
    })
    .filter((row) => row.balanceCents > 0);

  const groups = new Map<string, { client: string; phone: string; totalCents: number; rows: typeof rows }>();
  for (const row of rows) {
    const current = groups.get(row.clientId) ?? { client: row.client, phone: row.phone, totalCents: 0, rows: [] };
    current.totalCents += row.balanceCents;
    current.rows.push(row);
    groups.set(row.clientId, current);
  }
  return [...groups.values()].sort((a, b) => b.totalCents - a.totalCents);
}
