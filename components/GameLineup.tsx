"use client";

import { useTransition } from "react";
import { setAway } from "@/app/actions";
import { POSITIONS } from "@/lib/config";
import type { Game, Player } from "@/lib/types";
import Avatar from "./Avatar";
import { useMe } from "./useMe";

/** The four playing (big), the rest as subs (small), ✕ on anyone away, and an away toggle for "me". */
export default function GameLineup({
  game,
  players,
  canMarkAway,
}: {
  game: Pick<Game, "id" | "lineup" | "away">;
  players: Player[];
  canMarkAway: boolean;
}) {
  const [me] = useMe();
  const [pending, startTransition] = useTransition();
  const away = new Set(game.away);
  const spots = [...game.lineup].sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position));
  const playingIds = new Set(spots.map((s) => s.player.id));
  const subs = players.filter((p) => !playingIds.has(p.id));
  const meKnown = !!me && players.some((p) => p.id === me);
  const meAway = !!me && away.has(me);

  return (
    <div className="space-y-3">
      {spots.length > 0 ? (
        // Two columns: the four playing on the left, everyone else (subs) on the right.
        <div className="flex gap-3">
          <ul className="grid flex-1 grid-cols-2 gap-x-2 gap-y-3">
            {spots.map((s) => (
              <li key={s.position} className="flex flex-col items-center text-center">
                <Avatar player={s.player} size="md" away={away.has(s.player.id)} highlight={s.player.id === me} />
                <span className="mt-1 w-full truncate text-sm font-medium">{s.player.name}</span>
              </li>
            ))}
          </ul>
          {subs.length > 0 && (
            <div className="w-24 shrink-0 border-l border-line pl-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Subs</div>
              <ul className="space-y-2">
                {subs.map((p) => (
                  <li key={p.id} className="flex items-center gap-1.5">
                    <Avatar player={p} size="sm" away={away.has(p.id)} highlight={p.id === me} />
                    <span className={`truncate text-sm ${away.has(p.id) ? "text-muted line-through" : ""}`}>
                      {p.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">Lineup not set yet</p>
      )}

      {spots.length === 0 && subs.length > 0 && (
        <div className="flex items-center gap-3 border-t border-line pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Team</span>
          <ul className="flex flex-wrap gap-3">
            {subs.map((p) => (
              <li key={p.id} className="flex items-center gap-1.5">
                <Avatar player={p} size="sm" away={away.has(p.id)} highlight={p.id === me} />
                <span className={`text-sm ${away.has(p.id) ? "text-muted line-through" : ""}`}>{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canMarkAway && meKnown && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => void (await setAway(game.id, me!, !meAway)))}
          className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
            meAway ? "border-stone-red bg-stone-red/10 text-stone-red" : "border-line text-ink"
          }`}
        >
          {pending ? "Saving…" : meAway ? "You're marked away — tap if you can make it" : "Can't make it"}
        </button>
      )}
    </div>
  );
}
