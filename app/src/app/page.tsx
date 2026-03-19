"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailHint, setEmailHint] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (mode !== "register") {
      setEmailHint(null);
      return;
    }
    if (!normalizedEmail) {
      setEmailHint(null);
      return;
    }
    const id = setTimeout(async () => {
      try {
        setCheckingEmail(true);
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`);
        const data = (await res.json()) as { available?: boolean; reason?: string };
        if (!res.ok) {
          setEmailHint({ type: "error", text: data.reason || "邮箱格式有误" });
          return;
        }
        setEmailHint(
          data.available ? { type: "ok", text: "邮箱可用" } : { type: "error", text: "该邮箱已注册" }
        );
      } catch {
        setEmailHint({ type: "error", text: "邮箱校验失败" });
      } finally {
        setCheckingEmail(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [mode, normalizedEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { email, password }
        : { email, password, name: name.trim() || undefined };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "请求失败");

      setMessage({
        type: "success",
        text: mode === "login" ? "登录成功，正在跳转..." : "注册成功，正在跳转...",
      });
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 300);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "请求失败" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_0%,#fff_0%,#f5f5f7_55%,#f5f5f7_100%)] flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl border border-[#d2d2d7] bg-white/90 backdrop-blur-sm p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_18px_56px_rgba(0,0,0,0.12)]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 text-[#1d1d1f]">
            <svg viewBox="0 0 384 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
            {mode === "login" ? "使用 Apple ID 登录" : "创建 Apple ID"}
          </h1>
          <p className="mt-2 text-sm text-[#6e6e73]">
            {mode === "login" ? "输入账号信息继续" : "填写信息完成注册"}
          </p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          {mode === "register" && (
            <input
              className="w-full rounded-xl border border-[#d2d2d7] px-4 py-3 text-sm text-[#1d1d1f] outline-none transition-all duration-200 focus:-translate-y-0.5 focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/20"
              placeholder="姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <input
            className="w-full rounded-xl border border-[#d2d2d7] px-4 py-3 text-sm text-[#1d1d1f] outline-none transition-all duration-200 focus:-translate-y-0.5 focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/20"
            placeholder="Apple ID (邮箱)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode === "register" && normalizedEmail && (
            <div
              className={`text-xs px-1 transition-opacity duration-200 ${
                emailHint?.type === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {checkingEmail ? "正在校验邮箱..." : emailHint?.text}
            </div>
          )}

          <input
            className="w-full rounded-xl border border-[#d2d2d7] px-4 py-3 text-sm text-[#1d1d1f] outline-none transition-all duration-200 focus:-translate-y-0.5 focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/20"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {message && (
            <div
              className={`rounded-xl px-3 py-2 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "register" && (checkingEmail || emailHint?.type === "error"))}
            className="w-full rounded-xl bg-[#0071e3] py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0077ED] active:translate-y-0 disabled:opacity-60"
          >
            {loading ? "提交中..." : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <div className="mt-6 border-t border-[#d2d2d7] pt-4 text-center text-sm text-[#6e6e73]">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            type="button"
            className="ml-2 font-medium text-[#0071e3]"
            onClick={() => {
              setMessage(null);
              setMode((m) => (m === "login" ? "register" : "login"));
            }}
          >
            {mode === "login" ? "去注册" : "去登录"}
          </button>
        </div>
      </section>
    </main>
  );
}
