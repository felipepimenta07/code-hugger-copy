

## Problema: Master View invisível com muitos flows

A importação LinkedIn **está funcionando corretamente** — cada empresa gera um flow com a brand no centro e pessoas ao redor. O problema é que o **Master View usa layout circular**, e com 300+ flows o raio calculado é ~37.000px, forçando zoom de 0.01 onde tudo fica invisível.

## Solução: Grid layout para Master View

### 1. `src/components/Canvas.tsx` — `getFlowOffset`

Trocar layout circular por **grid** quando `flows.length > 12`:

```typescript
const getFlowOffset = (flowId, flowRingRadius) => {
  const idx = flows.findIndex(f => f.id === flowId);
  const count = flows.length;
  if (count <= 12) {
    // manter circular para poucos flows
    // ... código atual
  }
  // Grid layout
  const cols = Math.ceil(Math.sqrt(count));
  const spacing = 2 * flowRingRadius + 300;
  const row = Math.floor(idx / cols);
  const col = idx % cols;
  return { dx: col * spacing, dy: row * spacing };
};
```

### 2. `src/components/NetworkMatrix.tsx` — zoom mínimo

Em `calculateBounds` ou onde o zoom é computado, adicionar floor:

```typescript
const zoom = Math.max(calculatedZoom, 0.06);
```

Isso garante que mesmo com centenas de flows, os nós sejam visíveis.

### Arquivos alterados
- `src/components/Canvas.tsx` — `getFlowOffset` (grid para >12 flows)
- `src/components/NetworkMatrix.tsx` — zoom floor de 0.06

