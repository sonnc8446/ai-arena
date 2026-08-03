import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KEY_ENV,
  OPENAI_COMPATIBLE_BASE_URLS,
  OPENROUTER_HEADERS,
  callProvider,
  getApiKey,
  parseAnthropicContent,
  parseGeminiContent,
  parseOpenAiContent,
  withTimeout,
} from "./providers";
import type { Provider } from "./types";

const ALL_PROVIDERS: Provider[] = [
  "openai",
  "anthropic",
  "gemini",
  "xai",
  "deepseek",
  "moonshot",
  "openrouter",
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  for (const env of Object.values(KEY_ENV)) delete process.env[env];
});

describe("KEY_ENV", () => {
  it("có mapping cho mọi provider", () => {
    for (const p of ALL_PROVIDERS) {
      expect(KEY_ENV[p]).toBeTruthy();
    }
  });
});

describe("getApiKey", () => {
  it("đọc đúng env var theo provider", () => {
    process.env.OPENAI_API_KEY = "sk-openai";
    expect(getApiKey("openai")).toBe("sk-openai");
  });
  it("trả undefined khi chưa set", () => {
    expect(getApiKey("gemini")).toBeUndefined();
  });
});

describe("OPENAI_COMPATIBLE_BASE_URLS", () => {
  it("có base url cho các provider openai-compatible", () => {
    for (const p of ["openai", "xai", "deepseek", "moonshot", "openrouter"] as Provider[]) {
      expect(OPENAI_COMPATIBLE_BASE_URLS[p]).toMatch(/^https:\/\//);
    }
  });
  it("KHÔNG có base url cho anthropic/gemini", () => {
    expect(OPENAI_COMPATIBLE_BASE_URLS.anthropic).toBeUndefined();
    expect(OPENAI_COMPATIBLE_BASE_URLS.gemini).toBeUndefined();
  });
});

describe("parseOpenAiContent", () => {
  it("lấy content và trim", () => {
    expect(
      parseOpenAiContent({ choices: [{ message: { content: "  hi  " } }] })
    ).toBe("hi");
  });
  it("throw khi rỗng", () => {
    expect(() => parseOpenAiContent({ choices: [] })).toThrow(/Không có nội dung/);
  });
});

describe("parseAnthropicContent", () => {
  it("lấy text", () => {
    expect(parseAnthropicContent({ content: [{ text: "claude" }] })).toBe("claude");
  });
  it("throw khi rỗng", () => {
    expect(() => parseAnthropicContent({})).toThrow(/Không có nội dung/);
  });
});

describe("parseGeminiContent", () => {
  it("lấy text lồng nhau", () => {
    expect(
      parseGeminiContent({ candidates: [{ content: { parts: [{ text: "gem" }] } }] })
    ).toBe("gem");
  });
  it("throw khi rỗng", () => {
    expect(() => parseGeminiContent({ candidates: [] })).toThrow(/Không có nội dung/);
  });
});

describe("withTimeout", () => {
  it("resolve khi kịp thời", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });
  it("reject khi quá hạn", async () => {
    vi.useFakeTimers();
    const never = new Promise<number>(() => {});
    const p = withTimeout(never, 5000);
    const assertion = expect(p).rejects.toThrow(/Timeout/);
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
  });
});

describe("callProvider", () => {
  it("throw khi thiếu API key, kèm tên env var", async () => {
    await expect(callProvider("openai", "gpt-4o-mini", "hi")).rejects.toThrow(
      /OPENAI_API_KEY/
    );
  });

  it("gọi endpoint openai-compatible đúng URL + Bearer, trả content", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-ds";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "xin chào" } }] }),
    })) as any;
    vi.stubGlobal("fetch", fetchMock);

    const out = await callProvider("deepseek", "deepseek-chat", "hi");
    expect(out).toBe("xin chào");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.deepseek.com/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-ds");
  });

  it("openrouter đính kèm header HTTP-Referer/X-Title", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    })) as any;
    vi.stubGlobal("fetch", fetchMock);

    await callProvider("openrouter", "some/model:free", "hi");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["HTTP-Referer"]).toBe(OPENROUTER_HEADERS["HTTP-Referer"]);
    expect(init.headers["X-Title"]).toBe(OPENROUTER_HEADERS["X-Title"]);
  });

  it("ném lỗi HTTP kèm status khi response không ok", async () => {
    process.env.OPENAI_API_KEY = "sk-openai";
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    })) as any;
    vi.stubGlobal("fetch", fetchMock);

    await expect(callProvider("openai", "gpt-4o-mini", "hi")).rejects.toThrow(
      /HTTP 401/
    );
  });

  it("anthropic dùng header x-api-key và endpoint messages", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ text: "claude" }] }),
    })) as any;
    vi.stubGlobal("fetch", fetchMock);

    const out = await callProvider("anthropic", "claude-3-5-sonnet-latest", "hi");
    expect(out).toBe("claude");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe("sk-ant");
  });

  it("gemini truyền key qua query string", async () => {
    process.env.GEMINI_API_KEY = "gkey";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "gem" }] } }],
      }),
    })) as any;
    vi.stubGlobal("fetch", fetchMock);

    const out = await callProvider("gemini", "gemini-1.5-flash", "hi");
    expect(out).toBe("gem");
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("gemini-1.5-flash:generateContent?key=gkey");
  });
});
