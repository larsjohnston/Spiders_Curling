"use client";

import Link from "next/link";
import { useState } from "react";
import { useMe } from "./useMe";
import { usePush } from "./usePush";

/** Banner under the header for as long as this device isn't getting notifications. */
export default function PushBanner() {
  const [me] = useMe();
  const push = usePush();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (push.status === "checking" || push.status === "on" || push.status === "unsupported") return null;

  const bar = "flex items-center gap-3 bg-stone-red px-4 py-2.5 text-sm font-medium text-white";
  return (
    <div role="alert" className={bar}>
      <span className="text-lg" aria-hidden>
        🔔
      </span>
      {push.status === "off" ? (
        <>
          <span className="flex-1">{error || "Notifications are off. You'll miss game reminders."}</span>
          <button
            className="shrink-0 rounded-full bg-white px-3 py-1 font-semibold text-stone-red"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await push.turnOn(me);
              setError(res.error ?? "");
              setBusy(false);
            }}
          >
            {busy ? "…" : "Turn on"}
          </button>
        </>
      ) : push.status === "needs-install" ? (
        <>
          <span className="flex-1">Add Spiders to your Home Screen to get game reminders.</span>
          <Link href="/me" className="shrink-0 rounded-full bg-white px-3 py-1 font-semibold text-stone-red">
            How
          </Link>
        </>
      ) : (
        <span className="flex-1">Notifications are blocked. Turn them on in Settings → Notifications → Spiders.</span>
      )}
    </div>
  );
}
