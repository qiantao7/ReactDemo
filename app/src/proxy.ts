import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  verifyAccessToken,
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!accessToken && !refreshToken) {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  if (!accessToken && refreshToken) {
    return NextResponse.next();
  }

  try {
    await verifyAccessToken(accessToken as string);
    return NextResponse.next();
  } catch {
    if (refreshToken) return NextResponse.next();
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
