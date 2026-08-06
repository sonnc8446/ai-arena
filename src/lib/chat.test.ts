import { describe, expect, it, vi } from "vitest";
import { MAX_PROMPT_LENGTH, buildToolResult, runTools, validatePrompt } from "./chat";
import type { AiTool } from "./types";

const tool = (over: Partial<AiTool> = {}): AiTool => ({
  id: "id-1",
  name: "ChatGPT",
  provider: "openai",
  model: "gpt-4o-mini",
  enabled: true,
  sort_order: 1,
  accent_color: "#10a37f",
  description: "",
  created_at: "",
  updated_at: "",
  ...over,
});

describe("validatePrompt", () => {
  it("chấp nhận và trim prompt hợp lệ", () => {
    expect(validatePrompt("  hello  ")).toEqual({ ok: true, prompt: "hello" });
  });
  it("từ chối prompt rỗng", () => {
    expect(validatePrompt("   ")).toEqual({ ok: false, error: "Prompt trống" });
  });
  it("từ chối null/undefined", () => {
    expect(validatePrompt(undefined).ok).toBe(false);
    expect(validatePrompt(null).ok).toBe(false);
  });
  it("từ chối prompt quá dài", () => {
    const long = "a".repeat(MAX_PROMPT_LENGTH + 1);
    expect(validatePrompt(long)).toEqual({ ok: false, error: "Prompt quá dài" });
  });
  it("chấp nhận đúng độ dài giới hạn", () => {
    const edge = "a".repeat(MAX_PROMPT_LENGTH);
    expect(validatePrompt(edge).ok).toBe(true);
  });
  it("ép kiểu số về string", () => {
    expect(validatePrompt(123)).toEqual({ ok: true, prompt: "123" });
  });
});

describe("buildToolResult", () => {
  it("ok=true khi call thành công", async () => {
    const call = vi.fn(async () => "câu trả lời");
    const r = await buildToolResult(tool(), "hi", call);
    expect(r.ok).toBe(true);
    expect(r.content).toBe("câu trả lời");
    expect(r.toolId).toBe("id-1");
    expect(r.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(call).toHaveBeenCalledWith("openai", "gpt-4o-mini", "hi");
  });

  it("ok=false và giữ message lỗi khi call throw", async () => {
    const call = vi.fn(async () => {
      throw new Error("boom");
    });
    const r = await buildToolResult(tool(), "hi", call);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("boom");
    expect(r.content).toBeUndefined();
  });

  it("có message mặc định khi lỗi không có message", async () => {
    const call = vi.fn(async () => {
      throw {};
    });
    const r = await buildToolResult(tool(), "hi", call);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Lỗi không xác định");
  });
});

describe("runTools", () => {
  it("chạy song song và một engine lỗi không ảnh hưởng engine khác", async () => {
    const tools = [
      tool({ id: "a", provider: "openai" }),
      tool({ id: "b", provider: "gemini", model: "gemini-1.5-flash" }),
    ];
    const call = vi.fn(async (provider: string) => {
      if (provider === "gemini") throw new Error("gemini down");
      return "ok-openai";
    });

    const results = await runTools(tools, "hi", call as any);
    expect(results).toHaveLength(2);
    const byId = Object.fromEntries(results.map((r) => [r.toolId, r]));
    expect(byId.a.ok).toBe(true);
    expect(byId.a.content).toBe("ok-openai");
    expect(byId.b.ok).toBe(false);
    expect(byId.b.error).toBe("gemini down");
  });

  it("trả mảng rỗng khi không có tool", async () => {
    const call = vi.fn();
    await expect(runTools([], "hi", call as any)).resolves.toEqual([]);
    expect(call).not.toHaveBeenCalled();
  });
});
