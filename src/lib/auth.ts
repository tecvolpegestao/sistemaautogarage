import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isRole, type Role } from "@/lib/domain";
import { SESSION_COOKIE, readUserId, signUserId } from "@/lib/jwt";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const userId = await readUserId(token);
    if (!userId) return null;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.active || !isRole(user.role)) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSession(userId: string) {
  const token = await signUserId(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
