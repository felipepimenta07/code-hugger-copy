

## Plan: 8 Changes to NetworkMatrix UI

### 1. Move Groups Panel to Bottom-Left Corner
**File:** `NetworkSidebar.tsx`
- Change from `fixed` floating/draggable panel to a fixed bottom-left panel
- Remove drag functionality, set position to `bottom: 16px, left: 16px`
- Keep vertical layout, compact styling, anchored to bottom corner
- Remove the collapse-to-circle behavior, keep X close button

### 2. Flows Button Opens Left Sidebar Panel
**File:** `FlowManagerPanel.tsx`
- Transform from small dropdown to a full-height left sidebar panel (width ~280px, `fixed left-0 top-0 h-screen`)
- Click on "Flows" button toggles the sidebar open/closed
- Close on click outside
- Keep the existing flow list UI inside the sidebar

### 3. Hover on Flow Shows Preview Beside Sidebar
**File:** `FlowManagerPanel.tsx`
- On hover over a flow item in the sidebar, show a small preview card to the right of the sidebar
- Preview shows flow name, center node, node count stats
- No click needed — just mouse hover triggers the preview
- On mouse leave, preview disappears

### 4. Fix Duplicate Node Bug on Edit
**File:** `NetworkMatrix.tsx` — `handleNodeUpdate` function (line 694)
- **Root cause:** `handleNodeUpdate` only updates local state but never persists to the database. When realtime triggers `reloadData()`, it fetches stale DB data
- **Fix:** Add a Supabase `.update()` call inside `handleNodeUpdate` to persist the changes to the correct table before updating local state
- Also add the node ID to `recentUpdatesRef` to prevent the realtime listener from triggering a redundant reload

### 5. Show All Node Fields in Detail Panel
**File:** `NodeDetailPanel.tsx`
- Add missing fields: `status`, `address`, `original_node_id`, `flow_id`, `category` (already shown in header but ensure completeness)
- Show all fields the node object contains — iterate over known fields rather than hardcoding only email/phone/website/address/deadline/notes
- Add `company` to the details section (currently only in header)

### 6. Remove PathIndicator ("Caminho de Conexões")
**File:** `NetworkMatrix.tsx` (line 948-951)
- Remove the `<PathIndicator>` component render
- Optionally remove the import and the `PathIndicator.tsx` file entirely

### 7. Flow Colors + Node Colors by Connection Depth
**Files:** `Canvas.tsx`, `FlowManagerPanel.tsx`, `NetworkMatrix.tsx`
- Assign each flow a deterministic color using the existing `hashStr` + `SEED_COLORS` palette (based on flow name or ID)
- Pass flow colors to Canvas for rendering flow-specific styling
- In Single View, color nodes based on their connection depth from center (already calculated via `calculateNodeDepths` BFS in Canvas):
  - Depth 0 (center): bright primary color
  - Depth 1: warm/hot color
  - Depth 2+: progressively cooler/muted colors
  - Unconnected: gray/muted

### 8. Fix Background Gradient
**File:** `src/index.css` + `NetworkMatrix.tsx` (line 789)
- The `NetworkMatrix` container sets an inline `background` style that overrides the CSS gradient
- Remove or make the inline `style={{ background: ... }}` transparent so the `body` gradient from `index.css` shows through
- Adjust the CSS gradient to be more vibrant/visible per the reference image (increase opacity of radial gradients, add more color stops)

### Implementation Order
1. Remove PathIndicator (simplest)
2. Fix background gradient (CSS only)
3. Move Groups panel to bottom-left
4. Fix duplicate node bug (critical)
5. Show all node fields in detail panel
6. Transform Flows into sidebar with hover preview
7. Add flow/node coloring by depth

