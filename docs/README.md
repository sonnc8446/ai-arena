# AI Arena — Tài liệu dự án (`docs/`)

Thư mục này chứa tài liệu để **nâng cấp dự án về sau chỉ cần đọc ở đây**.

## Mục lục

| Tài liệu | Nội dung |
|----------|----------|
| [requirements.md](./requirements.md) | Requirements Specification (SRS): mục tiêu, phạm vi, user stories, FR/NFR, tiêu chí chấp nhận |
| [technical-spec.md](./technical-spec.md) | Đặc tả kỹ thuật: kiến trúc, data model, API, provider layer, bảo mật/RLS, cấu hình Supabase, sơ đồ Mermaid |
| [ai-agent-guide.md](./ai-agent-guide.md) | Hướng dẫn cho AI Agent/dev: quy ước, cách thêm provider, đổi schema, roadmap nâng cấp, DoD, cạm bẫy |
| [security-performance.md](./security-performance.md) | Kết quả review bảo mật & hiệu năng + các tối ưu đã áp dụng + khuyến nghị còn lại |
| [rotate-keys.md](./rotate-keys.md) | Hướng dẫn xoay (rotate) API key + script `scripts/rotate-keys.sh` |

## Đọc theo thứ tự

1. **requirements.md** — hiểu app làm gì.
2. **technical-spec.md** — hiểu app hoạt động thế nào.
3. **ai-agent-guide.md** — bắt tay sửa/mở rộng an toàn.

## Tóm tắt 30 giây

AI Arena: nhập 1 prompt → fan-out song song tới nhiều AI engine → so sánh kết quả. Next.js 14 + Supabase (Postgres + Auth) + Tailwind, deploy Vercel. Engine cấu hình động qua bảng `ai_tools` (admin quản trị). Thêm AI mới = sửa `types.ts` + `providers.ts` + seed DB, không đụng UI.

> Khi thay đổi kiến trúc/yêu cầu, **cập nhật lại các file trong thư mục này** để nguồn tài liệu luôn khớp code.
