

## Problem
The Flows button is missing from the UI. The toolbar leaves a 120px gap on the left for it, and the `FlowManagerPanel` sidebar is wired up to `showFlowsManager` state, but there is no visible "Flows" button rendered in that gap to toggle it.

## Fix
Add a **Flows button** in the toolbar, positioned in the left gap (before the `ml-[120px]` section), that calls `onOpenFlows` to toggle the sidebar.

### Changes

**File: `src/components/NetworkToolbar.tsx`**
- Add a "Flows" button as the first element in the toolbar's left section, positioned **before** the `ml-[120px]` group
- Use `Briefcase` icon (matching FlowManagerPanel) with "FLOWS" label
- Style it consistently with Planner/Single buttons
- Remove the `ml-[120px]` margin since the Flows button now occupies that space naturally

**Minimal change** — just adding the missing button element and adjusting spacing. No logic changes needed since `onOpenFlows` prop already exists and is wired up.

