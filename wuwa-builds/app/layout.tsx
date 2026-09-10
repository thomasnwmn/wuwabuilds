import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wuwa Builds",
  description: "A personal Wuthering Waves build archive.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <style>{`
          :root {
            --echo-placeholder: url("${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-assets/icons/echo.svg");
          }
        `}</style>
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
