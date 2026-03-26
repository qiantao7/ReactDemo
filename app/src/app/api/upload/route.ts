import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()\u4e00-\u9fa5]/g, "_");
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "文件大小需在 1B 到 50MB 之间" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const safeName = sanitizeFileName(file.name || "file.bin");
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext) || "file";
    const filename = `${Date.now()}-${randomUUID()}-${base}${ext}`;
    const fullPath = path.join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(fullPath, Buffer.from(bytes));

    const mimeType = file.type || "application/octet-stream";
    const kind = mimeType.startsWith("image/")
      ? "image"
      : mimeType.startsWith("video/")
        ? "video"
        : "file";

    return NextResponse.json(
      {
        attachment: {
          url: `/uploads/${filename}`,
          fileName: safeName,
          mimeType,
          size: file.size,
          kind,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
