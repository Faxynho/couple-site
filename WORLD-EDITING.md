# Nosso Mundo — guia de edição

Este guia explica os ajustes mais comuns sem exigir que você entenda todo o jogo.

## Onde está cada coisa

- Sprites e imagens: `frontend/public/world/`
- Mapa externo: `frontend/public/world/maps/main-world.tmj`
- Interior da casa: `frontend/public/world/maps/house-interior.tmj`
- Configuração do personagem: `frontend/world/config/characterConfig.ts`
- Configuração de câmera, mapa e assets: `frontend/world/config/worldConfig.ts`
- Regras autoritativas de decoração: `backend/src/world/worldConfig.ts`
- Código principal do Phaser: `frontend/world/game/WorldScene.ts`
- Persistência criada em runtime: `backend/data/persistent-world.json`

`persistent-world.json` não fica no Git. Em produção ele usa o mesmo diretório persistente já montado no Railway para `backend/data/`. Não edite `accounts.json` para mudar o mundo.

## Personagens

Abra `frontend/world/config/characterConfig.ts`.

- `scale`: tamanho visual. `2` significa duas vezes o tamanho original.
- `frameWidth` / `frameHeight`: tamanho de cada quadro do spritesheet.
- `collision.width` / `collision.height`: tamanho da colisão perto dos pés.
- `collision.offsetX` / `collision.offsetY`: posição dessa colisão dentro do frame.
- `walkSpeed`: velocidade em pixels por segundo.
- `fps`: velocidade da animação.
- `frames`: quais quadros formam cada direção.

O `walk.png` real mede 192×192 e tem 6 colunas por 6 linhas de frames 32×32. A versão atual usa:

- frente/baixo: frames 0 a 5 (linha 0);
- costas/cima: frames 12 a 17 (linha 2);
- perfil/direita: frames 24 a 29 (linha 4);
- perfil/esquerda: os mesmos frames da direita, espelhados com `flipX`.

As linhas 1, 3 e 5 são variações diagonais e ficaram disponíveis para uma expansão futura.

O `actions.png` mede 96×576: 3 colunas por 18 linhas de 32×32. A coluna central funciona como espaçamento em muitos grupos. A inspeção visual encontrou grupos direcionais de picareta, pá/enxada, machado e regador. O registro está em `ACTION_SHEET_LAYOUT`; eles ainda não são executados porque ferramentas/agricultura não fazem parte desta primeira versão.

## Câmera e controles mobile

Abra `frontend/world/config/worldConfig.ts`.

- `camera.zoom`: aproximação da câmera;
- `camera.lerpX` / `lerpY`: suavidade do acompanhamento;
- `camera.deadzoneWidth` / `deadzoneHeight`: área em que o personagem anda antes de a câmera acompanhar;
- `networkHz`: frequência máxima de envio de posição;
- `mobile`: parâmetros preparados para os controles touch.

O layout e o tamanho visual dos botões touch ficam em `frontend/app/mundo/World.module.css`.

## Abrindo e editando no Tiled

1. Instale o Tiled Map Editor.
2. Abra `frontend/public/world/maps/main-world.tmj` para o exterior.
3. Abra `frontend/public/world/maps/house-interior.tmj` para a casa.
4. Mantenha os arquivos dentro de `frontend/public/world/`; os tilesets estão incorporados ao mapa com caminhos de imagem relativos e funcionam em outro computador e em produção.
5. Salve no formato JSON do Tiled (`.tmj`).

Layers usadas:

- `Ground`: tiles pintáveis de piso;
- `GroundDetails`: retângulos com a propriedade `kind` (`water`, `path` ou `farm`);
- `Objects`: árvores, casa, animais e móveis fixos;
- `AbovePlayer`: objetos altos que participam da profundidade;
- `Collisions`: retângulos sólidos editáveis;
- `Interactions`: porta/saída com a propriedade `target`.

Para mover uma árvore ou a casa, selecione o objeto na layer `Objects` e arraste. Para mudar lago, caminho ou plantio, redimensione o retângulo correspondente em `GroundDetails`. Para mudar uma parede ou bloqueio, edite o retângulo em `Collisions`.

Ao adicionar um objeto fixo novo, copie um objeto semelhante e preserve a propriedade personalizada `asset`. Esse valor aponta para `WORLD_OBJECT_ASSETS` em `frontend/world/config/worldConfig.ts`.

## Trocando ou adicionando arte

Não acople regra ao nome do PNG. O registro contém:

- `texture`: nome interno;
- `url`: caminho público do PNG;
- `crop`: trecho usado dentro do atlas;
- `scale`: escala visual;
- `origin`: ponto de ancoragem;
- `collision`: colisão separada da imagem.

Para trocar arte mantendo a lógica, substitua apenas `url` e `crop` no registro. Se o novo arquivo usar dimensões diferentes, ajuste o `crop`; não aumente a colisão para cobrir a copa de uma árvore.

## Adicionando uma decoração

Uma decoração precisa existir em dois registros:

1. `DECORATION_ASSETS`, em `frontend/world/config/worldConfig.ts`, define imagem, recorte e aparência.
2. `WORLD_DECORATION_RULES`, em `backend/src/world/worldConfig.ts`, define quantos quadrados ela ocupa e permite que o servidor valide conflitos.

Também adicione o novo nome ao tipo `WorldDecorationType` em `frontend/world/types.ts` e a `WORLD_DECORATION_TYPES` em `backend/src/world/types.ts`. Depois inclua o botão na interface de `/mundo`.

Objetos colocados por André ou Flávia não alteram o mapa Tiled. Eles recebem um ID único, são validados pelo servidor e ficam em `backend/data/persistent-world.json`. Colocar, mover e remover sempre gera uma atualização para os dois jogadores conectados.

## Multiplayer e mapas separados

O mundo usa o Socket.IO já existente. Apenas um socket validado na sala persistente com `accountId` e `playerId` iguais a `andre` ou `flavia` aceita os eventos `world:*`. Visitantes e códigos temporários não entram.

Cada jogador guarda sua própria `scene`. Quem está fora vê somente jogadores no exterior; quem entra na casa vê somente jogadores no interior. A posição remota é interpolada no cliente para não tremer, mas o servidor limita posições, velocidade e operações de decoração.

## Música e efeitos

`frontend/world/audio/WorldAudioManager.ts` guarda dois volumes independentes:

- `musicVolume` para músicas;
- `sfxVolume` para efeitos.

Os valores ficam no `localStorage` e sobrevivem ao reload. Esta versão não inventa arquivos de som: não havia música/SFX em `frontend/public/world/`. Quando adicionar um arquivo, use `setMusicTrack` para música e `playSfx` para efeitos, mantendo as categorias separadas.

## Controles

PC:

- WASD ou setas: mover;
- E: entrar/sair pela porta;
- Esc: cancelar decoração ou abrir configurações;
- F3: FPS, posição, mapa, grid e hitboxes.

Celular em paisagem:

- direcional do lado esquerdo: mover;
- botão E do lado direito: interagir;
- Configurações e Modo Decorar ficam no topo.

Em retrato o jogo pede para girar o aparelho.
