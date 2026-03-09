
## What the user wants
When the AI identifies a connection (hidden connection, strategic bridge, or opportunity), clicking on it should open a **central overlay panel** — not just highlight on the canvas. This panel should show:
1. A small SVG mini-graph with visual nodes (people/brands/projects) connected by lines
2. Reasoning text explaining WHY these nodes are connected
3. Contact cards for each node with their full details (email, phone, company, etc.)

## What exists today
- `AIInsightsPanel.tsx`: right sidebar panel (420px wide). Items are shown as small cards with badge chips. Clicking a node badge calls `onFocusNode(id)` which navigates to that node on the canvas. Clicking a path calls `onHighlightPath(nodeIds)`.
- `NetworkMatrix.tsx`: `onHighlightPath` sets `highlightedPath` state, `onFocusNode` navigates to single view of that node.

## What needs to be built

### New component: `src/components/AIConnectionModal.tsx`
A centered overlay (`Dialog`) that opens when the user clicks "Ver Conexão" on any insight card. It receives:
- `connection`: the insight object (hidden_connection, bridge, or opportunity)
- `involvedNodes`: the full node objects for each node_id in the connection
- `onClose`: close handler
- `onFocusNode`: to navigate to a node from within the modal

**Layout (3 sections):**

```text
┌─────────────────────────────────────────────────────┐
│  🔗 Conexão Oculta: [título]              [X fechar] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [MINI GRAFO SVG]                                   │
│  Nó A ——————————————— Nó B                         │
│  (círculo com ícone)  (linha)  (círculo com ícone)  │
│                                                      │
├─────────────────────────────────────────────────────┤
│  🧠 Raciocínio da IA                                │
│  [descrição + action text]                          │
├─────────────────────────────────────────────────────┤
│  👥 Contatos Envolvidos                             │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ 👤 Nome      │  │ 🏢 Marca     │                │
│  │ empresa      │  │ categoria    │                │
│  │ email        │  │ website      │                │
│  │ telefone     │  │              │                │
│  │ [Ver no mapa]│  │ [Ver no mapa]│                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
```

### Changes to `AIInsightsPanel.tsx`
- Add `onOpenConnectionModal` prop: `(connection: any, involvedNodes: any[]) => void`
- In each insight card (hidden_connections, strategic_bridges, opportunities), replace the current badge-only interaction with a proper **"Ver Conexão →"** button that calls `onOpenConnectionModal`
- Pass `involvedNodes` by looking up the `node_ids` array against `[...people, ...brands, ...projects]`

### Changes to `NetworkMatrix.tsx`
- Add state: `aiConnectionModal: { connection: any; nodes: any[] } | null`
- Pass `onOpenConnectionModal` to `AIInsightsPanel`
- Render `AIConnectionModal` when `aiConnectionModal !== null`

## Mini-graph logic
The SVG mini-graph will:
- Place nodes in a horizontal or circular layout based on count (2 nodes = left/right, 3+ = circle)
- Draw dashed purple lines between each pair
- Show node type icons (👤 person, 🏢 brand, 📁 project) inside colored circles
- Node colors: person = blue, brand = orange, project = green (matching the existing visual system)

## Files to create/modify
1. **CREATE** `src/components/AIConnectionModal.tsx` — new modal component
2. **EDIT** `src/components/AIInsightsPanel.tsx` — add prop + "Ver Conexão" buttons
3. **EDIT** `src/components/NetworkMatrix.tsx` — wire state + render modal
