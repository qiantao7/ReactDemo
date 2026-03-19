import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getCookieValue,
  shouldUseSecureCookie,
} from "@/lib/auth";
import { rotateSessionByRefreshToken } from "@/lib/session";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const refreshToken = getCookieValue(cookieHeader, REFRESH_COOKIE_NAME);
  if (!refreshToken) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const rotated = await rotateSessionByRefreshToken(refreshToken, request);
    const response = NextResponse.json(
      {
        message: "会话已刷新",
        user: {
          id: rotated.user.id,
          email: rotated.user.email,
          name: rotated.user.name,
        },
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
    const response = NextResponse.json({ error: "刷新失败" }, { status: 401 });
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

