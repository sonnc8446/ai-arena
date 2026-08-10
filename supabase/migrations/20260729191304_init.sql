-- ============================================================
-- AI Arena — migration khởi tạo (chỉ DDL, không seed).
-- Nguồn sự thật cho schema khi dùng Supabase CLI:
--   supabase db push   (hoặc supabase migration up)
-- Seed dữ liệu mẫu nằm ở supabase/seed.sql (chạy tự động khi `supabase db reset`).
-- ============================================================

-- Bảng cấu hình các AI tool (engine)
create table if not exists public.ai_tools (
  id uuid primary key default gen_random_uuid(),
  -- Tên hiển thị: "ChatGPT", "Gemini", ...
  name text not null,
  -- provider: khớp với adapter trong code
  -- (openai | anthropic | gemini | xai | deepseek | moonshot | openrouter)
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

-- Index phục vụ truy vấn chính: lọc enabled + sắp theo sort_order.
create index if not exists idx_ai_tools_enabled_sort
  on public.ai_tools (enabled, sort_order);

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

-- Ai cũng đọc được (guest xem danh sách engine đang bật).
drop policy if exists "public read ai_tools" on public.ai_tools;
create policy "public read ai_tools"
  on public.ai_tools for select
  using (true);

-- Chỉ user đã đăng nhập (admin) được thêm/sửa/xoá.
-- LƯU Ý: policy này cho phép MỌI authenticated user ghi. Nếu cần giới hạn
-- theo vai trò admin, bổ sung bảng roles + điều kiện using/with check tương ứng
-- (xem docs/technical-spec.md mục "Bảo mật & RLS").
drop policy if exists "authenticated write ai_tools" on public.ai_tools;
create policy "authenticated write ai_tools"
  on public.ai_tools for all
  to authenticated
  using (true)
  with check (true);
