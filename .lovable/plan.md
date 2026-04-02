

## Plano: Diferenciar nó principal, highlight por grupo, auto-centralizar, e melhorar conexões

### 1. Diferenciar nó principal (selecionado) dos conectados

**Em `Nodes3D` (MasterCanvas.tsx):**
- Nó selecionado (`isSelected`): escala `1.6`, cor base cheia + `emissiveIntensity` mais alto (brilho forte)
- Nós conectados ao selecionado (`isConnectedSelect`): escala `1.0`, cor base com `multiplyScalar(0.85)` — visíveis mas claramente secundários
- Restante: mantém dimmed (`0.12`)

Isso cria hierarquia visual clara: **protagonista → coadjuvantes → figurantes**.

### 2. Clicar no grupo da sidebar → destacar na esfera

**Em `NetworkSidebar.tsx`:**
- Adicionar nova prop `onHighlightCategory?: (category: string | null) => void`
- Ao clicar num grupo, além do filtro atual, chamar `onHighlightCategory(name)`

**Em `NetworkMatrix.tsx`:**
- Novo state `highlightedCategory: string | null`
- Passar para `MasterCanvas` como nova prop

**Em `MasterCanvas.tsx` (Scene + Nodes3D):**
- Receber `highlightedCategory`
- No `useFrame` do `Nodes3D`: quando `highlightedCategory` está ativo, nós dessa categoria ficam com cor cheia, os outros ficam dimmed (`0.12`)
- Links entre nós da categoria ficam visíveis, resto apagado

### 3. Auto-centralizar câmera ao clicar num nó

**Novo componente `CameraFocus` dentro da Scene:**
- Recebe `selectedRef` e `simNodes`
- Quando `selectedRef` muda, encontra o nó, faz `lerp` suave da câmera em direção ao nó (usando `useFrame` com interpolação)
- A câmera se move suavemente para enquadrar o nó selecionado no centro
- Usa `OrbitControls.target` para mudar o ponto focal (via ref no OrbitControls)

### 4. Conexões mais fortes e com animação

**Em `Links3D`:**
- Trocar `lineBasicMaterial` por `lineBasicMaterial` com `linewidth` maior (limitado em WebGL, mas aumentar opacity)
- Quando selecionado: links ativos com `opacity={0.9}` (atualmente 0.7)
- Adicionar animação de "pulso" nas conexões ativas: no `useFrame`, variar a cor/opacity com `Math.sin(time * 3)` criando um efeito de energia fluindo pelos links

### 5. Conexões sugeridas pelo sistema com cor diferente

**Em `CONNECTION_COLORS`:**
- Adicionar novo tipo `suggested: new THREE.Color('hsl(45, 100%, 60%)')` — amarelo/dourado para sugestões de IA
- Adicionar `ai-suggested: new THREE.Color('hsl(45, 100%, 60%)')`
- Essas conexões se distinguem visualmente das orgânicas (azul/verde/cinza)

**No mapeamento de links:**
- `connectionType: c.connection_type || c.type || 'related'` já passa o tipo — basta o backend/criação de conexões usar `'suggested'` como tipo

### Arquivos modificados
1. **`src/components/MasterCanvas.tsx`** — diferenciação visual do nó principal, `CameraFocus`, animação de pulso nos links, novas cores de conexão, receber `highlightedCategory`
2. **`src/components/NetworkSidebar.tsx`** — nova prop `onHighlightCategory`
3. **`src/components/NetworkMatrix.tsx`** — state `highlightedCategory`, passar para MasterCanvas e NetworkSidebar

