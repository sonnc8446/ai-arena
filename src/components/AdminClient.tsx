"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AiTool, Provider } from "@/lib/types";

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "openai", label: "OpenAI (ChatGPT)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "gemini", label: "Google (Gemini)" },
  { value: "xai", label: "xAI (Grok)" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "moonshot", label: "Moonshot (Kimi)" },
  { value: "openrouter", label: "OpenRouter (gateway)" },
];

const emptyForm = {
  name: "",
  provider: "openai" as Provider,
  model: "",
  enabled: true,
  sort_order: 0,
  accent_color: "#6366f1",
  description: "",
};

export default function AdminClient({
  initialTools,
  email,
}: {
  initialTools: AiTool[];
  email: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [tools, setTools] = useState<AiTool[]>(initialTools);
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from("ai_tools")
      .select("*")
      .order("sort_order", { ascending: true });
    setTools((data ?? []) as AiTool[]);
  }

  function startEdit(t: AiTool) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      provider: t.provider,
      model: t.model,
      enabled: t.enabled,
      sort_order: t.sort_order,
      accent_color: t.accent_color ?? "#6366f1",
      description: t.description ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      provider: form.provider,
      model: form.model.trim(),
      enabled: !!form.enabled,
      sort_order: Number(form.sort_order) || 0,
      accent_color: form.accent_color,
      description: form.description,
    };

    if (!payload.name || !payload.model) {
      setError("Tên và Model không được để trống");
      setBusy(false);
      return;
    }

    const res = editingId
      ? await supabase.from("ai_tools").update(payload).eq("id", editingId)
      : await supabase.from("ai_tools").insert(payload);

    if (res.error) {
      setError(res.error.message);
    } else {
      resetForm();
      await refresh();
    }
    setBusy(false);
  }

  async function toggleEnabled(t: AiTool) {
    await supabase
      .from("ai_tools")
      .update({ enabled: !t.enabled })
      .eq("id", t.id);
    await refresh();
  }

  async function remove(t: AiTool) {
    if (!confirm(`Xoá "${t.name}"?`)) return;
    await supabase.from("ai_tools").delete().eq("id", t.id);
    await refresh();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quản trị AI Engines</h1>
          <p className="text-sm text-gray-400">{email}</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-gray-400 hover:text-white">
            ← Trang chủ
          </a>
          <button
            onClick={logout}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mb-8 rounded-xl border border-border bg-panel p-5"
      >
        <h2 className="font-semibold mb-4">
          {editingId ? "Chỉnh sửa engine" : "Thêm engine mới"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm mb-1">Tên hiển thị</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ChatGPT"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Provider</label>
            <select
              value={form.provider}
              onChange={(e) =>
                setForm({ ...form, provider: e.target.value as Provider })
              }
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Model ID</label>
            <input
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="gpt-4o-mini"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Thứ tự</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                setForm({ ...form, sort_order: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Màu badge</label>
            <input
              type="color"
              value={form.accent_color}
              onChange={(e) =>
                setForm({ ...form, accent_color: e.target.value })
              }
              className="h-10 w-full rounded-lg border border-border bg-bg px-1 py-1"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm({ ...form, enabled: e.target.checked })
                }
              />
              Bật engine này
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Mô tả</label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Ghi chú ngắn"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">⚠️ {error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-indigo-500"
          >
            {busy ? "Đang lưu…" : editingId ? "Cập nhật" : "Thêm"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-bg"
            >
              Huỷ
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <div className="rounded-xl border border-border bg-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg text-left text-gray-400">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Thứ tự</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {tools.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  Chưa có engine nào.
                </td>
              </tr>
            )}
            {tools.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: t.accent_color ?? "#6366f1" }}
                    />
                    {t.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{t.provider}</td>
                <td className="px-4 py-3 text-gray-400">{t.model}</td>
                <td className="px-4 py-3 text-gray-400">{t.sort_order}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleEnabled(t)}
                    className={`rounded-full px-2.5 py-0.5 text-xs ${
                      t.enabled
                        ? "bg-green-500/15 text-green-400"
                        : "bg-gray-500/15 text-gray-400"
                    }`}
                  >
                    {t.enabled ? "Đang bật" : "Đang tắt"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => startEdit(t)}
                    className="text-gray-400 hover:text-white mr-3"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => remove(t)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
