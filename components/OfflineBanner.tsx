"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Shown while the phone has no connection: whatever is on screen is the last saved copy. */
export default function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="bg-slate-700 px-4 py-2 text-center text-sm font-medium text-white">
      📡 No signal. Showing what the app last saw; changes won&apos;t save until you&apos;re back online.
    </div>
  );
}
