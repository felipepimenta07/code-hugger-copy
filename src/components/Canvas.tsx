import React, { useState, useRef } from 'react';
import { User, Target, Building2 } from 'lucide-react';
import { ConnectionTooltip } from './ConnectionTooltip';
import { parseRef } from '@/utils/nodeRef';

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
  hoveredFlowId?: number | null;
}

const nodeColors = {
  person: { primary: 'hsl(var(--node-person))', glow: 'hsl(var(--node-person-glow))', secondary: 'hsl(var(--node-person-secondary))' },
  project: { primary: 'hsl(var(--node-project))', glow: 'hsl(var(--node-project-glow))', secondary: 'hsl(var(--node-project-secondary))' },
  brand: { primary: 'hsl(var(--node-brand))', glow: 'hsl(var(--node-brand-glow))', secondary: 'hsl(var(--node-brand-secondary))' }
};

export const Canvas: React.FC<CanvasProps> = ({
  svgRef, state, updateState, viewMode, workflows, nodes, connections,
  selectedNodes, setSelectedNodes, selectedConnection, setSelectedConnection,
  highlightedPath, hoveredNode, setHoveredNode, updateNodePosition,
  setConnections, saveToHistory, onOpenEditModal, onSingleClick,
  projects = [], flows = [], allConnections = [],
  onGoToFlow, onWheel, showLabels = false,
  forcePositions, onForceDragStart, onForceDrag, onForceDragEnd,
  useForceLayout = false,
}) => {
  const [hoveredConnection, setHoveredConnection] = useState<{
    index: number;
    position: { x: number; y: number };
  } | null>(null);

  // BFS to calculate depth from center node using node_ref
  const calculateNodeDepths = () => {
    if (viewMode !== 'single' || nodes.length === 0) return new Map<string, number>();
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
        .filter(c => c.from_ref === current.ref || c.to_ref === current.ref)
        .forEach(c => {
          const neighborRef = c.from_ref === current.ref ? c.to_ref : c.from_ref;
          if (!visited.has(neighborRef) && nodes.some(n => n.node_ref === neighborRef)) {
            queue.push({ ref: neighborRef, depth: current.depth + 1 });
          }
        });
    }
    return depths;
  };
  
  const nodeDepths = calculateNodeDepths();
  
  const getFlowOffset = (flowId: number, flowRingRadius: number) => {
    if (!flows || flows.length === 0) return { dx: 0, dy: 0 };
    const idx = Math.max(0, flows.findIndex(f => f.id === flowId));
    const angle = (idx / Math.max(flows.length, 1)) * Math.PI * 2;
    const count = Math.max(flows.length, 1);
    let radius = 0;
    if (count > 1) {
      const filledRadius = flowRingRadius + 40;
      const LABEL_CLEARANCE = 120;
      const safeGap = 16 + LABEL_CLEARANCE;
      const neededChord = 2 * filledRadius + safeGap;
      radius = neededChord / (2 * Math.sin(Math.PI / count));
    }
    return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
  };

  const getFlowRingRadius = (nodeCount: number) => Math.max(240, nodeCount * 30);
  const getNodeFlowId = (n: any) => n?.flow_id ?? (n?.type === 'project' ? n.id : null);
  
  // Layout determinístico para Master View — keyed by node_ref
  const masterLayoutMap = React.useMemo(() => {
    if (viewMode !== 'master' || !flows?.length) return new Map<string, {x:number, y:number}>();
    const map = new Map<string, {x:number, y:number}>();
    const typeOrder = (t?: string) => (t === 'project' ? 0 : t === 'brand' ? 1 : 2);
    
    const maxRingRadius = flows.reduce((max, flow) => {
      const count = nodes.filter(n => getNodeFlowId(n) === flow.id).length;
      return Math.max(max, getFlowRingRadius(count));
    }, 240);
    
    flows.forEach(flow => {
      const clusterNodes = nodes.filter(n => getNodeFlowId(n) === flow.id);
      if (!clusterNodes.length) return;
      const centerNode = 
        clusterNodes.find(n => n.id === flow.center_id && n.type === flow.center_type) ||
        clusterNodes.find(n => n.id === flow.center_id) ||
        clusterNodes.find(n => n.type === 'project') ||
        clusterNodes[0];
      const ringRadius = getFlowRingRadius(clusterNodes.length);
      const { dx, dy } = getFlowOffset(flow.id, maxRingRadius);
      map.set(centerNode.node_ref, { x: dx, y: dy });
      
      const others = clusterNodes.filter(n => n.node_ref !== centerNode.node_ref);
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
        map.set(n.node_ref, { x: dx + ringRadius * Math.cos(angle), y: dy + ringRadius * Math.sin(angle) });
      });
    });
    return map;
  }, [viewMode, flows, nodes]);

  // Position resolver
  const getDisplayPos = (n: any) => {
    if (viewMode === 'master') {
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
    if (viewMode === 'master') {
      if (e.shiftKey) {
        setSelectedNodes(selectedNodes.includes(nodeRef) 
          ? selectedNodes.filter(r => r !== nodeRef) 
          : [...selectedNodes, nodeRef]);
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
        setSelectedNodes(selectedNodes.includes(nodeRef) 
          ? selectedNodes.filter(r => r !== nodeRef) 
          : [...selectedNodes, nodeRef]);
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
    
    if (viewMode === 'single') {
      if (onOpenEditModal) onOpenEditModal(node);
      return;
    }
    if (onGoToFlow) {
      const centerFlow = flows.find(f => f.center_id === node.id && f.center_type === node.type);
      if (centerFlow) {
        onGoToFlow(centerFlow.id);
      } else if (node.flow_id) {
        onGoToFlow(node.flow_id);
      }
    }
  };

  const handleConnectionDotMouseDown = (e: React.MouseEvent, node: any) => {
    if (viewMode === 'master') return;
    e.stopPropagation();
    const pos = getDisplayPos(node);
    updateState({ 
      isDraggingConnection: true, 
      connectionStart: { ref: node.node_ref, x: pos.x, y: pos.y }, 
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
        const dragX = x - state.offset.x;
        const dragY = y - state.offset.y;
        onForceDrag(state.dragging, dragX, dragY);
      } else {
        const draggedNode = nodes.find(n => n.node_ref === state.dragging);
        if (draggedNode) {
          const dx = x - state.offset.x - draggedNode.x;
          const dy = y - state.offset.y - draggedNode.y;
          selectedNodes.forEach(nodeRef => updateNodePosition(nodeRef, dx, dy, false));
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
      const targetNode = nodes.find(n => {
        const pos = getDisplayPos(n);
        return Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2) < 45;
      });
      if (targetNode && targetNode.node_ref !== state.connectionStart.ref) {
        const exists = connections.some(c => 
          (c.from_ref === state.connectionStart.ref && c.to_ref === targetNode.node_ref) || 
          (c.from_ref === targetNode.node_ref && c.to_ref === state.connectionStart.ref)
        );
        if (!exists) {
          const startParsed = parseRef(state.connectionStart.ref);
          saveToHistory();
          setConnections(prev => [...prev, { 
            from: startParsed.id, to: targetNode.id,
            from_ref: state.connectionStart.ref, to_ref: targetNode.node_ref,
            from_type: startParsed.type, to_type: targetNode.type,
            type: 'strong', directional: false 
          }]);
        }
      }
    }
    if (state.dragging) {
      if (useForceLayout && onForceDragEnd) {
        const pos = forcePositions?.[state.dragging];
        if (pos) {
          const draggedNode = nodes.find(n => n.node_ref === state.dragging);
          if (draggedNode) {
            const dx = pos.x - draggedNode.x;
            const dy = pos.y - draggedNode.y;
            selectedNodes.forEach(nodeRef => updateNodePosition(nodeRef, dx, dy, true));
          }
        }
        onForceDragEnd(state.dragging);
      } else {
        const draggedNode = nodes.find(n => n.node_ref === state.dragging);
        if (draggedNode) {
          const rect = svgRef.current!.getBoundingClientRect();
          const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
          const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
          const dx = x - state.offset.x - draggedNode.x;
          const dy = y - state.offset.y - draggedNode.y;
          selectedNodes.forEach(nodeRef => updateNodePosition(nodeRef, dx, dy, true));
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
                    (c.personA.node_ref === pA.node_ref && c.personB.node_ref === pB.node_ref) || (c.personA.node_ref === pB.node_ref && c.personB.node_ref === pA.node_ref));
                  if (!alreadyConnected) {
                    specificConnections.push({ personA: pA, personB: pB, flowA, flowB, emailDomain: domainA, type: 'email', strength: 1 });
                  }
                }
              }
            }
          }
          
          return specificConnections.map((conn, idx) => {
            const posA = masterLayoutMap.get(conn.personA.node_ref);
            const posB = masterLayoutMap.get(conn.personB.node_ref);
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
          const pos = masterLayoutMap.get(centerNode.node_ref);
          if (!pos) return null;
          const ringRadius = getFlowRingRadius(clusterNodes.length);
          return (
            <circle key={flow.id} cx={pos.x} cy={pos.y} r={ringRadius} fill="none"
              stroke="hsl(var(--muted))" strokeWidth="0.5" strokeDasharray="4,8" opacity="0.2" />
          );
        })}

        {/* Connections */}
        {(() => {
          const activeNodeRef = selectedNodes.length === 1 ? selectedNodes[0] : null;
          const hasFocus = activeNodeRef !== null;

          return connections.map((conn, idx) => {
          const from = nodes.find(n => n.node_ref === conn.from_ref);
          const to = nodes.find(n => n.node_ref === conn.to_ref);
          if (!from || !to) return null;
          
          const globalIdx = allConnections.findIndex(c => 
            (c.from_ref === conn.from_ref && c.to_ref === conn.to_ref) || 
            (c.from_ref === conn.to_ref && c.to_ref === conn.from_ref));
          const isSelected = selectedConnection === globalIdx;
          const fromDepth = nodeDepths.get(from.node_ref) ?? 0;
          const toDepth = nodeDepths.get(to.node_ref) ?? 0;
          const connectionLevel = Math.min(fromDepth, toDepth);
          const isInPath = highlightedPath.length > 0 && highlightedPath.some((ref, i) => 
            i < highlightedPath.length - 1 && 
            ((highlightedPath[i] === from.node_ref && highlightedPath[i + 1] === to.node_ref) || (highlightedPath[i] === to.node_ref && highlightedPath[i + 1] === from.node_ref)));
          
          const fromFlowId = getNodeFlowId(from);
          const toFlowId = getNodeFlowId(to);
          const isCrossFlow = viewMode === 'master' && fromFlowId && toFlowId && fromFlowId !== toFlowId;

          const isConnDimmed = hasFocus && conn.from_ref !== activeNodeRef && conn.to_ref !== activeNodeRef;
          
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
            <g key={`conn-${conn.id || idx}-${conn.from_ref}-${conn.to_ref}`} style={{ transition: 'opacity 0.3s ease' }}>
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
              {showLabels && conn.connection_type && (
                <text x={midX} y={controlY2 + 4} textAnchor="middle"
                  fill="hsl(var(--muted-foreground))" fontSize="13" fontFamily="monospace" opacity={isConnDimmed ? 0.06 : 0.6}>
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
        
        {/* Nodes */}
        {(() => {
          const activeNodeRef = selectedNodes.length === 1 ? selectedNodes[0] : null;
          const connectedNodeRefs = new Set<string>();
          if (activeNodeRef) {
            connectedNodeRefs.add(activeNodeRef);
            connections.forEach(c => {
              if (c.from_ref === activeNodeRef) connectedNodeRefs.add(c.to_ref);
              if (c.to_ref === activeNodeRef) connectedNodeRefs.add(c.from_ref);
            });
          }
          const hasFocus = activeNodeRef !== null;

          return nodes.map(node => {
          const nodeType = (node.type as keyof typeof nodeColors) || 'person';
          const colors = nodeColors[nodeType] || nodeColors.person;
          const isSelected = selectedNodes.includes(node.node_ref);
          const isInPath = highlightedPath.includes(node.node_ref);
          const connectionCount = connections.filter(c => c.from_ref === node.node_ref || c.to_ref === node.node_ref).length;
          
          const { x: displayX, y: displayY } = getDisplayPos(node);
          
          const baseSize = 20 + Math.min(connectionCount * 4, 25);
          const isCenterNode = (viewMode === 'single' && nodes[0]?.node_ref === node.node_ref);
          const nodeSize = isCenterNode ? Math.max(baseSize, 45) : baseSize;
          const isHovered = hoveredNode === node.node_ref;
          
          const isDimmed = hasFocus && !connectedNodeRefs.has(node.node_ref);
          
          return (
            <g key={node.node_ref} transform={`translate(${displayX}, ${displayY})`}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onClick={(e) => { e.stopPropagation(); handleNodeClick(e, node); }}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
              onMouseEnter={() => setHoveredNode(node.node_ref)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
              opacity={isDimmed ? 0.15 : 1}
              style={{ transition: state.dragging === node.node_ref ? 'none' : 'transform 0.1s ease-out, opacity 0.3s ease' }}
            >
              {isHovered && (
                <circle r={nodeSize + 12} fill={colors.primary} opacity="0.12" filter="url(#glow-node)" />
              )}
              
              {isSelected && (
                <circle r={nodeSize + 6} fill="none" stroke="white" strokeWidth="2" opacity="0.8" strokeDasharray="4,3" />
              )}
              
              {isInPath && (
                <circle r={nodeSize + 8} fill="none" stroke="hsl(var(--connection-path))" strokeWidth="3" opacity="0.6" />
              )}

              {(node as any).isNewHighlight && (
                <circle r={nodeSize + 10} fill="none" stroke="#facc15" strokeWidth="3" opacity="0.8" className="animate-pulse" />
              )}
              
              {node.profile_picture_url ? (
                <>
                  <defs>
                    <clipPath id={`clip-${node.type}-${node.id}`}>
                      <circle r={nodeSize} />
                    </clipPath>
                  </defs>
                  <image href={node.profile_picture_url} x={-nodeSize} y={-nodeSize}
                    width={nodeSize * 2} height={nodeSize * 2}
                    clipPath={`url(#clip-${node.type}-${node.id})`} preserveAspectRatio="xMidYMid slice" />
                  <circle r={nodeSize} fill="none" stroke={colors.primary} strokeWidth={isCenterNode ? 3 : 2} />
                </>
              ) : (
                <>
                  <circle r={nodeSize} fill="hsl(var(--background))" stroke={colors.primary}
                    strokeWidth={isCenterNode ? 3 : 2} opacity="0.95" />
                  <text textAnchor="middle" dominantBaseline="central"
                    fill={colors.primary} fontSize={nodeSize * 0.6} fontWeight="600" fontFamily="monospace">
                    {getInitial(node.name)}
                  </text>
                </>
              )}
              
              {viewMode === 'single' && (
                <circle cx={nodeSize + 8} cy="0" r="6"
                  fill="rgba(59, 130, 246, 0.9)" stroke="white" strokeWidth="1.5"
                  className="cursor-crosshair" style={{ pointerEvents: 'all' }}
                  onMouseDown={(e) => handleConnectionDotMouseDown(e, node)} />
              )}
              
              <text y={nodeSize + 20} textAnchor="middle" fill="hsl(var(--foreground))"
                fontSize={isHovered ? 16 : 15} fontWeight={isHovered ? 600 : 400}
                style={{ transition: 'font-size 0.15s ease' }}>
                {node.name.length > 18 ? node.name.substring(0, 18) + '…' : node.name}
              </text>
              
              {node.category && (
                <text y={nodeSize + 38} textAnchor="middle" fill={colors.primary}
                  fontSize="13" opacity={isHovered ? 0.9 : 0.5} fontFamily="monospace">
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
            || clusterNodes.find(n => n.id === flow.center_id)
            || clusterNodes.find(n => n.type === 'project') || clusterNodes[0];
          const pos = masterLayoutMap.get(centerNode.node_ref);
          if (!pos) return null;
          const ringRadius = getFlowRingRadius(clusterNodes.length);
          
          return (
            <g key={`label-${flow.id}`} pointerEvents="none">
                <text x={pos.x} y={pos.y - ringRadius - 40} textAnchor="middle"
                fill="hsl(var(--muted-foreground))" fontSize="16" fontWeight="600"
                letterSpacing="2" fontFamily="monospace">
                {flow.name.toUpperCase()}
              </text>
              <text x={pos.x} y={pos.y - ringRadius - 22} textAnchor="middle"
                fill="hsl(var(--muted-foreground))" fontSize="14" opacity="0.4" fontFamily="monospace">
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
      const from = nodes.find(n => n.node_ref === conn?.from_ref);
      const to = nodes.find(n => n.node_ref === conn?.to_ref);
      if (!conn || !from || !to) return null;
      return (
        <ConnectionTooltip connection={conn} fromNode={from} toNode={to}
          position={hoveredConnection.position} connectionType={conn.type} />
      );
    })()}
    </>
  );
};
