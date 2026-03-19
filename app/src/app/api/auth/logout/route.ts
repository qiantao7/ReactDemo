import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, shouldUseSecureCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ message: "已退出登录" }, { status: 200 });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
