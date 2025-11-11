import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NicknameProvider } from "@/contexts/NicknameContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Christmas Blackjack",
  description: "Best Online Multiplayer Blackjack",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NicknameProvider>
          {children}
        </NicknameProvider>
        <audio id="sound-card-deal" preload="auto" src="/sounds/card-deal.wav" />
        <audio id="sound-card-flip" preload="auto" src="/sounds/card-flip.wav" />
        <audio id="sound-chip-place" preload="auto" src="/sounds/chip-place.wav" />
        <audio id="sound-win" preload="auto" src="/sounds/win.mp3" />
        <audio id="sound-lose" preload="auto" src="/sounds/lose.wav" />
        <audio id="sound-button-click" preload="auto" src="/sounds/button-click.wav" />
        <audio id="christmas-radio" preload="none" />
      </body>
    </html>
  );
}
