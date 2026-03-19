import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getCookieValue,
  shouldUseSecureCookie,
  verifyAccessToken,
} from "@/lib/auth";
import { isSessionActive, rotateSessionByRefreshToken } from "@/lib/session";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const accessToken = getCookieValue(cookieHeader, ACCESS_COOKIE_NAME);
  const refreshToken = getCookieValue(cookieHeader, REFRESH_COOKIE_NAME);

  try {
    const payload = await verifyAccessToken(accessToken);
    const userId = Number(payload.sub);
    const active = await isSessionActive(payload.sid, userId);
    if (!active) throw new Error("session revoked");
    return NextResponse.json(
      {
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name ?? null,
        },
        sessionId: payload.sid,
      },
      { status: 200 }
    );
  } catch {
    if (!refreshToken) return NextResponse.json({ user: null }, { status: 200 });
    try {
      const rotated = await rotateSessionByRefreshToken(refreshToken, request);
      const response = NextResponse.json(
        {
          user: {
            id: String(rotated.user.id),
            email: rotated.user.email,
            name: rotated.user.name ?? null,
          },
          sessionId: rotated.sid,
        },
        { status: 200 }
      );
      response.cookies.set(ACCESS_COOKIE_NAME, rotated.accessToken, {
        httpOnly: true,
        secure: shouldUseSecureCookie(),
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 15,
      });
      response.cookies.set(REFRESH_COOKIE_NAME, rotated.refreshToken, {
        httpOnly: true,
        secure: shouldUseSecureCookie(),
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return response;
    } catch {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.set(ACCESS_COOKIE_NAME, "", {
        httpOnly: true,
        secure: shouldUseSecureCookie(),
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      response.cookies.set(REFRESH_COOKIE_NAME, "", {
        httpOnly: true,
        secure: shouldUseSecureCookie(),
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }
  }
}
