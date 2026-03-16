

## Análise: Faz sentido usar D3.js Force Simulation?

### Resposta curta: **Sim, faz muito sentido** — mas com uma abordagem incremental.

### Situação atual

O Canvas.tsx usa posicionamento **estático/determinístico**:
- Master View: nós posicionados em **anel circular** calculado por `masterLayoutMap` (ângulo + raio fixos)
- Single View: posições absolutas `(x, y)` salvas no banco
- Drag: move o nó manualmente, sem interação física com os outros
- Zoom/pan: transformação CSS no `<g>`, sem transições

Resultado: funcional, mas **rígido** — os nós não reagem uns aos outros, não se auto-organizam, e arrastar um nó não afeta os vizinhos.

### O que D3 Force traria

1. **Auto-layout orgânico** — nós se posicionam sozinhos baseados nas conexões (sem precisar calcular ângulos manualmente)
2. **Arrastar interativo** — mover um nó puxa/empurra os vizinhos em tempo real
3. **Repulsão por camada** — nós centrais mais espaçados, periféricos mais agrupados
4. **Colisão** — nós nunca se sobrepõem
5. **Entrada animada** — nós "nascem" e fluem para suas posições

### Plano de implementação

**Fase única: Integrar d3-force no Canvas**

1. **Instalar apenas os módulos necessários** (não o D3 inteiro):
   - `d3-force` (simulação de forças)
   - `d3-zoom` (zoom/pan suave com inércia)
   - `d3-drag` (drag com reheat da simulação)

2. **Criar hook `useForceSimulation.ts`**:
   - Recebe `nodes[]` e `connections[]`
   - Configura simulação com 4 forças (como o site ref):
     - `forceManyBody` com strength variável por profundidade/tipo
     - `forceCenter` fraco (0.04) para manter tudo visível
     - `forceCollide` para evitar sobreposição
     - `forceLink` para conexões elásticas
   - Retorna posições atualizadas a cada tick
   - Em Single View: usa simulação de forças
   - Em Master View: mantém layout em anel (determinístico) OU usa forças com posições fixas nos centros

3. **Atualizar `Canvas.tsx`**:
   - Usar posições do `useForceSimulation` em vez de `getDisplayPos` estático
   - Drag: ao arrastar, fixa o nó (`fx`, `fy`) e faz `.alpha(0.3).restart()` — vizinhos reagem
   - Ao soltar: remove `fx`/`fy` — nó volta a flutuar
   - Nós: adicionar `<animate>` ou transition suave nas posições

4. **Substituir zoom/pan manual por `d3-zoom`**:
   - Zoom com inércia e limites suaves
   - Pan com momentum (soltar e continuar deslizando)
   - Substituir o `onWheel` manual atual

5. **Manter compatibilidade**:
   - Posições salvas no banco continuam sendo o ponto de partida
   - A simulação usa as posições salvas como posição inicial
   - Ao parar de mover, salva a nova posição no banco

### Arquivos

1. `src/hooks/useForceSimulation.ts` — NOVO, hook com d3-force
2. `src/components/Canvas.tsx` — usar posições do hook, integrar d3-drag
3. `src/components/NetworkMatrix.tsx` — integrar d3-zoom no SVG, remover zoom manual
4. `package.json` — adicionar `d3-force`, `d3-zoom`, `d3-drag`, `d3-selection` + tipos

### Tamanho estimado
Médio-grande (~300 linhas novas no hook, ~100 linhas de mudança no Canvas). Resultado: a mesma fluidez orgânica do site de referência.

