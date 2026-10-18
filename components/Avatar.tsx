import type { Player } from "@/lib/types";

const SIZES = { sm: "h-10 w-10 text-sm", md: "h-14 w-14 text-lg", lg: "h-20 w-20 text-2xl" };

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Round player photo (or initials), with a red ✕ badge when they're away. */
export default function Avatar({
  player,
  size = "md",
  away = false,
  highlight = false,
}: {
  player: Pick<Player, "name" | "photo_url">;
  size?: keyof typeof SIZES;
  away?: boolean;
  highlight?: boolean;
}) {
  const ring = highlight ? "ring-2 ring-stone-blue ring-offset-2 ring-offset-card" : "";
  return (
    <span className={`relative inline-block shrink-0 ${SIZES[size]}`}>
      {player.photo_url ? (
        // Plain <img>: photos are tiny pre-resized JPEGs, no need for the image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.photo_url}
          alt={player.name}
          className={`h-full w-full rounded-full object-cover ${ring} ${away ? "opacity-40 grayscale" : ""}`}
        />
      ) : (
        <span
          aria-label={player.name}
          className={`flex h-full w-full items-center justify-center rounded-full bg-navy font-semibold text-white dark:bg-line ${ring} ${
            away ? "opacity-40" : ""
          }`}
        >
          {initials(player.name)}
        </span>
      )}
      {away && (
        <span
          aria-label="Away"
          className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-red text-xs font-bold text-white ring-2 ring-card"
        >
          ✕
        </span>
      )}
    </span>
  );
}
