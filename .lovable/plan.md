

## Master View: Visualização por Bolhas com Zoom Semântico

A imagem mostra que a visualização circular funciona como conceito, mas com 300+ flows no zoom 0.06, os nós individuais viram pontos invisíveis. A solução é **zoom semântico**: em zoom baixo, cada flow é representado como **uma única bolha** (tamanho proporcional ao número de pessoas); ao dar zoom ou clicar, expande para mostrar os nós individuais.

### Como funciona

```text
Zoom < 0.15 (visão macro):
  ● Google (45 pessoas)     ● Microsoft (23 pessoas)
       ● Apple (12)    ● Amazon (67)
  
Zoom > 0.15 (visão detalhada):
  Layout atual com nós individuais ao redor do centro
```

### Mudanças em `src/components/Canvas.tsx`

**1. Modo bolha para zoom baixo no Master View**

Na seção de renderização de nós (linha ~575), quando `viewMode === 'master'` e `state.zoom < 0.15`:
- Em vez de renderizar todos os nós individuais de cada flow, renderizar apenas **um círculo por flow** posicionado no centro do cluster
- Raio da bolha = `Math.sqrt(clusterNodes.length) * 8` (proporcional ao nº de pessoas)
- Cor da bolha = cor do flow (já existe via `FLOW_COLORS`)
- Label dentro ou abaixo da bolha: nome do flow + contagem
- Clique duplo na bolha → `onGoToFlow(flow.id)`

**2. Esconder nós individuais em zoom baixo**

Quando `state.zoom < 0.15` e `viewMode === 'master'`:
- Não renderizar os nós individuais (linhas 575-697)
- Não renderizar conexões intra-flow (linhas 486-566)
- Manter conexões cross-flow entre bolhas (reapont para o centro do cluster)

**3. Esconder cluster rings e flow labels redundantes**

- Cluster rings (linha 472): esconder quando zoom < 0.15
- Flow labels (linha 701): já cobertos pelo label na bolha

**4. Transição suave**

Adicionar opacity transition para que ao passar pelo threshold de zoom (0.15), os nós apareçam/desapareçam suavemente.

### Mudanças em `src/components/NetworkMatrix.tsx`

- Ajustar zoom inicial do master view para ~0.10 (bom nível para ver todas as bolhas)
- Manter zoom floor de 0.06

### Arquivos alterados
- `src/components/Canvas.tsx` — modo bolha para zoom < 0.15 no master view
- `src/components/NetworkMatrix.tsx` — zoom inicial ajustado

