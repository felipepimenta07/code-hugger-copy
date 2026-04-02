

## Plano: Cores por grupo/categoria nos nós e cada nó com cor única

### Problema atual
1. Quando clica num grupo (ex: "LinkedIn"), os nós usam `TYPE_COLORS[n.type]` (person/project/brand) — **não** a cor do grupo da sidebar
2. Todos os nós do mesmo tipo têm a mesma cor base — não há diferenciação individual

### Mudanças

#### 1. Importar e usar as cores da sidebar no MasterCanvas

**Em `MasterCanvas.tsx`:**
- Copiar a função `hashStr` e `getColor` da sidebar (ou importar de um módulo compartilhado) para mapear `category → cor HSL`
- No `Nodes3D`, quando `highlightedCategory` está ativo e o nó faz match, usar a cor do grupo (ex: cor do "LinkedIn") em vez de `TYPE_COLORS[n.type]`
- Quando **nenhum** filtro está ativo, cada nó usa a cor da sua categoria como cor base — assim nós "LinkedIn" são sempre azuis, nós "WhatsApp" verdes, etc.

**Lógica de cor atualizada no `useFrame`:**
```text
const categoryColor = getCategoryColor(n.category);  // cor do grupo
const baseColor = categoryColor;  // SEMPRE usar cor da categoria

if (highlightedCategory):
  match → cor cheia com glow
  não match → dimmed (0.06)
else (estado normal):
  cada nó com a cor da sua categoria (0.7 brightness)
```

#### 2. Links também usam cor da categoria quando filtro ativo

**Em `Links3D`:**
- Quando `highlightedCategory` ativo, links entre nós da mesma categoria usam a cor do grupo
- Links entre categorias diferentes ficam dimmed

#### 3. Aplicar o mesmo padrão ao SingleCanvas3D

**Em `SingleCanvas3D.tsx`:**
- Usar a mesma função de cor por categoria para os nós
- Nó central mantém destaque de escala (2.0) mas usa a cor da sua categoria

### Implementação técnica
- Extrair `hashStr` + `getColor` do `NetworkSidebar.tsx` para um utilitário compartilhado ou duplicar no MasterCanvas
- Converter HSL string para `THREE.Color` com `new THREE.Color(hslString)`
- Substituir `TYPE_COLORS[n.type]` por `new THREE.Color(getColor(n.category))` como cor base

### Arquivos modificados
1. `src/components/MasterCanvas.tsx` — cores por categoria nos nós e links
2. `src/components/SingleCanvas3D.tsx` — mesma lógica de cores por categoria

