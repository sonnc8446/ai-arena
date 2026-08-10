import type { Provider } from "@/lib/types";

export const SYSTEM_PROMPT =
  "You are a helpful assistant. Answer clearly and concisely.";

// Map provider -> env var chứa API key
export const KEY_ENV: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  xai: "XAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  moonshot: "MOONSHOT_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

// Base URL cho các provider dùng chuẩn OpenAI-compatible.
export const OPENAI_COMPATIBLE_BASE_URLS: Partial<Record<Provider, string>> = {
  openai: "https://api.openai.com/v1",
  xai: "https://api.x.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
  moonshot: "https://api.moonshot.cn/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

export const OPENROUTER_HEADERS: Record<string, string> = {
  "HTTP-Referer": "https://ai-arena.vercel.app",
  "X-Title": "AI Arena",
};

export function getApiKey(provider: Provider): string | undefined {
  return process.env[KEY_ENV[provider]];
}

// Giới hạn độ dài phản hồi để kiểm soát chi phí + độ trễ.
export const MAX_TOKENS = 1024;
export const DEFAULT_TIMEOUT_MS = 60000;

// Thực thi 1 promise (đã có sẵn signal bên trong) với timeout.
// Trả về signal để fetch hủy thật khi hết giờ (không rò rỉ kết nối như Promise.race).
export function makeTimeoutSignal(ms = DEFAULT_TIMEOUT_MS): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`Timeout sau ${ms}ms`)),
    ms
  );
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
}

// Helper cũ dựa trên Promise.race. LƯU Ý: không hủy fetch thật (chỉ reject).
// callProvider hiện dùng makeTimeoutSignal (AbortController) để hủy đúng cách.
// Giữ lại cho tương thích/tiện dụng ở các tác vụ không phải fetch.
export function withTimeout<T>(p: Promise<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  const guard = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout sau ${ms}ms`)), ms)
  );
  return Promise.race([p, guard]);
}

// ---- Pure parsers (tách để test không cần network) ----

export function parseOpenAiContent(data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Không có nội dung trả về");
  return content.trim();
}

export function parseAnthropicContent(data: any): string {
  const content = data?.content?.[0]?.text;
  if (!content) throw new Error("Không có nội dung trả về");
  return content.trim();
}

export function parseGeminiContent(data: any): string {
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Không có nội dung trả về");
  return content.trim();
}

// ---- Chuẩn OpenAI-compatible (dùng cho openai, xai, deepseek, moonshot, openrouter) ----
async function openAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  signal: AbortSignal,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: MAX_TOKENS,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return parseOpenAiContent(await res.json());
}

// ---- Anthropic (Claude) ----
async function anthropic(
  apiKey: string,
  model: string,
  prompt: string,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return parseAnthropicContent(await res.json());
}

// ---- Google Gemini ----
async function gemini(
  apiKey: string,
  model: string,
  prompt: string,
  signal: AbortSignal
): Promise<string> {
  // Mã hoá model để tránh path injection vào URL.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: MAX_TOKENS },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return parseGeminiContent(await res.json());
}

export async function callProvider(
  provider: Provider,
  model: string,
  prompt: string
): Promise<string> {
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(
      `Thiếu API key. Hãy đặt biến môi trường ${KEY_ENV[provider]}.`
    );
  }

  const { signal, cleanup } = makeTimeoutSignal();
  try {
    const openAiBase = OPENAI_COMPATIBLE_BASE_URLS[provider];
    if (openAiBase) {
      const extra = provider === "openrouter" ? OPENROUTER_HEADERS : {};
      return await openAiCompatible(openAiBase, apiKey, model, prompt, signal, extra);
    }

    switch (provider) {
      case "anthropic":
        return await anthropic(apiKey, model, prompt, signal);
      case "gemini":
        return await gemini(apiKey, model, prompt, signal);
      default:
        throw new Error(`Provider không hỗ trợ: ${provider}`);
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
      const reason = signal.reason;
      throw reason instanceof Error ? reason : new Error("Đã huỷ yêu cầu");
    }
    throw e;
  } finally {
    cleanup();
  }
}
