import { createClient } from "@/lib/supabase/server";
import type { AiTool } from "@/lib/types";
import AdminClient from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("ai_tools")
    .select("*")
    .order("sort_order", { ascending: true });

  const tools = (data ?? []) as AiTool[];

  return <AdminClient initialTools={tools} email={user?.email ?? ""} />;
}
