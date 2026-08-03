import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runTools, validatePrompt } from "@/lib/chat";
import type { AiTool } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
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

  const results = await runTools(tools, validation.prompt);
  return NextResponse.json({ results });
}
