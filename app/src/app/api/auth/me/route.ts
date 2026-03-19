import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const tokenPair = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!tokenPair) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const token = decodeURIComponent(tokenPair.split("=")[1] ?? "");
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const payload = await verifyToken(token);
    return NextResponse.json(
      {
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name ?? null,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

