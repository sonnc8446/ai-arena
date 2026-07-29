-- ============================================================
-- AI Arena - Supabase schema
-- Chạy file này trong Supabase Dashboard > SQL Editor
-- ============================================================

-- Bảng cấu hình các AI tool (engine)
create table if not exists public.ai_tools (
  id uuid primary key default gen_random_uuid(),
  -- Tên hiển thị: "ChatGPT", "Gemini", ...
  name text not null,
  -- provider: khớp với adapter trong code (openai | anthropic | gemini | xai | deepseek | moonshot | openrouter)
  provider text not null,
  -- model id gửi tới API, ví dụ "gpt-4o-mini", "gemini-1.5-flash"
  model text not null,
  -- bật/tắt engine này trên trang guest
  enabled boolean not null default true,
  -- thứ tự hiển thị
  sort_order int not null default 0,
  -- màu badge (tuỳ chọn, hex)
  accent_color text default '#6366f1',
  -- ghi chú/mô tả ngắn
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tự cập nhật updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ai_tools_updated_at on public.ai_tools;
create trigger trg_ai_tools_updated_at
  before update on public.ai_tools
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.ai_tools enable row level security;

-- Ai cũng đọc được (guest xem danh sách engine đang bật)
drop policy if exists "public read ai_tools" on public.ai_tools;
create policy "public read ai_tools"
  on public.ai_tools for select
  using (true);

-- Chỉ user đã đăng nhập (admin) được thêm/sửa/xoá
drop policy if exists "authenticated write ai_tools" on public.ai_tools;
create policy "authenticated write ai_tools"
  on public.ai_tools for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Dữ liệu mẫu (seed)
-- ============================================================
insert into public.ai_tools (name, provider, model, enabled, sort_order, accent_color, description) values
  ('ChatGPT', 'openai',     'gpt-4o-mini',            true, 1, '#10a37f', 'OpenAI GPT-4o mini'),
  ('Claude',  'anthropic',  'claude-3-5-sonnet-latest', true, 2, '#d97757', 'Anthropic Claude 3.5 Sonnet'),
  ('Gemini',  'gemini',     'gemini-1.5-flash',       true, 3, '#4285f4', 'Google Gemini 1.5 Flash'),
  ('Grok',    'xai',        'grok-2-latest',          true, 4, '#000000', 'xAI Grok 2'),
  ('DeepSeek','deepseek',   'deepseek-chat',          true, 5, '#4d6bfe', 'DeepSeek V3 Chat'),
  ('Kimi',    'moonshot',   'moonshot-v1-8k',         true, 6, '#111111', 'Moonshot Kimi')
on conflict do nothing;
