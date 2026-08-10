-- ============================================================
-- AI Arena — Canonical schema reference (DDL)
-- ============================================================
-- File này là BẢN THAM CHIẾU schema đầy đủ (dễ đọc trong 1 file).
--
-- Nguồn sự thật để áp dụng lên DB:
--   - Dùng Supabase CLI: các file trong supabase/migrations/ (khuyến nghị)
--   - Seed dữ liệu mẫu: supabase/seed.sql
--   - Hoặc dán nội dung file này vào Dashboard > SQL Editor cho lần khởi tạo nhanh
--
-- Khi thay đổi schema: tạo migration mới bằng `supabase migration new <name>`,
-- rồi cập nhật lại file tham chiếu này cho khớp. KHÔNG đặt seed ở đây.
-- ============================================================

-- Bảng cấu hình các AI tool (engine)
create table if not exists public.ai_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- provider khớp adapter code: openai|anthropic|gemini|xai|deepseek|moonshot|openrouter
  provider text not null,
  model text not null,
  enabled boolean not null default true,
  sort_order int not null default 0,
  accent_color text default '#6366f1',
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_tools_enabled_sort
  on public.ai_tools (enabled, sort_order);

-- Trigger tự cập nhật updated_at
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

-- Row Level Security
alter table public.ai_tools enable row level security;

drop policy if exists "public read ai_tools" on public.ai_tools;
create policy "public read ai_tools"
  on public.ai_tools for select
  using (true);

-- Chỉ admin (profiles.role = 'admin') được ghi ai_tools.
drop policy if exists "authenticated write ai_tools" on public.ai_tools;
drop policy if exists "admin write ai_tools" on public.ai_tools;
create policy "admin write ai_tools"
  on public.ai_tools for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Phân quyền: bảng profiles + helper is_admin + trigger tạo profile
-- ============================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer',   -- 'admin' | 'viewer'
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, role)
  values (new.id, 'viewer')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
