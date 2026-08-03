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

export function withTimeout<T>(p: Promise<T>, ms = 60000): Promise<T> {
  const controller = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout sau ${ms}ms`)), ms)
  );
  return Promise.race([p, controller]);
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
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
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
  prompt: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
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
  prompt: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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

  const task = (async () => {
    const openAiBase = OPENAI_COMPATIBLE_BASE_URLS[provider];
    if (openAiBase) {
      const extra = provider === "openrouter" ? OPENROUTER_HEADERS : {};
      return openAiCompatible(openAiBase, apiKey, model, prompt, extra);
    }

    switch (provider) {
      case "anthropic":
        return anthropic(apiKey, model, prompt);
      case "gemini":
        return gemini(apiKey, model, prompt);
      default:
        throw new Error(`Provider không hỗ trợ: ${provider}`);
    }
  })();

  return withTimeout(task);
}
