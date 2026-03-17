

## Problema

As bolhas usam as mesmas posições do `masterLayoutMap` (grid com spacing de ~780px entre flows). No zoom 0.04-0.10, uma bolha de raio 60px no SVG aparece como **2-6 pixels na tela** — invisível. O layout foi projetado para nós individuais, não para bolhas agregadas.

## Solução: Layout dedicado para Bubble Mode

Criar um layout separado para as bolhas, com espaçamento proporcional ao tamanho das bolhas (não ao tamanho dos clusters completos).

### 1. `Canvas.tsx` — Layout de bolhas dedicado

Adicionar um `useMemo` que calcula posições específicas para o modo bolha:

```typescript
const bubbleLayoutMap = useMemo(() => {
  if (viewMode !== 'master' || !flows?.length) return new Map();
  const map = new Map();
  const count = flows.length;
  const cols = Math.ceil(Math.sqrt(count));
  
  flows.forEach((flow, idx) => {
    const clusterNodes = nodes.filter(n => getNodeFlowId(n) === flow.id);
    const bubbleRadius = Math.max(30, Math.sqrt(clusterNodes.length) * 18);
    const spacing = 250; // espaçamento fixo e apertado
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const totalW = (cols - 1) * spacing;
    const totalH = (Math.ceil(count / cols) - 1) * spacing;
    map.set(flow.id, {
      x: col * spacing - totalW / 2,
      y: row * spacing - totalH / 2,
      radius: bubbleRadius
    });
  });
  return map;
}, [viewMode, flows, nodes]);
```

Atualizar a renderização das bolhas (linha 575-604) para usar `bubbleLayoutMap.get(flow.id)` em vez de `masterLayoutMap.get(centerNode.node_ref)`.

### 2. `NetworkMatrix.tsx` — Zoom e bounds para bolhas

Em `calculateBounds`, quando `flows.length > 12`, usar o espaçamento de bolhas (250px) em vez do espaçamento de clusters (780px) para calcular bounds menores.

Em `calculateOptimalZoom`, aumentar o floor para `0.06` e ajustar para que o zoom calculado encaixe todas as bolhas na tela confortavelmente.

### 3. Ajuste visual das bolhas

- Aumentar o raio mínimo da bolha para 40
- Aumentar o multiplicador: `Math.sqrt(count) * 22`
- Font size mínimo de 16px para o nome
- Adicionar sombra/glow padrão (não só no hover) para destaque

### Arquivos alterados
- `src/components/Canvas.tsx` — `bubbleLayoutMap` + renderização de bolhas
- `src/components/NetworkMatrix.tsx` — bounds e zoom para bubble mode

