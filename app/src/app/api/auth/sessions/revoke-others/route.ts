import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, getCookieValue, verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSessionActive } from "@/lib/session";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const accessToken = getCookieValue(cookieHeader, ACCESS_COOKIE_NAME);
  if (!accessToken) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const payload = await verifyAccessToken(accessToken);
    const userId = Number(payload.sub);
    const active = await isSessionActive(payload.sid, userId);
    if (!active) return NextResponse.json({ error: "会话已失效" }, { status: 401 });
    await prisma.session.updateMany({
      where: {
        userId,
        id: { not: payload.sid },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ message: "已踢下其他设备" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
}
