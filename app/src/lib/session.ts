import { createHash, randomUUID } from "crypto";

import { createAccessToken, createRefreshToken, verifyRefreshToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UserInfo = {
  id: number;
  email: string;
  name: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getClientInfo(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? null;
  const xff = request.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || null;
  return { userAgent, ip };
}

export async function createSessionForUser(user: UserInfo, request: Request) {
  const sid = randomUUID();
  const refreshToken = await createRefreshToken({ sub: String(user.id), sid });
  const accessToken = await createAccessToken({
    sub: String(user.id),
    sid,
    email: user.email,
    name: user.name,
  });
  const tokenHash = hashToken(refreshToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { userAgent, ip } = getClientInfo(request);

  await prisma.session.create({
    data: {
      id: sid,
      userId: user.id,
      refreshTokenHash: tokenHash,
      userAgent,
      ip,
      expiresAt,
      lastSeenAt: now,
    },
  });

  return { accessToken, refreshToken, sid };
}

export async function rotateSessionByRefreshToken(refreshToken: string, request: Request) {
  const payload = await verifyRefreshToken(refreshToken);
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) throw new Error("invalid user");

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });
  if (!session || session.userId !== userId) throw new Error("session not found");
  if (session.revokedAt || session.expiresAt <= new Date()) throw new Error("session expired");
  if (session.refreshTokenHash !== hashToken(refreshToken)) throw new Error("token rotated");

  const nextRefreshToken = await createRefreshToken({ sub: String(userId), sid: session.id });
  const nextAccessToken = await createAccessToken({
    sub: String(userId),
    sid: session.id,
    email: session.user.email,
    name: session.user.name,
  });
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { userAgent, ip } = getClientInfo(request);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashToken(nextRefreshToken),
      lastSeenAt: now,
      expiresAt,
      userAgent,
      ip,
    },
  });

  return {
    user: { id: session.user.id, email: session.user.email, name: session.user.name },
    sid: session.id,
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
  };
}

export async function revokeCurrentSession(refreshToken: string) {
  try {
    const payload = await verifyRefreshToken(refreshToken);
    await prisma.session.updateMany({
      where: { id: payload.sid, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    return;
  }
}

export async function isSessionActive(sessionId: string, userId: number) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, revokedAt: true, expiresAt: true },
  });
  if (!session || session.userId !== userId) return false;
  if (session.revokedAt) return false;
  return session.expiresAt > new Date();
}
