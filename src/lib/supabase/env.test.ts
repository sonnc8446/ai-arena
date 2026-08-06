import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

afterEach(() => {
  delete process.env[URL_KEY];
  delete process.env[ANON_KEY];
});

describe("getSupabaseUrl", () => {
  it("trả về URL đã trim khi có giá trị", () => {
    process.env[URL_KEY] = "https://x.supabase.co";
    expect(getSupabaseUrl()).toBe("https://x.supabase.co");
  });

  it("loại bỏ newline/space dư (nguyên nhân lỗi fetch Invalid value)", () => {
    process.env[URL_KEY] = "  https://x.supabase.co\n";
    expect(getSupabaseUrl()).toBe("https://x.supabase.co");
  });

  it("throw khi thiếu biến môi trường", () => {
    expect(() => getSupabaseUrl()).toThrow(/Missing NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throw khi giá trị chỉ có khoảng trắng", () => {
    process.env[URL_KEY] = "   ";
    expect(() => getSupabaseUrl()).toThrow(/Missing/);
  });
});

describe("getSupabaseAnonKey", () => {
  it("trả về key đã trim", () => {
    process.env[ANON_KEY] = "anon-key\n";
    expect(getSupabaseAnonKey()).toBe("anon-key");
  });

  it("throw khi thiếu", () => {
    expect(() => getSupabaseAnonKey()).toThrow(
      /Missing NEXT_PUBLIC_SUPABASE_ANON_KEY/
    );
  });
});
