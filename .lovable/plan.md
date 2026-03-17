

## Plano: Aumentar fontes do site + Background diferenciado Master/Single

### Mudanças

**1. Background diferenciado por modo (`NetworkMatrix.tsx`)**
- Master View: `hsl(220, 20%, 7%)` (atual)
- Single View: `hsl(225, 22%, 9%)` (tom levemente mais claro/azulado)

**2. Escala de fontes — aumentar tudo (~2 níveis)**

Mapeamento global de tamanhos:

| Antes | Depois |
|-------|--------|
| `text-[9px]` | `text-xs` (12px) |
| `text-[10px]` | `text-xs` (12px) |
| `text-[11px]` | `text-sm` (14px) |
| `text-xs` (12px) | `text-sm` (14px) |

Aplicar nos seguintes componentes:
- **`NetworkToolbar.tsx`** — botões Master/Single, contadores, search
- **`NodeDetailPanel.tsx`** — categoria header, info fields, conexões diretas, labels
- **`NetworkSidebar.tsx`** — nomes de categoria, contadores
- **`Canvas.tsx`** — labels dos nós no SVG (font-size nos `<text>`)
- **`NetworkMatrix.tsx`** — zoom indicator
- **`FlowManagerPanel.tsx`** — badges, stats
- **`Legend.tsx`** — se tiver textos pequenos

Ícones Lucide também sobem ~2px (de `size={10}` → `size={12}`, de `size={12}` → `size={14}`).

### Arquivos afetados

1. `src/components/NetworkMatrix.tsx` — bg dinâmico + zoom text
2. `src/components/NetworkToolbar.tsx` — fontes maiores
3. `src/components/NodeDetailPanel.tsx` — fontes maiores
4. `src/components/NetworkSidebar.tsx` — fontes maiores
5. `src/components/Canvas.tsx` — font-size SVG text labels
6. `src/components/FlowManagerPanel.tsx` — fontes maiores

