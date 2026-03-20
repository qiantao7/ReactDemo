import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, shouldUseSecureCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSessionForUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountRaw =
      typeof body?.account === "string"
        ? body.account
        : typeof body?.email === "string"
          ? body.email
          : "";
    const account = accountRaw.trim().toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!account || !password) {
      return NextResponse.json({ error: "用户名/邮箱和密码不能为空" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: account }, { username: account }],
      },
    });
    if (!user) {
      return NextResponse.json({ error: "用户名/邮箱或密码错误" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "用户名/邮箱或密码错误" }, { status: 401 });
    }

    const { accessToken, refreshToken } = await createSessionForUser(
      { id: user.id, email: user.email, name: user.name },
      request
    );
    const response = NextResponse.json(
      {
        message: "登录成功",
        user: { id: user.id, email: user.email, username: user.username, name: user.name },
      },
      { status: 200 }
    );
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
