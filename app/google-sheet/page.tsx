import Link from "next/link";

// For anyone still asking for "the Google Sheet".
export default function GoogleSheetPage() {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white px-6">
      <Link
        href="/"
        className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-4 text-sm text-neutral-300"
      >
        ‹ back
      </Link>
      <h1 className="text-center text-7xl leading-none font-black tracking-tight text-black sm:text-9xl">
        YOU&apos;RE OLD
      </h1>
    </div>
  );
}
