import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider } from "@/lib/providers";
import type { AiTool, ChatResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let prompt = "";
  try {
    const body = await req.json();
    prompt = (body?.prompt ?? "").toString().trim();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt trống" }, { status: 400 });
  }
  if (prompt.length > 8000) {
    return NextResponse.json({ error: "Prompt quá dài" }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_tools")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: `Lỗi đọc DB: ${error.message}` },
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

  const results: ChatResult[] = await Promise.all(
    tools.map(async (tool): Promise<ChatResult> => {
      const start = Date.now();
      try {
        const content = await callProvider(tool.provider, tool.model, prompt);
        return {
          toolId: tool.id,
          name: tool.name,
          provider: tool.provider,
          model: tool.model,
          accent_color: tool.accent_color,
          ok: true,
          content,
          elapsedMs: Date.now() - start,
        };
      } catch (e: any) {
        return {
          toolId: tool.id,
          name: tool.name,
          provider: tool.provider,
          model: tool.model,
          accent_color: tool.accent_color,
          ok: false,
          error: e?.message ?? "Lỗi không xác định",
          elapsedMs: Date.now() - start,
        };
      }
    })
  );

  return NextResponse.json({ results });
}
