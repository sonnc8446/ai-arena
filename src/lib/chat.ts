import { callProvider } from "@/lib/providers";
import type { AiTool, ChatResult } from "@/lib/types";

export const MAX_PROMPT_LENGTH = 8000;

export type PromptValidation =
  | { ok: true; prompt: string }
  | { ok: false; error: string };

// Validate & normalize prompt đầu vào (thuần, dễ test).
export function validatePrompt(raw: unknown): PromptValidation {
  const prompt = (raw ?? "").toString().trim();
  if (!prompt) {
    return { ok: false, error: "Prompt trống" };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { ok: false, error: "Prompt quá dài" };
  }
  return { ok: true, prompt };
}

// Gọi một engine và bọc kết quả thành ChatResult (không bao giờ throw).
export async function buildToolResult(
  tool: AiTool,
  prompt: string,
  call: typeof callProvider = callProvider
): Promise<ChatResult> {
  const start = Date.now();
  const base = {
    toolId: tool.id,
    name: tool.name,
    provider: tool.provider,
    model: tool.model,
    accent_color: tool.accent_color,
  };
  try {
    const content = await call(tool.provider, tool.model, prompt);
    return { ...base, ok: true, content, elapsedMs: Date.now() - start };
  } catch (e: any) {
    return {
      ...base,
      ok: false,
      error: e?.message ?? "Lỗi không xác định",
      elapsedMs: Date.now() - start,
    };
  }
}

// Chạy song song tất cả engine.
export function runTools(
  tools: AiTool[],
  prompt: string,
  call: typeof callProvider = callProvider
): Promise<ChatResult[]> {
  return Promise.all(tools.map((tool) => buildToolResult(tool, prompt, call)));
}
