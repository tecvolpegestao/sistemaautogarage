"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeTotals } from "@/lib/domain";
import { parseMoney } from "@/lib/format";
import { canRegisterPayment } from "@/lib/permissions";

export async function registerPayment(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("orderId") ?? "");
  if (!canRegisterPayment(user.role)) {
    redirect(`/os/${id}?erro=` + encodeURIComponent("Seu perfil não pode registrar pagamento."));
  }
  const order = await prisma.serviceOrder.findUnique({
    where: { id },
    include: { services: true, parts: true, payments: true },
  });
  if (!order) redirect("/os?erro=" + encodeURIComponent("OS não encontrada."));
  if (order.serviceStatus === "CANCELLED" || order.serviceStatus === "REFUSED") {
    redirect(`/os/${id}?erro=` + encodeURIComponent("Não há cobrança nesta OS."));
  }
  const amount = parseMoney(String(formData.get("amount") ?? ""));
  const method = String(formData.get("method") ?? "");
  const installments = Number(formData.get("installments") ?? 1);
  const notes = String(formData.get("notes") ?? "").trim();
  const paidAtRaw = String(formData.get("paidAt") ?? "");
  const paidAt = paidAtRaw ? new Date(`${paidAtRaw}T12:00:00-03:00`) : new Date();
  if (amount == null || amount <= 0) {
    redirect(`/os/${id}?erro=` + encodeURIComponent("Informe o valor recebido."));
  }
  if (!["PIX", "CASH", "CARD"].includes(method)) {
    redirect(`/os/${id}?erro=` + encodeURIComponent("Informe a forma de pagamento."));
  }
  if (method === "CARD" && (!Number.isInteger(installments) || installments < 1 || installments > 12)) {
    redirect(`/os/${id}?erro=` + encodeURIComponent("Parcelas do cartão devem ficar entre 1 e 12."));
  }
  if (Number.isNaN(paidAt.getTime())) {
    redirect(`/os/${id}?erro=` + encodeURIComponent("Data do pagamento inválida."));
  }
  const current = computeTotals({
    services: order.services,
    parts: order.parts,
    discountCents: order.discountCents,
    paidCents: order.payments.reduce((sum, payment) => sum + payment.amountCents, 0),
  });
  if (amount > current.balanceCents) {
    redirect(`/os/${id}?erro=` + encodeURIComponent("O valor passa do saldo desta OS."));
  }
  const paymentStatus = computeTotals({
    ...current,
    services: order.services,
    parts: order.parts,
    discountCents: order.discountCents,
    paidCents: current.paidCents + amount,
  }).paymentStatus;

  await prisma.payment.create({
    data: {
      orderId: id,
      amountCents: amount,
      paidAt,
      method,
      installments: method === "CARD" ? installments : 1,
      notes,
      createdById: user.id,
    },
  });
  await prisma.serviceOrder.update({ where: { id }, data: { paymentStatus } });
  await prisma.orderEvent.create({
    data: {
      orderId: id,
      type: "PAYMENT",
      message: `Pagamento registrado (${method === "CARD" ? `${installments}x no cartão` : method})`,
      userId: user.id,
      userName: user.name,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "PAYMENT",
      entity: "ServiceOrder",
      entityId: id,
      detail: `Recebeu ${amount} centavos via ${method}`,
    },
  });
  revalidatePath("/painel");
  revalidatePath("/os");
  revalidatePath(`/os/${id}`);
  revalidatePath("/recebimentos");
  revalidatePath("/a-receber");
  revalidatePath("/clientes");
  redirect(`/os/${id}?ok=` + encodeURIComponent("Pagamento registrado."));
}
