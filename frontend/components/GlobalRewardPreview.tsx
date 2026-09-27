import Image from "next/image";
import { GameId } from "@/lib/types";
import { minigameGlobalReward } from "@/lib/minigameRewards";

export default function GlobalRewardPreview({ gameId, rank, andreSolo = false }: { gameId: GameId; rank: string; andreSolo?: boolean }) {
  if (andreSolo) return <div className="mt-4 rounded-xl2 border border-surface/70 bg-surface/45 px-3 py-2 text-center text-xs font-semibold text-ink-soft">Solo de André não concede moeda global</div>;
  const reward = minigameGlobalReward(gameId, rank);
  return <div className="mt-4 flex items-center justify-center gap-2 rounded-xl2 border border-[#f0cf7d] bg-[#fff8dc] px-3 py-2 text-sm font-bold text-[#8b6018]"><span>Recompensa</span><Image src="/idle/icons/global-coin.webp" alt="" width={25} height={25} /><strong>{reward}</strong></div>;
}
