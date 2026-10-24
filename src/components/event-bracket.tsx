import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { bracketRoundLabel } from "@/lib/bracket";
import type { EventBracketGame, EventPlacement, Team } from "@/lib/types";

function TeamLine({ team, winner }: { team: Team | null | undefined; winner?: boolean }) {
  if (!team) {
    return <p className="text-sm text-muted-foreground">TBD</p>;
  }
  return (
    <p className={`flex items-center gap-2 text-sm ${winner ? "font-semibold" : ""}`}>
      <span className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: team.colorHex }} />
      {team.name}
    </p>
  );
}

export function EventBracket({
  games,
  placements,
  fieldTeams,
}: {
  games: EventBracketGame[];
  placements?: EventPlacement[];
  fieldTeams?: Team[];
}) {
  if (!games.length) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {fieldTeams?.length
            ? "Finals field — placements appear here after results are finalized."
            : "No elimination bracket yet."}
        </p>
        {!!fieldTeams?.length && (
          <div className="grid gap-2 sm:grid-cols-2">
            {fieldTeams.map((team) => (
              <div key={team.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                <TeamLine team={team} />
              </div>
            ))}
          </div>
        )}
        {!!placements?.length && (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
            {placements.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-3 py-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                  {row.placement}
                </span>
                <TeamLine team={row.team} winner={row.placement === 1} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const totalRounds = Math.max(...games.map((game) => game.round));
  const rounds = Array.from({ length: totalRounds }, (_, index) =>
    games.filter((game) => game.round === index + 1),
  );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-stretch gap-6">
        {rounds.map((roundGames, index) => (
          <div key={roundGames[0]?.round ?? index} className="flex w-56 flex-col justify-around gap-4">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {bracketRoundLabel(index + 1, totalRounds)}
            </p>
            {roundGames.map((game) => {
              const postponed = game.match?.status === "POSTPONED";
              return (
                <div
                  key={game.id}
                  className={`rounded-xl border bg-card/85 p-3 shadow-sm ${
                    postponed ? "border-amber-500/40" : "border-border/70"
                  }`}
                >
                  <div className="space-y-2">
                    <TeamLine team={game.homeTeam} winner={game.winnerTeamId === game.homeTeamId} />
                    <TeamLine team={game.awayTeam} winner={game.winnerTeamId === game.awayTeamId} />
                  </div>
                  {game.match && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {game.match.status === "POSTPONED"
                          ? "Postponed"
                          : `${game.match.homeScore} – ${game.match.awayScore}`}
                      </p>
                      {game.match.status === "POSTPONED" && game.match.postponeReason && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Reason: {game.match.postponeReason}
                        </p>
                      )}
                    </div>
                  )}
                  {!game.awayTeamId && game.homeTeamId && (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      Bye
                    </Badge>
                  )}
                  {game.round === totalRounds && game.winnerTeam && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <Trophy className="size-3.5" />
                      {game.winnerTeam.name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
