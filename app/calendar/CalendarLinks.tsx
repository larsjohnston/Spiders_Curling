"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
import { useMe } from "@/components/useMe";

/** Subscribe buttons for iPhone, Outlook and Google, personalised to whoever this device belongs to. */
export default function CalendarLinks({ host, players }: { host: string; players: Pick<Player, "id" | "name">[] }) {
  const [me] = useMe();
  const [copied, setCopied] = useState(false);
  const mine = players.find((p) => p.id === me);
  const path = `/cal/${mine ? mine.id : "spiders"}.ics`;
  const https = `https://${host}${path}`;
  const webcal = `webcal://${host}${path}`;
  const name = encodeURIComponent("Spiders Curling");

  const big = "flex w-full items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left";
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {mine ? (
          <>
            Personalised for <b>{mine.name}</b>: each game says if you&apos;re playing, a sub or out.
          </>
        ) : (
          <>Team calendar. Pick your name on the Me page to get one that says whether you&apos;re playing.</>
        )}
      </p>

      <a href={webcal} className={big}>
        <span className="text-2xl">📱</span>
        <span>
          <span className="block font-semibold">iPhone / Mac Calendar</span>
          <span className="text-xs text-muted">Tap, then Subscribe</span>
        </span>
      </a>

      <a
        href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${name}`}
        target="_blank"
        rel="noreferrer"
        className={big}
      >
        <span className="text-2xl">📧</span>
        <span>
          <span className="block font-semibold">Outlook.com / Hotmail</span>
          <span className="text-xs text-muted">Opens Outlook on the web, tap Import</span>
        </span>
      </a>

      <a
        href={`https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${name}`}
        target="_blank"
        rel="noreferrer"
        className={big}
      >
        <span className="text-2xl">🏢</span>
        <span>
          <span className="block font-semibold">Outlook for work (Microsoft 365)</span>
          <span className="text-xs text-muted">Opens Outlook on the web, tap Import</span>
        </span>
      </a>

      <a
        href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
        target="_blank"
        rel="noreferrer"
        className={big}
      >
        <span className="text-2xl">🗓️</span>
        <span>
          <span className="block font-semibold">Google Calendar</span>
          <span className="text-xs text-muted">For the Android guys</span>
        </span>
      </a>

      <div className="rounded-xl border border-dashed border-line p-3 text-sm">
        <div className="mb-1 font-semibold">Outlook desktop or anything else</div>
        <p className="mb-2 text-xs text-muted">Add calendar → From internet / Subscribe from web, and paste:</p>
        <div className="flex gap-2">
          <input readOnly value={https} className="input py-2 text-xs" onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className="btn shrink-0 py-2 text-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(https);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">Calendars check for changes on their own schedule, usually every hour or so.</p>
    </div>
  );
}
