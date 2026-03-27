import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

function safeFileName(input: string) {
  const name = path.basename(input);
  return name.replace(/[^a-zA-Z0-9._-]/g, "");
}

function detectMimeByExt(name: string) {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;
  const fileName = safeFileName(name);
  if (!fileName) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const fullPath = path.join(uploadsDir, fileName);

  try {
    const fileBuffer = await readFile(fullPath);
    const mimeType = detectMimeByExt(fileName);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
