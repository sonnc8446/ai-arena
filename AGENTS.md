# AI Arena — Project Notes for Kilo Agent

> 📚 Tài liệu đầy đủ ở `docs/` — đọc `docs/README.md` trước khi nâng cấp:
> Requirements (SRS), Technical Spec, và AI Agent onboarding guide.

## Stack
- **Frontend + Backend**: Next.js 14 (App Router) + API Routes, TypeScript, Tailwind CSS
- **Database + Auth**: Supabase (Postgres free tier)
- **Deploy**: Vercel (free)

## Key Files

- `src/app/page.tsx` — Guest landing page, renders `ArenaClient`
- `src/components/ArenaClient.tsx` — Client component: prompt input, parallel result grid
- `src/components/AnswerCard.tsx` — Individual engine result card
- `src/components/AdminClient.tsx` — Admin CRUD for ai_tools, uses Supabase client
- `src/app/admin/login/page.tsx` — Supabase Auth login
- `src/app/admin/page.tsx` — Admin dashboard (protected by middleware)
- `src/app/api/chat/route.ts` — POST `/api/chat`, fan-out to all enabled engines
- `src/lib/providers.ts` — Provider adapters: openai, anthropic, gemini, xai, deepseek, moonshot, openrouter
- `src/lib/types.ts` — Shared types (Provider, AiTool, ChatResult)
- `src/lib/supabase/client.ts` — Browser Supabase client
- `src/lib/supabase/server.ts` — Server Supabase client
- `src/lib/supabase/middleware.ts` — Middleware: protects /admin, refreshes session
- `src/middleware.ts` — Next.js middleware entry point

## DB Schema
- Table `ai_tools`: id, name, provider, model, enabled, sort_order, accent_color, description, created_at, updated_at
- RLS: authenticated users can write, everyone can read
- Seed: 6 engines (ChatGPT, Claude, Gemini, Grok, DeepSeek, Kimi)

## Provider Keys (env vars)
- `OPENAI_API_KEY` — openai provider
- `ANTHROPIC_API_KEY` — anthropic provider
- `GEMINI_API_KEY` — gemini provider
- `XAI_API_KEY` — xai provider
- `DEEPSEEK_API_KEY` — deepseek provider
- `MOONSHOT_API_KEY` — moonshot provider
- `OPENROUTER_API_KEY` — openrouter provider (good for "free" models like free-tier ones)

## Build
```bash
npm install
npm run build   # TypeScript + Next.js production build
npm run dev     # dev server
```

## Deploy to Vercel (after GitHub push)
```bash
vercel login
vercel --prod
# Or use Vercel dashboard → Import GitHub repo
```

## Known Issues Fixed
- `cookiesToSet` implicit `any` in `middleware.ts` and `server.ts` — fixed with explicit type `{ name: string; value: string; options?: any }[]`