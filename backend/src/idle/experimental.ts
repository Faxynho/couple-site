/**
 * Recursos EXPERIMENTAIS: só existem no ambiente DEV ("dev"), nunca no jogo normal ("real").
 *
 * Regra do projeto (ver CLAUDE.md na raiz):
 *  - Tudo que o jogo tem hoje vale igual nos dois ambientes: o jogo normal e o DEV rodam o MESMO código
 *    (`IdleStore`), só com saves separados. Mudança comum = código comum, e vai para os dois sozinha.
 *  - Algo que deve ficar só no DEV é registrado aqui, e todo código novo dele só roda quando
 *    `isExperimentalEnabled(id, environment)` for verdadeiro.
 *  - Para liberar no jogo normal, basta REMOVER a entrada daqui (e o `if` que a protege).
 *
 * Os arquivos `kittyDev*` (constelações, estrelas, despertar, Pedra Estelar, ilhas) e as missões `kitty-dev-*`
 * mantêm o nome antigo, mas JÁ FAZEM PARTE do jogo normal. Não são experimentais.
 */
import type { GameEnvironment } from "./types";

export interface ExperimentalFeature {
  /** O que é e por que ainda está só no DEV. */
  description: string;
}

/** Vazio de propósito: hoje todo o conteúdo do DEV já está liberado no jogo normal. */
export const EXPERIMENTAL_FEATURES: Readonly<Record<string, ExperimentalFeature>> = {};

export function isExperimentalEnabled(
  feature: string,
  environment: GameEnvironment,
  registry: Readonly<Record<string, ExperimentalFeature>> = EXPERIMENTAL_FEATURES,
): boolean {
  return environment === "dev" && Object.hasOwn(registry, feature);
}

/** IDs dos recursos experimentais ligados neste ambiente (sempre `[]` no jogo normal). */
export function experimentalFeaturesFor(
  environment: GameEnvironment,
  registry: Readonly<Record<string, ExperimentalFeature>> = EXPERIMENTAL_FEATURES,
): string[] {
  return environment === "dev" ? Object.keys(registry) : [];
}
