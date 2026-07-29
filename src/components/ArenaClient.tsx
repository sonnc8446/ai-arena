"use client";

import { useState } from "react";
import type { AiTool, ChatResult } from "@/lib/types";
import AnswerCard from "@/components/AnswerCard";

export default function ArenaClient({ tools }: { tools: AiTool[] }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ChatResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = prompt.trim();
    if (!p || loading) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Có lỗi xảy ra");
      } else {
        setResults(data.results as ChatResult[]);
      }
    } catch (err: any) {
      setError(err?.message ?? "Không kết nối được server");
    } finally {
      setLoading(false);
    }
  }

  const resultMap = new Map<string, ChatResult>();
  results?.forEach((r) => resultMap.set(r.toolId, r));

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="rounded-xl border border-border bg-panel p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                handleSubmit(e as any);
              }
            }}
            placeholder="Nhập prompt của bạn… (Cmd/Ctrl + Enter để gửi)"
            rows={3}
            className="w-full resize-y bg-transparent outline-none placeholder:text-gray-600 text-[15px]"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {tools.length} engine đang bật
            </span>
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-indigo-500 transition"
            >
              {loading ? "Đang chạy…" : "Gửi tới tất cả"}
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-400">⚠️ {error}</p>
        )}
      </form>

      {tools.length === 0 ? (
        <div className="rounded-xl border border-border bg-panel p-8 text-center text-gray-400">
          Chưa có AI engine nào được bật. Vào trang{" "}
          <a href="/admin" className="text-accent underline">
            Quản trị
          </a>{" "}
          để thêm.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <AnswerCard
              key={tool.id}
              name={tool.name}
              accent={tool.accent_color}
              loading={loading}
              result={resultMap.get(tool.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
