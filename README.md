# AI Arena

Một website cho phép **guest** nhập một prompt và nhận song song câu trả lời từ nhiều AI engine (ChatGPT, Claude, Gemini, Grok, DeepSeek, Kimi…). Danh sách engine được quản lý qua **trang quản trị**.

- **Frontend + Backend**: Next.js 14 (App Router, API Routes)
- **Database + Auth**: Supabase (Postgres free tier)
- **Deploy**: Vercel (free)

## Kiến trúc

```
Guest → /              (nhập prompt)
         └─ POST /api/chat
              ├─ đọc bảng ai_tools (enabled=true) từ Supabase
              └─ gọi song song từng provider bằng API key thật
Admin → /admin/login → /admin (CRUD ai_tools, bảo vệ bằng Supabase Auth)
```

Mỗi engine là một dòng trong bảng `ai_tools`:
`name` (tên hiển thị) · `provider` (adapter) · `model` (model id gửi API) · `enabled` · `sort_order` · `accent_color`.

Adapter hỗ trợ: `openai`, `anthropic`, `gemini`, `xai`, `deepseek`, `moonshot`, `openrouter`.

## Thiết lập

### 1. Tạo project Supabase
1. Tạo project tại https://supabase.com (free).
2. Vào **SQL Editor**, dán toàn bộ nội dung `supabase/schema.sql` và **Run**. Lệnh này tạo bảng `ai_tools`, bật RLS, và seed 6 engine mẫu.
3. Vào **Project Settings → API**, lấy `Project URL` và `anon public key`.

### 2. Tạo tài khoản admin
Vào Supabase → **Authentication → Users → Add user** (tạo email + password). Đây là tài khoản đăng nhập `/admin`.
> Nên tắt "Allow new users to sign up" trong Authentication → Providers → Email để không ai tự đăng ký.

### 3. Cấu hình biến môi trường
Copy `.env.example` thành `.env.local` rồi điền:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: bắt buộc.
- Các `*_API_KEY`: điền key của engine nào bạn muốn dùng. Engine thiếu key sẽ báo lỗi rõ ràng trên card của nó (các engine khác vẫn chạy).

### 4. Chạy local
```bash
npm install
npm run dev
```
Mở http://localhost:3000 (guest) và http://localhost:3000/admin (quản trị).

## Deploy lên Vercel
1. Push code lên GitHub.
2. Vào https://vercel.com → **Add New Project** → import repo.
3. Thêm toàn bộ biến môi trường (mục Environment Variables) như trong `.env.local`.
4. Deploy.

## Lấy API key ở đâu
| Engine | Provider | Lấy key |
|---|---|---|
| ChatGPT | openai | https://platform.openai.com/api-keys |
| Claude | anthropic | https://console.anthropic.com |
| Gemini | gemini | https://aistudio.google.com/app/apikey (có free tier) |
| Grok | xai | https://console.x.ai |
| DeepSeek | deepseek | https://platform.deepseek.com |
| Kimi | moonshot | https://platform.moonshot.cn |
| (nhiều model) | openrouter | https://openrouter.ai/keys (có model free) |

## Ghi chú về "free"
Đa số API chính thức **không miễn phí hoàn toàn**. Muốn thực sự free, dùng `provider = openrouter` với các model có hậu tố `:free`, hoặc `gemini` free tier. Chỉ cần đổi `provider`/`model` trong trang quản trị, không cần sửa code.
