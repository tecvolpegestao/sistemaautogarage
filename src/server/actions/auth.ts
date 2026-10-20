"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { clearSession, setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Informe e-mail e senha." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos." };
  }

  await setSession(user.id);
  redirect("/painel");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
