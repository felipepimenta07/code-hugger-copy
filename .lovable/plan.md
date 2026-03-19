

## Plano: Master View como na Referência (Galáxia Vibrante)

### Diagnóstico dos Problemas

**Hover quebrando**: A animação de auto-rotação (linha 134) tem `hoveredNode` como dependência do `useEffect`, fazendo o loop de animação reiniciar a cada hover — causa flicker e instabilidade.

**Visual muito apagado**: Nós max 6px e conexões com opacity 0.08 são praticamente invisíveis. A referência mostra nós grandes, brilhantes, com glow forte.

### Mudanças — `src/components/Canvas.tsx`

#### 1. Corrigir bug do hover (animação reiniciando)
- Remover `hoveredNode` da lista de dependências do `useEffect` da animação (linha 134)
- Usar `useRef` para `hoveredNode` dentro do loop de animação em vez de state direto

#### 2. Nós maiores e mais vibrantes (estilo referência)
- Mudar tamanho base no master view de `3 + importance*3` (max 6px) para `6 + importance*18` (range: 6-24px)
- Hubs (importance >= 0.5) ficam ainda maiores com glow forte
- Glow circle permanente (não só no hover) para nós importantes — `opacity: 0.2 + importance*0.3`

#### 3. Conexões visíveis mas elegantes
- Base opacity de 0.08 → 0.12
- Hover opacity de 0.35 → 0.5
- StrokeWidth base de 0.3 → 0.8
- Cor das conexões: branco/cinza claro ao invés da cor do tema (mais parecido com a referência)

#### 4. Halo/glow permanente nos hubs
- Adicionar circle com `filter="url(#glow-node)"` para nós com importance >= 0.3
- Raio do glow proporcional à importância
- Opacity do glow: `0.15 + importance * 0.2`

#### 5. Hover mais suave
- Escala hover de 2.5 → 1.8 (menos agressivo)
- Transição suave com CSS transition mantida
- Conexões do nó hovered destacam com strokeWidth 1.5 e opacity 0.4

### Resultado Esperado
- Nós coloridos grandes e brilhantes como "estrelas" na galáxia
- Conexões visíveis como fios de luz entre os nós
- Hover suave sem flicker
- Visual similar à imagem de referência

### Detalhes Técnicos
- Arquivo: `src/components/Canvas.tsx`
- Seções afetadas: useEffect animação (~linha 114-134), cálculo de nodeSize (~linha 966-968), renderização de nós (~linha 1014-1050), renderização de conexões (~linha 785-794)

