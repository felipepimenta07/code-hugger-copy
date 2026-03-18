import React, { useState, useRef, useMemo } from "react";
import { forceSimulation, forceManyBody, forceCenter, forceCollide, forceX, forceY } from "d3-force";
import { User, Target, Building2 } from "lucide-react";
import { ConnectionTooltip } from "./ConnectionTooltip";
import { parseRef } from "@/utils/nodeRef";
import { FLOW_COLORS } from "./FlowManagerPanel";
import {
  calculateAffinity,
  detectCommunities,
  calculateBetweennessCentrality,
  calculateNodeImportance,
} from "@/utils/graphAlgorithms";
import { getConsistentColor } from "@/data/groupColors";

interface CanvasProps {
  svgRef: React.RefObject<SVGSVGElement>;
  state: any;
  updateState: (updates: any) => void;
  viewMode: string;
  workflows: any[];
  nodes: any[];
  connections: any[];
  selectedNodes: string[];
  setSelectedNodes: (nodes: string[]) => void;
  selectedConnection: number | null;
  setSelectedConnection: (connection: number | null) => void;
  highlightedPath: string[];
  hoveredNode: string | null;
  setHoveredNode: (node: string | null) => void;
  updateNodePosition: (nodeRef: string, deltaX: number, deltaY: number, saveToDb?: boolean) => void;
  setConnections: (updater: any) => void;
  saveToHistory: () => void;
  onOpenEditModal?: (node: any) => void;
  onSingleClick?: (node: any) => void;
  projects?: any[];
  flows?: any[];
  allConnections?: any[];
  onGoToFlow?: (flowId: number) => void;
  onWheel?: (e: React.WheelEvent) => void;
  showLabels?: boolean;
  forcePositions?: { [nodeRef: string]: { x: number; y: number } };
  onForceDragStart?: (nodeRef: string) => void;
  onForceDrag?: (nodeRef: string, x: number, y: number) => void;
  onForceDragEnd?: (nodeRef: string) => void;
  useForceLayout?: boolean;
}

const nodeColors = {
  person: {
    primary: "hsl(var(--node-person))",
    glow: "hsl(var(--node-person-glow))",
    secondary: "hsl(var(--node-person-secondary))",
  },
  project: {
    primary: "hsl(var(--node-project))",
    glow: "hsl(var(--node-project-glow))",
    secondary: "hsl(var(--node-project-secondary))",
  },
  brand: {
    primary: "hsl(var(--node-brand))",
    glow: "hsl(var(--node-brand-glow))",
    secondary: "hsl(var(--node-brand-secondary))",
  },
};

const depthColors = ["hsl(var(--depth-0))", "hsl(var(--depth-1))", "hsl(var(--depth-2))", "hsl(var(--depth-3))"];
const depthUnconnected = "hsl(var(--depth-unconnected))";

