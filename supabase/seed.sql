-- ============================================================
-- AI Arena — Seed dữ liệu mẫu (6 engine mặc định).
-- Chạy tự động khi `supabase db reset` (cấu hình [db.seed] trong config.toml),
-- hoặc chạy thủ công trong Dashboard > SQL Editor.
-- Idempotent: dùng NOT EXISTS theo tên để không tạo trùng.
-- ============================================================

insert into public.ai_tools (name, provider, model, enabled, sort_order, accent_color, description)
select v.name, v.provider, v.model, v.enabled, v.sort_order, v.accent_color, v.description
from (values
  ('ChatGPT',  'openai',    'gpt-4o-mini',              true, 1, '#10a37f', 'OpenAI GPT-4o mini'),
  ('Claude',   'anthropic', 'claude-3-5-sonnet-latest', true, 2, '#d97757', 'Anthropic Claude 3.5 Sonnet'),
  ('Gemini',   'gemini',    'gemini-1.5-flash',         true, 3, '#4285f4', 'Google Gemini 1.5 Flash'),
  ('Grok',     'xai',       'grok-2-latest',            true, 4, '#000000', 'xAI Grok 2'),
  ('DeepSeek', 'deepseek',  'deepseek-chat',            true, 5, '#4d6bfe', 'DeepSeek V3 Chat'),
  ('Kimi',     'moonshot',  'moonshot-v1-8k',           true, 6, '#111111', 'Moonshot Kimi')
) as v(name, provider, model, enabled, sort_order, accent_color, description)
where not exists (
  select 1 from public.ai_tools t where t.name = v.name
);
