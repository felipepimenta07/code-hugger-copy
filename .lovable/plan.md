

## Consolidação das 4 Partes: Novo Layout Master View

O usuário enviou 4 arquivos atualizados que precisam ser integrados ao projeto. Esses arquivos implementam o layout orgânico com zoom progressivo no Master View, junto com algoritmos de grafo e gerenciamento de cores.

### Arquivos a criar (novos)

1. **`src/utils/graphAlgorithms.ts`** — Algoritmos de grafo (afinidade, detecção de comunidades, centralidade, importância de nó)
2. **`src/data/groupColors.ts`** — Paleta de cores, utilitários hex/rgba, `GroupColorManager` singleton

### Arquivos a substituir (existentes)

3. **`src/components/Canvas.tsx`** — Canvas atualizado com:
   - Import dos `graphAlgorithms` e `groupColors`
   - Layout orgânico grid-based com d3-force mais denso
   - Zoom progressivo (`isNodeVisibleAtZoom`, `getNodeZoomOpacity`)
   - Scores de importância por nó

4. **`src/components/NetworkMatrix.tsx`** — Reescrita significativa:
   - Remoção de imports antigos (NetworkToolbar, NetworkModals, NetworkSidebar, NodeDetailPanel, FlowManagerPanel, WhatsAppNotifications, useForceSimulation, makeRef)
   - Adição de imports novos (muitos ícones lucide, UI components, Legend, QuickActionsMenu, Canvas, NodeCreationModal, etc.)
   - Remoção da prop interface `NetworkMatrixProps` (componente agora sem props)
   - Lógica de estado inline completa (history, node CRUD, Supabase load/save, auto-organize)
   - UI header/toolbar inline ao invés de componentes separados
   - `node_ref` substituído por `id` direto em várias lógicas (updateNodePosition, deleteNode, etc.)

### Pontos de atenção

- O NetworkMatrix novo **não recebe mais props** (`onOpenWhatsApp`, `onLogout`) — o `Index.tsx` precisará ser atualizado para não passá-las
- O Canvas novo importa de `@/utils/graphAlgorithms` e `@/data/groupColors` que ainda não existem
- O NetworkMatrix novo importa componentes que já existem no projeto (QATestButton, ResetButton, FlowStarterModal, etc.)
- A lógica de `node_ref` vs `id` mudou em vários pontos — o Canvas usa `node_ref`, mas o NetworkMatrix passa `id` em `updateNodePosition`

### Mudanças no `src/pages/Index.tsx`

- Remover props `onOpenWhatsApp` e `onLogout` do `<NetworkMatrix />` já que o componente não os aceita mais

### Resumo de tarefas

1. Criar `src/utils/graphAlgorithms.ts` (parte 1)
2. Criar `src/data/groupColors.ts` (parte 2)
3. Substituir `src/components/Canvas.tsx` (parte 3)
4. Substituir `src/components/NetworkMatrix.tsx` (parte 4)
5. Atualizar `src/pages/Index.tsx` para remover props obsoletas

