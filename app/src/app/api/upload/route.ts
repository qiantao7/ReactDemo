import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function sanitizeOriginalName(name: string) {
  return name.replace(/[^\w.\-()\u4e00-\u9fa5]/g, "_");
}

function detectExt(fileName: string, mimeType: string) {
  const extFromName = path.extname(fileName).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(extFromName)) return extFromName;
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "video/mp4") return ".mp4";
  if (mimeType === "video/webm") return ".webm";
  return ".bin";
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

    const safeName = sanitizeOriginalName(file.name || "file.bin");
    const mimeType = file.type || "application/octet-stream";
    const ext = detectExt(safeName, mimeType);
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const fullPath = path.join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(fullPath, Buffer.from(bytes));

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
