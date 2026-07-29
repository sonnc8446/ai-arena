export type Provider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "xai"
  | "deepseek"
  | "moonshot"
  | "openrouter";

export interface AiTool {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  enabled: boolean;
  sort_order: number;
  accent_color: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatResult {
  toolId: string;
  name: string;
  provider: Provider;
  model: string;
  accent_color: string | null;
  ok: boolean;
  content?: string;
  error?: string;
  elapsedMs: number;
}
