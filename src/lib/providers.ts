import type { Provider } from "@/lib/types";

const SYSTEM_PROMPT =
  "You are a helpful assistant. Answer clearly and concisely.";

// Map provider -> env var chứa API key
const KEY_ENV: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  xai: "XAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  moonshot: "MOONSHOT_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export function getApiKey(provider: Provider): string | undefined {
  return process.env[KEY_ENV[provider]];
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms = 60000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Timeout sau ${ms}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---- Chuẩn OpenAI-compatible (dùng cho openai, xai, deepseek, moonshot, openrouter) ----
async function openAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  extraHeaders: Record<string, string> = {},
  signal?: AbortSignal
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
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Không có nội dung trả về");
  return content.trim();
}

// ---- Anthropic (Claude) ----
async function anthropic(
  apiKey: string,
  model: string,
  prompt: string,
  signal?: AbortSignal
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
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.content?.[0]?.text;
  if (!content) throw new Error("Không có nội dung trả về");
  return content.trim();
}

// ---- Google Gemini ----
async function gemini(
  apiKey: string,
  model: string,
  prompt: string,
  signal?: AbortSignal
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Không có nội dung trả về");
  return content.trim();
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

  const task = async (signal: AbortSignal) => {
    switch (provider) {
      case "openai":
        return openAiCompatible("https://api.openai.com/v1", apiKey, model, prompt, {}, signal);
      case "xai":
        return openAiCompatible("https://api.x.ai/v1", apiKey, model, prompt, {}, signal);
      case "deepseek":
        return openAiCompatible("https://api.deepseek.com/v1", apiKey, model, prompt, {}, signal);
      case "moonshot":
        return openAiCompatible("https://api.moonshot.cn/v1", apiKey, model, prompt, {}, signal);
      case "openrouter":
        return openAiCompatible("https://openrouter.ai/api/v1", apiKey, model, prompt, {
          "HTTP-Referer": "https://ai-arena.vercel.app",
          "X-Title": "AI Arena",
        }, signal);
      case "anthropic":
        return anthropic(apiKey, model, prompt, signal);
      case "gemini":
        return gemini(apiKey, model, prompt, signal);
      default:
        throw new Error(`Provider không hỗ trợ: ${provider}`);
    }
  };

  return withTimeout(task);
}
