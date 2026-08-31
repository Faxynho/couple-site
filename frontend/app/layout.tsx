import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { themeInitScript } from "@/lib/theme";
import ThemeToggleGate from "@/components/ThemeToggleGate";
import AccountPanelGate from "@/components/account/AccountPanelGate";
import PWARegister from "@/components/PWARegister";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Nós Dois • Jogos Cooperativos",
  description: "Uma salinha só nossa para jogar juntos, onde quer que estejamos.",

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lovie",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fredoka.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        {/* Roda antes da primeira pintura pra aplicar o tema salvo (ou a
            preferência do sistema) sem dar aquele "flash" de tema errado. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeToggleGate />
        <AccountPanelGate />
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
