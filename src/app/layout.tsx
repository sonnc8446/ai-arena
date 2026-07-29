import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Arena — So sánh câu trả lời của nhiều AI",
  description:
    "Nhập một prompt, nhận câu trả lời từ ChatGPT, Claude, Gemini, Grok, DeepSeek, Kimi cùng lúc.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
