"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isRole } from "@/lib/domain";
import { canManageSettings } from "@/lib/permissions";

function ownerOnly() {
  redirect("/painel?erro=" + encodeURIComponent("Só o dono altera as configurações."));
}

export async function updateSettings(formData: FormData) {
  const user = await requireUser();
  if (!canManageSettings(user.role)) ownerOnly();
  const margin = Number(formData.get("marginPercent") ?? 40);
  if (!Number.isInteger(margin) || margin < 0 || margin > 300) {
    redirect("/configuracoes?erro=" + encodeURIComponent("A margem precisa ser um número entre 0 e 300."));
  }
  await prisma.setting.upsert({
    where: { id: "default" },
    update: {
      legalName: String(formData.get("legalName") ?? "").trim() || "Autogarage",
      tradeName: String(formData.get("tradeName") ?? "").trim() || "Autogarage",
      cnpj: String(formData.get("cnpj") ?? "").trim(),
      pixKey: String(formData.get("pixKey") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      marginPercent: margin,
    },
    create: {
      id: "default",
      legalName: String(formData.get("legalName") ?? "").trim() || "Autogarage",
      tradeName: String(formData.get("tradeName") ?? "").trim() || "Autogarage",
      cnpj: String(formData.get("cnpj") ?? "").trim(),
      pixKey: String(formData.get("pixKey") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      marginPercent: margin,
    },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/imprimir");
  redirect("/configuracoes?ok=" + encodeURIComponent("Configurações salvas."));
}

export async function createUser(formData: FormData) {
  const user = await requireUser();
  if (!canManageSettings(user.role)) ownerOnly();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");
  if (name.length < 2) redirect("/configuracoes?erro=" + encodeURIComponent("Informe o nome."));
  if (!email.includes("@")) redirect("/configuracoes?erro=" + encodeURIComponent("E-mail inválido."));
  if (!isRole(role)) redirect("/configuracoes?erro=" + encodeURIComponent("Perfil inválido."));
  if (password.length < 6) redirect("/configuracoes?erro=" + encodeURIComponent("A senha precisa ter ao menos 6 caracteres."));
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/configuracoes?erro=" + encodeURIComponent("Já existe um acesso com este e-mail."));
  await prisma.user.create({
    data: { name, email, role, passwordHash: await bcrypt.hash(password, 10) },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "CREATE_USER",
      entity: "User",
      detail: `Criou acesso de ${name} (${role})`,
    },
  });
  revalidatePath("/configuracoes");
  redirect("/configuracoes?ok=" + encodeURIComponent("Acesso criado."));
}
