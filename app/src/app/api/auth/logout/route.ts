import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getCookieValue,
  shouldUseSecureCookie,
} from "@/lib/auth";
import { revokeCurrentSession } from "@/lib/session";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const refreshToken = getCookieValue(cookieHeader, REFRESH_COOKIE_NAME);
  if (refreshToken) await revokeCurrentSession(refreshToken);
  const response = NextResponse.json({ message: "已退出登录" }, { status: 200 });
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
