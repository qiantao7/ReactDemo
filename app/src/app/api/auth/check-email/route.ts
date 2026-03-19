import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json({ available: false, reason: "邮箱不能为空" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  return NextResponse.json({ available: !existing }, { status: 200 });
}

