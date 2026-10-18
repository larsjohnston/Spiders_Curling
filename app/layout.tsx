import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";
import HeaderNav from "@/components/HeaderNav";
import { NavTracker } from "@/components/BackLink";
import PushBanner from "@/components/PushBanner";
import OfflineBanner from "@/components/OfflineBanner";
import Welcome from "@/components/Welcome";
import { getPlayers } from "@/lib/data";
import { TEAM_NAME } from "@/lib/config";
import { isUnlocked } from "@/lib/auth";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${TEAM_NAME} Curling`,
  description: "Schedule, lineups and scores",
  appleWebApp: { capable: true, title: TEAM_NAME, statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0f1f3d",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [unlocked, players] = await Promise.all([isUnlocked(), getPlayers()]);
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <ServiceWorker />
        <NavTracker />
        <header className="bg-navy pt-[env(safe-area-inset-top)] text-white">
          <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo, no optimizer needed */}
              <img src="/logo-128.png" alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-white" />
              {TEAM_NAME}
            </Link>
            <HeaderNav players={players.map(({ id, name }) => ({ id, name }))} unlocked={unlocked} />
          </div>
        </header>
        <OfflineBanner />
        <PushBanner />
        <Welcome players={players.map(({ id, name, photo_url }) => ({ id, name, photo_url }))} />
        <main className="mx-auto max-w-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">{children}</main>
      </body>
    </html>
  );
}
