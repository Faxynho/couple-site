"use client";

import { ReactNode } from "react";
import { formatDuration, gameName, genericRankLabel, pickTopEntry } from "@/lib/accountFormat";
import { AccountsOverview } from "@/lib/accountTypes";

interface StatsTabProps {
  overview: AccountsOverview | null;
  error: string | null;
}

const ACCOUNT_ORDER = ["andre", "flavia"] as const;

export default function StatsTab({ overview, error }: StatsTabProps) {
  if (error) return <p className="py-6 text-center text-sm text-rose-deep">{error}</p>;
  if (!overview) return <p className="py-6 text-center text-sm text-ink-soft">Carregando estatísticas...</p>;

  const { duoShared, duoPerAccount, solo, profiles } = overview;
  const topDuoDifficulty = pickTopEntry(duoShared.difficultyCounts);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h3 className="font-display text-base font-semibold text-ink">💞 Modo Duo</h3>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatTile label="Partidas juntos" value={String(duoShared.togetherCompleted)} />
          <StatTile label="Duelos jogados" value={String(duoShared.totalDuels)} />
          <StatTile label="Tempo juntos" value={formatDuration(duoShared.timeMs)} />
        </div>

        <p className="mt-3 text-center text-sm text-ink-soft">
          Dificuldade mais jogada:{" "}
          <span className="font-medium text-ink">
            {topDuoDifficulty ? genericRankLabel(topDuoDifficulty.key) : "—"}
          </span>
        </p>
        <p className="mt-1 text-center text-xs text-ink-soft/80">
          Total de partidas finalizadas juntos: {duoShared.totalGamesFinished}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACCOUNT_ORDER.map((id) => {
            const participation = duoPerAccount[id];
            const topWin = pickTopEntry(participation.gameWinCounts);
            const topLoss = pickTopEntry(participation.gameLossCounts);
            return (
              <div key={id} className="rounded-xl2 bg-surface/60 p-4">
                <p className="font-display text-sm font-semibold text-ink">{profiles[id].name}</p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <Row label="Vitórias em duelo" value={participation.duelWins} />
                  <Row label="Derrotas em duelo" value={participation.duelLosses} />
                  <Row
                    label="Mais vence em"
                    value={topWin ? `${gameName(topWin.key)} (${topWin.count})` : "—"}
                  />
                  <Row
                    label="Mais perde em"
                    value={topLoss ? `${gameName(topLoss.key)} (${topLoss.count})` : "—"}
                  />
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="font-display text-base font-semibold text-ink">🙋 Modo Solo</h3>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACCOUNT_ORDER.map((id) => {
            const stats = solo[id];
            const topGame = pickTopEntry(stats.gamePlayCounts);
            const topDifficulty = pickTopEntry(stats.difficultyCounts);
            return (
              <div key={id} className="rounded-xl2 bg-surface/60 p-4">
                <p className="font-display text-sm font-semibold text-ink">{profiles[id].name}</p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <Row label="Tempo no site" value={formatDuration(stats.timeMs)} />
                  <Row
                    label="Jogo mais jogado"
                    value={topGame ? `${gameName(topGame.key)} (${topGame.count})` : "—"}
                  />
                  <Row
                    label="Dificuldade mais jogada"
                    value={topDifficulty ? genericRankLabel(topDifficulty.key) : "—"}
                  />
                </dl>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl2 bg-surface/60 py-3 text-center">
      <p className="font-display text-lg font-semibold text-ink">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
