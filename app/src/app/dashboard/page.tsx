"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/http";

type User = {
  id: string;
  email: string;
  name: string | null;
};

type SessionItem = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const data = await apiFetch<{ user: User | null; sessionId?: string }>("/api/auth/me");
      if (!data.user) {
        router.replace("/");
        return;
      }
      setUser(data.user);
      if (data.sessionId) setCurrentSessionId(data.sessionId);

      const sessionData = await apiFetch<{
        currentSessionId: string;
        sessions: SessionItem[];
      }>("/api/auth/sessions");
      setCurrentSessionId(sessionData.currentSessionId);
      setSessions(sessionData.sessions);
    }
    void loadUser();
  }, [router]);

  async function logout() {
    setBusy(true);
    await apiFetch<{ message: string }>("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  async function revokeOtherDevices() {
    setBusy(true);
    await apiFetch<{ message: string }>("/api/auth/sessions/revoke-others", { method: "POST" });
    const sessionData = await apiFetch<{
      currentSessionId: string;
      sessions: SessionItem[];
    }>("/api/auth/sessions");
    setCurrentSessionId(sessionData.currentSessionId);
    setSessions(sessionData.sessions);
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
      <section className="w-full max-w-lg rounded-3xl border border-[#d2d2d7] bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">欢迎回来</h1>
        <p className="mt-3 text-sm text-[#6e6e73]">
          当前登录用户：{user?.name || "未命名用户"}（{user?.email || "加载中..."}）
        </p>
        <div className="mt-6 space-y-2">
          <button
            onClick={logout}
            disabled={busy}
            className="w-full rounded-xl bg-[#1d1d1f] px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
          >
            退出当前设备
          </button>
          <button
            onClick={revokeOtherDevices}
            disabled={busy}
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-60"
          >
            踢下其他设备
          </button>
        </div>
        <div className="mt-5 rounded-xl border border-[#e5e5ea] bg-[#fafafa] p-3">
          <h2 className="text-sm font-semibold text-[#1d1d1f]">在线设备</h2>
          <ul className="mt-2 space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-lg bg-white p-2 text-xs text-[#3a3a3c]">
                <div className="font-medium">{s.userAgent || "未知设备"}</div>
                <div className="text-[#6e6e73]">
                  {s.id === currentSessionId ? "当前设备" : "其他设备"} · 最近活跃{" "}
                  {new Date(s.lastSeenAt).toLocaleString()}
                </div>
              </li>
            ))}
            {sessions.length === 0 && <li className="text-xs text-[#6e6e73]">暂无会话数据</li>}
          </ul>
        </div>
      </section>
    </main>
  );
}
