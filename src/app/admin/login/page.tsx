"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-xl border border-border bg-panel p-6"
      >
        <h1 className="text-xl font-bold mb-1">Đăng nhập quản trị</h1>
        <p className="text-sm text-gray-400 mb-5">AI Arena Admin</p>

        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-3 rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
        />

        <label className="block text-sm mb-1">Mật khẩu</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-4 rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
        />

        {error && <p className="text-sm text-red-400 mb-3">⚠️ {error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40 hover:bg-indigo-500 transition"
        >
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>

        <a
          href="/"
          className="mt-4 block text-center text-sm text-gray-500 hover:text-white"
        >
          ← Về trang chủ
        </a>
      </form>
    </main>
  );
}
