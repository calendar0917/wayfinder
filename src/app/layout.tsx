import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homepage",
  description: "Personal dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var cfg = null;
                  try { cfg = JSON.parse(localStorage.getItem('homepage-config')); } catch(e) {}
                  var theme = (cfg && cfg.settings && cfg.settings.theme) || 'auto';
                  if (theme === 'auto') {
                    document.documentElement.setAttribute('data-theme',
                      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  } else {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                } catch(e) {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
