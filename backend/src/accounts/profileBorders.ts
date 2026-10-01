import type { AccountStore } from "./AccountStore";
import type { AccountId } from "./types";
import type { IdleStore } from "../idle/IdleStore";

/**
 * Catálogo de bordas de perfil — a parte do SERVIDOR: só `id` e `preço`.
 *
 * O visual (imagem, nome, tamanho, posição) mora no frontend, em
 * `frontend/lib/profileBorders.ts`, ligado a este catálogo pelo MESMO `id`.
 * O preço fica só aqui de propósito: é o servidor que cobra as moedas
 * globais, então o cliente nunca consegue comprar por um valor diferente.
 *
 * Para criar uma borda nova: adicione uma linha aqui (id + preço) e a
 * entrada correspondente com o mesmo id no frontend. Para mudar o preço,
 * edite só o número abaixo. O teste `profileBorders.test.ts` do frontend
 * falha se os dois catálogos ficarem diferentes.
 *
 * Referência de balanceamento (moedas globais): um minigame concluído em
 * dupla paga de 8 a 34, os objetivos diários somam ~45, os semanais ~150, e
 * as decorações dos pets custam de 80 a 3.800 (mediana 700).
 */
export const PROFILE_BORDER_PRICES: Readonly<Record<string, number>> = {
  "laco-rosa": 150,
  "ciranda-coracoes": 400,
  "ceu-estrelado": 900,
  "asas-de-anjo": 1600,
  "coroa-real": 2800,
};

export const PROFILE_BORDER_IDS: readonly string[] = Object.keys(PROFILE_BORDER_PRICES);

export function isProfileBorderId(value: unknown): value is string {
  return typeof value === "string" && Object.hasOwn(PROFILE_BORDER_PRICES, value);
}

/** Forma da resposta de `GET /api/accounts/:id/borders` e da compra. */
export interface ProfileBorderState {
  equipped: string | null;
  owned: string[];
  prices: Readonly<Record<string, number>>;
  globalCoins: number;
}

type BorderAccounts = Pick<AccountStore, "getBorderState" | "ownsBorder" | "grantBorder">;
type BorderWallet = Pick<IdleStore, "getSnapshot" | "changeBalance">;

export function getProfileBorderState(accounts: BorderAccounts, wallet: BorderWallet, accountId: AccountId): ProfileBorderState {
  const { equipped, owned } = accounts.getBorderState(accountId);
  return { equipped, owned, prices: PROFILE_BORDER_PRICES, globalCoins: wallet.getSnapshot().globalCoins };
}

export type ProfileBorderPurchaseResult =
  | { status: 200; body: ProfileBorderState & { ok: true; alreadyOwned: boolean } }
  | { status: 400 | 409; body: Partial<ProfileBorderState> & { ok: false; error: string } };

/**
 * Compra uma borda com as moedas globais (a carteira é a mesma dos pets e do
 * Cantinho). Tudo é síncrono — verificar saldo, registrar a posse e descontar
 * acontecem no mesmo "tick", então duas requisições nunca se intercalam nem
 * permitem pagar duas vezes ou gastar o mesmo saldo duas vezes.
 *
 * Comprar não equipa: a borda só passa a aparecer quando a conta a escolhe em
 * `PUT /api/accounts/:id/profile`.
 */
export function purchaseProfileBorder(
  accounts: BorderAccounts,
  wallet: BorderWallet,
  accountId: AccountId,
  borderId: unknown,
): ProfileBorderPurchaseResult {
  if (!isProfileBorderId(borderId)) {
    return { status: 400, body: { ok: false, error: "Borda inválida." } };
  }
  if (accounts.ownsBorder(accountId, borderId)) {
    return { status: 200, body: { ok: true, alreadyOwned: true, ...getProfileBorderState(accounts, wallet, accountId) } };
  }

  const price = PROFILE_BORDER_PRICES[borderId];
  const balance = wallet.getSnapshot().globalCoins;
  if (balance < price) {
    return {
      status: 409,
      body: { ok: false, error: "Moedas globais insuficientes.", ...getProfileBorderState(accounts, wallet, accountId) },
    };
  }

  accounts.grantBorder(accountId, borderId);
  wallet.changeBalance("global", "remove", price);
  return { status: 200, body: { ok: true, alreadyOwned: false, ...getProfileBorderState(accounts, wallet, accountId) } };
}
