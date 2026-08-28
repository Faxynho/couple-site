"use client";

import { useEffect, useState } from "react";
import { fetchAccounts } from "@/lib/accountApi";
import { AccountId, subscribeToActiveAccountChange } from "@/lib/accountSession";

/**
 * Mapa accountId -> foto (base64) das duas contas fixas — usado em qualquer
 * lugar que mostra o "perfil" de um jogador (bolha de conexão da sala, chip
 * dentro dos jogos) para exibir a foto de verdade em vez de só a inicial
 * quando a pessoa tem uma salva.
 */
export function useAccountPhotos(): Partial<Record<AccountId, string | null>> {
  const [photos, setPhotos] = useState<Partial<Record<AccountId, string | null>>>({});

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchAccounts()
        .then((accounts) => {
          if (!alive) return;
          const map: Partial<Record<AccountId, string | null>> = {};
          for (const account of accounts) map[account.id] = account.photo;
          setPhotos(map);
        })
        .catch(() => {
          // Servidor fora do ar: mantém o que já tinha (ou vazio) e cai de
          // volta pras iniciais — nunca quebra a tela por causa disso.
        });
    };
    load();
    // Cobre trocar a própria foto e voltar pra essa tela sem dar refresh.
    return subscribeToActiveAccountChange(load);
  }, []);

  return photos;
}
