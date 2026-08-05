# Nós Dois 💞 — Jogos Cooperativos para Casal

Uma plataforma privada onde só duas pessoas jogam juntas, em tempo real, pela internet.
O primeiro jogo é um **Quebra-cabeça Cooperativo**, mas toda a arquitetura foi pensada
para receber outros jogos (Jogo da Velha, Forca, Memória, Sudoku a dois...) sem
retrabalho.

```
casal-jogos/
├── backend/     servidor Node + Express + Socket.IO (tempo real, salas, regras do jogo)
├── frontend/    Next.js + TypeScript + Tailwind + Framer Motion (interface)
└── scripts/     script auxiliar que gerou as imagens de exemplo do quebra-cabeça
```

---

## Como rodar localmente

Você vai precisar do **Node.js 18+** instalado. Abra dois terminais.

### 1. Backend (porta 4000)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Você verá: `🎮 Servidor de jogos cooperativos rodando em http://localhost:4000`

### 2. Frontend (porta 3000)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Abra `http://localhost:3000`. Para testar a experiência a dois no seu próprio
computador, abra a mesma URL em duas abas (ou uma aba anônima) — cada uma entra
como um jogador diferente.

Para jogar de verdade com outra pessoa em outro lugar, o backend precisa estar
acessível pela internet (ex.: deploy em um serviço como Render/Railway/Fly.io) e
`NEXT_PUBLIC_SOCKET_URL` no frontend precisa apontar para essa URL pública.

---

## Fluxo da sala e modo solo

- **Host**: quem cria a sala vira o "anfitrião" — só ele escolhe a imagem e a
  dificuldade, e só ele pode iniciar a partida. O outro jogador acompanha
  essas escolhas em tempo real (`room:setConfig`, sincronizado via
  `room:update`) enquanto ambos estão na sala de espera.
- **Jogar sozinho**: o botão de iniciar não exige mais os dois conectados —
  se só o host estiver na sala, o botão vira "Jogar sozinho". Se um amigo
  entrar depois, ele cai direto na partida já em andamento.
- **Tela de vitória**: pode ser fechada (X, "Continuar visualizando" ou
  clicando fora) sem afetar o jogo — o quebra-cabeça completo continua do
  jeito que foi montado. Um botão discreto ("Ver resultado") reabre o resumo
  depois.

## Como funciona o tempo real

O quebra-cabeça é um jigsaw de verdade: peças com formato de saliência/reentrância,
posição livre (não uma grade) e que se conectam em **grupos** ao se encaixar — dois
grupos conectados passam a se mover juntos, como um quebra-cabeça físico.

- O **backend é a fonte da verdade**. Cada peça pertence a um grupo (`{ pieceIds,
  originX, originY }`); mover um grupo é só mudar seu `origin`. Isso já resolve o caso
  de conflito: dois cliques na mesma peça ao mesmo tempo — quem chegou primeiro no
  servidor vence, o outro é ignorado.
- Três eventos cuidam do arrastar:
  - `game:pickup` — trava o grupo para o jogador que pegou (o servidor recusa se o
    outro já estiver segurando; o parceiro vê um contorno colorido enquanto isso).
  - `game:drag` — **apenas repassado** em tempo real para o outro jogador, sem validar
    nem gravar em estado. É isso que mantém o arrastar fluido a 60fps.
  - `game:drop` — o servidor valida, roda o algoritmo de encaixe/fusão de grupos e
    transmite o novo estado oficial para os dois — é o momento da animação de "snap"
    simultânea nos dois lados.
- **Encaixe automático**: ao soltar, o servidor verifica se o grupo ficou perto o
  suficiente (a) da moldura-guia da mesa ou (b) de um grupo vizinho na imagem original.
  Se sim, os grupos se fundem — e isso pode encadear (uma peça pode conectar dois
  blocos grandes já montados de uma vez).
- Salas são identificadas por um código de 5 caracteres, guardadas em memória no
  servidor (`RoomManager`). Não há banco de dados nesta versão inicial.

---

## Tecnologias e por quê

| Tecnologia | Por quê |
|---|---|
| **Next.js (App Router) + TypeScript** | Roteamento por arquivos (`/`, `/room`, `/game/puzzle/[code]`), tipagem ponta a ponta e ótima DX. |
| **Tailwind CSS** | Construir a identidade visual (cores, glass, radius, sombras) como tokens reutilizáveis, sem CSS solto. |
| **Framer Motion** | As animações de entrada, hover, flutuação dos cards e, principalmente, a reordenação suave das peças do quebra-cabeça (layout animation/FLIP). |
| **Socket.IO** | Comunicação em tempo real bidirecional, com fallback automático para long-polling quando WebSocket não está disponível — mais robusto que WebSocket puro para uso geral. |
| **Express** | Servidor HTTP mínimo por trás do Socket.IO (só serve o handshake e um health check). |
| **canvas-confetti** | Confete leve e performático na tela de vitória. |

