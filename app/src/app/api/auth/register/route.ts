import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, shouldUseSecureCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSessionForUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;

    if (!email || !username || !password) {
      return NextResponse.json({ error: "用户名、邮箱和密码不能为空" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });
    if (existing) {
      return NextResponse.json({ error: "该用户名或邮箱已注册" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, username, passwordHash, name },
      select: { id: true, email: true, username: true, name: true },
    });

    const { accessToken, refreshToken } = await createSessionForUser(
      { id: user.id, email: user.email, name: user.name },
      request
    );
    const response = NextResponse.json({ message: "注册成功", user }, { status: 201 });
    response.cookies.set(ACCESS_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: shouldUseSecureCookie(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: shouldUseSecureCookie(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
