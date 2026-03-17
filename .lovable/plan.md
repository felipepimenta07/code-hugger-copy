

## Plan: Reorganize Layout — Bottom Groups Bar + Right Flows Sidebar + Hover Highlight

### 1. `NetworkSidebar.tsx` — Convert to horizontal bottom bar

- Remove all drag logic (`position`, `isDragging`, `dragOffset`, `handleMouseDown`)
- Remove `GripVertical` import
- Change container from floating positioned box to `fixed bottom-0 left-0 right-0 z-50 h-14` with `bg-[hsl(220,20%,8%)]/90 backdrop-blur-md border-t border-border/30`
- Layout becomes `flex flex-row items-center gap-2 px-4 overflow-x-auto`
- Each category rendered as a compact chip: color dot + name + `(N nós)` count
- Collapsed state: small bottom-center pill button to reopen
- Keep existing color system, filter-on-click, and active state styling

### 2. `FlowManagerPanel.tsx` — Convert to right sidebar

- Remove hover/dropdown logic (`isHovering`, `isPinned`, `hoverTimeoutRef`, trigger button)
- Make it a controlled panel driven by `open` prop only
- Layout: `fixed right-0 top-0 h-full w-72 z-50` with slide-in animation (`translate-x` transition)
- Add X close button in header that calls `onOpenChange(false)`
- Add new props: `onHoverFlow(flowId)` and `onHoverFlowEnd()` on each flow row's `onMouseEnter`/`onMouseLeave`
- Keep existing flow list, icons, delete button

### 3. `NetworkMatrix.tsx` — Wire new state + layout

- Add `hoveredFlowId` state (`number | null`)
- Pass `onHoverFlow` / `onHoverFlowEnd` to `FlowManagerPanel`
- Pass `hoveredFlowId` to `Canvas` component
- Move zoom controls up slightly (`bottom-16`) to avoid overlap with bottom groups bar
- Move FABs up similarly
- Remove `FlowManagerPanel` from its current top-left position (line ~905-923) — it's now triggered by toolbar button only and rendered as right sidebar

### 4. `NetworkToolbar.tsx` — Clean up

- Remove `ml-[120px]` margin (Flows no longer overlays toolbar)
- FLOWS button already toggles `showFlowsManager` — keep as-is

### 5. `Canvas.tsx` — Accept `hoveredFlowId` prop

- Add optional `hoveredFlowId?: number | null` prop
- When `hoveredFlowId` is set, nodes not belonging to that flow get `opacity: 0.15`, matching nodes get `opacity: 1` with a subtle glow
- Determine flow membership by checking `node.flow_id === hoveredFlowId`

### 6. Background gradient — No changes needed

### Files modified

| File | Change |
|------|--------|
| `NetworkSidebar.tsx` | Rewrite as horizontal bottom bar |
| `FlowManagerPanel.tsx` | Rewrite as right sidebar with hover callbacks |
| `NetworkMatrix.tsx` | Add hoveredFlowId state, adjust zoom/FAB positions |
| `NetworkToolbar.tsx` | Remove left margin |
| `Canvas.tsx` | Add hoveredFlowId prop for dimming |

