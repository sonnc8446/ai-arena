# AI Arena — AI Agent Onboarding Guide

> Tài liệu dành cho **AI Agent / lập trình viên** sẽ nâng cấp dự án. Đọc file này trước khi sửa code.
> Đọc kèm: [requirements.md](./requirements.md), [technical-spec.md](./technical-spec.md).

## 0. Đọc gì trước (thứ tự)

1. `AGENTS.md` (gốc repo) — ghi chú nhanh về stack & file chính.
2. [requirements.md](./requirements.md) — phạm vi & yêu cầu.
3. [technical-spec.md](./technical-spec.md) — kiến trúc, data model, API.
4. File này — quy ước & cách mở rộng an toàn.

## 1. Nguyên tắc kiến trúc (giữ nguyên khi sửa)

- **Tách lớp:** API route → `lib/chat.ts` (validate + orchestration) → `lib/providers.ts` (adapter). Đừng gọi provider trực tiếp từ route.
- **Không throw ra ngoài orchestration:** mỗi engine lỗi phải bọc thành `ChatResult { ok:false, error }`. Giữ `buildToolResult` không throw.
- **Fan-out song song** bằng `Promise.all` — đừng chuyển thành tuần tự trừ khi có lý do.
- **Parser tách riêng, thuần** (không network) để unit test được.
- **Env chỉ đọc ở server** cho API key; sanitize bằng `env.ts`.
- **RLS luôn bật** trên bảng public.

## 2. Cách thêm một AI Provider mới

Ví dụ thêm provider `mistral`:

1. **`src/lib/types.ts`** — thêm vào union `Provider`:
   ```ts
   export type Provider = "openai" | ... | "openrouter" | "mistral";
   ```
2. **`src/lib/providers.ts`:**
   - Thêm vào `KEY_ENV`: `mistral: "MISTRAL_API_KEY"`.
   - Nếu **OpenAI-compatible:** thêm base URL vào `OPENAI_COMPATIBLE_BASE_URLS` → xong (dùng chung `openAiCompatible`).
   - Nếu **API riêng:** viết adapter `async function mistral(...)` + parser `parseMistralContent`, rồi thêm `case "mistral"` trong `callProvider`.
3. **`.env.example`** — thêm `MISTRAL_API_KEY=`.
4. **DB:** thêm dòng vào `supabase/seed.sql` (nếu muốn có sẵn) hoặc admin thêm qua `/admin`.
5. **Test:** thêm test cho parser mới trong `src/lib/providers.test.ts`.

> Không cần đụng UI: `ArenaClient`/`AnswerCard` render theo dữ liệu `ai_tools`.

## 3. Cách thay đổi schema Supabase (đúng chuẩn)

```bash
supabase migration new <ten_thay_doi>        # tạo file migration mới
# viết DDL vào file vừa tạo (chỉ DDL, KHÔNG seed)
supabase db push                              # áp lên DB
```
- Cập nhật lại `supabase/schema.sql` (bản tham chiếu) cho khớp.
- Seed mẫu → chỉ ở `supabase/seed.sql` (idempotent, dùng `where not exists`).
- **Không** nhét seed vào migration (tránh re-seed khi chạy lại).

## 4. Hướng nâng cấp gợi ý (roadmap & cách làm)

### 4.1 Lưu lịch sử prompt/kết quả
- **DB:** tạo migration bảng `chat_runs`:
  ```sql
  create table public.chat_runs (
    id uuid primary key default gen_random_uuid(),
    prompt text not null,
    results jsonb not null,          -- mảng ChatResult
    created_at timestamptz not null default now()
  );
  alter table public.chat_runs enable row level security;
  -- Ghi từ server dùng service role (bypass RLS) HOẶC policy insert phù hợp.
  ```
