# Regras do projeto (Nós Dois)

## Jogo normal x modo DEV (Fazendinha / Mundo da Hello Kitty)
- O jogo normal (`environment: "real"`) e o DEV (`"dev"`) rodam o **mesmo código** (`IdleStore`, rotas, frontend); só os **saves** são separados (`idleStore` x `idleDevStore`).
- **Padrão: toda mudança vale nos dois.** Alteração simples ou sistema novo (mundo, personagem, missão, custo...) vai em código comum e aparece no normal e no DEV. Não crie cópias "dev" de arquivos nem bifurque por ambiente sem o André pedir.
- **Só quando o André pedir "só no DEV"**: registre o recurso em `backend/src/idle/experimental.ts` (`EXPERIMENTAL_FEATURES`) e proteja todo o código novo com `this.experimental("id")` no backend e `isExperimental(snapshot, "id")` (`frontend/lib/experimental.ts`) no frontend. Para liberar no normal, remova a entrada e o `if`.
- Os "hacks" de teste (painel DEV, `/dev/action`, saldo/itens forçados) são só DEV e ficam protegidos por `environment === "dev"` + conta André.
- Arquivos/nomes `kittyDev*`, `KittyDev*`, `kitty-dev-*` e o campo `kittyDev` do save são nomes **legados**: constelações, estrelas, despertar, Pedra Estelar, ilhas e as missões `kitty-dev-*` **já fazem parte do jogo normal**. Não renomeie chaves salvas (`kitty.dev`, métricas `kittyDev*`) nem a rota `kittyDev`: quebraria saves.
- `backend/test/devParity.test.cjs` garante que normal e DEV têm o mesmo conteúdo (exceto o registrado em `experimental.ts`). Se falhar, algo vazou para um lado só.
- Ao mexer em balanceamento, os testes devem ler os valores da configuração (não números fixos). Para recalibrar despertares: `cd backend && npx tsx tools/kittyDevFit.ts`.

## Git
- Trabalhe na branch que o André indicar; não mexa em outras.
