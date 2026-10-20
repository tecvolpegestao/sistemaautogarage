"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canTransition,
  computeTotals,
  documentLabel,
  isServiceStatus,
  type Role,
  type ServiceStatus,
} from "@/lib/domain";
import { normalizePhone, normalizePlate, parseDateTimeLocal, parseMoney, parseQty } from "@/lib/format";
import type { SaveOrderInput } from "@/lib/order-input";
import {
  canApprove,
  canDeliver,
  canEditOrderItems,
  canOperateProduction,
  canSchedule,
  canSeeCosts,
} from "@/lib/permissions";

function flash(path: string, kind: "ok" | "erro", message: string): never {
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}${kind}=${encodeURIComponent(message)}`);
}

function revalidateShop(orderId?: string, clientId?: string) {
  revalidatePath("/painel");
  revalidatePath("/os");
  revalidatePath("/clientes");
  revalidatePath("/recebimentos");
  revalidatePath("/a-receber");
  if (orderId) {
    revalidatePath(`/os/${orderId}`);
    revalidatePath(`/imprimir/${orderId}`);
  }
  if (clientId) revalidatePath(`/clientes/${clientId}`);
}

async function track(orderId: string, user: { id: string; name: string }, action: string, message: string) {
  await prisma.orderEvent.create({
    data: { orderId, type: action, message, userId: user.id, userName: user.name },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, userName: user.name, action, entity: "ServiceOrder", entityId: orderId, detail: message },
  });
}

export async function saveOrder(input: SaveOrderInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!canEditOrderItems(user.role)) return { ok: false, error: "Seu perfil não pode editar orçamento." };

  const mechanics = await prisma.user.findMany({
    where: { active: true, role: { in: ["OWNER", "PRODUCTION"] } },
    select: { id: true },
  });
  const mechanicIds = new Set(mechanics.map((item) => item.id));

  const services: { description: string; priceCents: number; mechanicId: string | null }[] = [];
  for (const line of input.services) {
    const description = line.description.trim();
    if (!description && !line.price.trim()) continue;
    if (!description) return { ok: false, error: "Todo serviço precisa de uma descrição." };
    const price = parseMoney(line.price);
    if (price == null) return { ok: false, error: `Valor inválido no serviço "${description}".` };
    services.push({
      description,
      priceCents: price,
      mechanicId: line.mechanicId && mechanicIds.has(line.mechanicId) ? line.mechanicId : null,
    });
  }

  const existing = input.orderId
    ? await prisma.serviceOrder.findUnique({
        where: { id: input.orderId },
        include: { parts: true, services: true, payments: true },
      })
    : null;
  if (input.orderId && !existing) return { ok: false, error: "OS não encontrada." };
  if (existing && isServiceStatus(existing.serviceStatus) && !["QUOTE", "AWAITING_APPROVAL", "APPROVED", "OS_GENERATED", "SCHEDULED"].includes(existing.serviceStatus)) {
    return { ok: false, error: "Os itens só podem ser editados antes da execução." };
  }

  const previousCost = new Map(existing?.parts.map((part) => [part.id, part.unitCostCents]) ?? []);
  const parts: { description: string; quantity: number; unitCostCents: number; unitPriceCents: number }[] = [];
  for (const line of input.parts) {
    const description = line.description.trim();
    const empty = !description && !line.quantity.trim() && !line.unitPrice.trim();
    if (empty) continue;
    if (!description) return { ok: false, error: "Toda peça precisa de uma descrição." };
    const quantity = parseQty(line.quantity || "1");
    const unitPrice = parseMoney(line.unitPrice);
    if (quantity == null) return { ok: false, error: `Quantidade inválida em "${description}".` };
    if (unitPrice == null) return { ok: false, error: `Preço inválido em "${description}".` };
    let unitCost = 0;
    if (canSeeCosts(user.role)) {
      const parsed = parseMoney(line.unitCost ?? "");
      if (parsed == null) return { ok: false, error: `Custo inválido em "${description}".` };
      unitCost = parsed;
    } else if (line.id) {
      unitCost = previousCost.get(line.id) ?? 0;
    }
    parts.push({ description, quantity, unitCostCents: unitCost, unitPriceCents: unitPrice });
  }

  const discount = parseMoney(input.discount || "0");
  if (discount == null) return { ok: false, error: "Desconto inválido." };
  if (input.intent === "approval" && services.length + parts.length === 0) {
    return { ok: false, error: "Inclua ao menos um serviço ou uma peça para enviar à aprovação." };
  }

  const mileageRaw = input.mileage?.trim() ?? "";
  let mileageIn: number | null = null;
  if (mileageRaw) {
    const mileage = Number(mileageRaw.replace(/\./g, ""));
    if (!Number.isInteger(mileage) || mileage < 0 || mileage > 2_000_000) {
      return { ok: false, error: "Quilometragem inválida." };
    }
    mileageIn = mileage;
  }

  const paidCents = existing?.payments.reduce((sum, payment) => sum + payment.amountCents, 0) ?? 0;
  const nextTotals = computeTotals({
    services,
    parts,
    discountCents: discount,
    paidCents,
  });
  if (paidCents > nextTotals.totalCents) {
    return { ok: false, error: "O total ficou menor do que o valor já recebido." };
  }

  try {
    const orderId = await prisma.$transaction(async (tx) => {
      let clientId = existing?.clientId ?? input.clientId ?? "";
      let vehicleId = existing?.vehicleId ?? input.vehicleId ?? "";

      if (!existing && input.newClient) {
        const name = input.newClient.name.trim();
        const phone = normalizePhone(input.newClient.phone);
        if (name.length < 2) throw new Error("Informe o nome do cliente.");
        if (phone.length < 10 || phone.length > 13) throw new Error("Informe um telefone com DDD.");
        const duplicate = await tx.client.findFirst({ where: { phone } });
        if (duplicate) throw new Error(`Este telefone já está no cliente ${duplicate.name}.`);
        const created = await tx.client.create({
          data: {
            name,
            phone,
            email: input.newClient.email?.trim() ?? "",
            type: input.newClient.type === "PARTNER" ? "PARTNER" : "INDIVIDUAL",
          },
        });
        clientId = created.id;
      }

      if (!existing && input.newVehicle) {
        const plate = normalizePlate(input.newVehicle.plate);
        const brand = input.newVehicle.brand.trim();
        const model = input.newVehicle.model.trim();
        if (plate.length !== 7) throw new Error("A placa precisa ter 7 caracteres.");
        if (!brand || !model) throw new Error("Informe marca e modelo do veículo.");
        const duplicate = await tx.vehicle.findUnique({ where: { plate } });
        if (duplicate) throw new Error("Esta placa já está cadastrada.");
        const yearRaw = input.newVehicle.year?.trim();
        const year = yearRaw ? Number(yearRaw) : null;
        if (year != null && (!Number.isInteger(year) || year < 1950 || year > 2035)) {
          throw new Error("Ano do veículo inválido.");
        }
        if (!clientId) throw new Error("Selecione o cliente do veículo.");
        const created = await tx.vehicle.create({
          data: { clientId, plate, brand, model, year, color: input.newVehicle.color?.trim() ?? "" },
        });
        vehicleId = created.id;
      }

      if (!existing) {
        if (!clientId || !vehicleId) throw new Error("Selecione cliente e veículo.");
        const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle || vehicle.clientId !== clientId) throw new Error("O veículo não pertence a este cliente.");
        const last = await tx.serviceOrder.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
        const status: ServiceStatus = input.intent === "approval" ? "AWAITING_APPROVAL" : "QUOTE";
        const created = await tx.serviceOrder.create({
          data: {
            number: (last?.number ?? 0) + 1,
            clientId,
            vehicleId,
            mileageIn,
            problemReport: input.problemReport.trim(),
            notes: input.notes.trim(),
            serviceStatus: status,
            paymentStatus: nextTotals.paymentStatus,
            discountCents: discount,
            services: { create: services },
            parts: { create: parts },
          },
        });
        await tx.orderEvent.create({
          data: {
            orderId: created.id,
            type: "CREATE",
            message: status === "AWAITING_APPROVAL" ? "Orçamento criado e enviado para aprovação" : "Orçamento salvo como rascunho",
            userId: user.id,
            userName: user.name,
          },
        });
        return created.id;
      }

      const previous = computeTotals({
        services: existing.services,
        parts: existing.parts,
        discountCents: existing.discountCents,
        paidCents,
      });
      let serviceStatus = existing.serviceStatus;
      if (input.intent === "approval" && serviceStatus === "QUOTE") serviceStatus = "AWAITING_APPROVAL";

      await tx.serviceItem.deleteMany({ where: { orderId: existing.id } });
      await tx.partItem.deleteMany({ where: { orderId: existing.id } });
      await tx.serviceOrder.update({
        where: { id: existing.id },
        data: {
          mileageIn,
          problemReport: input.problemReport.trim(),
          notes: input.notes.trim(),
          discountCents: discount,
          serviceStatus,
          paymentStatus: nextTotals.paymentStatus,
          services: { create: services },
          parts: { create: parts },
        },
      });
      const changed = previous.totalCents !== nextTotals.totalCents || previous.costCents !== nextTotals.costCents;
      const approvedAlready = !["QUOTE", "AWAITING_APPROVAL"].includes(existing.serviceStatus);
      if (approvedAlready && changed) {
        await tx.orderEvent.create({
          data: {
            orderId: existing.id,
            type: "EDIT",
            message: `Itens alterados depois da aprovação. Total anterior ${previous.totalCents} centavos, novo total ${nextTotals.totalCents} centavos.`,
            userId: user.id,
            userName: user.name,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            userName: user.name,
            action: "EDIT_APPROVED_ORDER",
            entity: "ServiceOrder",
            entityId: existing.id,
            detail: `Total de ${previous.totalCents} para ${nextTotals.totalCents} centavos. Custo de ${previous.costCents} para ${nextTotals.costCents} centavos.`,
          },
        });
      } else if (serviceStatus !== existing.serviceStatus) {
        await tx.orderEvent.create({
          data: {
            orderId: existing.id,
            type: "STATUS",
            message: "Enviado para aprovação",
            userId: user.id,
            userName: user.name,
          },
        });
      }
      return existing.id;
    });

    revalidateShop(orderId);
    return { ok: true, id: orderId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar.";
    if (message.startsWith("NEXT_REDIRECT")) throw error;
    return { ok: false, error: message };
  }
}

async function changeStatus(id: string, to: ServiceStatus, allowed: (role: Role) => boolean, message: string, extra: Record<string, string | number | Date | null> = {}) {
  const user = await requireUser();
  if (!allowed(user.role)) flash(`/os/${id}`, "erro", "Seu perfil não pode fazer esta ação.");
  const order = await prisma.serviceOrder.findUnique({ where: { id } });
  if (!order || !isServiceStatus(order.serviceStatus)) flash("/os", "erro", "OS não encontrada.");
  if (!canTransition(order.serviceStatus, to)) flash(`/os/${id}`, "erro", "Esta mudança de situação não é permitida.");
  await prisma.serviceOrder.update({ where: { id }, data: { serviceStatus: to, ...extra } });
  await track(id, user, to, message);
  revalidateShop(id, order.clientId);
  flash(`/os/${id}`, "ok", message);
}

export async function sendForApproval(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  const order = await prisma.serviceOrder.findUnique({ where: { id }, include: { services: true, parts: true } });
  if (!order) flash("/os", "erro", "OS não encontrada.");
  if (order.services.length + order.parts.length === 0) {
    flash(`/os/${id}`, "erro", "Inclua ao menos um item antes de enviar para aprovação.");
  }
  await changeStatus(id, "AWAITING_APPROVAL", canApprove, "Enviado para aprovação do cliente");
}

export async function approveOrder(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  const channel = String(formData.get("channel") ?? "");
  if (!["WHATSAPP", "PHONE", "IN_PERSON"].includes(channel)) {
    flash(`/os/${id}`, "erro", "Informe como o cliente aprovou.");
  }
  await changeStatus(id, "APPROVED", canApprove, "Aprovação registrada", {
    approvalAt: new Date(),
    approvalChannel: channel,
  });
}

export async function refuseOrder(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  await changeStatus(id, "REFUSED", canApprove, "Orçamento recusado");
}

export async function generateOrder(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  const order = await prisma.serviceOrder.findUnique({ where: { id } });
  const label = order ? documentLabel("OS_GENERATED", order.number) : "OS";
  await changeStatus(id, "OS_GENERATED", canApprove, `${label} gerada`);
}

export async function scheduleOrder(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  const when = String(formData.get("scheduledAt") ?? "");
  const mechanicId = String(formData.get("mechanicId") ?? "");
  const date = parseDateTimeLocal(when);
  if (!date) flash(`/os/${id}`, "erro", "Informe a data da execução.");
  const mechanic = await prisma.user.findFirst({ where: { id: mechanicId, active: true, role: { in: ["OWNER", "PRODUCTION"] } } });
  if (!mechanic) flash(`/os/${id}`, "erro", "Escolha quem vai executar.");
  const order = await prisma.serviceOrder.findUnique({ where: { id } });
  if (!order || !isServiceStatus(order.serviceStatus)) flash("/os", "erro", "OS não encontrada.");
  if (order.serviceStatus === "SCHEDULED") {
    const user = await requireUser();
    if (!canSchedule(user.role)) flash(`/os/${id}`, "erro", "Seu perfil não pode fazer esta ação.");
    await prisma.serviceOrder.update({ where: { id }, data: { scheduledAt: date, mechanicId: mechanic.id } });
    await track(id, user, "RESCHEDULE", `Execução reagendada para ${mechanic.name}`);
    revalidateShop(id, order.clientId);
    flash(`/os/${id}`, "ok", "Execução reagendada.");
  }
  await changeStatus(id, "SCHEDULED", canSchedule, `Execução agendada para ${mechanic.name}`, {
    scheduledAt: date,
    mechanicId: mechanic.id,
  });
}

export async function startOrder(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  await changeStatus(id, "IN_PROGRESS", canOperateProduction, "Execução iniciada");
}

export async function waitForPart(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  await changeStatus(id, "WAITING_PART", canOperateProduction, "Execução pausada: aguardando peça");
}

export async function resumeOrder(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  await changeStatus(id, "IN_PROGRESS", canOperateProduction, "Execução retomada");
}

export async function completeOrder(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  await changeStatus(id, "READY", canOperateProduction, "Execução concluída. OS pronta.", { readyAt: new Date() });
}

export async function deliverOrder(formData: FormData) {
  const id = String(formData.get("orderId") ?? "");
  await changeStatus(id, "DELIVERED", canDeliver, "Veículo entregue", { deliveredAt: new Date() });
}

export async function cancelOrder(formData: FormData) {
  const user = await requireUser();
  if (!canApprove(user.role)) flash("/painel", "erro", "Seu perfil não pode cancelar uma OS.");
  const id = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) flash(`/os/${id}`, "erro", "Informe o motivo do cancelamento.");
  const order = await prisma.serviceOrder.findUnique({ where: { id }, include: { payments: true } });
  if (!order || !isServiceStatus(order.serviceStatus)) flash("/os", "erro", "OS não encontrada.");
  if (!canTransition(order.serviceStatus, "CANCELLED")) flash(`/os/${id}`, "erro", "Esta OS não pode ser cancelada.");
  await prisma.serviceOrder.update({
    where: { id },
    data: { serviceStatus: "CANCELLED", cancelReason: reason, cancelledAt: new Date() },
  });
  const note = order.payments.length
    ? `OS cancelada com pagamento registrado. Motivo: ${reason}`
    : `OS cancelada. Motivo: ${reason}`;
  await track(id, user, "CANCELLED", note);
  revalidateShop(id, order.clientId);
  flash(`/os/${id}`, "ok", "OS cancelada. O histórico foi mantido.");
}
