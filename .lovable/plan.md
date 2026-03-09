

## Problem Identified

The "Ver Conexão" button **does** set `aiConnectionModal` state correctly and the `AIConnectionModal` **does** render. However, two issues prevent it from being visible/interactive:

1. **Z-index conflict**: The `AIInsightsPanel` is a `fixed` div with `z-50`. The Dialog overlay and content from `AIConnectionModal` also use `z-50`. Since the panel stays open, it can visually cover or block interaction with the modal.

2. **Panel stays open**: When you click "Ver Conexão", the AIInsightsPanel remains open (no code closes it), so even if the modal renders behind/alongside it, it's obscured by the 420px-wide panel.

## Fix Plan

### 1. Close the AIInsightsPanel when opening the modal (NetworkMatrix.tsx)

In the `onOpenConnectionModal` callback (line ~2505), also set `showAIInsights` to `false` so the sidebar closes when the central modal opens:

```typescript
onOpenConnectionModal={(connection, involvedNodes, type) => {
  setShowAIInsights(false);
  setAiConnectionModal({ connection, nodes: involvedNodes, type });
}}
```

### 2. Increase z-index on AIConnectionModal (AIConnectionModal.tsx)

Override the Dialog's overlay and content z-index to `z-[60]` to guarantee it renders above any z-50 elements:

- `DialogContent` className: add `z-[60]`
- Also wrap with a higher-z overlay if needed

### 3. (Safety) Add console.log for debugging

Temporarily add a `console.log` in the `openModal` function in `AIInsightsPanel.tsx` to confirm the button click fires and the node data is resolved correctly.

## Files to modify
1. **`src/components/NetworkMatrix.tsx`** -- close panel on modal open (1 line change)
2. **`src/components/AIConnectionModal.tsx`** -- increase z-index on DialogContent and overlay

