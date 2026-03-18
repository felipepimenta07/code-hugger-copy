

## Novo Layout Master View: Agrupamento Orgânico com Zoom Progressivo

Inspirado na referência (grafo denso tipo Twitter/social network), o master view vai mudar de layout circular para um **cluster orgânico** com revelação progressiva de nós conforme o zoom.

### Mudanças em `src/components/Canvas.tsx`

**1. Novo `masterLayoutMap` — layout orgânico sem forma circular**
- Remover a distribuição de flow centroids em círculo (`angle = idx / flowCount * 2π`)
- Usar centroids em **grid compacto** (e.g. 3-4 colunas) para que os flows se agrupem lado a lado organicamente, não em anel
- Reduzir `forceCollide` para ~10, `forceManyBody` para ~-8, e aumentar a atração ao centroid (`forceX/Y strength 0.5`) para criar clusters muito densos
- Manter `forceCenter(0,0)` para centralizar tudo

**2. Zoom semântico progressivo — nós aparecem conforme zoom**
- Calcular um "importance score" por nó: nós com mais conexões ou que são center de um flow têm score alto
- Definir 3 tiers de visibilidade baseados no `state.zoom`:
  - **Zoom < 0.3**: Só nós de alta importância (brands/centers, top connectors) + labels dos flows
  - **Zoom 0.3–0.6**: Nós de média importância aparecem (pessoas com 2+ conexões)  
  - **Zoom > 0.6**: Todos os nós visíveis
- Aplicar `opacity` e `display` condicional na renderização dos nós no master view
- Conexões seguem a mesma lógica: só renderizar se ambos os nós extremos estão visíveis

**3. Ajustes visuais no master view**
- Nós distantes (baixa importância) entram com fade-in suave via `opacity` transition
- Reduzir tamanho base dos nós no master (nodeSize menor para nós não-center)
- Labels de nó: escondidos em zoom baixo, aparecem só em hover ou zoom > 0.5
- Labels de flow: sempre visíveis, tamanho escala inversamente com zoom

### Mudanças em `src/components/NetworkMatrix.tsx`

- Passar `state.zoom` para o Canvas (já está disponível via `state`)
- Nenhuma outra mudança necessária — o Canvas já recebe `state` com zoom

### Resultado esperado
- Ao abrir master view: nuvem densa compacta com clusters de flow visíveis, só nós importantes mostrados
- Ao dar zoom in: progressivamente mais nós e conexões aparecem, revelando a rede completa
- Visual mais próximo da referência: orgânico, denso, sem geometria artificial

