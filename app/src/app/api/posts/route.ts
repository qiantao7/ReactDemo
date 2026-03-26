import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

function toKind(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, username: true, name: true } } },
      },
      likes: { select: { userId: true } },
      favorites: { select: { userId: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
    take: 50,
  });

  return NextResponse.json({
    posts: posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      author: post.author,
      liked: post.likes.some((item) => item.userId === user.id),
      favorited: post.favorites.some((item) => item.userId === user.id),
      likeCount: post.likes.length,
      favoriteCount: post.favorites.length,
      commentCount: post.comments.length,
      comments: post.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: comment.author,
      })),
      attachments: post.attachments,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const attachmentsRaw: unknown[] = Array.isArray(body?.attachments) ? body.attachments : [];

    if (!title || !content) {
      return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
    }

    const attachments = attachmentsRaw
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => {
        const url = typeof item.url === "string" ? item.url : "";
        const fileName = typeof item.fileName === "string" ? item.fileName : "附件";
        const mimeType = typeof item.mimeType === "string" ? item.mimeType : "application/octet-stream";
        const size = typeof item.size === "number" && Number.isFinite(item.size) ? Math.max(0, Math.floor(item.size)) : 0;
        return {
          id: randomUUID(),
          url,
          fileName,
          mimeType,
          size,
          kind: toKind(mimeType),
        };
      })
      .filter((item) => item.url.startsWith("/uploads/"));

    const created = await prisma.post.create({
      data: {
        authorId: user.id,
        title,
        content,
        attachments: {
          create: attachments,
        },
      },
      include: {
        author: { select: { id: true, username: true, name: true } },
        attachments: true,
      },
    });

    return NextResponse.json(
      {
        message: "发布成功",
        post: {
          id: created.id,
          title: created.title,
          content: created.content,
          createdAt: created.createdAt,
          author: created.author,
          liked: false,
          favorited: false,
          likeCount: 0,
          favoriteCount: 0,
          commentCount: 0,
          comments: [],
          attachments: created.attachments,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}
