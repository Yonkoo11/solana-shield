import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vigil — Guardian Protocol",
  description:
    "On-chain guardian protocol for Solana. Detect exploits. Pause protocols. Protect TVL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen text-sm" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        {/* Header */}
        <header
          className="flex items-center justify-between h-12 px-5"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))",
          }}
        >
          <div className="flex items-center gap-2" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>
            {/* Logo: 2x2 grid of status cells */}
            <div className="grid grid-cols-2 gap-[2px]">
              <div className="w-[5px] h-[5px] rounded-[1px]" style={{ background: "var(--green-core)", boxShadow: "0 0 4px var(--green-glow)" }} />
              <div className="w-[5px] h-[5px] rounded-[1px]" style={{ background: "var(--text-muted)" }} />
              <div className="w-[5px] h-[5px] rounded-[1px]" style={{ background: "var(--text-muted)" }} />
              <div className="w-[5px] h-[5px] rounded-[1px]" style={{ background: "var(--green-core)", boxShadow: "0 0 4px var(--green-glow)" }} />
            </div>
            VIGIL
          </div>

          <nav className="flex overflow-hidden" style={{ border: "1px solid var(--border)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
            <a href="/" className="px-4 py-1.5" style={{ color: "var(--green-bright)", background: "rgba(16,185,129,0.06)", borderRight: "1px solid var(--border)" }}>
              Monitor
            </a>
            <a href="/drift" className="px-4 py-1.5 hover:text-white transition" style={{ color: "var(--text-secondary)" }}>
              Drift Replay
            </a>
          </nav>

          <div className="flex items-center gap-3" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--green-bright)", letterSpacing: "0.05em" }}>
            <span>UPTIME 99.97%</span>
            <div
              className="w-2 h-2 rounded-[2px]"
              style={{ background: "var(--green-core)", boxShadow: "0 0 6px var(--green-glow)", animation: "liveBlink 1.5s infinite" }}
            />
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
