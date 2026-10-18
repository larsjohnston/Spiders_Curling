"use client";

import { useTransition } from "react";
import { setAway } from "@/app/actions";
import { POSITIONS } from "@/lib/config";
import type { Game, Player } from "@/lib/types";
import Avatar from "./Avatar";
import { useMe } from "./useMe";

/** Playing (left) and subs (right), ✕ on anyone away, and an away toggle for "me". */
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

  const heading = "mb-2 text-xs font-semibold uppercase tracking-wide text-muted";

  return (
    <div className="space-y-3">
      {/* Two columns: who's playing on the left, everyone else (subs) on the right. */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className={heading}>Playing</div>
          {spots.length > 0 ? (
            <ul className="space-y-2">
              {spots.map((s) => (
                <li key={s.position} className="flex items-center gap-2">
                  <Avatar player={s.player} size="md" away={away.has(s.player.id)} highlight={s.player.id === me} />
                  <span className="truncate font-medium">{s.player.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Not set yet</p>
          )}
        </div>
        <div className="border-l border-line pl-3">
          <div className={heading}>Subs</div>
          <ul className="space-y-2">
            {subs.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <Avatar player={p} size="sm" away={away.has(p.id)} highlight={p.id === me} />
                <span className={`truncate text-sm ${away.has(p.id) ? "text-muted line-through" : ""}`}>{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

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
