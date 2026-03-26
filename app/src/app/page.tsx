"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { apiFetch } from "@/lib/http";

type Mode = "login" | "register";

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [account, setAccount] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailHint, setEmailHint] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username]);

  useEffect(() => {
    async function checkLoggedIn() {
      const data = await apiFetch<{ user: { id: string } | null }>("/api/auth/me");
      if (data.user) {
        router.replace("/dashboard");
      }
    }
    void checkLoggedIn();
  }, [router]);

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
        const data = await apiFetch<{ available: boolean }>(
          `/api/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`
        );
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
        ? { account, password }
        : { email, username, password, name: name.trim() || undefined };

    try {
      await apiFetch<{ message?: string; error?: string }>(url, {
        method: "POST",
        body: JSON.stringify(payload),
      });

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
    <Box
      sx={{
        minHeight: "100vh",
        py: 8,
        background: `radial-gradient(1200px 700px at 50% 0%, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${theme.palette.background.default} 58%, ${theme.palette.background.default} 100%)`,
      }}
    >
      <Container maxWidth="sm">
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={3}>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight={700}>
                  Ctrl+S 社
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {mode === "login" ? "输入账号信息继续" : "创建账号并加入社区"}
                </Typography>
              </Box>

              <Tabs
                value={mode}
                onChange={(_, v: Mode) => {
                  setMessage(null);
                  setMode(v);
                }}
                centered
              >
                <Tab value="login" label="登录" />
                <Tab value="register" label="注册" />
              </Tabs>

              <Box component="form" onSubmit={onSubmit}>
                <Stack spacing={2}>
                  {mode === "register" && (
                    <>
                      <TextField
                        label="用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        fullWidth
                      />
                      <TextField
                        label="昵称"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                      />
                    </>
                  )}

                  {mode === "login" ? (
                    <TextField
                      label="用户名或邮箱"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      required
                      fullWidth
                    />
                  ) : (
                    <TextField
                      label="邮箱"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      fullWidth
                    />
                  )}

                  {mode === "register" && normalizedEmail && normalizedUsername && (
                    <Chip
                      size="small"
                      color={emailHint?.type === "error" ? "error" : "success"}
                      label={checkingEmail ? "正在校验邮箱..." : emailHint?.text || "等待校验"}
                      sx={{ width: "fit-content" }}
                    />
                  )}

                  <TextField
                    label="密码"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                  />

                  {message && (
                    <Alert severity={message.type === "error" ? "error" : "success"}>{message.text}</Alert>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading || (mode === "register" && (checkingEmail || emailHint?.type === "error"))}
                    startIcon={loading ? <CircularProgress color="inherit" size={16} /> : undefined}
                  >
                    {loading ? "提交中..." : mode === "login" ? "登录" : "注册"}
                  </Button>
                </Stack>
              </Box>

              <Typography variant="body2" color="text.secondary" textAlign="center">
                {mode === "login" ? "还没有账号？切换到注册即可开始。" : "已经有账号？切换到登录继续。"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
