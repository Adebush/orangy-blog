"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogIn, ShieldCheck, User } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "登录失败");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="username" className="text-soft mb-1.5 block text-sm font-medium">
          用户名
        </label>
        <div className="glass-soft flex items-center rounded-2xl px-3.5">
          <User className="text-muted h-4 w-4 shrink-0" />
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full bg-transparent px-2.5 py-2.5 text-sm outline-none"
            placeholder="admin"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="text-soft mb-1.5 block text-sm font-medium">
          密码
        </label>
        <div className="glass-soft flex items-center rounded-2xl px-3.5">
          <KeyRound className="text-muted h-4 w-4 shrink-0" />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full bg-transparent px-2.5 py-2.5 text-sm outline-none"
            placeholder="••••••••"
            autoFocus
          />
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-500/12 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl hover:shadow-brand-500/40 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {loading ? "登录中…" : "登录后台"}
      </button>
    </form>
  );
}

export function LoginHeader() {
  return (
    <div className="mb-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-xl font-bold tracking-tight">后台管理</h1>
      <p className="text-muted mt-1 text-sm">登录后即可撰写与管理你的博客</p>
    </div>
  );
}
