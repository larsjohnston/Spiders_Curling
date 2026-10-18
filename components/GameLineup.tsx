"use client";

import { useState, useTransition } from "react";
import { setAway } from "@/app/actions";
import { POSITIONS } from "@/lib/config";
import { EXCUSE_MAX, EXCUSES } from "@/lib/excuses";
import type { Game, Player } from "@/lib/types";
import Avatar from "./Avatar";
import { useMe } from "./useMe";

/** Playing (left) and subs (right), ✕ (and their excuse) on anyone away, and an away toggle for "me". */
export default function GameLineup({
  game,
  players,
  canMarkAway,
}: {
  game: Pick<Game, "id" | "lineup" | "away" | "excuses">;
  players: Player[];
  canMarkAway: boolean;
}) {
  const [me] = useMe();
  const [pending, startTransition] = useTransition();
  const [picking, setPicking] = useState(false);
  const [custom, setCustom] = useState("");
  const away = new Set(game.away);
  const spots = [...game.lineup].sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position));
  const playingIds = new Set(spots.map((s) => s.player.id));
  const subs = players.filter((p) => !playingIds.has(p.id));
  const meKnown = !!me && players.some((p) => p.id === me);
  const meAway = !!me && away.has(me);

  const heading = "mb-2 text-xs font-semibold uppercase tracking-wide text-muted";
  const bail = (excuse: string | null) =>
    startTransition(async () => {
      await setAway(game.id, me!, true, excuse);
      setPicking(false);
      setCustom("");
    });

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
                  <span className="min-w-0 font-medium">
                    {s.player.name}
                    {away.has(s.player.id) && <Unavailable excuse={game.excuses[s.player.id]} />}
                  </span>
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
                <span className={`min-w-0 text-sm ${away.has(p.id) ? "text-muted" : ""}`}>
                  {p.name}
                  {away.has(p.id) && <Unavailable excuse={game.excuses[p.id]} />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {canMarkAway && meKnown && meAway && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => void (await setAway(game.id, me!, false)))}
          className="w-full rounded-lg border border-stone-red bg-stone-red/10 px-3 py-2 text-sm font-semibold text-stone-red"
        >
          {pending ? "Saving…" : "You're marked away — tap if you can make it"}
        </button>
      )}

      {canMarkAway && meKnown && !meAway && !picking && (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink"
        >
          Can&apos;t make it
        </button>
      )}

      {canMarkAway && meKnown && !meAway && picking && (
        <div className="space-y-2 rounded-xl border-2 border-stone-red p-3">
          <div className="text-sm font-semibold">What&apos;s your excuse? The team will see it.</div>
          {EXCUSES.map((e) => (
            <button
              key={e}
              type="button"
              disabled={pending}
              onClick={() => bail(e)}
              className="block w-full rounded-lg border border-line px-3 py-2 text-left text-sm active:bg-stone-red/10"
            >
              {e}
            </button>
          ))}
          <form
            className="flex gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (custom.trim()) bail(custom);
            }}
          >
            <input
              value={custom}
              onChange={(ev) => setCustom(ev.target.value)}
              maxLength={EXCUSE_MAX}
              placeholder="✏️ Write your own…"
              className="input py-2 text-sm"
            />
            <button className="btn shrink-0 py-2 text-sm" disabled={pending || !custom.trim()}>
              Send
            </button>
          </form>
          <div className="flex justify-between text-xs">
            <button type="button" className="text-muted underline" disabled={pending} onClick={() => bail(null)}>
              No excuse, just out
            </button>
            <button type="button" className="text-muted underline" onClick={() => setPicking(false)}>
              Never mind, I&apos;m in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Unavailable({ excuse }: { excuse?: string }) {
  return (
    <>
      <span className="block text-xs font-normal text-stone-red">(unavailable)</span>
      {excuse && <span className="block text-xs font-normal text-muted italic">&ldquo;{excuse}&rdquo;</span>}
    </>
  );
}
