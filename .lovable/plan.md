

## Changes

### 1. Rename "Planner" to "Master"
**File:** `src/components/NetworkToolbar.tsx` (line 46)
- Change label from `Planner` to `Master`

### 2. Use flow sidebar colors on Canvas nodes
**File:** `src/components/Canvas.tsx`
- The `FlowManagerPanel` already defines `FLOW_COLORS` for the sidebar. Export that palette (or duplicate it in Canvas) and use it to tint nodes based on their flow, but with shifted lightness/saturation to create "other tones" (e.g. lower saturation, slightly different lightness) so they're related but distinct from the sidebar indicators.
- Pass `flows` array (already a prop) to map each node's `flow_id` → flow index → derive a canvas-specific color variant from the same base hue.

**File:** `src/components/FlowManagerPanel.tsx`
- Export `FLOW_COLORS` so Canvas can import and derive tones from the same base hues.

