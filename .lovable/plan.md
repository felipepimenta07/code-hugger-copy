

## Plano: Corrigir Bug de Criação + Simplificar Fluxo

### Bug Principal (linha 603)
`handleCreateNode` usa `nodeCreationType` (estado global) em vez do tipo que o usuário escolheu. Quando o contexto menu ou flow starter não atualiza esse estado corretamente, tudo vira "person".

### Mudanças

**1. `NodeCreationModal.tsx` — Unificar**
- Tipo é escolhido DENTRO do modal (3 botões: 👤/🎯/🏢), não como prop obrigatória
- Categorias como chips multi-select
- O modal retorna `{ ...dados, nodeType: 'person'|'project'|'brand' }` no `onCreate`
- Prop `type` vira opcional (default: 'person', mas editável)

**2. `NetworkMatrix.tsx` — Corrigir lógica**
- `handleCreateNode` e `handleNodeCreation`: extrair tipo de `nodeData.nodeType` em vez de `nodeCreationType`
- Remover `showFlowStarterModal` — "Novo Flow" abre direto o `NodeCreationModal` com flag `isCreatingFlowRoot`
- Simplificar `onNewFlow`: seta `isCreatingFlowRoot=true` e abre modal unificado

**3. `ContextMenu.tsx` — Simplificar**
- Um único botão "Criar Nó" que abre o modal unificado (tipo escolhido dentro)

**4. `NetworkModals.tsx` — Remover FlowStarterModal**
- Remover import e renderização do `FlowStarterModal`
- Ajustar props (remover `showFlowStarterModal`, `onSelectFlowType`)

**5. `NetworkToolbar.tsx` — Simplificar menu "Novo Flow"**
- Em vez de 3 opções (Flow: Pessoa/Marca/Projeto), um único "Novo Flow" que abre o modal unificado
- Toolbar visual como no screenshot: CAMADAS [● 2°] [● 3°] | VISÃO | AJUSTAR | RESET | [● RÓTULOS] [● ISOLADOS] | buscar

### Arquivos
1. `src/components/NodeCreationModal.tsx` — reescrever com seletor de tipo interno
2. `src/components/NetworkMatrix.tsx` — corrigir bug, simplificar flow creation
3. `src/components/ContextMenu.tsx` — botão único
4. `src/components/NetworkModals.tsx` — remover FlowStarter
5. `src/components/NetworkToolbar.tsx` — menu simplificado + visual do screenshot

