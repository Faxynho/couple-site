# Nosso Mundo — mapas e decoração

Este guia descreve a estrutura que está em produção. O mapa Tiled é sempre a
base imutável; decorações e alterações de terreno dos jogadores são overlays
persistidos pelo backend.

## Arquivos principais

- Exterior: `frontend/public/world/maps/main-world.tmj`
- Casa: `frontend/public/world/maps/house-interior.tmj`
- Tilesets carregáveis: `frontend/world/config/tilesetConfig.ts`
- Catálogo visual e comportamental: `frontend/world/config/decorationCatalog.ts`
- Validação autoritativa mínima: `backend/src/world/decorationCatalog.ts`
- Render, preview, colisão e autotile: `frontend/world/game/WorldScene.ts`
- Persistência: `backend/src/world/WorldStore.ts`
- Eventos Socket.IO: `backend/src/world/worldSocketHandlers.ts`
- Save de runtime, fora do Git: `backend/data/persistent-world.json`

## Auditoria dos mapas atuais

Os dois mapas usam grid de 16×16 px e as mesmas oito layers:

| Layer | Tipo | Uso atual |
| --- | --- | --- |
| `Ground` | Tile Layer | piso-base; no exterior também contém a água |
| `GroundDetails` | Tile Layer | detalhes baixos; terra/areia/caminhos externos e piso/paredes da casa |
| `GroundDetailsTop` | Tile Layer | detalhes superiores; cultivos externos e tapete/parede interna |
| `Objects` | Object Layer | árvores, construções, cercas e móveis com Y-sort |
| `reference` | Object Layer | referências de edição, não renderizadas como decoração dinâmica |
| `AbovePlayer` | Object Layer | partes que devem aparecer acima do jogador |
| `Collisions` | Object Layer | bloqueios manuais do mapa |
| `Interactions` | Object Layer | porta/saída e respectivos destinos |

O sistema dinâmico respeita a layer do equivalente real: água em `Ground`,
terra e areia em `GroundDetails`, e tapete em `GroundDetailsTop`. Os TMJ atuais
não possuem Terrain Set nem Wang Set. Por isso o autotile aprende as máscaras
e frames observando os padrões já pintados na layer correspondente, usando
somente variantes que existem no mapa.

Objetos dinâmicos usam os mesmos tilesets, dimensões exibidas, collision
objects e `sortOffsetY` dos objetos Tiled equivalentes. Sprite e colisão são
independentes: a copa de uma árvore pode ser grande enquanto apenas o tronco
bloqueia o jogador.

## Catálogo atual

O menu possui as categorias Plantas, Decorações, Móveis, Caminhos, Natureza e
Terreno. Só foram incluídas referências comprovadamente usadas nos TMJ atuais:

- plantas: flores/arbusto de `plants-v2` e planta interna de `house-plants`;
- decorações: gaveteiro e barril de `props-1`, fogueira de pedra de `pit`;
- móveis: mesa, cama, cadeiras, sofá e estante dos tilesets internos;
- caminhos: cerca de `fences` e tapete de `carpet-1`;
- natureza: árvores de `trees_v2`, pedra de `rocks` e arbusto de `bushes`;
- terreno: terra de `tilled-dirt`, areia de `ground-2`, água de `water` e a
  ferramenta para restaurar o terreno original.

Assets soltos e itens sem um equivalente configurado no mapa não entram no
catálogo. Em particular, a cerca antiga recortada por código não é usada.

## Como adicionar uma decoração

### Objeto comum

1. Use no Tiled um frame real do tileset e confirme tamanho, layer, colisão e
   `sortOffsetY`.
2. Garanta que o tileset exista em `tilesetConfig.ts`.
3. Adicione uma definição `kind: "object"` em `decorationCatalog.ts` com:
   `id`, nome, categoria, mapas permitidos, `source`, `footprint`, `collisions`,
   `depth` e rotações permitidas.
4. Adicione a regra mínima de servidor, com o mesmo ID/mapas/footprint, em
   `backend/src/world/decorationCatalog.ts`. Essa pequena duplicação impede que
   um cliente adulterado grave itens ou áreas inválidas.

Não é necessário alterar `WorldScene`, UI, tipos de save, sockets ou renderer.
O botão aparece automaticamente na categoria.

`footprint` é a área ocupada no grid e não precisa ter o tamanho do sprite.
Copie `collisions` do collision object do tile no TMJ; não crie uma colisão do
tamanho total da imagem. Use `depth.behavior: "y-sort"` para objetos pelos quais
o jogador passa à frente/atrás, ou `"above-player"` apenas quando o equivalente
real estiver na layer `AbovePlayer`.

### Objeto conectável

Use `kind: "connected-object"`, um `connectionGroup`, passo/origem do grid,
mapa `variants` (máscara N=1, E=2, S=4, W=8) e `variantCollisions`. Cadastre
somente combinações que possuam frame real. Ao colocar ou remover um segmento,
somente ele e os vizinhos cardinais são reavaliados.

### Terreno ou caminho

Use `kind: "terrain"` ou `"path"`, escolha `terrainLayer` pelo equivalente no
TMJ e informe os frames reais em `autotile.baseFrames`. `collision: true` cria
o bloqueio Arcade Physics por célula; atualmente isso é usado pela água.
Variantes visuais não são persistidas: cada cliente calcula o mesmo resultado
a partir das células sincronizadas.

Nunca escolha uma layer por aparência aproximada. Confira onde o tile já está
pintado no mapa. Se não houver Terrain/Wang Set nem padrões suficientes no TMJ,
deixe o item fora do catálogo até existir uma referência confiável.

### Checklist de teste para item novo

1. Execute typecheck/build e testes de frontend e backend.
2. Teste preview válido e inválido no exterior/interior permitido.
3. Confirme footprint, colisão, depth e remoção.
4. Abra dois clientes, coloque/remova em ambos e reconecte.
5. No mobile, confirme que `pointerdown` só inicia o preview, arrastar move e
   apenas `pointerup` válido confirma; `pointercancel` e soltura sobre UI cancelam.
6. Para conectáveis/terreno, teste todas as variantes existentes e a remoção de
   uma célula central.

## Persistência e multiplayer

O save v2 armazena objetos como `itemId`, mapa, coordenadas, rotação e metadados
de autoria/tempo. Terreno armazena apenas mapa, célula e `terrainId`. Frames de
autotile e cerca são derivados, não salvos. Saves v1 com o antigo campo `type`
são migrados ao carregar e objetos legados permanecem preservados.

O servidor valida catálogo, mapa, área, footprint, sobreposição e água antes de
persistir. Os eventos enviam a coleção autoritativa aos dois clientes. O efeito
`decoration-place-effect.png` é executado localmente na confirmação e enviado
somente ao outro socket; terreno nunca dispara esse efeito.

## Personagens e controles

`characterConfig.ts` centraliza escala, colisão, velocidade e animações. O
`walk.png` usa frames 32×32. O `actions.png` real mede 96×864 e é uma grade de
2×18 frames de 48×48.

No desktop: WASD/setas movem, E interage, Esc cancela e F3 mostra debug. No
mobile: direcional move e o botão E interage. A câmera, zoom, fullscreen e
controles não fazem parte do catálogo e não devem ser alterados ao cadastrar
itens.
