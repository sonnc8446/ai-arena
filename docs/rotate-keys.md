# Hướng dẫn xoay (rotate) API key — AI Arena

> Các key trong `.env.all` / `.env.production` / `.env.local` từng nằm ngoài vùng bảo vệ `.gitignore`,
> nên coi như **đã lộ**. Xoay toàn bộ theo checklist dưới đây.
> Kiểm tra key nào có mặt: `bash scripts/rotate-keys.sh check`

## Danh sách key cần xoay + nơi thực hiện

| Key | Dashboard xoay key |
|-----|--------------------|
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys → Revoke key cũ, Create new |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey → xoá key, tạo mới |
| `XAI_API_KEY` | https://console.x.ai/ → API Keys |
| `DEEPSEEK_API_KEY` | https://platform.deepseek.com/api_keys |
| `MOONSHOT_API_KEY` | https://platform.moonshot.cn/console/api-keys |
| `OPENROUTER_API_KEY` | https://openrouter.ai/keys → Delete + Create |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key: **xoay bằng cách rotate JWT secret** trong Supabase → Project Settings > API > "Rotate". Lưu ý: rotate sẽ vô hiệu toàn bộ token hiện có. |
| `VERCEL_OIDC_TOKEN` | Token do Vercel tự phát hành trong build; **không** cần đưa vào repo. Chỉ cần đảm bảo `.env.*` không bị commit. |

> `NEXT_PUBLIC_SUPABASE_ANON_KEY` là public-by-design (an toàn để lộ ra client **nếu** RLS đúng). Vẫn nên rotate nếu nghi ngờ, nhưng ưu tiên cao nhất là các **secret key** (OpenAI/Anthropic/... vì tính phí).

## Quy trình xoay (mỗi provider)

1. Vào dashboard provider → **thu hồi (revoke/delete)** key cũ.
2. **Tạo key mới**.
3. Cập nhật trên **Vercel** (nguồn sự thật cho production):
   ```bash
   vercel env rm OPENAI_API_KEY production   # xoá giá trị cũ
   vercel env add OPENAI_API_KEY production   # dán giá trị mới
   ```
   (làm tương tự cho preview/development nếu dùng)
4. Đồng bộ về máy để dev:
   ```bash
   vercel env pull .env.local
   ```
5. Redeploy để dùng key mới:
   ```bash
   vercel --prod
   ```

## Sau khi xoay

- [ ] Đã revoke tất cả key cũ ở dashboard.
- [ ] Đã cập nhật key mới trên Vercel (production).
- [ ] `.env.all`, `.env.production`, `.env.local` chỉ còn ở máy, **không** trong git (đã được `.gitignore` chặn — kiểm tra: `git ls-files | grep .env` chỉ hiện `.env.example`).
- [ ] Cân nhắc xoá các file `.env.all` / `.env.production` local (là bản sao Vercel CLI, tải lại bằng `vercel env pull` khi cần).
- [ ] Nếu Supabase anon key đã rotate: cập nhật `NEXT_PUBLIC_SUPABASE_ANON_KEY` và redeploy.

## Ghi chú

- Sau này chỉ dùng `.env.local` (đã gitignore) cho dev, và Vercel env cho production. Không tạo `.env.all`/`.env.production` trong repo.
- File tham chiếu biến môi trường: `.env.example` (không chứa giá trị thật).
