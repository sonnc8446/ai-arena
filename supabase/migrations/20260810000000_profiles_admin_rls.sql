-- ============================================================
-- AI Arena — Siết RLS: chỉ admin được ghi ai_tools.
-- Thêm bảng profiles (user_id, role) liên kết auth.users.
-- ============================================================

-- Bảng profiles: mỗi user Supabase Auth có 1 profile với role.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer',   -- 'admin' | 'viewer'
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- User đọc được profile của chính mình.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

-- Không mở insert/update/delete qua API (chỉ set qua service role / SQL admin).
-- (Không tạo policy write → mặc định bị chặn với anon/authenticated.)

-- Helper: kiểm tra user hiện tại có phải admin không.
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

-- Tự tạo profile khi có user mới (mặc định 'viewer').
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

-- ============================================================
-- Thay policy write của ai_tools: chỉ admin.
-- Public read giữ nguyên. Bỏ policy "authenticated write" cũ (mọi user login).
-- ============================================================
drop policy if exists "authenticated write ai_tools" on public.ai_tools;

drop policy if exists "admin write ai_tools" on public.ai_tools;
create policy "admin write ai_tools"
  on public.ai_tools for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- Backfill: tạo profile cho các user hiện có (mặc định viewer).
-- Nâng user đầu tiên (theo created_at) lên admin để không mất quyền quản trị.
-- Sau đó bạn có thể tự set thêm admin bằng SQL:
--   update public.profiles set role='admin' where user_id='<uuid>';
-- ============================================================
insert into public.profiles (user_id, role)
select id, 'viewer' from auth.users
on conflict (user_id) do nothing;

update public.profiles
set role = 'admin'
where user_id = (select id from auth.users order by created_at asc limit 1)
  and not exists (select 1 from public.profiles where role = 'admin');
