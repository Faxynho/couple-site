// NOME LEGADO: este arquivo faz parte do jogo normal E do DEV (não é experimental). Ver CLAUDE.md e experimental.ts.
/**
 * Conquistas e missões de Pedras Estelares, estrelas, constelações, despertar e itens do Mundo da Hello Kitty.
 *
 * Regras de design:
 *  - Conquistas são permanentes e feitas uma única vez: as recompensas (moedas globais) sobem com a dificuldade,
 *    na mesma escala das conquistas atuais da Hello Kitty (50 → 1.500).
 *  - Missões renováveis NUNCA podem ficar impossíveis: cada uma tem uma regra de disponibilidade (kittyDevQuestAvailable
 *    no IdleStore) e só entra no sorteio quando ainda existe algo a fazer. As de "viagem" e a de "observatório" funcionam sempre.
 *  - Todo dia sai pelo menos 1 missão do grupo "devstone" (Pedra Estelar): a de "observatório" é o último recurso e nunca falta.
 */
import type { AchievementDefinition, KittyObjectiveDefinition } from "./idleConfig";

const STONE = "/idle/dev/pedra-estelar.webp";
const CLICK = "/idle/events/click2.webp";
const WORLD = "/idle/islands/island-1.webp";
const CRYSTAL = "/idle/dev/cst/cst-crystal.webp";
const CONST_ICON = "/idle/dev/cst/cst-icon.webp";

type DevStat = Extract<AchievementDefinition["condition"], { type: "devStat" }>["stat"];

function devAchievement(id: string, title: string, description: string, reward: number, stat: DevStat, target: number, iconAsset: string, iconItemId?: string): AchievementDefinition {
  return { id, mode: "kitty", title, description, reward, iconAsset, ...(iconItemId ? { iconItemId } : {}), condition: { type: "devStat", stat, target } };
}

export const KITTY_DEV_ACHIEVEMENTS: AchievementDefinition[] = [
  // ----- Pedras Estelares ganhas (a cada 10 níveis de personagem) -----
  devAchievement("kitty-dev-stone-1", "Primeira pedrinha", "Ganhe 1 Pedra Estelar", 20, "stonesEarned", 1, STONE),
  devAchievement("kitty-dev-stone-50", "Bolso brilhante", "Ganhe 50 Pedras Estelares", 90, "stonesEarned", 50, STONE),
  devAchievement("kitty-dev-stone-150", "Chuva de pedras", "Ganhe 150 Pedras Estelares", 260, "stonesEarned", 150, STONE),
  devAchievement("kitty-dev-stone-300", "Mina estelar", "Ganhe 300 Pedras Estelares", 600, "stonesEarned", 300, STONE),
  devAchievement("kitty-dev-stone-550", "Galáxia no bolso", "Ganhe 550 Pedras Estelares", 1_200, "stonesEarned", 550, STONE),
  // ----- Estrelas (soma dos níveis de todas as constelações) -----
  devAchievement("kitty-dev-star-1", "Primeira estrela", "Acenda 1 estrela", 40, "stars", 1, CRYSTAL),
  devAchievement("kitty-dev-star-10", "Céu começando", "Acenda 10 estrelas", 150, "stars", 10, CRYSTAL),
  devAchievement("kitty-dev-star-30", "Noite estrelada", "Acenda 30 estrelas", 400, "stars", 30, CRYSTAL),
  devAchievement("kitty-dev-star-60", "Via Láctea", "Acenda 60 estrelas", 800, "stars", 60, CRYSTAL),
  devAchievement("kitty-dev-star-120", "Universo completo", "Acenda as 120 estrelas de todos os personagens", 2_000, "stars", 120, CRYSTAL),
  // ----- Constelações completas -----
  devAchievement("kitty-dev-const-1", "Desenhando o céu", "Complete 1 constelação", 120, "constellations", 1, CONST_ICON),
  devAchievement("kitty-dev-const-6", "Pequeno atlas", "Complete 6 constelações", 450, "constellations", 6, CONST_ICON),
  devAchievement("kitty-dev-const-12", "Astrônoma fofa", "Complete 12 constelações", 900, "constellations", 12, CONST_ICON),
  devAchievement("kitty-dev-const-24", "Mestra das constelações", "Complete as 24 constelações", 2_400, "constellations", 24, CONST_ICON),
  // ----- Despertar -----
  devAchievement("kitty-dev-awake-1", "Primeiro despertar", "Desperte o primeiro personagem", 500, "awakened", 1, "/idle/characters/awake/awake-hello-kitty.webp"),
  devAchievement("kitty-dev-awake-6", "Turma acordando", "Desperte 6 personagens", 900, "awakened", 6, "/idle/characters/awake/awake-dear-daniel.webp"),
  devAchievement("kitty-dev-awake-12", "Meio caminho brilhante", "Desperte 12 personagens", 2_000, "awakened", 12, "/idle/characters/awake/awake-my-melody.webp"),
  devAchievement("kitty-dev-awake-24", "Todos despertos", "Desperte os 24 personagens", 5_000, "awakened", 24, "/idle/characters/awake/awake-hello-kitty.webp"),
  // ----- Itens exclusivos -----
  devAchievement("kitty-dev-click-item-1", "Mãozinha de ouro", "Compre 1 item de clique", 40, "clickItems", 1, CLICK),
  devAchievement("kitty-dev-click-item-6", "Coleção de cliques", "Compre 6 itens de clique", 180, "clickItems", 6, CLICK),
  devAchievement("kitty-dev-click-item-24", "Cliques por todos", "Compre os 24 itens de clique", 900, "clickItems", 24, CLICK),
  devAchievement("kitty-dev-stone-item-1", "Faro estelar", "Compre 1 item estelar", 50, "stoneItems", 1, STONE),
  devAchievement("kitty-dev-stone-item-6", "Caçadora de pedras", "Compre 6 itens estelares", 220, "stoneItems", 6, STONE),
  devAchievement("kitty-dev-stone-item-24", "Tesouro completo", "Compre os 24 itens estelares", 1_000, "stoneItems", 24, STONE),
  devAchievement("kitty-dev-item-max-1", "No máximo!", "Deixe 1 item no nível máximo", 150, "itemsMaxed", 1, CLICK),
  devAchievement("kitty-dev-item-max-12", "Itens lendários", "Deixe 12 itens no nível máximo", 700, "itemsMaxed", 12, CLICK),
  devAchievement("kitty-dev-item-max-48", "Perfeição absoluta", "Deixe os 48 itens no nível máximo", 3_000, "itemsMaxed", 48, CLICK),
];

