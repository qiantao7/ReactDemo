import { getCookieValue, ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const accessToken = getCookieValue(cookieHeader, ACCESS_COOKIE_NAME);
  if (!accessToken) return null;

  try {
    const payload = await verifyAccessToken(accessToken);
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId)) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, name: true },
    });
    return user;
  } catch {
    return null;
  }
}
