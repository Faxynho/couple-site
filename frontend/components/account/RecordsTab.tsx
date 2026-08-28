"use client";

import { ReactNode, useState } from "react";
import { GAMES } from "@/lib/games";
import { GAME_RANKS, GAMES_WITHOUT_DUEL, formatRecordValue, rankLabel } from "@/lib/accountFormat";
import { AccountId, AccountRecords, AccountsOverview, RecordEntry } from "@/lib/accountTypes";

interface RecordsTabProps {
  overview: AccountsOverview | null;
  error: string | null;
}

const ACCOUNT_ORDER = ["andre", "flavia"] as const;
type SubTab = "solo" | "duo" | "together";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "solo", label: "🙋 Solo" },
  { id: "duo", label: "⚔️ Duelo" },
  { id: "together", label: "💞 Juntos" },
];

function isBetter(candidate: RecordEntry, current: RecordEntry): boolean {
  if (candidate.scoreType !== current.scoreType) return false;
  return candidate.scoreType === "time" ? candidate.value < current.value : candidate.value > current.value;
}

function winnerIds(records: Record<AccountId, AccountRecords>, gameId: keyof AccountRecords["solo"], rank: string, mode: "solo" | "duo"): AccountId[] {
  const entries = ACCOUNT_ORDER.map((id) => [id, records[id][mode]?.[gameId]?.[rank]] as const).filter((entry): entry is readonly [AccountId, RecordEntry] => Boolean(entry[1]));
  return entries.filter(([, entry]) => entries.every(([, other]) => !isBetter(other, entry))).map(([id]) => id);
}

function trophyCounts(overview: AccountsOverview, mode: "solo" | "duo"): Record<AccountId, number> {
  const counts: Record<AccountId, number> = { andre: 0, flavia: 0 };
  for (const game of GAMES) {
    for (const rank of GAME_RANKS[game.id]) {
      for (const id of winnerIds(overview.records, game.id, rank, mode)) counts[id] += 1;
    }
  }
  return counts;
}

export default function RecordsTab({ overview, error }: RecordsTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("solo");

  if (error) return <p className="py-6 text-center text-sm text-rose-deep">{error}</p>;
  if (!overview) return <p className="py-6 text-center text-sm text-ink-soft">Carregando recordes...</p>;

  const { profiles, records, togetherRecords } = overview;

  return (
    <div className="flex flex-col gap-5">
      <div className="mx-auto flex flex-wrap justify-center gap-1.5 rounded-full bg-surface/60 p-1">
        {SUB_TABS.map((t) => (
          <SubTabButton key={t.id} active={subTab === t.id} onClick={() => setSubTab(t.id)}>
            {t.label}
          </SubTabButton>
        ))}
      </div>

      {(subTab === "solo" || subTab === "duo") && <TrophySummary overview={overview} mode={subTab} />}

      {subTab === "duo" && (
        <p className="text-center text-xs text-ink-soft">
          Melhor marca pessoal de cada um jogando em modo Duelo, contra quem for.
        </p>
      )}
      {subTab === "together" && (
        <p className="text-center text-xs text-ink-soft">
          A melhor marca que André e Flávia já fizeram juntos, jogando em dupla de verdade.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {GAMES.map((game) => {
          const ranks = GAME_RANKS[game.id];
          const noDuel = subTab === "duo" && GAMES_WITHOUT_DUEL.includes(game.id);
          return (
            <div key={game.id} className="rounded-xl2 bg-surface/60 p-4">
              <p className="font-display text-sm font-semibold text-ink">
                {game.emoji} {game.name}
              </p>

              {noDuel ? (
                <p className="mt-2 text-sm text-ink-soft">Este jogo não tem modo de Duelo.</p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {ranks.map((rank) => (
                    <div key={rank} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                      <span className="text-ink-soft">{rankLabel(game.id, rank)}</span>
                      {subTab === "together" ? (
                        <span className="font-medium text-ink">
                          {togetherRecords[game.id]?.[rank]
                            ? formatRecordValue(togetherRecords[game.id]![rank]!.value, togetherRecords[game.id]![rank]!.scoreType)
                            : "—"}
                        </span>
                      ) : (
                        <div className="flex flex-1 flex-wrap justify-end gap-x-5 gap-y-1">
                          {ACCOUNT_ORDER.map((id) => {
                            const entry = records[id][subTab]?.[game.id]?.[rank];
                            const winners = winnerIds(records, game.id, rank, subTab);
                            return (
                              <span key={id} className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="text-xs text-ink-soft">{profiles[id].name}{winners.includes(id) ? " 🏆" : ""}</span>
                                <span className="font-medium text-ink">
                                  {entry ? formatRecordValue(entry.value, entry.scoreType) : "—"}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrophySummary({ overview, mode }: { overview: AccountsOverview; mode: "solo" | "duo" }) {
  const counts = trophyCounts(overview, mode);
  return (
    <div className="glass-panel mx-auto w-full max-w-md rounded-xl2 px-4 py-3">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-ink-soft">🏆 Troféus {mode === "solo" ? "Solo" : "Duelo"}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        {ACCOUNT_ORDER.map((id) => (
          <div key={id} className="rounded-lg bg-surface/55 px-2 py-1.5">
            <p className="truncate text-xs text-ink-soft">{overview.profiles[id].name}</p>
            <p className="font-display text-lg font-semibold text-ink">{counts[id]} 🏆</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-rose text-white shadow-glow" : "text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
