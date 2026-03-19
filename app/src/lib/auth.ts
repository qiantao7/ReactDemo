import { jwtVerify, SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev_secret_change_me");
export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";

type BasePayload = {
  sub: string;
  sid: string;
};

export type AccessPayload = BasePayload & {
  email: string;
  name?: string | null;
  typ: "access";
};

export type RefreshPayload = BasePayload & {
  typ: "refresh";
};

export async function createAccessToken(payload: Omit<AccessPayload, "typ">) {
  return new SignJWT({ ...payload, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function createRefreshToken(payload: Omit<RefreshPayload, "typ">) {
  return new SignJWT({ ...payload, typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  if (payload.typ !== "access") throw new Error("invalid token type");
  return payload as unknown as AccessPayload;
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  if (payload.typ !== "refresh") throw new Error("invalid token type");
  return payload as unknown as RefreshPayload;
}

export function getCookieValue(cookieHeader: string, cookieName: string) {
  const pair = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${cookieName}=`));
  return decodeURIComponent(pair?.split("=")[1] ?? "");
}

export function shouldUseSecureCookie() {
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;
  if (process.env.AUTH_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}
