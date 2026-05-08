import type { Metadata } from "next";
import { readConfig } from "@/lib/config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const config = readConfig();
  return { title: config.settings.title };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = readConfig();

  return (
    <html lang="en" data-theme={config.settings.theme}>
      <body>
        {children}
      </body>
    </html>
  );
}
