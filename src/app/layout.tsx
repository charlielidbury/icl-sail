import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Provider } from "@/components/ui/provider";
import { Provider as JotaiProvider } from "jotai";
import { requestCompetition } from "@/request-competition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { competition } = await requestCompetition();
  if (competition === null) {
    return {
      title: "iSail",
      description: "Live race results for university team racing",
    };
  }
  return {
    title: competition.name,
    description: `${competition.name} Live Race Results`,
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
