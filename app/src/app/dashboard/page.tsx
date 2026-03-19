"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  name: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { user: User | null };
      setUser(data.user);
    }
    void loadUser();
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
      <section className="w-full max-w-lg rounded-3xl border border-[#d2d2d7] bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">欢迎回来</h1>
        <p className="mt-3 text-sm text-[#6e6e73]">
          当前登录用户：{user?.name || "未命名用户"}（{user?.email || "加载中..."}）
        </p>
        <button
          onClick={logout}
          className="mt-6 rounded-xl bg-[#1d1d1f] px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          退出登录
        </button>
      </section>
    </main>
  );
}

