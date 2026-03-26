"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#1d4ed8_0%,#0f172a_35%,#020617_75%)] px-4 py-8 text-white">
      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-6 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Ctrl+S 社</h1>
              <p className="mt-1 text-sm text-slate-200">
                {loading
                  ? "正在加载..."
                  : `欢迎 ${user?.name || user?.username || user?.email || "开发者"}，写下你的灵感`}
              </p>
            </div>
            <button
              onClick={logout}
              disabled={loading}
              className="rounded-xl border border-white/40 bg-black/40 px-4 py-2 text-sm hover:bg-black/60 disabled:opacity-60"
            >
              退出登录
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
          <form
            onSubmit={publishPost}
            className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl"
          >
            <h2 className="text-lg font-semibold">发布新文章</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题：比如《从 0 到 1 的 Next.js 全栈实践》"
              className="mt-4 w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="支持 Markdown：# 标题、**加粗**、*斜体*、`代码`、[链接](https://...)"
              className="mt-3 h-56 w-full resize-none rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
            <div className="mt-3 flex items-center justify-between">
              <label className="cursor-pointer rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs hover:bg-white/15">
                上传附件（图/视频/文件）
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void uploadFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => setPreview((prev) => !prev)}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
              >
                {preview ? "隐藏预览" : "显示预览"}
              </button>
            </div>

            {attachments.length > 0 && (
              <ul className="mt-3 space-y-2 rounded-xl border border-white/15 bg-black/20 p-3 text-xs text-slate-200">
                {attachments.map((item, index) => (
                  <li key={`${item.url}-${index}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{item.fileName}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((target) => target.url !== item.url))
                      }
                      className="rounded bg-rose-500/30 px-2 py-1 text-[11px] hover:bg-rose-500/50"
                    >
                      移除
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {message && (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                  message.type === "success"
                    ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
                    : "border-rose-300/40 bg-rose-400/15 text-rose-100"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={publishing}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
            >
              {publishing ? "发布中..." : "立即发布"}
            </button>
          </form>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
            <h2 className="text-lg font-semibold">Markdown 预览</h2>
            <div
              className="prose prose-invert mt-4 max-w-none rounded-2xl border border-white/15 bg-black/20 p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: preview ? renderedPreview : "<p>预览已关闭</p>" }}
            />
          </div>
        </div>

        <section className="mt-6 space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-3xl border border-white/20 bg-gradient-to-br from-black/40 to-slate-900/40 p-5 backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-semibold">{post.title}</h3>
                <span className="text-xs text-slate-300">{new Date(post.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                作者：{post.author.name || post.author.username || `用户${post.author.id}`}
              </p>

              <div
                className="prose prose-invert mt-4 max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
              />

              {post.attachments.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {post.attachments.map((file) => (
                    <div key={file.url} className="overflow-hidden rounded-xl border border-white/15 bg-black/30 p-2">
                      {file.kind === "image" ? (
                        <Image
                          src={file.url}
                          alt={file.fileName}
                          width={800}
                          height={500}
                          className="h-44 w-full rounded object-cover"
                        />
                      ) : file.kind === "video" ? (
                        <video src={file.url} controls className="h-44 w-full rounded object-cover" />
                      ) : (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded bg-white/10 px-3 py-2 text-xs hover:bg-white/20"
                        >
                          下载附件：{file.fileName}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    void toggleLike(post.id);
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    post.liked
                      ? "border-cyan-300 bg-cyan-300/20 text-cyan-100"
                      : "border-white/25 bg-white/10 hover:bg-white/20"
                  }`}
                >
                  👍 点赞 {post.likeCount}
                </button>
                <button
                  onClick={() => {
                    void toggleFavorite(post.id);
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    post.favorited
                      ? "border-fuchsia-300 bg-fuchsia-300/20 text-fuchsia-100"
                      : "border-white/25 bg-white/10 hover:bg-white/20"
                  }`}
                >
                  ⭐ 收藏 {post.favoriteCount}
                </button>
                <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs">
                  💬 评论 {post.commentCount}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-white/15 bg-black/25 px-3 py-2">
                    <div className="text-xs text-slate-300">
                      {comment.author.name || comment.author.username || `用户${comment.author.id}`} ·{" "}
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                    <p className="mt-1 text-sm">{comment.content}</p>
                  </div>
                ))}
                {post.comments.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/20 px-3 py-2 text-xs text-slate-300">
                    暂无评论，来抢沙发
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={commentMap[post.id] || ""}
                  onChange={(e) => setCommentMap((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  placeholder="写下你的评论..."
                  className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                />
                <button
                  onClick={() => {
                    void submitComment(post.id);
                  }}
                  className="rounded-xl bg-white/20 px-4 py-2 text-sm hover:bg-white/30"
                >
                  发送
                </button>
              </div>
            </article>
          ))}
          {posts.length === 0 && !loading && (
            <div className="rounded-3xl border border-dashed border-white/30 bg-white/5 px-4 py-10 text-center text-slate-200">
              还没有文章，发布第一篇吧
            </div>
          )}
          {loading && (
            <div className="rounded-3xl border border-white/20 bg-white/10 px-4 py-10 text-center text-slate-200">
              正在加载文章流...
            </div>
          )}
        </section>
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              void loadPosts();
            }}
            className="rounded-xl border border-white/30 bg-white/10 px-5 py-2 text-sm hover:bg-white/20"
          >
            刷新文章列表
          </button>
        </div>
        <div className="mt-4 text-center text-xs text-slate-300">
          你已进入登录后的首页流：发文、评论、点赞、收藏、附件上传都可用
        </div>
      </section>
    </main>
  );
}
