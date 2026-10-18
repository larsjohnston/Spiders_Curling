"use client";

import { useEffect, useState } from "react";
import { sendTest, subscribe, unsubscribe, type FormState } from "../actions";
import type { Player } from "@/lib/types";
import FormMessage from "@/components/FormMessage";
import { useMe } from "@/components/useMe";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Env = { supported: boolean; ios: boolean; standalone: boolean };

export default function MePanel({ players, vapidKey }: { players: Player[]; vapidKey: string }) {
  const [me, setMe] = useMe();
  const [env, setEnv] = useState<Env | null>(null);
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<FormState>({});

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // Reading browser capabilities has to happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv({ supported, ios, standalone });
    if (supported) {
      navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then(setSub);
    }
  }, []);

  async function choose(id: string) {
    setMe(id || null);
    // Keep the server's record of who this device belongs to in sync.
    if (sub) await subscribe(sub.toJSON() as never, id || null);
  }

  async function turnOn() {
    setBusy(true);
    setMsg({});
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMsg({ error: "Notifications are blocked. Allow them in Settings → Notifications → Spiders." });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const s = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const res = await subscribe(s.toJSON() as never, me);
      setSub(s);
      setMsg(res.error ? res : { ok: "Notifications on. You'll get a reminder the evening before each game." });
    } catch (e) {
      setMsg({ error: e instanceof Error ? e.message : "Couldn't turn on notifications" });
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!sub) return;
    setBusy(true);
    await unsubscribe(sub.endpoint);
    await sub.unsubscribe();
    setSub(null);
    setMsg({ ok: "Notifications off" });
    setBusy(false);
  }

  async function test() {
    if (!sub) return;
    setBusy(true);
    setMsg(await sendTest(sub.endpoint));
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-xl border border-line bg-card p-4">
        <label className="label" htmlFor="me">
          Who are you?
        </label>
        <select id="me" className="input" value={me ?? ""} onChange={(e) => choose(e.target.value)}>
          <option value="">Pick your name</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted">Highlights your games and tells you in reminders whether you&apos;re playing.</p>
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-card p-4">
        <h2 className="font-semibold">Game reminders</h2>
        {env === null ? null : env.ios && !env.standalone ? (
          <InstallSteps />
        ) : !env.supported ? (
          <p className="text-sm text-muted">This browser doesn&apos;t support notifications.</p>
        ) : sub ? (
          <>
            <p className="text-sm">
              <span className="font-semibold text-green-600">On</span> — you&apos;ll get a push the evening before each game with
              the opponent and who&apos;s playing.
            </p>
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={test} disabled={busy}>
                Send test
              </button>
              <button className="btn-ghost" onClick={turnOff} disabled={busy}>
                Turn off
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Get a push the evening before each game with the opponent and who&apos;s playing.</p>
            <button className="btn w-full" onClick={turnOn} disabled={busy || !vapidKey}>
              {busy ? "Turning on…" : "Turn on notifications"}
            </button>
          </>
        )}
        <FormMessage state={msg} />
      </section>
    </div>
  );
}

function InstallSteps() {
  return (
    <div className="space-y-2 text-sm">
      <p>On iPhone, notifications only work once the app is on your Home Screen:</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Open this page in <b>Safari</b>.
        </li>
        <li>
          Tap the <b>Share</b> button (square with arrow).
        </li>
        <li>
          Tap <b>Add to Home Screen</b>, then <b>Add</b>.
        </li>
        <li>Open Spiders from your Home Screen and come back to this page.</li>
      </ol>
    </div>
  );
}
