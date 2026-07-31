// Read and sanitize Supabase env vars.
// Trailing newlines/spaces (e.g. from a mis-set Vercel env var) would make
// the Supabase URL invalid and cause: fetch on 'Window': Invalid value.

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export function getSupabaseUrl(): string {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return key;
}
