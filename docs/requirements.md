# AI Arena — Requirements Specification (SRS)

> Tài liệu yêu cầu phần mềm. Phiên bản 1.0. Cập nhật khi thay đổi phạm vi.
> Đọc kèm: [technical-spec.md](./technical-spec.md), [ai-agent-guide.md](./ai-agent-guide.md).

## 1. Tổng quan

**AI Arena** là web app cho phép người dùng nhập **một prompt** và **so sánh song song** câu trả lời từ nhiều AI engine (ChatGPT, Claude, Gemini, Grok, DeepSeek, Kimi...). Admin quản lý danh sách engine qua trang quản trị.

- **Người dùng khách (guest):** không cần đăng nhập, nhập prompt và xem kết quả.
- **Admin:** đăng nhập để bật/tắt, thêm/sửa/xoá engine.

## 2. Mục tiêu

| # | Mục tiêu |
|---|----------|
| G1 | So sánh nhanh chất lượng/tốc độ trả lời của nhiều AI trên cùng một prompt |
| G2 | Cho phép cấu hình engine linh hoạt (thêm provider/model) mà không sửa DB thủ công |
| G3 | Chạy được trên hạ tầng miễn phí (Vercel + Supabase free tier) |
| G4 | Kiến trúc dễ mở rộng để bổ sung AI engine / provider mới |

## 3. Phạm vi

**Trong phạm vi:** fan-out prompt tới các engine đang bật, hiển thị kết quả dạng lưới; quản trị `ai_tools`; auth admin; rate limit cơ bản qua provider.

**Ngoài phạm vi (hiện tại):** lưu lịch sử hội thoại, tài khoản người dùng khách, thanh toán, streaming từng token, đánh giá/chấm điểm câu trả lời.

## 4. Đối tượng người dùng (Actors)

- **Guest** — người dùng ẩn danh, chỉ tương tác trang chính.
- **Admin** — người dùng Supabase Auth đã đăng nhập, quản trị engine.
- **AI Provider** — dịch vụ ngoài (OpenAI, Anthropic...) được gọi qua adapter.

## 5. User Stories

### Guest
- **US-G1:** Là guest, tôi muốn nhập một prompt và gửi tới tất cả engine đang bật, để so sánh câu trả lời.
- **US-G2:** Là guest, tôi muốn thấy từng engine trả lời trên card riêng (tên, thời gian phản hồi, nội dung/ lỗi), để đánh giá nhanh.
- **US-G3:** Là guest, tôi muốn gửi bằng Cmd/Ctrl+Enter, để thao tác nhanh.
- **US-G4:** Là guest, khi một engine lỗi, tôi vẫn thấy kết quả các engine khác (lỗi không lan).

### Admin
- **US-A1:** Là admin, tôi muốn đăng nhập bằng email/mật khẩu (Supabase Auth).
- **US-A2:** Là admin, tôi muốn xem danh sách tất cả engine (kể cả đang tắt).
- **US-A3:** Là admin, tôi muốn thêm/sửa engine (name, provider, model, màu, mô tả, sort_order).
- **US-A4:** Là admin, tôi muốn bật/tắt và xoá engine.
- **US-A5:** Là admin, khi chưa đăng nhập mà truy cập `/admin`, tôi bị chuyển tới trang login.

## 6. Yêu cầu chức năng (Functional Requirements)

| ID | Yêu cầu | Ưu tiên |
|----|---------|---------|
| FR-1 | Trang chính hiển thị các engine `enabled = true`, sắp theo `sort_order` | Cao |
| FR-2 | `POST /api/chat` nhận `{ prompt }`, validate (không rỗng, ≤ 8000 ký tự) | Cao |
| FR-3 | Fan-out prompt song song tới tất cả engine đang bật, trả mảng `ChatResult` | Cao |
| FR-4 | Mỗi engine lỗi được bọc thành `{ ok: false, error }`, không throw ra ngoài | Cao |
| FR-5 | Mỗi kết quả có `elapsedMs` (thời gian phản hồi) | Trung bình |
| FR-6 | Trang chính khử trùng lặp engine theo `provider` (giữ engine đầu tiên) | Trung bình |
| FR-7 | `/admin` được middleware bảo vệ; chưa auth → redirect `/admin/login` | Cao |
| FR-8 | Admin CRUD `ai_tools` qua Supabase client (RLS: authenticated write) | Cao |
| FR-9 | Guest đọc `ai_tools` công khai (RLS: public read) | Cao |
| FR-10 | Hỗ trợ provider: openai, anthropic, gemini, xai, deepseek, moonshot, openrouter | Cao |

## 7. Yêu cầu phi chức năng (Non-Functional Requirements)

| ID | Yêu cầu |
|----|---------|
| NFR-1 | **Hiệu năng:** fan-out song song (`Promise.all`); timeout mỗi call 60s |
| NFR-2 | **Độ tin cậy:** lỗi 1 engine không ảnh hưởng engine khác (graceful degradation) |
| NFR-3 | **Bảo mật:** API key provider chỉ ở server (biến môi trường), không lộ ra client |
| NFR-4 | **Bảo mật:** RLS bật trên mọi bảng public; ghi chỉ cho authenticated |
| NFR-5 | **Cấu hình:** env được sanitize (`.trim()`) tránh lỗi "Invalid value" từ newline |
| NFR-6 | **Khả chuyển:** deploy Vercel + Supabase free tier; runtime Node.js |
| NFR-7 | **Bảo trì:** thêm provider mới = sửa 1 union type + 1 map, không đụng UI |
| NFR-8 | **Kiểm thử:** logic thuần (validate, parser, orchestration) có unit test (Vitest) |

## 8. Ràng buộc & Giả định

- **Ràng buộc:** `maxDuration = 60s` cho API route (giới hạn Vercel). Prompt ≤ 8000 ký tự.
- **Giả định:** admin tự cấu hình API key provider qua env; thiếu key → engine đó trả lỗi có kiểm soát.
- **Phụ thuộc ngoài:** Supabase (DB + Auth), các AI provider API.

## 9. Tiêu chí chấp nhận (Acceptance Criteria)

- Nhập prompt hợp lệ → nhận đủ card cho mọi engine đang bật, mỗi card ở trạng thái ok/lỗi.
- Prompt rỗng/quá dài → API trả 400 với thông báo tiếng Việt.
- Chưa đăng nhập truy cập `/admin` → bị redirect login.
- Admin thêm engine mới enabled → xuất hiện trên trang chính (sau reload) nếu provider chưa trùng.

## 10. Rủi ro & Hướng mở rộng tương lai

- **Rủi ro:** provider đổi schema response → parser hỏng. Giảm thiểu: parser tách riêng, có test.
- **Mở rộng gợi ý:** lưu lịch sử prompt/kết quả vào Supabase (bảng `chat_runs`); streaming token; xếp hạng câu trả lời; giới hạn rate ở tầng app. Xem [ai-agent-guide.md](./ai-agent-guide.md).
