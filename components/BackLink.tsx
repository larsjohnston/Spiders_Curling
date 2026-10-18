"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const KEY = "spiders.pagesVisited";

function visited(): number {
  try {
    return Number(sessionStorage.getItem(KEY) ?? 0);
  } catch {
    return 0;
  }
}

/** Counts in-app page views this session, so BackLink knows whether "back" stays inside the app. */
export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, String(visited() + 1));
    } catch {}
  }, [pathname]);
  return null;
}

/**
 * "‹ Back" for pages the Home Screen app can't otherwise leave (it has no browser back button).
 * Goes back when the previous page was in the app; opened straight from a link or a notification,
 * it goes to `fallback` instead.
 */
export default function BackLink({ fallback = "/", label = "Back" }: { fallback?: string; label?: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      onClick={(e) => {
        if (visited() > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="inline-block py-1 text-sm text-muted"
    >
      ‹ {label}
    </Link>
  );
}
