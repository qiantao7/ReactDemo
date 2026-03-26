import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await context.params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return NextResponse.json({ error: "文章不存在" }, { status: 404 });

  const existing = await prisma.postFavorite.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
  });

  if (existing) {
    await prisma.postFavorite.delete({ where: { postId_userId: { postId, userId: user.id } } });
  } else {
    await prisma.postFavorite.create({ data: { postId, userId: user.id } });
  }

  const count = await prisma.postFavorite.count({ where: { postId } });
  return NextResponse.json({ favorited: !existing, favoriteCount: count }, { status: 200 });
}
