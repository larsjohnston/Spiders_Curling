"use client";

import { useState } from "react";
import type { FormState } from "../actions";
import type { Player } from "@/lib/types";
import Avatar from "@/components/Avatar";
import FormMessage from "@/components/FormMessage";
import InstallSteps from "@/components/InstallSteps";
import { useMe } from "@/components/useMe";
import { usePush } from "@/components/usePush";

export default function MePanel({ players }: { players: Player[] }) {
  const [me, setMe] = useMe();
  const push = usePush();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<FormState>({});

  async function run(action: () => Promise<FormState>) {
    setBusy(true);
    setMsg({});
    setMsg(await action());
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-line bg-card p-4">
        <h2 className="font-semibold">Who are you?</h2>
        <ul className="grid grid-cols-3 gap-3">
          {players.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setMe(p.id);
                  void push.setPlayer(p.id);
                }}
                aria-pressed={me === p.id}
                className={`flex w-full flex-col items-center gap-1 rounded-xl p-2 ${me === p.id ? "bg-stone-blue/10" : ""}`}
              >
                <Avatar player={p} size="lg" highlight={me === p.id} />
                <span className={`text-sm ${me === p.id ? "font-semibold" : ""}`}>{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-card p-4">
        <h2 className="font-semibold">Notifications</h2>
        {push.status === "needs-install" ? (
          <>
            <p className="text-sm">On iPhone, notifications only work once Spiders is on your Home Screen:</p>
            <InstallSteps />
          </>
        ) : push.status === "unsupported" ? (
          <p className="text-sm text-muted">This browser doesn&apos;t support notifications.</p>
        ) : push.status === "denied" ? (
          <p className="text-sm text-stone-red">
            Notifications are blocked. Turn them on in <b>Settings → Notifications → Spiders</b>.
          </p>
        ) : push.status === "on" ? (
          <>
            <p className="text-sm">
              <span className="font-semibold text-green-600">On</span>: you&apos;ll get a reminder at 7pm the night before
              you play, and every result.
            </p>
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={() => run(push.test)} disabled={busy}>
                Send test
              </button>
              <button className="btn-ghost" onClick={() => run(push.turnOff)} disabled={busy}>
                Turn off
              </button>
            </div>
          </>
        ) : push.status === "off" ? (
          <button className="btn w-full py-3 text-base" onClick={() => run(() => push.turnOn(me))} disabled={busy}>
            {busy ? "Turning on…" : "🔔 Turn on notifications"}
          </button>
        ) : null}
        <FormMessage state={msg} />
      </section>
    </div>
  );
}
