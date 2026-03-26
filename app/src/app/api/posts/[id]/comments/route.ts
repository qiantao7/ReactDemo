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

  try {
    const body = await request.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) return NextResponse.json({ error: "评论不能为空" }, { status: 400 });

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return NextResponse.json({ error: "文章不存在" }, { status: 404 });

    const comment = await prisma.comment.create({
      data: { postId, authorId: user.id, content },
      include: { author: { select: { id: true, username: true, name: true } } },
    });

    return NextResponse.json(
      {
        message: "评论成功",
        comment: {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          author: comment.author,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "评论失败" }, { status: 500 });
  }
}
