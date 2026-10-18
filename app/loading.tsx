/**
 * Instant loading state for every page. Links prefetch dynamic routes up to this boundary, so a tap
 * paints this skeleton immediately and the real page streams in behind it.
 */
export default function Loading() {
  const line = "animate-pulse rounded bg-line";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className={`${line} h-3 w-16`} />
        <div className={`${line} h-8 w-24`} />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3 rounded-xl border border-line bg-card p-4">
          <div className={`${line} h-3 w-40`} />
          <div className={`${line} h-5 w-56`} />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-2">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className={`${line} h-14 w-14 rounded-full`} />
                  <div className={`${line} h-4 w-20`} />
                </div>
              ))}
            </div>
            <div className="space-y-2 border-l border-line pl-3">
              {[0, 1].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className={`${line} h-10 w-10 rounded-full`} />
                  <div className={`${line} h-4 w-16`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
