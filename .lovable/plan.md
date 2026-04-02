

## Plano: Visão neutra + reset de filtro + remover esfera interna

### Problemas identificados

1. **Tudo colorido sem filtro** — No estado neutro (sem grupo selecionado), todos os nós usam `getCategoryColor(n.category)` com intensidade alta. Isso faz tudo ficar rosa/verde/etc. O pedido é: **sem filtro ativo, só o nó central tem cor. Todo o resto é neutro/cinza.**

2. **Filtro não reseta ao trocar de view** — Ao fazer double-click num nó no Master (entra no Single View), `highlightedCategory` nunca é resetado para `null`. Resultado: o Single View já abre com tudo dimmed.

3. **Sidebar sem toggle "nenhum"** — Clicar num grupo já selecionado deveria desativar o filtro (e faz isso via `isActive ? null : name`), mas o estado persiste entre views.

4. **Esfera dentro do poliedro** — Existe um segundo `instancedMesh` com `sphereGeometry` renderizado dentro do tetraedro. Isso foi adicionado como "núcleo interno" mas o usuário não quer.

### Correções

#### 1. Estado neutro: só nó central colorido
Em `SingleCanvas3D.tsx`, na lógica de cor do `SingleNodes3D`:
- Quando `!highlightedCategory && !selectedRef && !hoveredRef`:
  - **Nó central**: cor da categoria (`baseColor`) com intensidade normal
  - **Todos os outros nós**: cor neutra cinza (`#94a3b8`) com intensidade baseada em depth
  - **Links**: cor neutra uniforme, sem variação por tipo

Em `MasterCanvas.tsx`, no `Nodes3D`:
- Estado neutro (sem filtro): todos os nós em cinza neutro uniforme
- Com filtro: nós do grupo ficam coloridos, resto fica dimmed

#### 2. Resetar `highlightedCategory` ao trocar de view
Em `NetworkMatrix.tsx`:
- Adicionar `setHighlightedCategory(null)` em todos os pontos onde `setViewMode('single')` ou `setViewMode('master')` é chamado
- Isso garante que ao entrar num flow, a visão começa limpa

#### 3. Remover a esfera interna (core mesh)
Em `SingleCanvas3D.tsx` e `MasterCanvas.tsx`:
- Remover o segundo `instancedMesh` com `sphereGeometry`
- Remover toda a lógica de `coreRef`, `coreColor`, `getCategoryCoreColor`
- Manter apenas o tetraedro como geometria do nó

#### 4. Links neutros no estado sem filtro
- Sem filtro: todos os links usam uma cor cinza uniforme sutil
- Com filtro ativo: links entre nós do grupo ativo ficam coloridos, resto dimmed

### Arquivos
- `src/components/SingleCanvas3D.tsx` — cor neutra, remover core mesh
- `src/components/MasterCanvas.tsx` — cor neutra, remover core mesh
- `src/components/NetworkMatrix.tsx` — reset de `highlightedCategory` nas transições de view

### Resultado
- Visão limpa e neutra por padrão
- Só o nó central se destaca com cor
- Clicar num grupo na sidebar colore os nós daquele grupo
- Trocar de view limpa o filtro
- Sem esfera dentro do poliedro

