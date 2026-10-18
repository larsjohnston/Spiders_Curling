import Link from "next/link";

// Served by the service worker when there's no signal and the page asked for was never loaded.
export default function OfflinePage() {
  return (
    <div className="space-y-4 py-12 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-xl font-bold">No signal</h1>
      <p className="text-muted">
        This page hasn&apos;t been loaded on this phone yet. The schedule you last saw is still here.
      </p>
      <Link href="/" className="btn inline-flex">
        Open the schedule
      </Link>
    </div>
  );
}
