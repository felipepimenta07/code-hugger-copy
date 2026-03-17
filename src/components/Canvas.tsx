import React, { useState, useRef } from 'react';
import { User, Target, Building2 } from 'lucide-react';
import { ConnectionTooltip } from './ConnectionTooltip';

interface CanvasProps {
  svgRef: React.RefObject<SVGSVGElement>;
  state: any;
  updateState: (updates: any) => void;
  viewMode: string;
  workflows: any[];
  nodes: any[];
  connections: any[];
  selectedNodes: number[];
  setSelectedNodes: (nodes: number[]) => void;
  selectedConnection: number | null;
  setSelectedConnection: (connection: number | null) => void;
  highlightedPath: number[];
  hoveredNode: number | null;
  setHoveredNode: (node: number | null) => void;
  updateNodePosition: (nodeId: number, deltaX: number, deltaY: number, saveToDb?: boolean) => void;
  setConnections: (updater: any) => void;
  saveToHistory: () => void;
  onOpenEditModal?: (node: any) => void;
  onSingleClick?: (node: any) => void;
  projects?: any[];
  flows?: any[];
  allConnections?: any[];
  onGoToProject?: (id: number) => void;
  onWheel?: (e: React.WheelEvent) => void;
  showLabels?: boolean;
  // Force simulation props
  forcePositions?: { [nodeId: number]: { x: number; y: number } };
  onForceDragStart?: (nodeId: number) => void;
  onForceDrag?: (nodeId: number, x: number, y: number) => void;
  onForceDragEnd?: (nodeId: number) => void;
  useForceLayout?: boolean;
}

const MASTER_RING_RADIUS = 240;

