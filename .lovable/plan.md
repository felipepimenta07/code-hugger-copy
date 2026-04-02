

## Plano: Corrigir nós brancos e glow excessivo

### Causa raiz
O problema é **uma linha** em cada material:
```
emissive="#ffffff" emissiveIntensity={0.7}
emissive="#ffffff" emissiveIntensity={1.2}
```
Isso injeta luz branca constante em TODOS os nós, independente da `instanceColor`. A `instanceColor` só afeta o canal difuso, mas o branco emissivo domina — especialmente com Bloom em cima. Resultado: tudo fica branco.

### Correções

#### 1. Materiais — trocar emissive branco por emissive baseado na instanceColor
Em `MasterCanvas.tsx` e `SingleCanvas3D.tsx`, nos 4 materiais (2 por arquivo):

**Casca externa (tetraedro):**
- `emissive` → `"#000000"` (desligado no material base)
- `emissiveIntensity` → `0.4`
- A cor emissiva real será controlada via `instanceColor` + `color` property
- Alternativa mais simples: usar `meshBasicMaterial` que já respeita `instanceColor` diretamente sem iluminação, dando cores puras

**Núcleo interno (esfera):**
- Mesmo princípio: remover emissive branco
- Usar `meshBasicMaterial` para o core — cor pura, sem iluminação, destaque máximo da cor

#### 2. Bloom — reduzir drasticamente
Nos dois canvases:
- `intensity`: 1.2 → **0.4**
- `luminanceThreshold`: 0.1 → **0.6** (só brilha o que for realmente claro)
- `toneMappingExposure`: 1.5 → **1.0**

#### 3. Lógica de cor — remover lerp com branco
Em toda a lógica de `Nodes3D` e `SingleNodes3D`:
- Remover TODOS os `.lerp(new THREE.Color('#ffffff'), ...)` 
- Substituir por:
  - **estado normal**: `_color.copy(baseColor)` (cor pura)
  - **highlight/hover/selected**: `_color.copy(baseColor).multiplyScalar(1.3)` (mais brilhante sem branco)
  - **dimmed**: `_color.copy(baseColor).multiplyScalar(0.05)` (quase apagado)
- O nó central no Single View: `_color.copy(baseColor).multiplyScalar(1.2)` — cor da categoria, intensificada, sem branco

#### 4. Manter comportamento de destaque
- Sem grupo ativo: todos os nós com cor da sua categoria, intensidade normal
- Com grupo ativo: nós do grupo ficam cor cheia, outros quase apagados
- Nó central: cor da categoria dele, escala maior, sem branco

### Arquivos
- `src/components/MasterCanvas.tsx` — materiais + cores + bloom
- `src/components/SingleCanvas3D.tsx` — materiais + cores + bloom

### Resultado
- Poliedros com cor real do grupo (azul, verde, roxo, etc.)
- Nó central colorido pela categoria, não branco
- Glow sutil em vez de wash-out
- Destaque por grupo funciona com cor vibrante

