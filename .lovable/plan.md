

## Plano: Hover Orgânico no Master View + Zoom Inicial 230%

### Resumo

Duas mudanças no Master View: (1) efeitos interativos orgânicos no hover dos nós, (2) zoom inicial de 2.3 (230%).

---

### 1. Zoom Inicial 230%

**Arquivo:** `src/hooks/useNetworkState.ts`

- Alterar `zoom: 0.5` para `zoom: 2.3` no estado inicial
- Ajustar `pan` para centralizar o grafo no viewport com esse zoom (aproximadamente `pan: { x: 400, y: 300 }`)

---

### 2. Hover Orgânico no Master View

**Arquivo:** `src/components/Canvas.tsx`

**2a. Calcular vizinhos do nó hovered**

No bloco de renderização (antes do map dos nós), criar um `Set<string>` de nós conectados ao `hoveredNode`:

```text
hoveredNode ativo?
  → connectedToHovered = Set de node_refs ligados ao hoveredNode
```

**2b. Nós — efeito hover**

Dentro do render de cada nó no master view (`showAsSmallDot` block):

- **Nó hovered**: escalar raio × 2.5, adicionar círculo de glow (opacity 0.25), renderizar label SVG (nome do nó acima, fontSize 10, fill white, opacity fade-in)
- **Vizinho 1º grau**: escalar raio × 1.5, opacity → 0.9
- **Outros nós (quando há hover ativo)**: opacity → 0.3
- Remover o `<title>` nativo, substituído pelo label SVG no hover

CSS transitions já existentes cobrem a suavidade.

**2c. Conexões — highlight no hover**

No bloco de conexões master view (linhas ~726-729):

- Se a conexão liga ao `hoveredNode`: `strokeWidth → 1`, `opacity → 0.35`
- Caso contrário (e hover ativo): manter opacity 0.03 para dimming extra

---

### Detalhes técnicos

- O `connectedToHovered` Set é calculado com `useMemo` baseado em `hoveredNode` e `connections`
- Transições CSS `transition: all 0.3s ease` aplicadas nos círculos e opacidades dos nós
- Label flutuante: `<text>` SVG posicionado em `y={-nodeSize - 8}`, `textAnchor="middle"`, com `pointerEvents="none"`

### Arquivos alterados
- `src/hooks/useNetworkState.ts` — zoom inicial
- `src/components/Canvas.tsx` — hover orgânico