export function kittyDevAchievementById(id: string): AchievementDefinition | undefined {
  return KITTY_DEV_ACHIEVEMENTS.find((item) => item.id === id);
}

/** Grupo de missões de Pedra Estelar: o sorteio diário sempre inclui uma delas. */
export const KITTY_DEV_REQUIRED_DAILY_GROUP = "devstone";

export const KITTY_DEV_OBJECTIVES: KittyObjectiveDefinition[] = [
  // Diárias (rápidas)
  { id: "kitty-dev-daily-travel", group: "travel", period: "daily", title: "Passeio pelas ilhas", description: "Viaje entre as ilhas 3 vezes", metric: "kittyDevTravels", target: 3, reward: 8 },
  { id: "kitty-dev-daily-item", group: "devitem", period: "daily", title: "Brilho de item", description: "Compre ou melhore 1 item de personagem", metric: "kittyDevItems", target: 1, reward: 15 },
  // Pedra Estelar (uma delas sempre aparece nas diárias)
  { id: "kitty-dev-daily-stone", group: "devstone", period: "daily", title: "Garimpo estelar", description: "Ganhe 1 Pedra Estelar", metric: "kittyDevStones", target: 1, reward: 20 },
  { id: "kitty-dev-daily-star", group: "devstone", period: "daily", title: "Pedra no céu", description: "Use Pedras Estelares para acender 1 estrela", metric: "kittyDevStars", target: 1, reward: 25 },
  { id: "kitty-dev-daily-sky", group: "devstone", period: "daily", title: "Observatório estelar", description: "Visite as constelações e confira suas Pedras Estelares", metric: "kittyDevSky", target: 1, reward: 10 },
  // Semanais (um pouco mais difíceis)
  { id: "kitty-dev-weekly-stone", group: "devstone", period: "weekly", title: "Mineradora de estrelas", description: "Ganhe 3 Pedras Estelares", metric: "kittyDevStones", target: 3, reward: 50 },
  { id: "kitty-dev-weekly-travel", group: "travel", period: "weekly", title: "Exploradora de ilhas", description: "Viaje entre as ilhas 15 vezes", metric: "kittyDevTravels", target: 15, reward: 35 },
  { id: "kitty-dev-weekly-items", group: "devitem", period: "weekly", title: "Colecionadora de itens", description: "Compre ou melhore 4 itens de personagem", metric: "kittyDevItems", target: 4, reward: 60 },
  { id: "kitty-dev-weekly-star", group: "devstar", period: "weekly", title: "Noite estrelada", description: "Evolua 1 estrela de constelação", metric: "kittyDevStars", target: 1, reward: 70 },
];

export function kittyDevObjectiveById(id: string): KittyObjectiveDefinition | undefined {
  return KITTY_DEV_OBJECTIVES.find((item) => item.id === id);
}
