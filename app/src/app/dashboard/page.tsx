"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

import { useThemeSettings } from "@/components/app-theme-provider";
import { apiFetch } from "@/lib/http";
import { renderMarkdown } from "@/lib/markdown";

type User = {
  id: string;
  email: string;
  username?: string | null;
  name: string | null;
};

type Attachment = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  kind: string;
};

type PostComment = {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    username: string | null;
    name: string | null;
  };
};

type PostItem = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  author: {
    id: number;
    username: string | null;
    name: string | null;
  };
  liked: boolean;
  favorited: boolean;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  comments: PostComment[];
  attachments: Attachment[];
};

export default function DashboardPage() {
  const router = useRouter();
  const theme = useTheme();
  const { mode, toggleMode, primaryColor, setPrimaryColor } = useThemeSettings();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [commentMap, setCommentMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preview, setPreview] = useState(true);

  const renderedPreview = useMemo(() => renderMarkdown(content), [content]);

  async function loadPosts() {
    const data = await apiFetch<{ posts: PostItem[] }>("/api/posts");
    setPosts(data.posts);
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        setLoading(true);
        const me = await apiFetch<{ user: User | null }>("/api/auth/me");
        if (!me.user) {
          router.replace("/");
          return;
        }
        setUser(me.user);
        await loadPosts();
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }
    void bootstrap();
  }, [router]);

  async function logout() {
    setLoading(true);
    await apiFetch<{ message: string }>("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setMessage(null);
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const result = await apiFetch<{ attachment: Attachment }>("/api/upload", {
        method: "POST",
        body: form,
      });
      next.push(result.attachment);
    }
    setAttachments((prev) => [...prev, ...next]);
  }

  async function publishPost(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setMessage({ type: "error", text: "标题和内容不能为空" });
      return;
    }
    try {
      setPublishing(true);
      const result = await apiFetch<{ post: PostItem }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({ title, content, attachments }),
      });
      setPosts((prev) => [result.post, ...prev]);
      setTitle("");
      setContent("");
      setAttachments([]);
      setMessage({ type: "success", text: "文章发布成功" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "发布失败" });
    } finally {
      setPublishing(false);
    }
  }

  async function toggleLike(postId: number) {
    const result = await apiFetch<{ liked: boolean; likeCount: number }>(`/api/posts/${postId}/like`, {
      method: "POST",
    });
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId ? { ...item, liked: result.liked, likeCount: result.likeCount } : item
      )
    );
  }

  async function toggleFavorite(postId: number) {
    const result = await apiFetch<{ favorited: boolean; favoriteCount: number }>(
      `/api/posts/${postId}/favorite`,
      {
        method: "POST",
      }
    );
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? { ...item, favorited: result.favorited, favoriteCount: result.favoriteCount }
          : item
      )
    );
  }

  async function submitComment(postId: number) {
    const text = (commentMap[postId] || "").trim();
    if (!text) return;
    const result = await apiFetch<{ comment: PostComment }>(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content: text }),
    });
    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? {
              ...item,
              comments: [...item.comments, result.comment],
              commentCount: item.commentCount + 1,
            }
          : item
      )
    );
    setCommentMap((prev) => ({ ...prev, [postId]: "" }));
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: 8,
        background: `radial-gradient(1200px 760px at 100% -20%, ${alpha(theme.palette.primary.main, 0.16)} 0%, ${theme.palette.background.default} 58%, ${theme.palette.background.default} 100%)`,
      }}
    >
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: "blur(14px)" }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
            Ctrl+S 社
          </Typography>
          <Tooltip title="刷新文章">
            <IconButton onClick={() => void loadPosts()} color="primary">
              <RefreshRoundedIcon />
            </IconButton>
          </Tooltip>
          <Button
            startIcon={<LogoutRoundedIcon />}
            onClick={logout}
            disabled={loading}
            variant="outlined"
            color="inherit"
          >
            退出登录
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    欢迎 {user?.name || user?.username || user?.email || "开发者"}
                  </Typography>
                  <Typography color="text.secondary" mt={0.5}>
                    轻量、清爽、可定制主题色的创作社区
                  </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                  <TextField
                    label="主题色"
                    type="color"
                    size="small"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    sx={{ minWidth: 120 }}
                  />
                  <FormControlLabel
                    control={<Switch checked={mode === "dark"} onChange={toggleMode} />}
                    label={mode === "dark" ? "深色" : "浅色"}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="stretch">
            <Card sx={{ flex: 1 }}>
              <CardContent component="form" onSubmit={publishPost}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                    发布新文章
                  </Typography>
                  <TextField
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    label="文章标题"
                    fullWidth
                  />
                  <TextField
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    label="Markdown 内容"
                    multiline
                    minRows={10}
                    fullWidth
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                    <Button component="label" variant="outlined">
                      上传附件（图片/视频/文件）
                      <input
                        hidden
                        type="file"
                        multiple
                        onChange={(e) => {
                          void uploadFiles(e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                    </Button>
                    <Button variant="text" onClick={() => setPreview((prev) => !prev)}>
                      {preview ? "隐藏预览" : "显示预览"}
                    </Button>
                  </Stack>

                  {attachments.length > 0 && (
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      {attachments.map((item, index) => (
                        <Chip
                          key={`${item.url}-${index}`}
                          label={item.fileName}
                          onDelete={() =>
                            setAttachments((prev) => prev.filter((target) => target.url !== item.url))
                          }
                        />
                      ))}
                    </Stack>
                  )}

                  {message && <Alert severity={message.type === "error" ? "error" : "success"}>{message.text}</Alert>}

                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={publishing ? <CircularProgress color="inherit" size={16} /> : <PublishRoundedIcon />}
                    disabled={publishing}
                  >
                    {publishing ? "发布中..." : "立即发布"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Markdown 预览
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.background.default, 0.45) }}>
                  <div
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: preview ? renderedPreview : "<p>预览已关闭</p>" }}
                  />
                </Paper>
              </CardContent>
            </Card>
          </Stack>

          <Stack spacing={2}>
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {post.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          作者：{post.author.name || post.author.username || `用户${post.author.id}`} ·{" "}
                          {new Date(post.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>

                    <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />

                    {post.attachments.length > 0 && (
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                        {post.attachments.map((file) => (
                          <Paper key={file.url} variant="outlined" sx={{ p: 1.2, width: { xs: "100%", sm: 300 } }}>
                            {file.kind === "image" ? (
                              <Image
                                src={file.url}
                                alt={file.fileName}
                                width={800}
                                height={500}
                                unoptimized
                                className="h-44 w-full rounded object-cover"
                              />
                            ) : file.kind === "video" ? (
                              <video src={file.url} controls className="h-44 w-full rounded object-cover" />
                            ) : (
                              <Button href={file.url} target="_blank" rel="noreferrer" fullWidth variant="outlined">
                                下载附件：{file.fileName}
                              </Button>
                            )}
                          </Paper>
                        ))}
                      </Stack>
                    )}

                    <Stack direction="row" spacing={1.2} flexWrap="wrap">
                      <Button
                        variant={post.liked ? "contained" : "outlined"}
                        startIcon={<ThumbUpRoundedIcon />}
                        onClick={() => void toggleLike(post.id)}
                      >
                        点赞 {post.likeCount}
                      </Button>
                      <Button
                        variant={post.favorited ? "contained" : "outlined"}
                        color={post.favorited ? "secondary" : "primary"}
                        startIcon={<FavoriteRoundedIcon />}
                        onClick={() => void toggleFavorite(post.id)}
                      >
                        收藏 {post.favoriteCount}
                      </Button>
                      <Chip label={`评论 ${post.commentCount}`} />
                    </Stack>

                    <Divider />

                    <Stack spacing={1.2}>
                      {post.comments.map((comment) => (
                        <Paper key={comment.id} variant="outlined" sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {comment.author.name || comment.author.username || `用户${comment.author.id}`} ·{" "}
                            {new Date(comment.createdAt).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" mt={0.5}>
                            {comment.content}
                          </Typography>
                        </Paper>
                      ))}
                      {post.comments.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          暂无评论，来抢沙发
                        </Typography>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      <TextField
                        value={commentMap[post.id] || ""}
                        onChange={(e) => setCommentMap((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        label="写下你的评论"
                        size="small"
                        fullWidth
                      />
                      <Button variant="contained" onClick={() => void submitComment(post.id)} startIcon={<SendRoundedIcon />}>
                        发送
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}

            {posts.length === 0 && !loading && (
              <Paper variant="outlined" sx={{ py: 6, textAlign: "center" }}>
                <Typography color="text.secondary">还没有文章，发布第一篇吧</Typography>
              </Paper>
            )}
            {loading && (
              <Paper variant="outlined" sx={{ py: 6, textAlign: "center" }}>
                <CircularProgress size={28} />
              </Paper>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