export const Canvas: React.FC<CanvasProps> = ({
  svgRef,
  state,
  updateState,
  viewMode,
  workflows,
  nodes,
  connections,
  selectedNodes,
  setSelectedNodes,
  selectedConnection,
  setSelectedConnection,
  highlightedPath,
  hoveredNode,
  setHoveredNode,
  updateNodePosition,
  setConnections,
  saveToHistory,
  onOpenEditModal,
  onSingleClick,
  projects = [],
  flows = [],
  allConnections = [],
  onGoToFlow,
  onWheel,
  showLabels = false,
  forcePositions,
  onForceDragStart,
  onForceDrag,
  onForceDragEnd,
  useForceLayout = false,
}) => {
  const [hoveredConnection, setHoveredConnection] = useState<{
    index: number;
    position: { x: number; y: number };
  } | null>(null);

  // BFS to calculate depth from center node using node_ref
  const calculateNodeDepths = () => {
    if (viewMode !== "single" || nodes.length === 0) return new Map<string, number>();
    const centerNode = nodes[0];
    const depths = new Map<string, number>();
    const queue: Array<{ ref: string; depth: number }> = [{ ref: centerNode.node_ref, depth: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.ref)) continue;
      visited.add(current.ref);
      depths.set(current.ref, current.depth);
      connections
        .filter((c) => c.from_ref === current.ref || c.to_ref === current.ref)
        .forEach((c) => {
          const neighborRef = c.from_ref === current.ref ? c.to_ref : c.from_ref;
          if (!visited.has(neighborRef) && nodes.some((n) => n.node_ref === neighborRef)) {
            queue.push({ ref: neighborRef, depth: current.depth + 1 });
          }
        });
    }
    return depths;
  };

  const nodeDepths = calculateNodeDepths();

  const getNodeFlowId = (n: any) => n?.flow_id ?? (n?.type === "project" ? n.id : null);

  // Single unified cloud/globe layout — all nodes form one organic cluster
  const masterLayoutMap = React.useMemo(() => {
    if (viewMode !== "master" || nodes.length === 0)
      return new Map<string, { x: number; y: number }>();

    // Build adjacency from allConnections for link force
    const nodeRefSet = new Set(nodes.map((n: any) => n.node_ref));
    const links = (allConnections || connections).filter(
      (c: any) => nodeRefSet.has(c.from_ref) && nodeRefSet.has(c.to_ref)
    ).map((c: any) => ({ source: c.from_ref, target: c.to_ref }));

    // Scatter all nodes randomly around center — no per-flow clustering
    const simNodes = nodes.map((n: any) => ({
      id: n.node_ref,
      nodeRef: n.node_ref,
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 80,
      vx: 0,
      vy: 0,
    }));

    const sim = forceSimulation(simNodes as any)
      .force("charge", forceManyBody().strength(-18))
      .force("center", forceCenter(0, 0).strength(0.12))
      .force("collision", forceCollide<any>().radius(6).strength(0.9))
      .force("x", forceX(0).strength(0.08))
      .force("y", forceY(0).strength(0.08))
      .force("link", links.length > 0
        ? (await import("d3-force")).forceLink(links).id((d: any) => d.id).distance(20).strength(0.3)
        : null
      )
      .stop();

    for (let i = 0; i < 300; i++) sim.tick();

    const map = new Map<string, { x: number; y: number }>();
    simNodes.forEach((sn) => {
      map.set(sn.nodeRef, { x: sn.x, y: sn.y });
    });
    return map;
  }, [viewMode, nodes, connections, allConnections]);

  // Importance score for progressive zoom visibility in master view
  const nodeImportance = React.useMemo(() => {
    if (viewMode !== "master") return new Map<string, number>();
    const scores = new Map<string, number>();
    const maxConns = Math.max(1, ...nodes.map((n: any) =>
      connections.filter((c: any) => c.from_ref === n.node_ref || c.to_ref === n.node_ref).length
    ));
    nodes.forEach((n: any) => {
      const isCenter = flows?.some((f: any) => f.center_id === n.id && f.center_type === n.type);
      const connCount = connections.filter((c: any) => c.from_ref === n.node_ref || c.to_ref === n.node_ref).length;
      const score = isCenter ? 1.0 : Math.max(0.05, connCount / maxConns);
      scores.set(n.node_ref, score);
    });
    return scores;
  }, [viewMode, nodes, connections, flows]);

  // Determine if a node is visible at current zoom
  const isNodeVisibleAtZoom = React.useCallback((nodeRef: string, zoom: number) => {
    if (viewMode !== "master") return true;
    const importance = nodeImportance.get(nodeRef) ?? 0;
    if (zoom >= 0.6) return true;
    if (zoom >= 0.3) return importance >= 0.15;
    return importance >= 0.7;
  }, [viewMode, nodeImportance]);

  // Get node opacity based on zoom and importance (for fade-in effect)
  const getNodeZoomOpacity = React.useCallback((nodeRef: string, zoom: number) => {
    if (viewMode !== "master") return 1;
    const importance = nodeImportance.get(nodeRef) ?? 0;
    if (importance >= 0.7) return 1;
    if (zoom >= 0.6) return 0.5 + importance * 0.5;
    if (zoom >= 0.3) return importance >= 0.15 ? 0.3 + importance * 0.7 : 0;
    return 0;
  }, [viewMode, nodeImportance]);

  // Position resolver
  const getDisplayPos = (n: any) => {
    if (viewMode === "master") {
      const pos = masterLayoutMap.get(n.node_ref);
      return pos ?? { x: n.x, y: n.y };
    }
    if (useForceLayout && forcePositions && forcePositions[n.node_ref]) {
      return forcePositions[n.node_ref];
    }
    return { x: n.x, y: n.y };
  };

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCountRef = useRef(0);

  const handleNodeMouseDown = (e: React.MouseEvent, node: any) => {
    e.stopPropagation();
    const nodeRef = node.node_ref;
    if (viewMode === "master") {
      if (e.shiftKey) {
        setSelectedNodes(
          selectedNodes.includes(nodeRef) ? selectedNodes.filter((r) => r !== nodeRef) : [...selectedNodes, nodeRef],
        );
      } else {
        if (!selectedNodes.includes(nodeRef)) setSelectedNodes([nodeRef]);
        updateState({ selectedNode: nodeRef });
      }
      return;
    }
    if (e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      const rect = svgRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
      const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
      if (e.shiftKey) {
        setSelectedNodes(
          selectedNodes.includes(nodeRef) ? selectedNodes.filter((r) => r !== nodeRef) : [...selectedNodes, nodeRef],
        );
      } else {
        if (!selectedNodes.includes(nodeRef)) setSelectedNodes([nodeRef]);
        const pos = getDisplayPos(node);
        updateState({ dragging: nodeRef, offset: { x: x - pos.x, y: y - pos.y }, selectedNode: nodeRef });
        if (useForceLayout && onForceDragStart) {
          onForceDragStart(nodeRef);
        }
      }
    }
  };

  const handleNodeClick = (e: React.MouseEvent, node: any) => {
    clickCountRef.current++;
    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          if (onSingleClick) onSingleClick(node);
        }
        clickCountRef.current = 0;
      }, 250);
    }
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, node: any) => {
    e.stopPropagation();
    clickCountRef.current = 2;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (viewMode === "single") {
      if (onOpenEditModal) onOpenEditModal(node);
      return;
    }
    if (onGoToFlow) {
      const centerFlow = flows.find((f) => f.center_id === node.id && f.center_type === node.type);
      if (centerFlow) {
        onGoToFlow(centerFlow.id);
      } else if (node.flow_id) {
        onGoToFlow(node.flow_id);
      }
    }
  };

  const handleConnectionDotMouseDown = (e: React.MouseEvent, node: any) => {
    if (viewMode === "master") return;
    e.stopPropagation();
    const pos = getDisplayPos(node);
    updateState({
      isDraggingConnection: true,
      connectionStart: { ref: node.node_ref, x: pos.x, y: pos.y },
      connectionEnd: { x: pos.x, y: pos.y },
      showSidebar: false,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
    const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
    if (state.dragging && viewMode === "master") return;
    if (state.dragging) {
      if (useForceLayout && onForceDrag) {
        const dragX = x - state.offset.x;
        const dragY = y - state.offset.y;
        onForceDrag(state.dragging, dragX, dragY);
      } else {
        const draggedNode = nodes.find((n) => n.node_ref === state.dragging);
        if (draggedNode) {
          const dx = x - state.offset.x - draggedNode.x;
          const dy = y - state.offset.y - draggedNode.y;
          selectedNodes.forEach((nodeRef) => updateNodePosition(nodeRef, dx, dy, false));
        }
      }
    } else if (state.isPanning) {
      updateState({ pan: { x: e.clientX - state.panStart.x, y: e.clientY - state.panStart.y } });
    } else if (state.isDraggingConnection) {
      updateState({ connectionEnd: { x, y } });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (state.isDraggingConnection && state.connectionStart) {
      const rect = svgRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
      const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
      const targetNode = nodes.find((n) => {
        const pos = getDisplayPos(n);
        return Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2) < 45;
      });
      if (targetNode && targetNode.node_ref !== state.connectionStart.ref) {
        const exists = connections.some(
          (c) =>
            (c.from_ref === state.connectionStart.ref && c.to_ref === targetNode.node_ref) ||
            (c.from_ref === targetNode.node_ref && c.to_ref === state.connectionStart.ref),
        );
        if (!exists) {
          const startParsed = parseRef(state.connectionStart.ref);
          saveToHistory();
          setConnections((prev) => [
            ...prev,
            {
              from: startParsed.id,
              to: targetNode.id,
              from_ref: state.connectionStart.ref,
              to_ref: targetNode.node_ref,
              from_type: startParsed.type,
              to_type: targetNode.type,
              type: "strong",
              directional: false,
            },
          ]);
        }
      }
    }
    if (state.dragging) {
      if (useForceLayout && onForceDragEnd) {
        const pos = forcePositions?.[state.dragging];
        if (pos) {
          const draggedNode = nodes.find((n) => n.node_ref === state.dragging);
          if (draggedNode) {
            const dx = pos.x - draggedNode.x;
            const dy = pos.y - draggedNode.y;
            selectedNodes.forEach((nodeRef) => updateNodePosition(nodeRef, dx, dy, true));
          }
        }
        onForceDragEnd(state.dragging);
      } else {
        const draggedNode = nodes.find((n) => n.node_ref === state.dragging);
        if (draggedNode) {
          const rect = svgRef.current!.getBoundingClientRect();
          const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
          const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
          const dx = x - state.offset.x - draggedNode.x;
          const dy = y - state.offset.y - draggedNode.y;
          selectedNodes.forEach((nodeRef) => updateNodePosition(nodeRef, dx, dy, true));
        }
      }
      saveToHistory();
    }
    updateState({ dragging: null, isPanning: false, isDraggingConnection: false, connectionStart: null });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (viewMode === "master") return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
    const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
    const clickedNode = nodes.find((n) => {
      const pos = getDisplayPos(n);
      return Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2) < 45;
    });
    if (!clickedNode) {
      updateState({ contextMenu: { x: e.clientX, y: e.clientY, canvasX: x, canvasY: y, type: "canvas" } });
    }
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  return (
    <>
      <svg
        ref={svgRef}
        className="w-full h-full cursor-move"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleCanvasContextMenu}
        onWheel={onWheel}
        onMouseDown={(e) => {
          if (e.button === 0 && !e.shiftKey) {
            setSelectedNodes([]);
            updateState({ isPanning: true, panStart: { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y } });
          }
        }}
      >
        <defs>
          <filter id="glow-node" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="connectionGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--connection-strong))" />
          </marker>
        </defs>

        <g
          transform={`translate(${state.pan.x}, ${state.pan.y}) scale(${state.zoom})`}
          style={{ transition: state.isPanning || state.dragging ? "none" : "transform 0.15s ease-out" }}
        >
          <rect x="-5000" y="-5000" width="15000" height="15000" fill="transparent" />

          {/* Subtle dotted rings (Single View only) */}
          {viewMode === "single" &&
            nodes.length > 0 &&
            (() => {
              const centerNode = nodes[0];
              if (!centerNode) return null;
              const centerPos = getDisplayPos(centerNode);
              return (
                <g key="radial-rings" opacity="0.15">
                  <circle
                    cx={centerPos.x}
                    cy={centerPos.y}
                    r={200}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="0.5"
                    strokeDasharray="4,12"
                  />
                  <circle
                    cx={centerPos.x}
                    cy={centerPos.y}
                    r={350}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="0.5"
                    strokeDasharray="4,12"
                  />
                  <circle
                    cx={centerPos.x}
                    cy={centerPos.y}
                    r={520}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="0.5"
                    strokeDasharray="3,12"
                  />
                </g>
              );
            })()}

          {/* Cross-flow connections (Master View) */}
          {viewMode === "master" &&
            (() => {
              const specificConnections: Array<{
                personA: any;
                personB: any;
                flowA: number;
                flowB: number;
                company?: string;
                emailDomain?: string;
                type: "company" | "email";
                strength: number;
              }> = [];

              const peopleWithCompany = nodes.filter((n) => n.type === "person" && n.company);
              const peopleWithEmail = nodes.filter((n) => n.type === "person" && n.email);

              for (let i = 0; i < peopleWithCompany.length; i++) {
                for (let j = i + 1; j < peopleWithCompany.length; j++) {
                  const pA = peopleWithCompany[i];
                  const pB = peopleWithCompany[j];
                  const flowA = getNodeFlowId(pA);
                  const flowB = getNodeFlowId(pB);
                  const compA = typeof pA.company === "string" ? pA.company.trim().toLowerCase() : "";
                  const compB = typeof pB.company === "string" ? pB.company.trim().toLowerCase() : "";
                  if (flowA !== flowB && compA && compA === compB) {
                    specificConnections.push({
                      personA: pA,
                      personB: pB,
                      flowA,
                      flowB,
                      company: pA.company,
                      type: "company",
                      strength: pA.category === pB.category ? 3 : 2,
                    });
                  }
                }
              }

              for (let i = 0; i < peopleWithEmail.length; i++) {
                for (let j = i + 1; j < peopleWithEmail.length; j++) {
                  const pA = peopleWithEmail[i];
                  const pB = peopleWithEmail[j];
                  const flowA = getNodeFlowId(pA);
                  const flowB = getNodeFlowId(pB);
                  if (flowA !== flowB && pA.email && pB.email) {
                    const domainA = pA.email.split("@")[1]?.toLowerCase();
                    const domainB = pB.email.split("@")[1]?.toLowerCase();
                    if (
                      domainA &&
                      domainB &&
                      domainA === domainB &&
                      !["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"].includes(domainA)
                    ) {
                      const alreadyConnected = specificConnections.some(
                        (c) =>
                          (c.personA.node_ref === pA.node_ref && c.personB.node_ref === pB.node_ref) ||
                          (c.personA.node_ref === pB.node_ref && c.personB.node_ref === pA.node_ref),
                      );
                      if (!alreadyConnected) {
                        specificConnections.push({
                          personA: pA,
                          personB: pB,
                          flowA,
                          flowB,
                          emailDomain: domainA,
                          type: "email",
                          strength: 1,
                        });
                      }
                    }
                  }
                }
              }

              return specificConnections.map((conn, idx) => {
                if (!isNodeVisibleAtZoom(conn.personA.node_ref, state.zoom) || !isNodeVisibleAtZoom(conn.personB.node_ref, state.zoom)) return null;
                const posA = masterLayoutMap.get(conn.personA.node_ref);
                const posB = masterLayoutMap.get(conn.personB.node_ref);
                if (!posA || !posB) return null;
                const style =
                  conn.type === "company"
                    ? {
                        stroke: "hsl(var(--connection-cross))",
                        strokeWidth: conn.strength === 3 ? "2.5" : "2",
                        dasharray: "6,4",
                        opacity: "0.5",
                      }
                    : { stroke: "hsl(var(--primary))", strokeWidth: "1.5", dasharray: "8,6", opacity: "0.35" };
                return (
                  <path
                    key={`xflow-${idx}`}
                    d={`M ${posA.x} ${posA.y} L ${posB.x} ${posB.y}`}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.dasharray}
                    opacity={style.opacity}
                    fill="none"
                    className="pointer-events-none"
                  />
                );
              });
            })()}

          {/* Removed cluster rings — dense layout has no rings */}

          {/* Connections */}
          {(() => {
            const activeNodeRef = selectedNodes.length === 1 ? selectedNodes[0] : null;
            const hasFocus = activeNodeRef !== null;

            return connections.map((conn, idx) => {
              const from = nodes.find((n) => n.node_ref === conn.from_ref);
              const to = nodes.find((n) => n.node_ref === conn.to_ref);
              if (!from || !to) return null;

              // In master view, hide connections if either node is not visible at current zoom
              if (viewMode === "master" && (!isNodeVisibleAtZoom(from.node_ref, state.zoom) || !isNodeVisibleAtZoom(to.node_ref, state.zoom))) return null;

              const globalIdx = allConnections.findIndex(
                (c) =>
                  (c.from_ref === conn.from_ref && c.to_ref === conn.to_ref) ||
                  (c.from_ref === conn.to_ref && c.to_ref === conn.from_ref),
              );
              const isSelected = selectedConnection === globalIdx;
              const fromDepth = nodeDepths.get(from.node_ref) ?? 0;
              const toDepth = nodeDepths.get(to.node_ref) ?? 0;
              const connectionLevel = Math.min(fromDepth, toDepth);
              const isInPath =
                highlightedPath.length > 0 &&
                highlightedPath.some(
                  (ref, i) =>
                    i < highlightedPath.length - 1 &&
                    ((highlightedPath[i] === from.node_ref && highlightedPath[i + 1] === to.node_ref) ||
                      (highlightedPath[i] === to.node_ref && highlightedPath[i + 1] === from.node_ref)),
                );

              const fromFlowId = getNodeFlowId(from);
              const toFlowId = getNodeFlowId(to);
              const isCrossFlow = viewMode === "master" && fromFlowId && toFlowId && fromFlowId !== toFlowId;

              const isConnDimmed = hasFocus && conn.from_ref !== activeNodeRef && conn.to_ref !== activeNodeRef;

              let strokeColor: string,
                strokeWidth: number,
                strokeDasharray: string | undefined,
                opacity = 1,
                useGlow = false;

              if (isInPath) {
                strokeColor = "#10b981";
                strokeWidth = 4;
              } else if (isSelected) {
                strokeColor = "#f59e0b";
                strokeWidth = isCrossFlow ? 3 : 2.5;
              } else if (isCrossFlow) {
                strokeColor = "hsl(var(--connection-cross))";
                strokeWidth = 2;
                strokeDasharray = "8,4";
                opacity = 0.5;
              } else {
                strokeColor = conn.type === "strong" ? "#a855f7" : "#6366f1";
                if (viewMode === "single") {
                  switch (connectionLevel) {
                    case 0:
                      strokeWidth = 3;
                      opacity = 0.9;
                      useGlow = true;
                      break;
                    case 1:
                      strokeWidth = 2;
                      opacity = 0.7;
                      break;
                    case 2:
                      strokeWidth = 1.5;
                      opacity = 0.5;
                      strokeDasharray = "6,4";
                      break;
                    default:
                      strokeWidth = 1;
                      opacity = 0.3;
                      strokeDasharray = "3,8";
                      break;
                  }
                } else {
                  strokeWidth = 2;
                  opacity = 0.3;
                }
              }
              if (isSelected) opacity = 1;
              if (isConnDimmed) opacity = 0.06;

              const { x: fromX, y: fromY } = getDisplayPos(from);
              const { x: toX, y: toY } = getDisplayPos(to);
              const midX = (fromX + toX) / 2;
              const midY = (fromY + toY) / 2;
              const controlY2 = midY - 60;
              const pathData = `M ${fromX},${fromY} Q ${midX},${controlY2} ${toX},${toY}`;

              return (
                <g
                  key={`conn-${conn.id || idx}-${conn.from_ref}-${conn.to_ref}`}
                  style={{ transition: "opacity 0.3s ease" }}
                >
                  <path
                    d={pathData}
                    stroke="transparent"
                    strokeWidth="15"
                    fill="none"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConnection(selectedConnection === globalIdx ? null : globalIdx);
                      setSelectedNodes([]);
                    }}
                    onMouseEnter={(e) => {
                      const rect = svgRef.current!.getBoundingClientRect();
                      const mx = midX * state.zoom + state.pan.x + rect.left;
                      const my = controlY2 * state.zoom + state.pan.y + rect.top;
                      setHoveredConnection({ index: idx, position: { x: mx, y: my } });
                    }}
                    onMouseLeave={() => setHoveredConnection(null)}
                  />
                  <path
                    d={pathData}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={strokeDasharray}
                    opacity={opacity}
                    markerEnd={conn.directional ? "url(#arrowhead)" : ""}
                    filter={useGlow ? "url(#connectionGlow)" : undefined}
                    className="pointer-events-none"
                  />
                  {showLabels && conn.connection_type && (
                    <text
                      x={midX}
                      y={controlY2 + 4}
                      textAnchor="middle"
                      fill="hsl(var(--muted-foreground))"
                      fontSize="13"
                      fontFamily="monospace"
                      opacity={isConnDimmed ? 0.06 : 0.6}
                    >
                      {conn.connection_type}
                    </text>
                  )}
                </g>
              );
            });
          })()}

          {/* Dragging connection line */}
          {state.isDraggingConnection && state.connectionStart && (
            <line
              x1={state.connectionStart.x}
              y1={state.connectionStart.y}
              x2={state.connectionEnd.x}
              y2={state.connectionEnd.y}
              stroke="hsl(var(--connection-strong))"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}

          {/* Removed bubble mode — dense layout always shows individual nodes */}

          {/* Nodes */}
          {(() => {
            const activeNodeRef = selectedNodes.length === 1 ? selectedNodes[0] : null;
            const connectedNodeRefs = new Set<string>();
            if (activeNodeRef) {
              connectedNodeRefs.add(activeNodeRef);
              connections.forEach((c) => {
                if (c.from_ref === activeNodeRef) connectedNodeRefs.add(c.to_ref);
                if (c.to_ref === activeNodeRef) connectedNodeRefs.add(c.from_ref);
              });
            }
            const hasFocus = activeNodeRef !== null;

            return nodes.map((node) => {
              // Progressive visibility in master view
              if (viewMode === "master" && !isNodeVisibleAtZoom(node.node_ref, state.zoom)) return null;

              const nodeType = (node.type as keyof typeof nodeColors) || "person";
              const depth = nodeDepths.get(node.node_ref);
              const useDepthColor = viewMode === "single" && depth !== undefined;
              const depthColor = useDepthColor
                ? depthColors[Math.min(depth, depthColors.length - 1)]
                : depth === undefined && viewMode === "single"
                  ? depthUnconnected
                  : undefined;
              const colors = nodeColors[nodeType] || nodeColors.person;
              // Derive flow-based color with shifted tones
              const flowColor = (() => {
                if (node.flow_id && flows.length > 0) {
                  const flowIndex = flows.findIndex((f: any) => f.id === node.flow_id);
                  if (flowIndex >= 0) {
                    const baseColor = FLOW_COLORS[flowIndex % FLOW_COLORS.length];
                    // Shift to lower saturation and higher lightness for canvas tones
                    return baseColor.replace(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/, (_, h, s, l) => {
                      const newS = Math.max(Number(s) - 20, 25);
                      const newL = Math.min(Number(l) + 10, 75);
                      return `hsl(${h}, ${newS}%, ${newL}%)`;
                    });
                  }
                }
                return null;
              })();
              const nodeColor = depthColor || flowColor || colors.primary;
              const isSelected = selectedNodes.includes(node.node_ref);
              const isInPath = highlightedPath.includes(node.node_ref);
              const connectionCount = connections.filter(
                (c) => c.from_ref === node.node_ref || c.to_ref === node.node_ref,
              ).length;

              const { x: displayX, y: displayY } = getDisplayPos(node);

              // Smaller nodes in master view at low zoom
              const isMasterView = viewMode === "master";
              const importance = nodeImportance.get(node.node_ref) ?? 0;
              const baseSize = isMasterView
                ? (importance >= 0.7 ? 10 + Math.min(connectionCount * 1.5, 10) : 5 + Math.min(connectionCount * 1, 6))
                : 20 + Math.min(connectionCount * 4, 25);
              const isCenterNode = viewMode !== "master" && viewMode === "single" && nodes[0]?.node_ref === node.node_ref;
              const nodeSize = isCenterNode ? Math.max(baseSize, 45) : baseSize;
              const isHovered = hoveredNode === node.node_ref;

              const isDimmed = hasFocus && !connectedNodeRefs.has(node.node_ref);
              const zoomOpacity = getNodeZoomOpacity(node.node_ref, state.zoom);
              const finalOpacity = isDimmed ? 0.15 : (isMasterView ? zoomOpacity : 1);

              // In master view at low zoom, show small dots for low-importance nodes
              const showAsSmallDot = isMasterView && importance < 0.7 && state.zoom < 0.5;
              const showLabel = isMasterView ? (isHovered || state.zoom > 0.5) : true;

              return (
                <g
                  key={node.node_ref}
                  transform={`translate(${displayX}, ${displayY})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(e, node);
                  }}
                  onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
                  onMouseEnter={() => setHoveredNode(node.node_ref)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                  opacity={finalOpacity}
                  style={{
                    transition:
                      state.dragging === node.node_ref ? "none" : "transform 0.1s ease-out, opacity 0.4s ease",
                  }}
                >
                  {/* Small dot mode for low-importance nodes at low zoom */}
                  {showAsSmallDot ? (
                    <>
                      <circle r={nodeSize} fill={nodeColor} opacity="0.7" />
                      {isHovered && (
                        <>
                          <circle r={nodeSize + 6} fill={nodeColor} opacity="0.2" />
                          <text
                            y={nodeSize + 14}
                            textAnchor="middle"
                            fill="hsl(var(--foreground))"
                            fontSize="11"
                            fontWeight="500"
                          >
                            {node.name.length > 16 ? node.name.substring(0, 16) + "…" : node.name}
                          </text>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {isHovered && <circle r={nodeSize + 12} fill={nodeColor} opacity="0.12" filter="url(#glow-node)" />}

                      {isSelected && (
                        <circle
                          r={nodeSize + 6}
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          opacity="0.8"
                          strokeDasharray="4,3"
                        />
                      )}

                      {isInPath && (
                        <circle
                          r={nodeSize + 8}
                          fill="none"
                          stroke="hsl(var(--connection-path))"
                          strokeWidth="3"
                          opacity="0.6"
                        />
                      )}

                      {(node as any).isNewHighlight && (
                        <circle
                          r={nodeSize + 10}
                          fill="none"
                          stroke="#facc15"
                          strokeWidth="3"
                          opacity="0.8"
                          className="animate-pulse"
                        />
                      )}

                      {node.profile_picture_url ? (
                        <>
                          <defs>
                            <clipPath id={`clip-${node.type}-${node.id}`}>
                              <circle r={nodeSize} />
                            </clipPath>
                          </defs>
                          <image
                            href={node.profile_picture_url}
                            x={-nodeSize}
                            y={-nodeSize}
                            width={nodeSize * 2}
                            height={nodeSize * 2}
                            clipPath={`url(#clip-${node.type}-${node.id})`}
                            preserveAspectRatio="xMidYMid slice"
                          />
                          <circle r={nodeSize} fill="none" stroke={nodeColor} strokeWidth={isCenterNode ? 3 : 2} />
                        </>
                      ) : (
                        <>
                          <circle
                            r={nodeSize}
                            fill="hsl(var(--background))"
                            stroke={nodeColor}
                            strokeWidth={isCenterNode ? 3 : 2}
                            opacity="0.95"
                          />
                          {nodeSize > 10 && (
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill={nodeColor}
                              fontSize={nodeSize * 0.6}
                              fontWeight="600"
                              fontFamily="monospace"
                            >
                              {getInitial(node.name)}
                            </text>
                          )}
                        </>
                      )}

                      {viewMode === "single" && (
                        <circle
                          cx={nodeSize + 8}
                          cy="0"
                          r="6"
                          fill="rgba(59, 130, 246, 0.9)"
                          stroke="white"
                          strokeWidth="1.5"
                          className="cursor-crosshair"
                          style={{ pointerEvents: "all" }}
                          onMouseDown={(e) => handleConnectionDotMouseDown(e, node)}
                        />
                      )}

                      {showLabel && !isMasterView && (
                        <text
                          y={nodeSize + 20}
                          textAnchor="middle"
                          fill="hsl(var(--foreground))"
                          fontSize={isHovered ? 16 : 15}
                          fontWeight={isHovered ? 600 : 400}
                          style={{ transition: "font-size 0.15s ease, opacity 0.3s ease" }}
                        >
                          {node.name.length > 18 ? node.name.substring(0, 18) + "…" : node.name}
                        </text>
                      )}

                      {showLabel && !isMasterView && node.category && (
                        <text
                          y={nodeSize + 38}
                          textAnchor="middle"
                          fill={nodeColor}
                          fontSize="13"
                          opacity={isHovered ? 0.9 : 0.5}
                          fontFamily="monospace"
                        >
                          {node.category}
                        </text>
                      )}
                    </>
                  )}
                </g>
              );
            });
          })()}

          {/* Flow labels (Master View) — positioned at flow centroid */}
          {viewMode === "master" &&
            flows?.map((flow, flowIdx) => {
              const clusterNodes = nodes.filter((n) => n.flow_id === flow.id);
              if (clusterNodes.length === 0) return null;
              // Calculate centroid from actual node positions
              const positions = clusterNodes.map((n) => masterLayoutMap.get(n.node_ref)).filter(Boolean) as {
                x: number;
                y: number;
              }[];
              if (positions.length === 0) return null;
              const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
              const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
              // Find bounding radius of the cluster
              const maxDist = Math.max(...positions.map((p) => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)), 30);
              const flowColor = FLOW_COLORS[flowIdx % FLOW_COLORS.length];
              return (
                <g key={`label-${flow.id}`} pointerEvents="none">
                  <text
                    x={cx}
                    y={cy - maxDist - 12}
                    textAnchor="middle"
                    fill={flowColor}
                    fontSize="13"
                    fontWeight="700"
                    letterSpacing="1.5"
                    fontFamily="monospace"
                    opacity="0.85"
                  >
                    {flow.name.toUpperCase()}
                  </text>
                </g>
              );
            })}
        </g>
      </svg>

      {/* Connection tooltip */}
      {hoveredConnection &&
        (() => {
          const conn = connections[hoveredConnection.index];
          const from = nodes.find((n) => n.node_ref === conn?.from_ref);
          const to = nodes.find((n) => n.node_ref === conn?.to_ref);
          if (!conn || !from || !to) return null;
          return (
            <ConnectionTooltip
              connection={conn}
              fromNode={from}
              toNode={to}
              position={hoveredConnection.position}
              connectionType={conn.type}
            />
          );
        })()}
    </>
  );
};
