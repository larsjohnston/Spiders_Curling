import type { Game, Player } from "@/lib/types";
import { charmAndJinx, playerRecords, recordText } from "@/lib/stats";
import Avatar from "@/components/Avatar";

const heading = "text-sm font-semibold uppercase tracking-wide text-muted";

/** Team record with each player on the ice, plus who's the lucky charm and who's the jinx. */
export default function LuckyCharms({ games, players }: { games: Game[]; players: Player[] }) {
  const rows = playerRecords(games, players);
  const { charm, jinx } = charmAndJinx(rows);
  if (!rows.some((r) => r.games > 0)) return null;

  return (
    <section className="space-y-2">
      <h2 className={heading}>Lucky charms</h2>
      {(charm || jinx) && (
        <div className="grid grid-cols-2 gap-2">
          {charm && (
            <div className="rounded-xl border-2 border-green-600 bg-green-600/10 p-3">
              <div className="flex items-center gap-2">
                <Avatar player={charm.player} size="sm" />
                <span className="text-2xl">🍀</span>
              </div>
              <div className="mt-1 text-sm font-semibold">
                {charm.player.name} is the lucky charm
              </div>
              <div className="text-xs text-muted">We&apos;re {recordText(charm)} with him on the ice.</div>
            </div>
          )}
          {jinx && (
            <div className="rounded-xl border-2 border-stone-red bg-stone-red/10 p-3">
              <div className="flex items-center gap-2">
                <Avatar player={jinx.player} size="sm" />
                <span className="text-2xl">🪦</span>
              </div>
              <div className="mt-1 text-sm font-semibold">{jinx.player.name} is the jinx</div>
              <div className="text-xs text-muted">{recordText(jinx)} with him. Just saying.</div>
            </div>
          )}
        </div>
      )}
      <table className="w-full overflow-hidden rounded-xl border border-line bg-card text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th className="py-2 pl-4 text-left font-medium">With him playing</th>
            <th className="w-16 font-medium">Record</th>
            <th className="w-14 pr-4 text-right font-medium">Win %</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr key={r.player.id} className="border-b border-line last:border-0">
              <td className="py-1.5 pl-4">
                <span className="flex items-center gap-2">
                  <Avatar player={r.player} size="xs" />
                  {r.player.name}
                  {r === charm && " 🍀"}
                  {r === jinx && " 🪦"}
                </span>
              </td>
              <td className="text-center">{r.games ? recordText(r) : "–"}</td>
              <td className="pr-4 text-right">{r.games ? `${Math.round(r.pct * 100)}%` : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted">Team record in games each guy actually played. Ties count as half a win.</p>
    </section>
  );
}
