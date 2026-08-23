/**
 * Tipos do banco de perguntas do Quiz. Mantidos separados da lógica de jogo
 * (QuizGame.ts) para que adicionar novas perguntas nunca exija tocar em
 * código de sala/pontuação/sincronização.
 */

export type QuizDifficulty = "easy" | "medium" | "hard";

export type QuizCategory =
  | "Conhecimentos Gerais"
  | "História"
  | "Geografia"
  | "Ciência"
  | "Tecnologia"
  | "Matemática"
  | "Astronomia"
  | "Animais"
  | "Natureza"
  | "Esportes"
  | "Filmes"
  | "Séries"
  | "Música"
  | "Jogos"
  | "Literatura"
  | "Cultura"
  | "Curiosidades";

/**
 * Uma pergunta "crua" tal como vive nos arquivos easy.ts/medium.ts/hard.ts.
 * `correctIndex` aponta para a alternativa certa dentro de `options`
 * (sempre 4 alternativas). Nunca é enviado ao cliente antes da hora —
 * isso é responsabilidade da camada de rede (socketHandlers), não daqui.
 */
export interface RawQuizQuestion {
  category: QuizCategory;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation?: string;
}

/** Pergunta já com um id estável (gerado a partir da dificuldade + posição no banco). */
export interface QuizQuestion extends RawQuizQuestion {
  id: string;
  difficulty: QuizDifficulty;
}
