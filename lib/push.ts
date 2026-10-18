import "server-only";
import webpush from "web-push";
import { db } from "./db";

export type StoredSubscription = {
  id: string;
  player_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = { title: string; body: string; url?: string };

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys must be set");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub, priv);
  configured = true;
}

export async function getSubscriptions(): Promise<StoredSubscription[]> {
  const { data, error } = await db().from("push_subscriptions").select("id, player_id, endpoint, p256dh, auth");
  if (error) throw error;
  return data;
}

/** Sends one push; prunes the subscription if the browser says it's gone. Returns true on success. */
export async function sendPush(sub: StoredSubscription, payload: PushPayload): Promise<boolean> {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12 },
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await db().from("push_subscriptions").delete().eq("id", sub.id);
    } else {
      console.error("Push failed", status, err);
    }
    return false;
  }
}
