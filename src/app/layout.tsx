import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Provider } from "@/components/ui/provider";
import { Provider as JotaiProvider } from "jotai";
import { headers } from "next/headers";
import { competitionHosts } from "@/shared";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const hostname = (await headers()).get("host")?.split(":")[0] ?? "";
  const name = competitionHosts[hostname]?.name ?? "I-Sail";
  return {
    title: name,
    description: `${name} Live Race Results`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <JotaiProvider>
          <Provider>{children}</Provider>
        </JotaiProvider>
      </body>
    </html>
  );
}
