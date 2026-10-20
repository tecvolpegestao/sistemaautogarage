import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readUserId } from "@/lib/jwt";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let valid = false;
  if (token) {
    try {
      valid = Boolean(await readUserId(token));
    } catch {
      valid = false;
    }
  }

  const path = request.nextUrl.pathname;
  if (path.startsWith("/login")) {
    if (valid) return NextResponse.redirect(new URL("/painel", request.url));
    const response = NextResponse.next();
    if (token && !valid) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (!valid) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)"],
};