- **Code:** trong `POST /api/chat`, sau `runTools`, insert `chat_runs`. Cân nhắc dùng `SUPABASE_SERVICE_ROLE_KEY` (server-only) để ghi.
- Xem pattern tham khảo ở project anh em `vibe-forge` (Supabase optional + ghi kết quả từng bước).

### 4.2 Streaming token
- Đổi `/api/chat` sang `ReadableStream` (NDJSON) như `vibe-forge/src/app/api/pipeline/route.ts`; `ArenaClient` đọc stream cập nhật card dần.

### 4.3 Phân quyền admin theo role
- **Đã triển khai:** bảng `profiles(user_id, role)` + hàm `is_admin()` + trigger tạo profile; RLS write `ai_tools` chỉ cho `role='admin'` (migration `20260810000000_profiles_admin_rls.sql`). Xem technical-spec §8.
- Nâng admin: `update public.profiles set role='admin' where user_id='<uuid>';` (hạ quyền: đổi về `'viewer'`).

### 4.4 Hủy request khi client rời trang
- Truyền `req.signal` xuống `callProvider` và dùng `AbortController` trong fetch (pattern đã áp dụng ở `vibe-forge`).
- Lưu ý: `callProvider` đã dùng `makeTimeoutSignal` (AbortController) cho timeout. Có thể kết hợp thêm `req.signal` từ route.

### 4.5 Rate limit phân tán & cache engine
- Rate limit hiện tại là in-memory (1 instance). Nâng cấp: `@upstash/ratelimit` + Upstash Redis.
- Cache `ai_tools` bằng `unstable_cache`/revalidate 30–60s để giảm truy vấn DB mỗi request.
- Xem [security-performance.md](./security-performance.md) mục "Khuyến nghị còn lại".

## 5. Kiểm thử & Definition of Done

Trước khi coi là hoàn tất một thay đổi:
- [ ] `npm run test` xanh (thêm test cho logic mới; parser/validate/orchestration).
- [ ] `npm run build` thành công (type-check sạch).
- [ ] Nếu đổi schema: đã tạo migration + cập nhật `schema.sql`; seed ở `seed.sql`.
- [ ] Nếu thêm provider: cập nhật `types.ts`, `providers.ts`, `.env.example`.
- [ ] Không lộ API key ra client; RLS còn bật.
- [ ] Cập nhật tài liệu trong `docs/` nếu thay đổi kiến trúc/yêu cầu.

## 6. Cạm bẫy đã biết (tránh lặp lại)

- **Thứ tự route:** trong router có path param, khai báo route cố định (`/search`) TRƯỚC route `/{id}` (áp dụng nếu port pattern từ smart-hr; ai-arena hiện không có).
- **Dedupe theo provider:** `page.tsx` chỉ giữ engine đầu tiên mỗi provider (`new Map(tools.map(t => [t.provider, t]))`). Nếu muốn hiển thị nhiều engine cùng provider, bỏ/đổi logic này.
- **Env newline:** luôn dùng `env.ts` để đọc Supabase env (đã `.trim()`), tránh lỗi "Invalid value".
- **maxDuration 60s:** call provider chậm có thể chạm giới hạn Vercel; giữ `withTimeout`.

## 7. Bản đồ file nhanh (khi cần sửa gì → mở file nào)

| Muốn làm | File |
|----------|------|
| Đổi validate prompt / orchestration | `src/lib/chat.ts` |
| Thêm/sửa provider, model, parser | `src/lib/providers.ts` |
| Đổi kiểu dữ liệu chung | `src/lib/types.ts` |
| Đổi UI trang chính / card | `src/components/ArenaClient.tsx`, `AnswerCard.tsx` |
| Đổi CRUD admin | `src/components/AdminClient.tsx` |
| Đổi bảo vệ route | `src/lib/supabase/middleware.ts`, `src/middleware.ts` |
| Đổi schema DB | `supabase/migrations/`, `supabase/schema.sql`, `supabase/seed.sql` |
| Đổi API chat | `src/app/api/chat/route.ts` |