---

## Arquitetura pensada para crescer

Adicionar um novo jogo cooperativo (ex.: Jogo da Velha) envolve só três passos:

1. **Backend** — criar `backend/src/games/tictactoe/TicTacToeGame.ts` implementando a
   interface `GameEngine<TState, TAction>` (mesmo contrato que o `PuzzleGame.ts` usa)
   e registrá-lo em `backend/src/games/GameRegistry.ts`.
2. **Tipos** — acrescentar o id em `GameId` (`backend/src/types/index.ts` e
   `frontend/lib/types.ts`).
3. **Frontend** — adicionar um item em `frontend/lib/games.ts` (aparece automaticamente
   como card na Home) e criar a rota `frontend/app/game/tictactoe/[code]/page.tsx` com
   a interface do jogo.

O sistema de salas, conexão em tempo real, sincronização entre os dois jogadores e o
layout geral (glassmorphism, animações, painel lateral) já ficam prontos e são
reaproveitados por qualquer jogo novo.

---

## Dificuldade, proporção e tamanho das peças

Nada disso é fixo — tudo é calculado automaticamente a partir de dois números:
a **proporção da imagem** (`largura/altura`) e a **quantidade de peças alvo** da
dificuldade escolhida.

- **Linhas x colunas**: `cols = round(√(peças × proporção))`, `rows = round(peças / cols)`.
  Isso faz imagens largas gerarem mais colunas e imagens altas gerarem mais linhas,
  mantendo cada peça aproximadamente quadrada.
- **Tamanho da peça**: `130 × √(30 / peças_reais)`, com piso de 60 e teto de 140
  unidades. Não há nenhum valor "por dificuldade" — o Fácil só parece ter peças
  maiores porque tem menos peças; a mesma fórmula vale para 30 ou 500 peças.
- **Tamanho do quadro**: calculado iterativamente (aumenta a margem ao redor da
  moldura-guia até haver espaço suficiente para espalhar todas as peças sem
  sobrepor) — nenhum tamanho de tabuleiro fixo.

Dificuldades ficam em `DIFFICULTIES` (`backend/.../puzzleImages.ts` e
`frontend/lib/games.ts`) — adicionar uma nova (200, 300, 500 peças...) é só
acrescentar uma linha com o `targetPieces`; o resto do sistema já funciona.

---

## Câmera (pan/zoom)

O quadro do quebra-cabeça é um canvas navegável, não uma área fixa:

- **Zoom**: scroll do mouse, pinça de dois dedos, ou os botões +/-. Sempre "zoom no
  cursor" (o ponto sob o mouse/dedos fica parado enquanto o resto escala).
- **Mover**: botão do meio do mouse, `Espaço` + clique esquerdo, ou dois dedos no
  celular (um dedo continua reservado para arrastar peças).
- **Centralizar**: botão que anima suavemente de volta para a moldura-guia.
- **100% local**: a câmera nunca é enviada pela rede — cada jogador navega o próprio
  quadro de forma independente. Só as peças (posição, grupos, quem está segurando)
  são sincronizadas.

A matemática de zoom/limites fica isolada em `frontend/lib/camera.ts`.

---

## Sobre as imagens do quebra-cabeça

As 4 imagens em `frontend/public/images/puzzle/` são placeholders gerados
proceduralmente (gradientes pastéis, em proporções propositalmente diferentes —
quadrada, paisagem e retrato) só para o projeto já sair funcionando. Para usar
fotos reais do casal:

1. Coloque o arquivo `.jpg` em `frontend/public/images/puzzle/`.
2. Adicione uma linha em `frontend/lib/games.ts` (array `PUZZLE_IMAGES`) e em
   `backend/src/games/puzzle/puzzleImages.ts`, **com a largura/altura reais da
   imagem** — é a partir delas que a proporção do quebra-cabeça é calculada.

---

## Limitações conhecidas (v1)

- **Sem persistência**: salas vivem em memória; reiniciar o servidor apaga as salas
  ativas.
- **Identidade por socket**: se a pessoa der um refresh na página do jogo (não na
  navegação normal pelo app), ela reconecta com um novo `socket.id`. A sala tenta
  recuperar o estado, mas uma sessão persistente (token salvo localmente) é uma boa
  evolução futura.
- **Sem autenticação**: qualquer pessoa com o código de 5 caracteres entra na sala.
  Como o código expira com a sala e é de uso único (2 jogadores), isso é suficiente
  para o uso pretendido (duas pessoas combinando o código em particular).
