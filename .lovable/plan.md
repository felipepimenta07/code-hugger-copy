

## Plano: Reduzir brilho + highlight no hover + mostrar conexões ao clicar

### Mudanças em `src/components/MasterCanvas.tsx`

#### 1. Reduzir Bloom (brilho) geral
- `Bloom intensity={1.5}` → `intensity={0.4}`, `luminanceThreshold={0}` → `0.6`
- Nós ficam visíveis mas sem "explodir" de brilho no estado normal

#### 2. Reduzir vibração da simulação
- `alpha(0.8)` → `alpha(0.6)` (menos energia inicial)
- `alphaDecay(0.02)` → `alphaDecay(0.04)` (estabiliza mais rápido)
- `velocityDecay(0.5)` → `velocityDecay(0.7)` (mais atrito, menos vibração)

#### 3. Cores mais suaves no estado normal
- `Nodes3D`: cor base com `multiplyScalar(0.5)` no estado normal (sem hover)
- No hover: cor base cheia (brilho total)
- Nós conectados ao hovered: cor base com `multiplyScalar(0.8)`
- Dimmed: mantém `multiplyScalar(0.15)`

#### 4. Adicionar estado "selected" ao clicar
- Novo state `selectedRef: string | null` na Scene
- Ao clicar um nó: seta `selectedRef` (além de chamar `onNodeClick`)
- Clicar no fundo: limpa `selectedRef`

#### 5. Mostrar conexões do nó selecionado
- Novo set `connectedToSelected` (mesmo padrão do `connectedToHovered`)
- Links: quando `selectedRef` ativo, links conectados ao selecionado ficam `opacity={0.8}`, os outros `opacity={0.08}`
- Nós: quando `selectedRef` ativo, nós conectados ficam brilhantes, os outros dimmed
- Hover continua funcionando por cima (mostra label)

#### 6. Links3D reage ao selected
- Passar `selectedRef` e `connectedToSelected` para `Links3D`
- No `useFrame`, ajustar alpha/cor dos links: conectados ao selecionado = cor cheia, outros = quase invisíveis

### Resultado
- Nós ficam com brilho suave no estado normal, sem vibração excessiva
- Hover: nó brilha + mostra nome
- Click: destaca o nó + todas as suas conexões (links e nós conectados), o resto fica opaco

