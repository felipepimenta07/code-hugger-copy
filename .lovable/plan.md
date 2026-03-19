

## Plano: Refazer Master View Igual ao Projeto de Referência

### O que muda

O Master View atual é instável (nós pulam, `Math.random()` no layout, animação 60fps desnecessária, semantic zoom complexo). O projeto de referência é limpo: D3 nativo gerencia zoom/pan/drag, simulação roda ao vivo, nós têm avatares com labels, links são linhas simples.

### Abordagem

Criar um componente **dedicado** para o Master View (`MasterCanvas.tsx`) que replica o padrão do `RelationshipMap.tsx` de referência, usando D3 imperativo. O `Canvas.tsx` atual continua servindo apenas o Single View.

### Arquivos e Mudanças

#### 1. Novo: `src/components/MasterCanvas.tsx`
Componente D3 imperativo inspirado no `RelationshipMap.tsx`:
- **D3 nativo** para zoom, pan e drag (não React state)
- **Simulação ao vivo** com `forceSimulation`, `forceManyBody(-400)`, `forceCenter`, `forceCollide(50)`, `forceLink(distance: 120)`
- **Nós com avatar**: círculo com `clipPath` + `image` para `profile_picture_url`, fallback com inicial
- **Labels** abaixo de cada nó (nome + categoria)
- **Links**: linhas simples coloridas por tipo de conexão
- **Drag**: `d3.drag` com `fx/fy` (mesmo padrão do ref)
- **Click**: single click → abre detail panel, double click → entra no Single View (navega ao flow)
- **Hover**: highlight do nó e conexões (opacity dos outros diminui)
- Fundo escuro `#0a0b14` com pattern sutil

#### 2. Alterar: `src/components/NetworkMatrix.tsx`
- Quando `viewMode === 'master'`, renderizar `<MasterCanvas>` em vez de `<Canvas>`
- Passar props: `allNodes`, `allConnections`, `flows`, `onNodeClick`, `onNodeDoubleClick`, `onGoToFlow`

#### 3. Alterar: `src/components/Canvas.tsx`
- Remover toda a lógica específica de master view (masterLayoutMap, nodeImportance, semantic zoom, animTime loop, traveling dots, cross-flow connections)
- Canvas fica exclusivo para Single View → código muito mais simples e estável

#### 4. Limpar: `src/hooks/useNetworkState.ts`
- Manter zoom/pan iniciais como estão (o MasterCanvas gerencia seu próprio zoom via D3)

### Resultado
- Master View estável, fluido, com avatares e labels visíveis
- Drag funciona sem pulos
- Zoom/pan nativo do D3 (suave)
- Single View intocado — continua funcionando como antes
- ~500 linhas removidas do Canvas.tsx

