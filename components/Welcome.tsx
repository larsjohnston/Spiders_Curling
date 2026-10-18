"use client";

import { useEffect, useState } from "react";
import type { FormState } from "@/app/actions";
import type { Player } from "@/lib/types";
import Avatar from "./Avatar";
import FormMessage from "./FormMessage";
import InstallSteps from "./InstallSteps";
import { useMe } from "./useMe";
import { usePush } from "./usePush";

type Step = "pick" | "notify" | null;

/**
 * First visit: pick yourself from the photos. That same tap asks for notification permission
 * (iOS only shows the prompt in response to a tap), so saying "Allow" is the only extra step.
 */
export default function Welcome({ players }: { players: Pick<Player, "id" | "name" | "photo_url">[] }) {
  const [me, setMe] = useMe();
  const push = usePush();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<FormState>({});

  // useMe reads localStorage, which only exists after mount; wait so returning visitors never see a flash.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const current: Step = step ?? (mounted && !me ? "pick" : null);
  if (!current || players.length === 0) return null;

  async function pick(id: string) {
    setMe(id);
    setStep("notify");
    if (push.status === "off") {
      setBusy(true);
      setMsg(await push.turnOn(id));
      setBusy(false);
    } else {
      void push.setPlayer(id);
    }
  }

  async function retry() {
    setBusy(true);
    setMsg(await push.turnOn(me));
    setBusy(false);
  }

  const name = players.find((p) => p.id === me)?.name;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ice pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md space-y-6 px-5 py-8">
        {current === "pick" ? (
          <>
            <div className="text-center">
              <div className="text-4xl">🥌</div>
              <h1 className="mt-2 text-2xl font-bold">Welcome to the Spiders</h1>
              <p className="mt-1 text-muted">Tap your photo to get started.</p>
            </div>
            <ul className="grid grid-cols-2 gap-4">
              {players.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void pick(p.id)}
                    className="flex w-full flex-col items-center gap-2 rounded-2xl border border-line bg-card p-4 active:bg-stone-blue/10"
                  >
                    <Avatar player={p} size="lg" />
                    <span className="font-semibold">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            {push.status === "off" && (
              <p className="text-center text-sm text-muted">
                Your phone will ask to allow notifications. Tap <b>Allow</b> so you get game reminders.
              </p>
            )}
          </>
        ) : (
          <div className="space-y-5 text-center">
            <div className="text-4xl">🔔</div>
            <h1 className="text-2xl font-bold">{name ? `Hey ${name}!` : "Almost done"}</h1>
            {push.status === "on" ? (
              <p>
                Notifications are <b className="text-green-600">on</b>. You&apos;ll get a reminder at 7pm the night before you
                play, and every result.
              </p>
            ) : push.status === "needs-install" ? (
              <div className="space-y-3 text-left">
                <p className="text-center">
                  To get game reminders on iPhone, add Spiders to your Home Screen first:
                </p>
                <InstallSteps />
              </div>
            ) : push.status === "denied" ? (
              <p className="text-stone-red">
                Notifications are blocked. Turn them on in <b>Settings → Notifications → Spiders</b>, or you&apos;ll miss
                game reminders.
              </p>
            ) : push.status === "unsupported" ? (
              <p className="text-muted">This browser can&apos;t do notifications. Try Safari or Chrome on your phone.</p>
            ) : (
              <>
                <p>Turn on notifications so you know when you&apos;re playing and how the game went.</p>
                <button className="btn w-full py-4 text-lg" onClick={() => void retry()} disabled={busy}>
                  {busy ? "Turning on…" : "🔔 Turn on notifications"}
                </button>
              </>
            )}
            {msg.error && <FormMessage state={msg} />}
            <button
              className={push.status === "on" ? "btn w-full py-3" : "text-sm text-muted underline"}
              onClick={() => setStep(null)}
              disabled={busy}
            >
              {push.status === "on" ? "Let's go" : "Not now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
