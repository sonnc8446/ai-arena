import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { AiTool } from "@/lib/types";
import ArenaClient from "@/components/ArenaClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_tools")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  const tools = (data ?? []) as AiTool[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">AI Arena</h1>
          <p className="text-sm text-gray-400">
            Nhập một prompt, so sánh câu trả lời từ nhiều AI cùng lúc.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Quản trị →
        </Link>
      </header>

      <ArenaClient tools={tools} />
    </main>
  );
}