const nodeColors = {
  person: { primary: 'hsl(var(--node-person))', glow: 'hsl(var(--node-person-glow))', secondary: 'hsl(var(--node-person-secondary))' },
  project: { primary: 'hsl(var(--node-project))', glow: 'hsl(var(--node-project-glow))', secondary: 'hsl(var(--node-project-secondary))' },
  brand: { primary: 'hsl(var(--node-brand))', glow: 'hsl(var(--node-brand-glow))', secondary: 'hsl(var(--node-brand-secondary))' }
};

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
  onGoToProject,
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

  // BFS to calculate depth from center node
  const calculateNodeDepths = () => {
    if (viewMode !== 'single' || nodes.length === 0) return new Map<number, number>();
    const centerNode = nodes[0];
    const depths = new Map<number, number>();
    const queue: Array<{ id: number; depth: number }> = [{ id: centerNode.id, depth: 0 }];
    const visited = new Set<number>();
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      depths.set(current.id, current.depth);
      connections
        .filter(c => c.from === current.id || c.to === current.id)
        .forEach(c => {
          const neighborId = c.from === current.id ? c.to : c.from;
          if (!visited.has(neighborId) && nodes.some(n => n.id === neighborId)) {
            queue.push({ id: neighborId, depth: current.depth + 1 });
          }
        });
    }
    return depths;
  };
  
  const nodeDepths = calculateNodeDepths();
  
  const getFlowOffset = (flowId: number) => {
    if (!flows || flows.length === 0) return { dx: 0, dy: 0 };
    const idx = Math.max(0, flows.findIndex(f => f.id === flowId));
    const angle = (idx / Math.max(flows.length, 1)) * Math.PI * 2;
    const count = Math.max(flows.length, 1);
    let radius = 0;
    if (count > 1) {
      const filledRadius = MASTER_RING_RADIUS + 40;
      const LABEL_CLEARANCE = 120;
      const safeGap = 16 + LABEL_CLEARANCE;
      const neededChord = 2 * filledRadius + safeGap;
      radius = neededChord / (2 * Math.sin(Math.PI / count));
    }
    return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
  };

  const getNodeFlowId = (n: any) => n?.flow_id ?? (n?.type === 'project' ? n.id : null);
  
  // Layout determinístico para Master View
  const masterLayoutMap = React.useMemo(() => {
    if (viewMode !== 'master' || !flows?.length) return new Map<number, {x:number, y:number}>();
    const map = new Map<number, {x:number, y:number}>();
    const typeOrder = (t?: string) => (t === 'project' ? 0 : t === 'brand' ? 1 : 2);
    
    flows.forEach(flow => {
      const clusterNodes = nodes.filter(n => getNodeFlowId(n) === flow.id);
      if (!clusterNodes.length) return;
      const centerNode = 
        clusterNodes.find(n => n.id === flow.center_id && n.type === flow.center_type) ||
        clusterNodes.find(n => n.type === 'project') ||
        clusterNodes[0];
      const { dx, dy } = getFlowOffset(flow.id);
      map.set(centerNode.id, { x: dx, y: dy });
      
      const others = clusterNodes.filter(n => n.id !== centerNode.id);
      const sorted = [...others].sort((a, b) => {
        const t = typeOrder(a.type) - typeOrder(b.type);
        if (t !== 0) return t;
        const na = (a.name || '').localeCompare(b.name || '');
        if (na !== 0) return na;
        return a.id - b.id;
      });
      
      const N = Math.max(sorted.length, 1);
      const start = -Math.PI / 2;
      const step = (2 * Math.PI) / N;
      sorted.forEach((n, i) => {
        const angle = start + i * step;
        map.set(n.id, { x: dx + MASTER_RING_RADIUS * Math.cos(angle), y: dy + MASTER_RING_RADIUS * Math.sin(angle) });
      });
    });
    return map;
  }, [viewMode, flows, nodes]);

  // Position resolver — uses force positions when available in single view
  const getDisplayPos = (n: any) => {
    if (viewMode === 'master') {
      const pos = masterLayoutMap.get(n.id);
      return pos ?? { x: n.x, y: n.y };
    }
    // Use force simulation positions when available
    if (useForceLayout && forcePositions && forcePositions[n.id]) {
      return forcePositions[n.id];
    }
    return { x: n.x, y: n.y };
  };
  
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCountRef = useRef(0);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    if (viewMode === 'master') {
      if (e.shiftKey) {
        setSelectedNodes(selectedNodes.includes(nodeId) 
          ? selectedNodes.filter(id => id !== nodeId) 
          : [...selectedNodes, nodeId]);
      } else {
        if (!selectedNodes.includes(nodeId)) setSelectedNodes([nodeId]);
        updateState({ selectedNode: nodeId });
      }
      return;
    }
    if (e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      const node = nodes.find(n => n.id === nodeId);
      const rect = svgRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
      const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
      if (e.shiftKey) {
        setSelectedNodes(selectedNodes.includes(nodeId) 
          ? selectedNodes.filter(id => id !== nodeId) 
          : [...selectedNodes, nodeId]);
      } else {
        if (!selectedNodes.includes(nodeId)) setSelectedNodes([nodeId]);
        const pos = getDisplayPos(node);
        updateState({ dragging: nodeId, offset: { x: x - pos.x, y: y - pos.y }, selectedNode: nodeId });
        // Notify force simulation of drag start
        if (useForceLayout && onForceDragStart) {
          onForceDragStart(nodeId);
        }
      }
    }
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: number) => {
    // Only trigger single click if no drag happened
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    clickCountRef.current++;
    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          // Single click → open detail panel
          if (onSingleClick) onSingleClick(node);
        }
        clickCountRef.current = 0;
      }, 250);
    }
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    // Cancel single click
    clickCountRef.current = 2;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    if (viewMode === 'single') {
      if (onOpenEditModal) onOpenEditModal(node);
      return;
    }
    if (onGoToProject) {
      const centerFlow = flows.find(f => f.center_id === node.id && f.center_type === node.type);
      if (centerFlow) {
        onGoToProject(centerFlow.center_id);
      } else if (node.flow_id) {
        const belongsToFlow = flows.find(f => f.id === node.flow_id);
        if (belongsToFlow) onGoToProject(belongsToFlow.center_id);
      }
    }
  };

  const handleConnectionDotMouseDown = (e: React.MouseEvent, nodeId: number) => {
    if (viewMode === 'master') return;
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    const pos = getDisplayPos(node);
    updateState({ 
      isDraggingConnection: true, 
      connectionStart: { id: nodeId, x: pos.x, y: pos.y }, 
      connectionEnd: { x: pos.x, y: pos.y },
      showSidebar: false
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
    const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
    if (state.dragging && viewMode === 'master') return;
    if (state.dragging) {
      if (useForceLayout && onForceDrag) {
        // In force mode, update the fixed position directly
        const dragX = x - state.offset.x;
        const dragY = y - state.offset.y;
        onForceDrag(state.dragging, dragX, dragY);
      } else {
        const draggedNode = nodes.find(n => n.id === state.dragging);
        const dx = x - state.offset.x - draggedNode.x;
        const dy = y - state.offset.y - draggedNode.y;
        selectedNodes.forEach(nodeId => updateNodePosition(nodeId, dx, dy, false));
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
      const targetNode = nodes.find(n => {
        const pos = getDisplayPos(n);
        return Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2) < 45;
      });
      if (targetNode && targetNode.id !== state.connectionStart.id) {
        const exists = connections.some(c => 
          (c.from === state.connectionStart.id && c.to === targetNode.id) || 
          (c.from === targetNode.id && c.to === state.connectionStart.id)
        );
        if (!exists) {
          saveToHistory();
          setConnections(prev => [...prev, { from: state.connectionStart.id, to: targetNode.id, type: 'strong', directional: false }]);
        }
      }
    }
    if (state.dragging) {
      if (useForceLayout && onForceDragEnd) {
        // End force drag — save final position to DB
        const pos = forcePositions?.[state.dragging];
        if (pos) {
          const draggedNode = nodes.find(n => n.id === state.dragging);
          if (draggedNode) {
            const dx = pos.x - draggedNode.x;
            const dy = pos.y - draggedNode.y;
            selectedNodes.forEach(nodeId => updateNodePosition(nodeId, dx, dy, true));
          }
        }
        onForceDragEnd(state.dragging);
      } else {
        const draggedNode = nodes.find(n => n.id === state.dragging);
        if (draggedNode) {
          const rect = svgRef.current!.getBoundingClientRect();
          const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
          const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
          const dx = x - state.offset.x - draggedNode.x;
          const dy = y - state.offset.y - draggedNode.y;
          selectedNodes.forEach(nodeId => updateNodePosition(nodeId, dx, dy, true));
        }
      }
      saveToHistory();
    }
    updateState({ dragging: null, isPanning: false, isDraggingConnection: false, connectionStart: null });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (viewMode === 'master') return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
    const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
    const clickedNode = nodes.find(n => {
      const pos = getDisplayPos(n);
      return Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2) < 45;
    });
    if (!clickedNode) {
      updateState({ contextMenu: { x: e.clientX, y: e.clientY, canvasX: x, canvasY: y, type: 'canvas' } });
    }
  };

  // Get initial of node name for display
  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
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
          <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="connectionGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--connection-strong))" />
        </marker>
      </defs>

      <g transform={`translate(${state.pan.x}, ${state.pan.y}) scale(${state.zoom})`}
         style={{ transition: state.isPanning || state.dragging ? 'none' : 'transform 0.15s ease-out' }}
      >
        <rect x="-5000" y="-5000" width="15000" height="15000" fill="transparent" />
        
        {/* Subtle dotted rings (Single View only) */}
        {viewMode === 'single' && nodes.length > 0 && (() => {
          const centerNode = nodes[0];
          if (!centerNode) return null;
          const centerPos = getDisplayPos(centerNode);
          return (
            <g key="radial-rings" opacity="0.15">
              <circle cx={centerPos.x} cy={centerPos.y} r={200} fill="none" stroke="hsl(var(--muted))" strokeWidth="0.5" strokeDasharray="4,12" />
              <circle cx={centerPos.x} cy={centerPos.y} r={350} fill="none" stroke="hsl(var(--muted))" strokeWidth="0.5" strokeDasharray="4,12" />
              <circle cx={centerPos.x} cy={centerPos.y} r={520} fill="none" stroke="hsl(var(--muted))" strokeWidth="0.5" strokeDasharray="3,12" />
            </g>
          );
        })()}
        
        {/* Cross-flow connections (Master View) */}
        {viewMode === 'master' && (() => {
          const specificConnections: Array<{
            personA: any; personB: any; flowA: number; flowB: number;
            company?: string; emailDomain?: string; type: 'company' | 'email'; strength: number;
          }> = [];
          
          const peopleWithCompany = nodes.filter(n => n.type === 'person' && n.company);
          const peopleWithEmail = nodes.filter(n => n.type === 'person' && n.email);
          
          for (let i = 0; i < peopleWithCompany.length; i++) {
            for (let j = i + 1; j < peopleWithCompany.length; j++) {
              const pA = peopleWithCompany[i]; const pB = peopleWithCompany[j];
              const flowA = getNodeFlowId(pA); const flowB = getNodeFlowId(pB);
              const compA = typeof pA.company === 'string' ? pA.company.trim().toLowerCase() : '';
              const compB = typeof pB.company === 'string' ? pB.company.trim().toLowerCase() : '';
              if (flowA !== flowB && compA && compA === compB) {
                specificConnections.push({ personA: pA, personB: pB, flowA, flowB, company: pA.company, type: 'company', strength: pA.category === pB.category ? 3 : 2 });
              }
            }
          }
          
          for (let i = 0; i < peopleWithEmail.length; i++) {
            for (let j = i + 1; j < peopleWithEmail.length; j++) {
              const pA = peopleWithEmail[i]; const pB = peopleWithEmail[j];
              const flowA = getNodeFlowId(pA); const flowB = getNodeFlowId(pB);
              if (flowA !== flowB && pA.email && pB.email) {
                const domainA = pA.email.split('@')[1]?.toLowerCase();
                const domainB = pB.email.split('@')[1]?.toLowerCase();
                if (domainA && domainB && domainA === domainB && !['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'].includes(domainA)) {
                  const alreadyConnected = specificConnections.some(c => 
                    (c.personA.id === pA.id && c.personB.id === pB.id) || (c.personA.id === pB.id && c.personB.id === pA.id));
                  if (!alreadyConnected) {
                    specificConnections.push({ personA: pA, personB: pB, flowA, flowB, emailDomain: domainA, type: 'email', strength: 1 });
                  }
                }
              }
            }
          }
          
          return specificConnections.map((conn, idx) => {
            const posA = masterLayoutMap.get(conn.personA.id);
            const posB = masterLayoutMap.get(conn.personB.id);
            if (!posA || !posB) return null;
            const style = conn.type === 'company' 
              ? { stroke: 'hsl(var(--connection-cross))', strokeWidth: conn.strength === 3 ? '2.5' : '2', dasharray: '6,4', opacity: '0.5' }
              : { stroke: 'hsl(var(--primary))', strokeWidth: '1.5', dasharray: '8,6', opacity: '0.35' };
            return (
              <path key={`xflow-${idx}`} d={`M ${posA.x} ${posA.y} L ${posB.x} ${posB.y}`}
                stroke={style.stroke} strokeWidth={style.strokeWidth} strokeDasharray={style.dasharray}
                opacity={style.opacity} fill="none" className="pointer-events-none" />
            );
          });
        })()}
        
        {/* Cluster rings (Master View) */}
        {viewMode === 'master' && flows.map(flow => {
          const clusterNodes = nodes.filter(n => getNodeFlowId(n) === flow.id);
          if (clusterNodes.length === 0) return null;
          const centerNode = clusterNodes.find(n => n.id === flow.center_id && n.type === flow.center_type) || clusterNodes.find(n => n.type === 'project') || clusterNodes[0];
          const pos = masterLayoutMap.get(centerNode.id);
          if (!pos) return null;
          return (
            <circle key={flow.id} cx={pos.x} cy={pos.y} r={MASTER_RING_RADIUS} fill="none"
              stroke="hsl(var(--muted))" strokeWidth="0.5" strokeDasharray="4,8" opacity="0.2" />
          );
        })}

        {/* Connections */}
        {(() => {
          const activeNodeId = selectedNodes.length === 1 ? selectedNodes[0] : null;
          const hasFocus = activeNodeId !== null;

          return connections.map((conn, idx) => {
          const from = nodes.find(n => n.id === conn.from);
          const to = nodes.find(n => n.id === conn.to);
          if (!from || !to) return null;
          
          const globalIdx = allConnections.findIndex(c => (c.from === conn.from && c.to === conn.to) || (c.from === conn.to && c.to === conn.from));
          const isSelected = selectedConnection === globalIdx;
          const fromDepth = nodeDepths.get(from.id) ?? 0;
          const toDepth = nodeDepths.get(to.id) ?? 0;
          const connectionLevel = Math.min(fromDepth, toDepth);
          const isInPath = highlightedPath.length > 0 && highlightedPath.some((id, i) => 
            i < highlightedPath.length - 1 && 
            ((highlightedPath[i] === from.id && highlightedPath[i + 1] === to.id) || (highlightedPath[i] === to.id && highlightedPath[i + 1] === from.id)));
          
          const fromFlowId = getNodeFlowId(from);
          const toFlowId = getNodeFlowId(to);
          const isCrossFlow = viewMode === 'master' && fromFlowId && toFlowId && fromFlowId !== toFlowId;

          // Dim connections not touching selected node
          const isConnDimmed = hasFocus && conn.from !== activeNodeId && conn.to !== activeNodeId;
          
          let strokeColor: string, strokeWidth: number, strokeDasharray: string | undefined, opacity = 1, useGlow = false;
          
          if (isInPath) { strokeColor = '#10b981'; strokeWidth = 4; }
          else if (isSelected) { strokeColor = '#f59e0b'; strokeWidth = isCrossFlow ? 3 : 2.5; }
          else if (isCrossFlow) { strokeColor = 'hsl(var(--connection-cross))'; strokeWidth = 2; strokeDasharray = '8,4'; opacity = 0.5; }
          else {
            strokeColor = conn.type === 'strong' ? '#a855f7' : '#6366f1';
            if (viewMode === 'single') {
              switch (connectionLevel) {
                case 0: strokeWidth = 3; opacity = 0.9; useGlow = true; break;
                case 1: strokeWidth = 2; opacity = 0.7; break;
                case 2: strokeWidth = 1.5; opacity = 0.5; strokeDasharray = '6,4'; break;
                default: strokeWidth = 1; opacity = 0.3; strokeDasharray = '3,8'; break;
              }
            } else {
              strokeWidth = 2; opacity = 0.3;
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
            <g key={idx} style={{ transition: 'opacity 0.3s ease' }}>
              <path d={pathData} stroke="transparent" strokeWidth="15" fill="none" className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setSelectedConnection(selectedConnection === globalIdx ? null : globalIdx); setSelectedNodes([]); }}
                onMouseEnter={(e) => {
                  const rect = svgRef.current!.getBoundingClientRect();
                  const mx = midX * state.zoom + state.pan.x + rect.left;
                  const my = controlY2 * state.zoom + state.pan.y + rect.top;
                  setHoveredConnection({ index: idx, position: { x: mx, y: my } });
                }}
                onMouseLeave={() => setHoveredConnection(null)}
              />
              <path d={pathData} stroke={strokeColor} strokeWidth={strokeWidth} fill="none"
                strokeDasharray={strokeDasharray} opacity={opacity}
                markerEnd={conn.directional ? 'url(#arrowhead)' : ''}
                filter={useGlow ? "url(#connectionGlow)" : undefined}
                className="pointer-events-none" />
              {/* Connection label */}
              {showLabels && conn.connection_type && (
                <text x={midX} y={controlY2 + 4} textAnchor="middle"
                  fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="monospace" opacity={isConnDimmed ? 0.06 : 0.6}>
                  {conn.connection_type}
                </text>
              )}
            </g>
          );
        });
        })()}
        
        {/* Dragging connection line */}
        {state.isDraggingConnection && state.connectionStart && (
          <line x1={state.connectionStart.x} y1={state.connectionStart.y} x2={state.connectionEnd.x} y2={state.connectionEnd.y}
            stroke="hsl(var(--connection-strong))" strokeWidth="2" strokeDasharray="5,5" />
        )}
        
        {/* Compute highlight set: selected node + its direct connections */}
        {(() => {
          const activeNodeId = selectedNodes.length === 1 ? selectedNodes[0] : null;
          const connectedNodeIds = new Set<number>();
          if (activeNodeId) {
            connectedNodeIds.add(activeNodeId);
            connections.forEach(c => {
              if (c.from === activeNodeId) connectedNodeIds.add(c.to);
              if (c.to === activeNodeId) connectedNodeIds.add(c.from);
            });
          }
          const hasFocus = activeNodeId !== null;

          return nodes.map(node => {
          const nodeType = (node.type as keyof typeof nodeColors) || 'person';
          const colors = nodeColors[nodeType] || nodeColors.person;
          const isSelected = selectedNodes.includes(node.id);
          const isInPath = highlightedPath.includes(node.id);
          const connectionCount = connections.filter(c => c.from === node.id || c.to === node.id).length;
          
          const { x: displayX, y: displayY } = getDisplayPos(node);
          
          // Size based on connections (organic)
          const baseSize = 20 + Math.min(connectionCount * 4, 25);
          const isCenterNode = (node as any).level === 'center' || (viewMode === 'single' && nodes[0]?.id === node.id);
          const nodeSize = isCenterNode ? Math.max(baseSize, 45) : baseSize;
          const isHovered = hoveredNode === node.id;
          
          // Dim nodes not connected to selected node
          const isDimmed = hasFocus && !connectedNodeIds.has(node.id);
          
          return (
            <g key={node.id} transform={`translate(${displayX}, ${displayY})`}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onClick={(e) => { e.stopPropagation(); handleNodeClick(e, node.id); }}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
              opacity={isDimmed ? 0.15 : 1}
              style={{ transition: state.dragging === node.id ? 'none' : 'transform 0.1s ease-out, opacity 0.3s ease' }}
            >
              {/* Hover glow */}
              {isHovered && (
                <circle r={nodeSize + 12} fill={colors.primary} opacity="0.12" filter="url(#glow-node)" />
              )}
              
              {/* Selection ring */}
              {isSelected && (
                <circle r={nodeSize + 6} fill="none" stroke="white" strokeWidth="2" opacity="0.8" strokeDasharray="4,3" />
              )}
              
              {/* Path highlight */}
              {isInPath && (
                <circle r={nodeSize + 8} fill="none" stroke="hsl(var(--connection-path))" strokeWidth="3" opacity="0.6" />
              )}

              {/* New node highlight */}
              {(node as any).isNewHighlight && (
                <circle r={nodeSize + 10} fill="none" stroke="#facc15" strokeWidth="3" opacity="0.8" className="animate-pulse" />
              )}
              
              {/* Node body */}
              {node.profile_picture_url ? (
                <>
                  <defs>
                    <clipPath id={`clip-${node.id}`}>
                      <circle r={nodeSize} />
                    </clipPath>
                  </defs>
                  <image href={node.profile_picture_url} x={-nodeSize} y={-nodeSize}
                    width={nodeSize * 2} height={nodeSize * 2}
                    clipPath={`url(#clip-${node.id})`} preserveAspectRatio="xMidYMid slice" />
                  <circle r={nodeSize} fill="none" stroke={colors.primary} strokeWidth={isCenterNode ? 3 : 2} />
                </>
              ) : (
                <>
                  <circle r={nodeSize} fill="hsl(var(--background))" stroke={colors.primary}
                    strokeWidth={isCenterNode ? 3 : 2} opacity="0.95" />
                  {/* Initial letter */}
                  <text textAnchor="middle" dominantBaseline="central"
                    fill={colors.primary} fontSize={nodeSize * 0.6} fontWeight="600" fontFamily="monospace">
                    {getInitial(node.name)}
                  </text>
                </>
              )}
              
              {/* Connection dot (Single View only) */}
              {viewMode === 'single' && (
                <circle cx={nodeSize + 8} cy="0" r="6"
                  fill="rgba(59, 130, 246, 0.9)" stroke="white" strokeWidth="1.5"
                  className="cursor-crosshair" style={{ pointerEvents: 'all' }}
                  onMouseDown={(e) => handleConnectionDotMouseDown(e, node.id)} />
              )}
              
              {/* Name label */}
              <text y={nodeSize + 18} textAnchor="middle" fill="hsl(var(--foreground))"
                fontSize={isHovered ? 14 : 13} fontWeight={isHovered ? 600 : 400}
                style={{ transition: 'font-size 0.15s ease' }}>
                {node.name.length > 18 ? node.name.substring(0, 18) + '…' : node.name}
              </text>
              
              {/* Category / notes subtitle */}
              {node.category && (
                <text y={nodeSize + 32} textAnchor="middle" fill={colors.primary}
                  fontSize="9" opacity={isHovered ? 0.9 : 0.5} fontFamily="monospace">
                  {node.category}
                </text>
              )}
            </g>
          );
        });
        })()}

        
        {/* Flow labels (Master View) */}
        {viewMode === 'master' && flows?.map(flow => {
          const clusterNodes = nodes.filter(n => n.flow_id === flow.id);
          if (clusterNodes.length === 0) return null;
          const centerNode = clusterNodes.find(n => n.id === flow.center_id && n.type === flow.center_type) 
            || clusterNodes.find(n => n.type === 'project') || clusterNodes[0];
          const pos = masterLayoutMap.get(centerNode.id);
          if (!pos) return null;
          
          return (
            <g key={`label-${flow.id}`} pointerEvents="none">
              <text x={pos.x} y={pos.y - MASTER_RING_RADIUS - 40} textAnchor="middle"
                fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="600"
                letterSpacing="2" fontFamily="monospace">
                {flow.name.toUpperCase()}
              </text>
              <text x={pos.x} y={pos.y - MASTER_RING_RADIUS - 24} textAnchor="middle"
                fill="hsl(var(--muted-foreground))" fontSize="10" opacity="0.4" fontFamily="monospace">
                {clusterNodes.length} {clusterNodes.length === 1 ? 'nó' : 'nós'}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
    
    {/* Connection tooltip */}
    {hoveredConnection && (() => {
      const conn = connections[hoveredConnection.index];
      const from = nodes.find(n => n.id === conn?.from);
      const to = nodes.find(n => n.id === conn?.to);
      if (!conn || !from || !to) return null;
      return (
        <ConnectionTooltip connection={conn} fromNode={from} toNode={to}
          position={hoveredConnection.position} connectionType={conn.type} />
      );
    })()}
    </>
  );
};
