"use client";

import type { ChatResult } from "@/lib/types";

export default function AnswerCard({
  result,
  loading,
  name,
  accent,
}: {
  result?: ChatResult;
  loading: boolean;
  name: string;
  accent: string | null;
}) {
  const color = accent || "#6366f1";

  return (
    <div className="flex flex-col rounded-xl border border-border bg-panel overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border"
        style={{ borderTopColor: color, borderTopWidth: 3 }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: color }}
          />
          <span className="font-semibold">{name}</span>
          {result && (
            <span className="text-xs text-gray-500">{result.model}</span>
          )}
        </div>
        {result && (
          <span className="text-xs text-gray-500">
            {(result.elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      <div className="p-4 flex-1 min-h-[120px]">
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
            Đang tạo câu trả lời…
          </div>
        )}

        {!loading && result?.ok && (
          <div className="prose-answer">{result.content}</div>
        )}

        {!loading && result && !result.ok && (
          <div className="text-sm text-red-400 prose-answer">
            ⚠️ {result.error}
          </div>
        )}

        {!loading && !result && (
          <div className="text-sm text-gray-600">Chưa có câu trả lời.</div>
        )}
      </div>
    </div>
  );
}
