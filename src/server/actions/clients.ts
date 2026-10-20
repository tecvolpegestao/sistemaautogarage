"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageClients } from "@/lib/permissions";
import { normalizePhone, normalizePlate } from "@/lib/format";

function deny() {
  redirect("/painel?erro=" + encodeURIComponent("Seu perfil não pode alterar cadastros."));
}

export async function createClient(_prev: { error?: string } | null, formData: FormData) {
  const user = await requireUser();
  if (!canManageClients(user.role)) deny();

  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();
  const type = String(formData.get("type") ?? "INDIVIDUAL");
  const notes = String(formData.get("notes") ?? "").trim();

  if (name.length < 2) return { error: "Informe o nome do cliente." };
  if (phone.length < 10 || phone.length > 13) return { error: "Informe um telefone com DDD." };
  if (type !== "INDIVIDUAL" && type !== "PARTNER") return { error: "Tipo de cliente inválido." };

  const duplicate = await prisma.client.findFirst({ where: { phone } });
  if (duplicate) {
    return { error: `Este telefone já está no cliente ${duplicate.name}.` };
  }

  const client = await prisma.client.create({
    data: { name, phone, email, document, type, notes },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "CREATE_CLIENT",
      entity: "Client",
      entityId: client.id,
      detail: `Cadastrou ${name}`,
    },
  });
  revalidatePath("/clientes");
  redirect(`/clientes/${client.id}?ok=` + encodeURIComponent("Cliente cadastrado."));
}

export async function updateClient(formData: FormData) {
  const user = await requireUser();
  if (!canManageClients(user.role)) deny();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();
  const type = String(formData.get("type") ?? "INDIVIDUAL");
  const notes = String(formData.get("notes") ?? "").trim();
  if (name.length < 2 || phone.length < 10) {
    redirect(`/clientes/${id}?erro=` + encodeURIComponent("Nome e telefone são obrigatórios."));
  }
  const duplicate = await prisma.client.findFirst({ where: { phone, NOT: { id } } });
  if (duplicate) {
    redirect(`/clientes/${id}?erro=` + encodeURIComponent(`Este telefone já está no cliente ${duplicate.name}.`));
  }
  await prisma.client.update({
    where: { id },
    data: { name, phone, email, document, type: type === "PARTNER" ? "PARTNER" : "INDIVIDUAL", notes },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "UPDATE_CLIENT",
      entity: "Client",
      entityId: id,
      detail: `Atualizou ${name}`,
    },
  });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}?ok=` + encodeURIComponent("Dados do cliente atualizados."));
}

export async function createVehicle(formData: FormData) {
  const user = await requireUser();
  if (!canManageClients(user.role)) deny();
  const clientId = String(formData.get("clientId") ?? "");
  const plate = normalizePlate(String(formData.get("plate") ?? ""));
  const brand = String(formData.get("brand") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const year = yearRaw ? Number(yearRaw) : null;
  if (plate.length !== 7) {
    redirect(`/clientes/${clientId}?erro=` + encodeURIComponent("A placa precisa ter 7 caracteres."));
  }
  if (!brand || !model) {
    redirect(`/clientes/${clientId}?erro=` + encodeURIComponent("Informe marca e modelo."));
  }
  if (year != null && (!Number.isInteger(year) || year < 1950 || year > 2035)) {
    redirect(`/clientes/${clientId}?erro=` + encodeURIComponent("Ano do veículo inválido."));
  }
  const duplicate = await prisma.vehicle.findUnique({ where: { plate } });
  if (duplicate) {
    redirect(`/veiculos/${duplicate.id}?erro=` + encodeURIComponent("Esta placa já está cadastrada."));
  }
  const vehicle = await prisma.vehicle.create({
    data: { clientId, plate, brand, model, year, color },
  });
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/veiculos/${vehicle.id}?ok=` + encodeURIComponent("Veículo cadastrado."));
}

export async function updateVehicle(formData: FormData) {
  const user = await requireUser();
  if (!canManageClients(user.role)) deny();
  const id = String(formData.get("id") ?? "");
  const plate = normalizePlate(String(formData.get("plate") ?? ""));
  const brand = String(formData.get("brand") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const year = yearRaw ? Number(yearRaw) : null;
  if (plate.length !== 7 || !brand || !model) {
    redirect(`/veiculos/${id}?erro=` + encodeURIComponent("Placa, marca e modelo são obrigatórios."));
  }
  const duplicate = await prisma.vehicle.findFirst({ where: { plate, NOT: { id } } });
  if (duplicate) {
    redirect(`/veiculos/${id}?erro=` + encodeURIComponent("Esta placa já está em outro veículo."));
  }
  await prisma.vehicle.update({ where: { id }, data: { plate, brand, model, year, color } });
  revalidatePath(`/veiculos/${id}`);
  redirect(`/veiculos/${id}?ok=` + encodeURIComponent("Veículo atualizado."));
}
