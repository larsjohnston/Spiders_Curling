import type { End } from "@/lib/types";
import { endTotals } from "@/lib/ends";

const shortName = (team: string) => team.split(",")[0];

/** End-by-end score, scoreboard style: one column per end plus the total. */
export default function Linescore({ ends, opponent }: { ends: End[]; opponent: string }) {
  const totals = endTotals(ends);
  const cell = "w-7 py-1 text-center tabular-nums";
  return (
    <div className="overflow-x-auto">
      <table className="text-sm" aria-label="Score by end">
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" className="pr-2 text-left font-medium">
              End
            </th>
            {ends.map((_, i) => (
              <th key={i} scope="col" className={`${cell} font-medium`}>
                {i + 1}
              </th>
            ))}
            <th scope="col" className={`${cell} border-l border-line font-semibold text-ink`}>
              T
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="pr-2 text-left font-semibold">
              Us
            </th>
            {ends.map((e, i) => (
              <td key={i} className={`${cell} ${e.us ? "font-semibold" : "text-muted"}`}>
                {e.us}
              </td>
            ))}
            <td className={`${cell} border-l border-line font-bold`}>{totals.us}</td>
          </tr>
          <tr>
            <th scope="row" className="max-w-24 truncate pr-2 text-left font-semibold">
              {shortName(opponent)}
            </th>
            {ends.map((e, i) => (
              <td key={i} className={`${cell} ${e.them ? "font-semibold" : "text-muted"}`}>
                {e.them}
              </td>
            ))}
            <td className={`${cell} border-l border-line font-bold`}>{totals.them}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
