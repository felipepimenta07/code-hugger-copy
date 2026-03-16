

## Plano: Corrigir Bugs + Painel Lateral de Referência + Menu de Grupos

### Bugs Identificados

**1. Nós duplicados (key warning no console)**
- `getNodesForSingleView` (linha 222) prepende o center node manualmente, mas ele já pode estar no array `flowNodes`, causando duplicata
- Fix: garantir que o center node não aparece duas vezes

**2. Nós sem flow (`flow_id = null`)**
- Master View filtra `n.flow_id !== null` (linha 226), então nós sem flow desaparecem
- Não há UI para o usuário ver/atribuir esses nós órfãos a um flow

**3. Nós sem conexão**
- Nós dentro de um flow mas sem nenhuma conexão ficam "flutuando" sem relação — a simulação de forças os empurra para longe

### Mudanças

**1. Fix: Duplicata de nós no Single View**
- `NetworkMatrix.tsx` → `getNodesForSingleView`: verificar se center já está no array antes de prepender

**2. Novo componente: `NodeDetailPanel.tsx` (painel direito ao clicar num nó)**
Baseado nos screenshots de referência:
- Painel fixo à direita (~350px), fundo escuro, borda laranja à esquerda
- Header: categoria em texto colorido (ex: "STF / JUDICIÁRIO") + "× Fechar"
- Nome grande do nó
- Subtítulo/descrição (notes ou company)
- Seção "CONEXÕES DIRETAS" — lista de todos os nós conectados diretamente, cada um com:
  - Bolinha colorida (cor da categoria)
  - Nome do nó conectado
  - Label da conexão (connection_type ou notes)
  - Clicável → navega para aquele nó
- Substitui o Drawer atual do NodeEditor para visualização rápida
- Double-click continua abrindo o modal de edição completa

**3. Refatorar click behavior no Canvas**
- Single click: abre `NodeDetailPanel` (visualização, não edição)
- Double-click: abre `NodeCreationModal` em modo edição (como já funciona)
- Remover o Drawer-based NodeEditor da visualização principal

**4. Sidebar esquerda: menu de grupos colapsável**
- Adicionar botão toggle para colapsar/expandir
- Quando colapsado: mostra apenas as bolinhas coloridas (mini mode ~40px)
- Quando expandido: mostra nome + count (como está, ~200px)
- Canvas ajusta `ml-[]` dinamicamente

**5. Flow Manager: simplificar layout**
- Remover o Sheet lateral e usar um painel inline ou modal mais limpo
- Cards dos flows mais compactos, com visual consistente ao tema escuro

### Arquivos

1. `src/components/NodeDetailPanel.tsx` — **NOVO** — painel direito de visualização ao clicar
2. `src/components/Canvas.tsx` — ajustar click: single click → detail panel, double click → edit modal
3. `src/components/NetworkMatrix.tsx` — fix duplicata, integrar NodeDetailPanel, remover Drawer do NodeEditor
4. `src/components/NetworkModals.tsx` — remover Drawer/NodeEditor
5. `src/components/NetworkSidebar.tsx` — adicionar toggle collapse/expand
6. `src/components/FlowManagerPanel.tsx` — visual mais compacto e consistente

### Detalhes técnicos do NodeDetailPanel

```text
┌─────────────────────────────┐
│ CATEGORIA / SUBCATEGORIA  × │
│                             │
│ Nome do Nó (grande)         │
│ descrição / notes           │
│                             │
│ ─── CONEXÕES DIRETAS ───    │
│ ● Martha Graeff             │
│   perguntou sobre encontro  │
│ ● Daniel Vorcaro            │
│   "Conseguiu bloquear?"     │
│ ● Viviane Barci             │
│   esposa                    │
└─────────────────────────────┘
```

Props: `node`, `connections`, `allNodes`, `onClose`, `onNavigateToNode`

A lista de conexões é calculada filtrando `connections` onde `from === node.id || to === node.id`, e resolvendo o nó oposto em `allNodes`.

