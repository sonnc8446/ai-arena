# AI Arena — Security & Performance Review

> Kết quả rà soát bảo mật & hiệu năng và các tối ưu đã áp dụng.
> Phiên bản review: 2026-08-10. Đọc kèm: [technical-spec.md](./technical-spec.md).

## A. Bảo mật

### Đã vá

| # | Mức | Vấn đề | Cách xử lý |
|---|-----|--------|------------|
| S1 | **Nghiêm trọng** | `.env.all`, `.env.production` chứa API key thật nhưng KHÔNG được `.gitignore` bảo vệ (chỉ chặn `.env` và `.env*.local`) → nguy cơ commit lộ key | Sửa `.gitignore`: chặn `.env.*` và chỉ cho phép `!.env.example`. Xác nhận các file này đã bị ignore, `.env.example` vẫn track được |
| S2 | Cao | `/api/chat` không có rate limit → lạm dụng, đốt chi phí API (mỗi request fan-out nhiều engine) | Thêm rate limit theo IP (in-memory sliding window, 10 req/60s), trả 429 + `Retry-After` |
| S3 | Cao | Rò rỉ chi tiết lỗi nội bộ DB ra client (`Lỗi đọc DB: ${error.message}`) | Log lỗi ở server, trả thông báo chung chung cho client |
| S4 | Trung bình | Gemini nối thẳng `model` vào URL → path injection tiềm ẩn | `encodeURIComponent(model)` |
| S5 | Trung bình | Không giới hạn số engine fan-out → 1 request có thể bung rất nhiều call | Giới hạn `MAX_ENGINES_PER_REQUEST = 8` (`.limit()` khi query) |

### Đánh giá tốt (giữ nguyên)

- **API key provider** chỉ đọc ở server (`process.env`), không lộ ra client.
- **RLS** bật trên `ai_tools`: public read, authenticated write.
- **Middleware** chặn `/admin` khi chưa auth; dùng `supabase.auth.getUser()` (xác thực phía server, không tin cookie thô).
- **Env sanitize** (`env.ts` `.trim()`).
- **XSS:** `AnswerCard` render `result.content` qua `{}` của React (tự escape) — an toàn. **Không dùng `dangerouslySetInnerHTML`.**

### Khuyến nghị còn lại (chưa làm, cần quyết định)

- **[Quan trọng] Xoay (rotate) toàn bộ API key** trong `.env.all`/`.env.production` vì chúng đã tồn tại ngoài vùng bảo vệ gitignore một thời gian (DeepSeek, Gemini, Moonshot, OpenRouter, Supabase anon key, và `VERCEL_OIDC_TOKEN`).
  → Hướng dẫn + công cụ: [rotate-keys.md](./rotate-keys.md), `scripts/rotate-keys.sh` (`check` / `pull`). **Đang chờ bạn thực hiện ở dashboard provider.**
- **Rate limit phân tán:** bản in-memory chỉ đúng trong 1 instance. Hiện chạy 1 instance nên tạm đủ; khi scale nhiều instance → Upstash Redis.
- **CAPTCHA/Turnstile** cho trang guest nếu bị lạm dụng nặng.

### Đã bổ sung (RLS theo role)

- **RLS `ai_tools` siết theo admin** (migration `20260810000000_profiles_admin_rls.sql`): thêm bảng `profiles(user_id, role)`, hàm `is_admin()`, trigger tạo profile tự động; policy write đổi từ "mọi authenticated user" → **chỉ `role='admin'`**. User đầu tiên được backfill làm admin.

## B. Hiệu năng

### Đã tối ưu

| # | Mức | Vấn đề | Cách xử lý |
|---|-----|--------|------------|
| P1 | Cao | `withTimeout` dùng `Promise.race` → timeout KHÔNG hủy fetch thật, giữ kết nối/tốn tài nguyên đến khi provider phản hồi | Thêm `makeTimeoutSignal` (AbortController); `callProvider` truyền `signal` vào mọi `fetch` → hủy thật khi hết giờ |
| P2 | Trung bình | `select("*")` lấy cả cột không cần (description, timestamps) | Chỉ `select("id, name, provider, model, accent_color")` |
| P3 | Trung bình | Không chặn số engine fan-out đồng thời | `.limit(MAX_ENGINES_PER_REQUEST)` |
| P4 | Trung bình | Không giới hạn độ dài phản hồi → payload lớn, chậm, tốn token | `max_tokens/maxOutputTokens = 1024` cho mọi provider |
| P5 | Thấp | Query lặp lại thiếu index | Thêm index `idx_ai_tools_enabled_sort (enabled, sort_order)` (migration) |

### Đánh giá tốt (giữ nguyên)

- **Fan-out song song** bằng `Promise.all` (không tuần tự).
- **Parser tách riêng** — nhẹ, không chặn.
- Trang chính dùng `dynamic = "force-dynamic"` nhưng query rất nhẹ (1 bảng, có index).

### Khuyến nghị còn lại

- **Cache danh sách engine:** `ai_tools` ít đổi → cache ngắn (vd `unstable_cache` 30–60s hoặc revalidate) để giảm truy vấn DB mỗi request.
- **Streaming token:** đổi `/api/chat` sang NDJSON stream (xem pattern `vibe-forge`) để hiển thị dần, cải thiện cảm nhận tốc độ.
- **Connection pooling:** dùng Supabase pooler (port 54329 / `?pgbouncer=true`) khi tải cao.

## C. Kiểm thử sau tối ưu

- `npm run test` — **38/38 pass** (thêm test: `max_tokens` + `AbortSignal` được truyền; Gemini mã hoá model chống path injection).
- `npm run build` — thành công.

## D. Checklist khi triển khai production

- [ ] Đã xoay API key (khuyến nghị S1) — xem [rotate-keys.md](./rotate-keys.md).
- [ ] `SECRET`/keys chỉ đặt trong Vercel env, không trong repo.
- [x] RLS siết theo role admin (`profiles` + `is_admin()`).
- [ ] Cân nhắc rate limit phân tán (Upstash) khi scale >1 instance (hiện 1 instance — tạm bỏ qua).
