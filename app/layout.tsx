import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";
import HeaderNav from "@/components/HeaderNav";
import { NavTracker } from "@/components/BackLink";
import PushBanner from "@/components/PushBanner";
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
              <span aria-hidden className="relative inline-block h-6 w-6 rounded-full bg-stone-blue">
                <span className="absolute inset-[3px] rounded-full bg-white" />
                <span className="absolute inset-[6px] rounded-full bg-stone-red" />
                <span className="absolute inset-[9px] rounded-full bg-white" />
              </span>
              {TEAM_NAME}
            </Link>
            <HeaderNav players={players.map(({ id, name }) => ({ id, name }))} unlocked={unlocked} />
          </div>
        </header>
        <PushBanner />
        <Welcome players={players.map(({ id, name, photo_url }) => ({ id, name, photo_url }))} />
        <main className="mx-auto max-w-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">{children}</main>
      </body>
    </html>
  );
}
