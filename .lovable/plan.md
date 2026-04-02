

## Plano Consolidado: Corrigir Master View + Criar Single View 3D

### Parte 1: Correções no Master View (`MasterCanvas.tsx`)

#### 1.1 Corrigir CameraFocus — orbitar, não arrastar
O bug atual: só move `controls.target` sem mover a câmera, mudando o centro de rotação.

**Correção**: No `useFrame`, calcular o `offset` entre câmera e target, lerpar o target, e reposicionar a câmera mantendo o offset:
```
const offset = camera.position.clone().sub(controls.target);
controls.target.lerp(nodePos, 0.08);
camera.position.copy(controls.target).add(offset);
```

#### 1.2 Corrigir category matching
Os nós são construídos com `category: n.category || null`. Se o campo vier vazio do DB, nunca dá match com o grupo da sidebar. Adicionar fallback: `category: n.category || n.group || null` e verificar o que a sidebar envia como nome.

---

### Parte 2: Criar Single View 3D (`SingleCanvas3D.tsx`)

Novo componente baseado no `MasterCanvas.tsx`, adaptado para visualização de um único flow.

**Estrutura idêntica**: Three.js + R3F, tetraedros, fog, bloom, stars, mesmos parâmetros visuais.

**Diferenças**:
- Nó central fixado em `(0,0,0)` com escala `2.0` e cor mais brilhante
- `forceRadial` mais forte para hierarquia radial clara
- Cores por profundidade BFS (depth 0 = brilhante, depth 3+ = dimmed)
- Conexões diretas do centro mais brilhantes
- Props compatíveis com as do `Canvas.tsx` atual: `nodes`, `connections`, `onSingleClick`, `onOpenEditModal`, `selectedNodes`, `highlightedPath`, `showLabels`

---

### Parte 3: Integrar no NetworkMatrix

Em `NetworkMatrix.tsx`, no bloco `viewMode !== 'master'`, renderizar `SingleCanvas3D` no lugar de `Canvas` (SVG), passando as mesmas props.

---

### Arquivos
1. **Editar** `src/components/MasterCanvas.tsx` — corrigir CameraFocus + category fallback
2. **Criar** `src/components/SingleCanvas3D.tsx` — Single View 3D
3. **Editar** `src/components/NetworkMatrix.tsx` — trocar Canvas por SingleCanvas3D

