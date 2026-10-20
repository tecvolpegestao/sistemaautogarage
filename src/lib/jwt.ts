import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ag_session";

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function signUserId(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(key());
}

export async function readUserId(token: string) {
  const { payload } = await jwtVerify(token, key());
  return typeof payload.sub === "string" ? payload.sub : null;
}
