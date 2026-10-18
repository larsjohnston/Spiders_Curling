"use client";

import { useCallback, useEffect, useState } from "react";
import { sendTest, subscribe, unsubscribe, type FormState } from "@/app/actions";

const EVENT = "spiders-push-change";

/**
 * Where this device stands on push:
 * - needs-install: iPhone/iPad in a browser tab; iOS only allows push once added to the Home Screen
 * - unsupported:   browser can't do push at all
 * - denied:        the person blocked notifications; only Settings can undo it
 * - off / on:      ready to subscribe / subscribed
 */
export type PushStatus = "checking" | "needs-install" | "unsupported" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Shared push state for the welcome screen, the banner and the Me page (they stay in sync via an event). */
export function usePush() {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [sub, setSub] = useState<PushSubscription | null>(null);

  const refresh = useCallback(async () => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (ios && !standalone) return setStatus("needs-install");
    if (!supported) return setStatus("unsupported");
    if (Notification.permission === "denied") return setStatus("denied");
    const s = await currentSubscription();
    setSub(s);
    setStatus(s ? "on" : "off");
  }, []);

  useEffect(() => {
    // Browser capabilities can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [refresh]);

  /** Must be called straight from a tap: iOS only shows the permission prompt for a user gesture. */
  const turnOn = useCallback(async (playerId: string | null): Promise<FormState> => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        window.dispatchEvent(new Event(EVENT));
        return { error: "Notifications are blocked. Allow them in Settings → Notifications → Spiders." };
      }
      const reg = await navigator.serviceWorker.ready;
      const s =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""),
        }));
      const res = await subscribe(s.toJSON() as never, playerId);
      window.dispatchEvent(new Event(EVENT));
      return res.error ? res : { ok: "Notifications on. You'll get game reminders and results." };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Couldn't turn on notifications" };
    }
  }, []);

  const turnOff = useCallback(async (): Promise<FormState> => {
    const s = await currentSubscription();
    if (s) {
      await unsubscribe(s.endpoint);
      await s.unsubscribe();
    }
    window.dispatchEvent(new Event(EVENT));
    return { ok: "Notifications off" };
  }, []);

  /** Re-tag this device's subscription when the person changes who they are. */
  const setPlayer = useCallback(async (playerId: string | null) => {
    const s = await currentSubscription().catch(() => null);
    if (s) await subscribe(s.toJSON() as never, playerId);
  }, []);

  const test = useCallback(async (): Promise<FormState> => {
    const s = await currentSubscription();
    return s ? sendTest(s.endpoint) : { error: "This device isn't subscribed" };
  }, []);

  return { status, sub, turnOn, turnOff, setPlayer, test };
}
