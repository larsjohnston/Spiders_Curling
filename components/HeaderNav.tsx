"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { lockAction } from "@/app/actions";
import type { Player } from "@/lib/types";
import { useMe } from "./useMe";

const TABS = [
  { href: "/", label: "Games", match: (p: string) => p === "/" || p.startsWith("/games") },
  { href: "/league", label: "League", match: (p: string) => p.startsWith("/league") },
];

/** Games / League tabs plus a ☰ menu holding everything else. */
export default function HeaderNav({ players, unlocked }: { players: Pick<Player, "id" | "name">[]; unlocked: boolean }) {
  const pathname = usePathname();
  const [me] = useMe();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const myName = players.find((p) => p.id === me)?.name;

  // Close on navigation and on any tap outside the menu.
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const item = "block w-full px-4 py-3 text-left text-ink active:bg-line/60";

  return (
    <>
      <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-3 py-1.5 ${t.match(pathname) ? "bg-white/15 text-white" : "text-white/70"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div ref={menu} className="relative">
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-white/90 active:bg-white/15"
        >
          ☰
        </button>
        {open && (
          <div
            className="absolute top-11 right-0 z-20 w-56 overflow-hidden rounded-xl border border-line bg-card text-sm shadow-lg"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <Link href="/me" className={item}>
              {myName ? (
                <>
                  <span className="block font-semibold">{myName}</span>
                  <span className="text-xs text-muted">Change name · notifications</span>
                </>
              ) : (
                <span className="font-semibold">Me · notifications</span>
              )}
            </Link>
            <Link href="/google-sheet" className={item}>
              Google Sheet
            </Link>
            <div className="border-t border-line" />
            {unlocked ? (
              <>
                <Link href="/lineups" className={item}>
                  Lineups
                </Link>
                <Link href="/games/new" className={item}>
                  + Add game
                </Link>
                <Link href="/roster" className={item}>
                  Roster &amp; photos
                </Link>
                <form action={lockAction} onSubmit={() => setOpen(false)}>
                  <button className={`${item} text-muted`}>Lock editing</button>
                </form>
              </>
            ) : (
              <Link href="/unlock" className={item}>
                Unlock editing (PIN)
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
