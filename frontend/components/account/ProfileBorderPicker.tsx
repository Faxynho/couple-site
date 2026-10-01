"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Coins, Loader2, Lock } from "lucide-react";
import AccountAvatar from "./AccountAvatar";
import { fetchBorderState, purchaseBorder } from "@/lib/accountApi";
import { AccountId } from "@/lib/accountSession";
import { ProfileBorderState } from "@/lib/accountTypes";
import { PROFILE_BORDERS } from "@/lib/profileBorders";

interface ProfileBorderPickerProps {
  accountId: AccountId;
  /** Nome e foto do rascunho, para cada borda ser pré-visualizada na foto da pessoa. */
  name: string;
  photo: string | null;
  /** Borda escolhida no rascunho (`null` = sem borda). */
  selected: string | null;
  onSelect: (borderId: string | null) => void;
}

function formatCoins(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString("pt-BR");
}

/**
 * Lista de bordas dentro da edição do perfil. Mostra o saldo de moedas globais,
 * deixa escolher qualquer borda já desbloqueada e comprar as demais. A compra é
 * em dois toques (Desbloquear → Confirmar) porque as moedas globais são do
 * casal. Comprar NÃO equipa: a borda só é aplicada ao salvar o perfil.
 */
export default function ProfileBorderPicker({ accountId, name, photo, selected, onSelect }: ProfileBorderPickerProps) {
  const [state, setState] = useState<ProfileBorderState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoadError(null);
    fetchBorderState(accountId)
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Não foi possível carregar as bordas agora.");
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => load(), [load]);

  const handleBuy = async (borderId: string) => {
    setBuying(borderId);
    setMessage(null);
    try {
      const next = await purchaseBorder(accountId, borderId);
      setState(next);
      setConfirming(null);
      onSelect(borderId);
    } catch (err) {
      // Em falha de saldo o servidor devolve o estado atual — usa para corrigir o saldo na tela.
      const serverState = (err as { state?: Partial<ProfileBorderState> | null }).state;
      if (serverState) setState((prev) => (prev ? { ...prev, ...serverState } : prev));
      setConfirming(null);
      setMessage(err instanceof Error ? err.message : "Não foi possível comprar agora.");
    } finally {
      setBuying(null);
    }
  };

  const coins = state?.globalCoins ?? 0;
  const owned = new Set(state?.owned ?? []);
  const forSale = state ? PROFILE_BORDERS.filter((border) => state.prices[border.id] !== undefined) : [];

  return (
    <section aria-label="Bordas do perfil" className="w-full">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[color:var(--pc-text)]">Bordas do perfil</h3>
        {state && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--pc-panel-border)] bg-[color:var(--pc-panel-bg)] px-3 py-1 text-xs font-bold text-[color:var(--pc-text)]"
            aria-label={`Moedas globais: ${formatCoins(coins)}`}
          >
            <Coins size={14} aria-hidden="true" style={{ color: "var(--pc-accent)" }} />
            {formatCoins(coins)}
          </span>
        )}
      </div>

      {!state && !loadError && (
        <p className="py-6 text-center text-sm text-[color:var(--pc-text-soft)]">
          <Loader2 size={16} className="mr-1.5 inline animate-spin" aria-hidden="true" />
          Carregando bordas...
        </p>
      )}

      {loadError && (
        <div className="py-4 text-center">
          <p className="text-sm text-rose-deep">{loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-2 text-sm font-semibold underline decoration-dotted underline-offset-4 text-[color:var(--pc-text)]">
            Tentar de novo
          </button>
        </div>
      )}

      {state && (
        <ul className="grid grid-cols-2 gap-2.5 min-[400px]:grid-cols-3">
          <li>
            <button
              type="button"
              aria-pressed={selected === null}
              aria-label="Sem borda"
              data-selected={selected === null}
              onClick={() => onSelect(null)}
              className="border-tile border-tile-owned h-full w-full"
            >
              <AccountAvatar name={name} photo={photo} accountId={accountId} size={52} border={null} />
              <span className="text-xs font-bold text-[color:var(--pc-text)]">Sem borda</span>
              <span className="text-[0.68rem] font-semibold text-[color:var(--pc-text-soft)]">
                {selected === null ? (
                  <>
                    <Check size={11} className="mr-0.5 inline" aria-hidden="true" />
                    Em uso
                  </>
                ) : (
                  "Padrão"
                )}
              </span>
            </button>
          </li>

          {forSale.map((border) => {
            const price = state.prices[border.id];
            const isOwned = owned.has(border.id);
            const isSelected = selected === border.id;
            const missing = Math.max(0, price - coins);
            const preview = (
              <AccountAvatar name={name} photo={photo} accountId={accountId} size={52} border={border.id} />
            );

            if (isOwned) {
              return (
                <li key={border.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`Borda ${border.name}`}
                    data-selected={isSelected}
                    onClick={() => onSelect(border.id)}
                    className="border-tile border-tile-owned h-full w-full"
                  >
                    {preview}
                    <span className="text-xs font-bold leading-tight text-[color:var(--pc-text)]">{border.name}</span>
                    <span className="text-[0.68rem] font-semibold text-[color:var(--pc-text-soft)]">
                      {isSelected ? (
                        <>
                          <Check size={11} className="mr-0.5 inline" aria-hidden="true" />
                          Em uso
                        </>
                      ) : (
                        "Desbloqueada"
                      )}
                    </span>
                  </button>
                </li>
              );
            }

            return (
              <li key={border.id}>
                <div className="border-tile h-full w-full" data-selected="false" data-locked="true" title={border.description}>
                  {preview}
                  <span className="text-xs font-bold leading-tight text-[color:var(--pc-text)]">{border.name}</span>
                  <span className="border-tile-price">
                    <Lock size={10} aria-hidden="true" />
                    <Coins size={11} aria-hidden="true" />
                    {formatCoins(price)}
                  </span>
                  {confirming === border.id ? (
                    <div className="flex w-full gap-1.5">
                      <button
                        type="button"
                        className="border-tile-buy"
                        disabled={buying !== null}
                        aria-label={`Confirmar compra de ${border.name}`}
                        onClick={() => void handleBuy(border.id)}
                      >
                        {buying === border.id ? <Loader2 size={12} className="mx-auto animate-spin" aria-hidden="true" /> : "Confirmar"}
                      </button>
                      <button
                        type="button"
                        className="border-tile-buy border-tile-buy-ghost"
                        disabled={buying !== null}
                        aria-label={`Cancelar compra de ${border.name}`}
                        onClick={() => setConfirming(null)}
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="border-tile-buy"
                      disabled={missing > 0 || buying !== null}
                      aria-label={
                        missing > 0
                          ? `${border.name}: faltam ${formatCoins(missing)} moedas`
                          : `Desbloquear ${border.name} por ${formatCoins(price)} moedas`
                      }
                      onClick={() => {
                        setMessage(null);
                        setConfirming(border.id);
                      }}
                    >
                      {missing > 0 ? `Faltam ${formatCoins(missing)}` : "Desbloquear"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p role="status" aria-live="polite" className={`mt-2.5 text-center text-xs ${message ? "text-rose-deep" : "text-[color:var(--pc-text-soft)]"}`}>
        {message ?? "As moedas globais são do casal: ganhe em minijogos, conquistas e objetivos."}
      </p>
    </section>
  );
}
