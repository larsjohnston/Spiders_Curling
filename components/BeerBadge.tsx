/** Beer glass for a finished game: full colour with the jug count once logged, a ghost while it isn't. */
export default function BeerBadge({ jugs, size = "md" }: { jugs: number | null; size?: "sm" | "md" }) {
  const text = size === "sm" ? "text-base" : "text-2xl";
  if (jugs === null) {
    return (
      <span title="No jugs logged yet" className={`${text} opacity-25 grayscale`} aria-label="No jugs logged">
        🍺
      </span>
    );
  }
  return (
    <span title={`${jugs} jug${jugs === 1 ? "" : "s"}`} className="inline-flex items-center" aria-label={`${jugs} jugs`}>
      <span className={`${text} ${jugs === 0 ? "opacity-40 grayscale" : ""}`}>🍺</span>
      <span className="ml-0.5 text-xs font-bold text-amber-600 tabular-nums">×{jugs}</span>
    </span>
  );
}
