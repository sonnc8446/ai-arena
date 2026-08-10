import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runTools, validatePrompt } from "@/lib/chat";
import type { AiTool } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Giới hạn số engine fan-out mỗi request để tránh 1 request bung quá nhiều
// lời gọi provider (tốn tiền + chạm maxDuration). Admin có thể bật nhiều hơn
// nhưng mỗi lần chấm chỉ dùng tối đa số này (ưu tiên sort_order).
const MAX_ENGINES_PER_REQUEST = 8;

// ===== Rate limit đơn giản theo IP (in-memory, sliding window) =====
// Lưu ý: chỉ hiệu quả trong 1 instance. Với nhiều instance/serverless nên
// dùng Upstash Redis. Đủ để chặn lạm dụng cơ bản và bảo vệ chi phí API.
const RATE_LIMIT_MAX = 10; // số request
const RATE_LIMIT_WINDOW_MS = 60_000; // mỗi 60s
const hits = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  // Dọn map định kỳ (tránh phình bộ nhớ).
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) hits.delete(k);
    }
  }
  return arr.length > RATE_LIMIT_MAX;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Bạn gửi quá nhanh. Vui lòng thử lại sau ít phút." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const validation = validatePrompt(body?.prompt);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_tools")
    // Chỉ chọn cột cần dùng (tránh trả dư dữ liệu).
    .select("id, name, provider, model, accent_color")
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .limit(MAX_ENGINES_PER_REQUEST);

  if (error) {
    // Không rò rỉ chi tiết lỗi nội bộ ra client; log ở server.
    console.error("[/api/chat] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Không đọc được cấu hình engine. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  const tools = (data ?? []) as AiTool[];
  if (tools.length === 0) {
    return NextResponse.json(
      { error: "Chưa có AI engine nào được bật. Vào /admin để thêm." },
      { status: 400 }
    );
  }

  const results = await runTools(tools, validation.prompt);
  return NextResponse.json({ results });
}
