import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";
import MeLink from "@/components/MeLink";
import { getPlayers } from "@/lib/data";
import { TEAM_NAME } from "@/lib/config";
import { isUnlocked } from "@/lib/auth";
import { lockAction } from "./actions";

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
        <header className="bg-navy pt-[env(safe-area-inset-top)] text-white">
          <div className="mx-auto flex max-w-xl items-center gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span aria-hidden className="relative inline-block h-6 w-6 rounded-full bg-stone-blue">
                <span className="absolute inset-[3px] rounded-full bg-white" />
                <span className="absolute inset-[6px] rounded-full bg-stone-red" />
                <span className="absolute inset-[9px] rounded-full bg-white" />
              </span>
              {TEAM_NAME}
            </Link>
            <nav className="ml-auto flex items-center gap-4 text-sm font-medium text-white/80">
              <MeLink players={players.map(({ id, name }) => ({ id, name }))} />
              {unlocked ? (
                <>
                  <Link href="/roster">Roster</Link>
                  <form action={lockAction}>
                    <button className="text-white/60">Lock</button>
                  </form>
                </>
              ) : (
                <Link href="/unlock">Edit</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">{children}</main>
      </body>
    </html>
  );
}
