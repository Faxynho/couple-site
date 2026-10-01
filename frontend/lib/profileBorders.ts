/**
 * Catálogo VISUAL das bordas de perfil (molduras em volta do avatar).
 *
 * O servidor só conhece `id` e `preço` (backend/src/accounts/profileBorders.ts);
 * tudo o que é aparência mora aqui. Os dois catálogos se ligam pelo MESMO `id`
 * e o teste `test/profileBorders.test.ts` falha se um lado ficar sem o outro.
 *
 * ── COMO ADICIONAR UMA BORDA NOVA ───────────────────────────────────────────
 * 1. Coloque a imagem em `frontend/public/borders/` (PNG com fundo
 *    transparente, SVG ou WebP — quadrada, de preferência 512×512).
 * 2. Adicione uma entrada em `PROFILE_BORDERS` abaixo (a ordem da lista é a
 *    ordem na loja).
 * 3. Adicione o mesmo `id` com o preço em
 *    `backend/src/accounts/profileBorders.ts` (PROFILE_BORDER_PRICES).
 *
 * ── COMO AJUSTAR TAMANHO E POSIÇÃO ──────────────────────────────────────────
 * A imagem da borda é desenhada centrada no avatar. Três números controlam
 * o encaixe:
 *
 * • `holeRatio` — TAMANHO. É o diâmetro do "buraco" da moldura (a parte
 *   transparente onde a foto aparece) dividido pela largura da imagem.
 *   Buraco de 360px numa imagem de 512px → 360 / 512 = 0.70.
 *   Menor = a moldura fica maior em volta da foto (mais espaço para
 *   enfeites); maior = moldura mais justa. Valor entre 0.2 e 1.
 * • `offsetX` / `offsetY` — POSIÇÃO. Deslocamento fino da moldura, medido
 *   em fração do tamanho do avatar (0.1 = 10% do diâmetro da foto).
 *   Positivo em X = direita; positivo em Y = para baixo. O padrão é 0.
 *   Use quando o buraco não está no centro da imagem. Regra prática:
 *   offset = (centro da imagem − centro do buraco, em pixels) ÷ (diâmetro
 *   do buraco em pixels). Ex.: o buraco está 40px ABAIXO do centro, e mede
 *   360px → offsetY = −40 / 360 ≈ −0.11 (sobe a moldura para compensar).
 * • `layer` — CAMADA. "front" (padrão) desenha a moldura POR CIMA da foto;
 *   "back" desenha ATRÁS da foto (bom para asas, orelhas, fundos).
 */
export interface ProfileBorderDefinition {
  /** Igual ao id no catálogo do servidor. Não mude depois de publicada: é
   *  o que fica salvo na conta de quem comprou. */
  id: string;
  name: string;
  description: string;
  /** Caminho da imagem a partir de `frontend/public`. */
  image: string;
  holeRatio: number;
  offsetX?: number;
  offsetY?: number;
  layer?: "front" | "back";
}

export const PROFILE_BORDERS: readonly ProfileBorderDefinition[] = [
  {
    id: "laco-rosa",
    name: "Laço Rosa",
    description: "Um anel rosinha de perolinhas com um laço fofo.",
    image: "/borders/laco-rosa.svg",
    holeRatio: 0.72,
  },
  {
    id: "ciranda-coracoes",
    name: "Ciranda de Corações",
    description: "Corações rosa e lilás dançando em volta da foto.",
    image: "/borders/ciranda-coracoes.svg",
    holeRatio: 0.72,
  },
  {
    id: "ceu-estrelado",
    name: "Céu Estrelado",
    description: "Uma noite roxa com lua, estrelas e brilhinhos.",
    image: "/borders/ceu-estrelado.svg",
    holeRatio: 0.72,
  },
  {
    id: "asas-de-anjo",
    name: "Asas de Anjo",
    description: "Asas macias atrás da foto e um aro dourado.",
    image: "/borders/asas-de-anjo.svg",
    holeRatio: 0.5625,
    layer: "back",
  },
  {
    id: "coroa-real",
    name: "Coroa Real",
    description: "Moldura de ouro com gemas e uma coroa no topo.",
    image: "/borders/coroa-real.svg",
    holeRatio: 0.72,
  },
];

const BY_ID = new Map(PROFILE_BORDERS.map((border) => [border.id, border]));

/** Definição visual de uma borda, ou `null` para "sem borda" / id que não
 *  existe mais no catálogo (assim o avatar nunca quebra por causa disso). */
export function getProfileBorder(id: string | null | undefined): ProfileBorderDefinition | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export interface BorderFrameGeometry {
  /** Largura e altura da imagem da moldura, como fração do tamanho do avatar
   *  (1.39 = a moldura é 39% maior que a foto). */
  scale: number;
  /** Posição do canto superior esquerdo da moldura em relação ao canto
   *  superior esquerdo do avatar, também como fração do tamanho do avatar
   *  (negativa = a moldura sai para fora da foto). */
  left: number;
  top: number;
}

const MIN_HOLE_RATIO = 0.2;

/** Calcula o tamanho e a posição da moldura para o "buraco" dela coincidir com
 *  o avatar. Tudo em FRAÇÕES do avatar (e não em px), para a moldura acompanhar
 *  o avatar mesmo que algum CSS do site o redimensione. */
export function getBorderFrameGeometry(border: ProfileBorderDefinition): BorderFrameGeometry {
  const ratio = Number.isFinite(border.holeRatio) ? Math.min(1, Math.max(MIN_HOLE_RATIO, border.holeRatio)) : 1;
  const scale = 1 / ratio;
  const centered = (1 - scale) / 2;
  return {
    scale,
    left: centered + (border.offsetX ?? 0),
    top: centered + (border.offsetY ?? 0),
  };
}
