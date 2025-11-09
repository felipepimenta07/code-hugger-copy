import React, { useState, useRef } from 'react';
import { User, Target, Building2, Copy } from 'lucide-react';
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
  updateNodePosition: (nodeId: number, deltaX: number, deltaY: number) => void;
  setConnections: (updater: any) => void;
  saveToHistory: () => void;
  onOpenEditModal?: (node: any) => void;
  projects?: any[];
  flows?: any[];
  allConnections?: any[];
  onGoToProject?: (id: number) => void;
  onWheel?: (e: React.WheelEvent) => void;
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
  projects = [],
  flows = [],
  allConnections = [],
  onGoToProject,
  onWheel
}) => {
  const [hoveredConnection, setHoveredConnection] = useState<{
    index: number;
    position: { x: number; y: number };
  } | null>(null);

  // BFS to calculate depth from center node (for connection styling by distance)
  const calculateNodeDepths = () => {
    if (viewMode !== 'single' || nodes.length === 0) return new Map<number, number>();
    
    const centerNode = nodes[0]; // Active project is always first in single view
    const depths = new Map<number, number>();
    const queue: Array<{ id: number; depth: number }> = [{ id: centerNode.id, depth: 0 }];
    const visited = new Set<number>();
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      
      visited.add(current.id);
      depths.set(current.id, current.depth);
      
      // Find all connected nodes (using filtered connections for current view)
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
  
  // Offsets estáveis por flow no Master View para evitar sobreposição
  const getFlowOffset = (flowId: number) => {
    if (!flows || flows.length === 0) return { dx: 0, dy: 0 };
    const idx = Math.max(0, flows.findIndex(f => f.id === flowId));
    const angle = (idx / Math.max(flows.length, 1)) * Math.PI * 2;

    // Raio dinâmico: garante que os anéis grandes não se sobreponham e fiquem o mais próximos possível
    const count = Math.max(flows.length, 1);
    let radius = 0;
    if (count > 1) {
      const filledRadius = MASTER_RING_RADIUS + 40; // 280 (raio do maior círculo decorativo)
      const gap = 16; // pequeno espaço entre os círculos para não encostar
      const neededChord = 2 * filledRadius + gap; // distância mínima entre centros adjacentes
      radius = neededChord / (2 * Math.sin(Math.PI / count)); // R = chord / (2*sin(pi/n))
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
      
      // Encontrar nó central
      const centerNode = 
        clusterNodes.find(n => n.id === flow.center_id && n.type === flow.center_type) ||
        clusterNodes.find(n => n.type === 'project') ||
        clusterNodes[0];
      
      // Centro do cluster = posição do nó central + offset do flow
      const anchorX = 0;
      const anchorY = 0;
      const { dx, dy } = getFlowOffset(flow.id);
      const cx = anchorX + dx;
      const cy = anchorY + dy;
      
      // Posição do central
      map.set(centerNode.id, { x: cx, y: cy });
      
      // Distribuição uniforme dos demais nós
      const others = clusterNodes.filter(n => n.id !== centerNode.id);
      const sorted = [...others].sort((a, b) => {
        const t = typeOrder(a.type) - typeOrder(b.type);
        if (t !== 0) return t;
        const na = (a.name || '').localeCompare(b.name || '');
        if (na !== 0) return na;
        return a.id - b.id;
      });
      
      const N = Math.max(sorted.length, 1);
      const start = -Math.PI / 2; // começa no topo
      const step = (2 * Math.PI) / N;
      
      sorted.forEach((n, i) => {
        const angle = start + i * step;
        const x = cx + MASTER_RING_RADIUS * Math.cos(angle);
        const y = cy + MASTER_RING_RADIUS * Math.sin(angle);
        map.set(n.id, { x, y });
      });
    });
    
    return map;
  }, [viewMode, flows, nodes]);
  
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    
    // BLOQUEAR dragging no Master View - apenas permite seleção
    if (viewMode === 'master') {
      if (e.shiftKey) {
        if (selectedNodes.includes(nodeId)) {
          setSelectedNodes(selectedNodes.filter(id => id !== nodeId));
        } else {
          setSelectedNodes([...selectedNodes, nodeId]);
        }
      } else {
        if (!selectedNodes.includes(nodeId)) {
          setSelectedNodes([nodeId]);
        }
        updateState({ selectedNode: nodeId });
      }
      return;
    }
    
    // Código original para Single View
    if (e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      const node = nodes.find(n => n.id === nodeId);
      const rect = svgRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
      const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
      
      if (e.shiftKey) {
        if (selectedNodes.includes(nodeId)) {
          setSelectedNodes(selectedNodes.filter(id => id !== nodeId));
        } else {
          setSelectedNodes([...selectedNodes, nodeId]);
        }
      } else {
        if (!selectedNodes.includes(nodeId)) {
          setSelectedNodes([nodeId]);
        }
        updateState({ dragging: nodeId, offset: { x: x - node.x, y: y - node.y }, selectedNode: nodeId });
      }
    }
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    // Simple click does nothing, let double click handle editing
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // No Single View: abre o editor lateral
    if (viewMode === 'single') {
      if (onOpenEditModal) {
        onOpenEditModal(node);
      }
      return;
    }
    
    // No Master View: navegar para o flow (verificando se é nó central)
    if (onGoToProject) {
      // Primeiro: verificar se este nó é o centro de algum flow
      const centerFlow = flows.find(f => 
        f.center_id === node.id && f.center_type === node.type
      );
      
      if (centerFlow) {
        // É um nó central → ir para Single View usando o center_id
        onGoToProject(centerFlow.center_id);
      } else if (node.flow_id) {
        // Não é centro, mas pertence a um flow → encontrar o center desse flow
        const belongsToFlow = flows.find(f => f.id === node.flow_id);
        if (belongsToFlow) {
          onGoToProject(belongsToFlow.center_id);
        }
      }
    }
  };

  const handleConnectionDotMouseDown = (e: React.MouseEvent, nodeId: number) => {
    if (viewMode === 'master') return;
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    updateState({ 
      isDraggingConnection: true, 
      connectionStart: { id: nodeId, x: node.x, y: node.y }, 
      connectionEnd: { x: node.x, y: node.y },
      showSidebar: false
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
    const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
    
    // BLOQUEAR movimento de nós no Master View
    if (state.dragging && viewMode === 'master') return;
    
    if (state.dragging) {
      const draggedNode = nodes.find(n => n.id === state.dragging);
      const dx = x - state.offset.x - draggedNode.x;
      const dy = y - state.offset.y - draggedNode.y;
      
      selectedNodes.forEach(nodeId => {
        updateNodePosition(nodeId, dx, dy);
      });
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
      const targetNode = nodes.find(n => Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) < 45);
      
      if (targetNode && targetNode.id !== state.connectionStart.id) {
        
        const exists = connections.some(c => 
          (c.from === state.connectionStart.id && c.to === targetNode.id) || 
          (c.from === targetNode.id && c.to === state.connectionStart.id)
        );
        if (!exists) {
          saveToHistory();
          setConnections(prev => [...prev, { 
            from: state.connectionStart.id, 
            to: targetNode.id,
            type: 'strong',
            directional: false
          }]);
        }
      }
    }
    
    if (state.dragging) {
      saveToHistory();
    }
    
    updateState({ 
      dragging: null, 
      isPanning: false, 
      isDraggingConnection: false, 
      connectionStart: null
    });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (viewMode === 'master') return;
                      const rect = svgRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - state.pan.x) / state.zoom;
    const y = (e.clientY - rect.top - state.pan.y) / state.zoom;
    const clickedNode = nodes.find(n => Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) < 45);
    if (!clickedNode) {
      updateState({ contextMenu: { x: e.clientX, y: e.clientY, canvasX: x, canvasY: y, type: 'canvas' } });
    }
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
          updateState({ 
            isPanning: true, 
            panStart: { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y } 
          });
        }
      }}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
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

      <defs>
        <radialGradient id="gradientPinkPurple">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </radialGradient>
        <radialGradient id="gradientCyan">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0891b2" />
        </radialGradient>
      </defs>

      <g transform={`translate(${state.pan.x}, ${state.pan.y}) scale(${state.zoom})`}>
        <rect x="-5000" y="-5000" width="15000" height="15000" fill="#000000" />
        
        {/* Anéis Decorativos Radiais (Single View) */}
        {viewMode === 'single' && nodes.length > 0 && (() => {
          // FIXED: Always use nodes[0] as center (active project)
          const centerNode = nodes[0];
          if (!centerNode) return null;
          
          return (
            <g key="radial-rings">
              {/* Anel rosa/roxo interno (decorativo) */}
              <circle
                cx={centerNode.x}
                cy={centerNode.y}
                r={140}
                fill="none"
                stroke="url(#gradientPinkPurple)"
                strokeWidth="35"
                opacity="0.25"
              />
              
              {/* Sun Rays - Traços radiais */}
              {Array.from({ length: 48 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 48;
                const innerRadius = 130;
                const outerRadius = 165;
                const x1 = centerNode.x + innerRadius * Math.cos(angle);
                const y1 = centerNode.y + innerRadius * Math.sin(angle);
                const x2 = centerNode.x + outerRadius * Math.cos(angle);
                const y2 = centerNode.y + outerRadius * Math.sin(angle);
                
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(139, 92, 246, 0.6)"
                    strokeWidth="2"
                    opacity={(i % 2 === 0) ? 0.8 : 0.4}
                  />
                );
              })}
              
              {/* Círculo pontilhado nível 1 */}
              <circle
                cx={centerNode.x}
                cy={centerNode.y}
                r={200}
                fill="none"
                stroke="rgba(139, 92, 246, 0.35)"
                strokeWidth="1.5"
                strokeDasharray="4,8"
              />
              
              {/* Círculo pontilhado nível 2 */}
              <circle
                cx={centerNode.x}
                cy={centerNode.y}
                r={280}
                fill="none"
                stroke="rgba(139, 92, 246, 0.25)"
                strokeWidth="1.5"
                strokeDasharray="4,8"
              />
              
              {/* Círculo pontilhado nível 3 */}
              <circle
                cx={centerNode.x}
                cy={centerNode.y}
                r={350}
                fill="none"
                stroke="rgba(139, 92, 246, 0.2)"
                strokeWidth="1.5"
                strokeDasharray="4,8"
              />
              
              {/* Círculo pontilhado nível 4 */}
              <circle
                cx={centerNode.x}
                cy={centerNode.y}
                r={440}
                fill="none"
                stroke="rgba(139, 92, 246, 0.15)"
                strokeWidth="1"
                strokeDasharray="3,6"
              />
              
              {/* Círculo pontilhado nível 5 */}
              <circle
                cx={centerNode.x}
                cy={centerNode.y}
                r={520}
                fill="none"
                stroke="rgba(139, 92, 246, 0.1)"
                strokeWidth="1"
                strokeDasharray="2,6"
              />
            </g>
          );
        })()}
        
        {/* Linhas entre Flows com Empresas Compartilhadas (Master View) */}
        {viewMode === 'master' && (() => {
          const flowConnections: Array<{ flowA: number; flowB: number; companies: string[] }> = [];
          const peopleByFlow = new Map<number, any[]>();
          
          // Agrupar pessoas por flow
          nodes.forEach(node => {
            if (node.type === 'person' && node.company) {
              const flowId = getNodeFlowId(node);
              if (!peopleByFlow.has(flowId)) peopleByFlow.set(flowId, []);
              peopleByFlow.get(flowId)!.push(node);
            }
          });
          
          // Encontrar empresas compartilhadas entre flows
          const flowIds = Array.from(peopleByFlow.keys());
          for (let i = 0; i < flowIds.length; i++) {
            for (let j = i + 1; j < flowIds.length; j++) {
              const peopleA = peopleByFlow.get(flowIds[i])!;
              const peopleB = peopleByFlow.get(flowIds[j])!;
              const sharedCompanies = peopleA
                .filter(a => peopleB.some(b => b.company === a.company))
                .map(p => p.company)
                .filter((v, i, a) => a.indexOf(v) === i); // unique
              
              if (sharedCompanies.length > 0) {
                flowConnections.push({ flowA: flowIds[i], flowB: flowIds[j], companies: sharedCompanies });
              }
            }
          }
          
          // Renderizar linhas entre flows
          return flowConnections.map((fc, idx) => {
            const flowANodes = nodes.filter(n => getNodeFlowId(n) === fc.flowA);
            const flowBNodes = nodes.filter(n => getNodeFlowId(n) === fc.flowB);
            if (flowANodes.length === 0 || flowBNodes.length === 0) return null;
            
            const flowA = flows?.find(f => f.id === fc.flowA);
            const flowB = flows?.find(f => f.id === fc.flowB);
            if (!flowA || !flowB) return null;
            
            const centerA = 
              flowANodes.find(n => n.id === flowA.center_id && n.type === flowA.center_type) ||
              flowANodes.find(n => n.type === 'project') ||
              flowANodes[0];
            const centerB = 
              flowBNodes.find(n => n.id === flowB.center_id && n.type === flowB.center_type) ||
              flowBNodes.find(n => n.type === 'project') ||
              flowBNodes[0];
            
            const posA = masterLayoutMap.get(centerA.id);
            const posB = masterLayoutMap.get(centerB.id);
            if (!posA || !posB) return null;
            
            return (
              <g key={`flow-conn-${idx}`}>
                <path
                  d={`M ${posA.x} ${posA.y} L ${posB.x} ${posB.y}`}
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  strokeDasharray="8,8"
                  opacity="0.3"
                  className="pointer-events-auto cursor-pointer hover:opacity-60"
                  onMouseEnter={(e) => {
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) {
                      setHoveredConnection({ 
                        index: -1000 - idx, 
                        position: { x: e.clientX - rect.left, y: e.clientY - rect.top }
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredConnection(null)}
                />
                {hoveredConnection?.index === -1000 - idx && (
                  <foreignObject 
                    x={hoveredConnection.position.x - 100} 
                    y={hoveredConnection.position.y - 60} 
                    width="200" 
                    height="80"
                    className="pointer-events-none"
                  >
                    <div className="bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg text-xs">
                      <strong>Empresas em comum:</strong>
                      <ul className="mt-1">
                        {fc.companies.map(c => <li key={c}>• {c}</li>)}
                      </ul>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          });
        })()}
        
        {/* Anéis Decorativos Radiais (Master View - para cada nó raiz) */}
        {viewMode === 'master' && flows && flows.length > 0 && flows.map(flow => {
          const clusterNodes = nodes.filter(n => getNodeFlowId(n) === flow.id);
          if (!clusterNodes.length) return null;
          
          const centerNode = 
            clusterNodes.find(n => n.id === flow.center_id && n.type === flow.center_type) ||
            clusterNodes.find(n => n.type === 'project') ||
            clusterNodes[0];
          
          const pos = masterLayoutMap.get(centerNode.id);
          if (!pos) return null;
          
          return (
            <g key={`ring-${flow.id}`}>
              {/* Anel rosa/roxo interno (decorativo) */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={140}
                fill="none"
                stroke="url(#gradientPinkPurple)"
                strokeWidth="35"
                opacity="0.25"
              />
              
              {/* Sun Rays - Traços radiais */}
              {Array.from({ length: 48 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 48;
                const innerRadius = 130;
                const outerRadius = 165;
                const x1 = pos.x + innerRadius * Math.cos(angle);
                const y1 = pos.y + innerRadius * Math.sin(angle);
                const x2 = pos.x + outerRadius * Math.cos(angle);
                const y2 = pos.y + outerRadius * Math.sin(angle);
                
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(139, 92, 246, 0.6)"
                    strokeWidth="2"
                    opacity={(i % 2 === 0) ? 0.8 : 0.4}
                  />
                );
              })}
            </g>
          );
        })}
        
        
        {/* Clusters no Master View (por flow) */}
        {viewMode === 'master' && flows.map(flow => {
          const clusterNodes = nodes.filter(n => getNodeFlowId(n) === flow.id);
          if (clusterNodes.length === 0) return null;
          
          const centerNode = 
            clusterNodes.find(n => n.id === flow.center_id && n.type === flow.center_type) ||
            clusterNodes.find(n => n.type === 'project') ||
            clusterNodes[0];
          
          const pos = masterLayoutMap.get(centerNode.id);
          if (!pos) return null;
          
          const dottedRadius = MASTER_RING_RADIUS;
          const filledRadius = MASTER_RING_RADIUS + 40;
 
           return (
            <g key={flow.id}>
              {/* Anel rosa/roxo decorativo */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={140}
                fill="none"
                stroke="url(#gradientPinkPurple)"
                strokeWidth="15"
                opacity="0.15"
              />
              
              {/* Círculo preenchido */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={filledRadius}
                fill="#8b5cf615"
                opacity="0.2"
              />
              
              {/* Círculo pontilhado externo */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={dottedRadius}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeDasharray="10,5"
                opacity="0.35"
              />
              
              {/* Círculo pontilhado externo adicional - menos opaco */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={dottedRadius + 25}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeDasharray="10,5"
                opacity="0.25"
              />
              
              {/* Label do flow */}
              <text
                x={pos.x}
                y={pos.y - dottedRadius - 30}
                textAnchor="middle"
                fill="#8b5cf6"
                fontSize="18"
                fontWeight="bold"
                letterSpacing="3"
              >
                {flow.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Conexões */}
        {connections.map((conn, idx) => {
          const from = nodes.find(n => n.id === conn.from);
          const to = nodes.find(n => n.id === conn.to);
          if (!from || !to) return null;
          
          // Permitir conexões projeto↔projeto também no Single View
          
          // Encontrar índice correto em allConnections
          const globalIdx = allConnections.findIndex(c => 
            (c.from === conn.from && c.to === conn.to) || 
            (c.from === conn.to && c.to === conn.from)
          );
          const isSelected = selectedConnection === globalIdx;
          
          // Calculate connection depth level based on node depths (distance from center)
          const fromDepth = nodeDepths.get(from.id) ?? 0;
          const toDepth = nodeDepths.get(to.id) ?? 0;
          const connectionLevel = Math.min(fromDepth, toDepth);
          
          const isInPath = highlightedPath.length > 0 && 
            highlightedPath.some((id, i) => 
              i < highlightedPath.length - 1 && 
              ((highlightedPath[i] === from.id && highlightedPath[i + 1] === to.id) ||
                (highlightedPath[i] === to.id && highlightedPath[i + 1] === from.id))
            );
          
          // Detectar cross-flow: conexões entre flows diferentes no Master View
          const fromFlowId = getNodeFlowId(from);
          const toFlowId = getNodeFlowId(to);
          const isCrossFlow = viewMode === 'master' &&
            fromFlowId && toFlowId && fromFlowId !== toFlowId;
          
          // Styling based on priority: path > selected > cross-project > depth-based
          let strokeColor;
          let strokeWidth;
          let strokeDasharray = undefined;
          let opacity = 1;
          let useGlow = false;
          
          if (isInPath) {
            strokeColor = '#10b981';
            strokeWidth = 5;
          } else if (isSelected) {
            strokeColor = '#f59e0b';
            strokeWidth = isCrossFlow ? 4 : (conn.type === 'strong' ? 3 : 2);
          } else if (isCrossFlow) {
            strokeColor = 'hsl(var(--connection-cross))';
            strokeWidth = 4;
            strokeDasharray = '8,4';
          } else {
            // Sistema de gradiente visual baseado em nível
            strokeColor = conn.type === 'strong' ? '#a855f7' : '#6366f1';
            
            if (viewMode === 'single' && connectionLevel >= 0) {
              // Gradiente progressivo de força
              switch (connectionLevel) {
                case 0: // Conexão direta ao centro
                  strokeWidth = conn.type === 'strong' ? 4 : 3;
                  opacity = 1;
                  useGlow = true;
                  break;
                case 1: // 1 grau de separação
                  strokeWidth = conn.type === 'strong' ? 3 : 2;
                  opacity = 0.9;
                  break;
                case 2: // 2 graus de separação
                  strokeWidth = conn.type === 'strong' ? 2.5 : 2;
                  opacity = 0.75;
                  strokeDasharray = '6,4';
                  break;
                case 3: // 3 graus de separação
                  strokeWidth = 2;
                  opacity = 0.6;
                  strokeDasharray = '4,6';
                  strokeColor = conn.type === 'strong' ? '#9333ea' : '#4f46e5';
                  break;
                default: // 4+ graus de separação
                  strokeWidth = 1.5;
                  opacity = 0.4;
                  strokeDasharray = '3,8';
                  strokeColor = conn.type === 'strong' ? '#7c3aed' : '#4338ca';
                  break;
              }
            } else {
              // Master view
              strokeWidth = conn.type === 'strong' ? 3 : 2;
              opacity = 0.4;
            }
          }
          
          if (isSelected) {
            opacity = 1;
          }
          
          // Usar coordenadas corretas para conexões baseadas no viewMode + offset por flow no Master View
          const getDisplayPos = (n: any) => {
            if (viewMode === 'master') {
              const pos = masterLayoutMap.get(n.id);
              return pos ?? { x: n.x, y: n.y };
            }
            return { x: n.x, y: n.y };
          };
          
          const { x: fromX, y: fromY } = getDisplayPos(from);
          const { x: toX, y: toY } = getDisplayPos(to);
          
          const controlX = (fromX + toX) / 2;
          const controlY = (fromY + toY) / 2 - 80;
          const pathData = `M ${fromX},${fromY} Q ${controlX},${controlY} ${toX},${toY}`;
          
          // Gerar tooltip inteligente para conexões cross-flow
          let tooltipText = '';
          if (isCrossFlow) {
            // Pessoa ↔ Pessoa (projetos diferentes)
            if (from.type === 'person' && to.type === 'person') {
              tooltipText = `${from.name} conectado(a) a ${to.name} (projetos diferentes)`;
            }
            // Pessoa ↔ Marca
            else if ((from.type === 'person' && to.type === 'brand') || (from.type === 'brand' && to.type === 'person')) {
              const person = from.type === 'person' ? from : to;
              const brand = from.type === 'brand' ? from : to;
              tooltipText = `${person.name} trabalha na ${brand.name}`;
            }
            // Marca ↔ Marca (projetos diferentes)
            else if (from.type === 'brand' && to.type === 'brand') {
              tooltipText = `${from.name} parceira de ${to.name} (projetos diferentes)`;
            }
            // Pessoa ↔ Projeto (projetos diferentes)
            else if ((from.type === 'person' && to.type === 'project') || (from.type === 'project' && to.type === 'person')) {
              const person = from.type === 'person' ? from : to;
              const project = from.type === 'project' ? from : to;
              tooltipText = `${person.name} participa do projeto ${project.name}`;
            }
            // Marca ↔ Projeto (projetos diferentes)
            else if ((from.type === 'brand' && to.type === 'project') || (from.type === 'project' && to.type === 'brand')) {
              const brand = from.type === 'brand' ? from : to;
              const project = from.type === 'project' ? from : to;
              tooltipText = `${brand.name} participa do projeto ${project.name}`;
            }
          }
          
          return (
            <g key={idx}>
              {/* Área de hover maior para cross-flow */}
              {isCrossFlow ? (
                <>
                  <path
                    d={pathData}
                    stroke="transparent"
                    strokeWidth="20"
                    fill="none"
                    className="cursor-pointer"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedConnection(selectedConnection === globalIdx ? null : globalIdx);
                      setSelectedNodes([]);
                    }}
                    onMouseEnter={(e) => {
                      const rect = svgRef.current!.getBoundingClientRect();
                      const { x: fromX, y: fromY } = getDisplayPos(from);
                      const { x: toX, y: toY } = getDisplayPos(to);
                      const midX = ((fromX + toX) / 2) * state.zoom + state.pan.x + rect.left;
                      const midY = ((fromY + toY) / 2 - 80) * state.zoom + state.pan.y + rect.top;
                      setHoveredConnection({ index: idx, position: { x: midX, y: midY } });
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
                    markerEnd={conn.directional ? 'url(#arrowhead)' : ''}
                    filter={useGlow ? "url(#connectionGlow)" : undefined}
                    className="pointer-events-none"
                  />
                </>
              ) : (
                <>
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
                      const { x: fromX, y: fromY } = getDisplayPos(from);
                      const { x: toX, y: toY } = getDisplayPos(to);
                      const midX = ((fromX + toX) / 2) * state.zoom + state.pan.x + rect.left;
                      const midY = ((fromY + toY) / 2 - 80) * state.zoom + state.pan.y + rect.top;
                      setHoveredConnection({ index: idx, position: { x: midX, y: midY } });
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
                    markerEnd={conn.directional ? 'url(#arrowhead)' : ''}
                    filter={useGlow ? "url(#connectionGlow)" : undefined}
                    className="pointer-events-none"
                  />
                </>
              )}
            </g>
          );
        })}
        
        {state.isDraggingConnection && state.connectionStart && (
          <line 
            x1={state.connectionStart.x} 
            y1={state.connectionStart.y} 
            x2={state.connectionEnd.x} 
            y2={state.connectionEnd.y} 
            stroke="hsl(var(--connection-strong))" 
            strokeWidth="3"
            strokeDasharray="5,5"
          />
        )}
        
        {/* Nós */}
        {nodes.map(node => {
          // Garantir que node.type existe e é válido
          const nodeType = (node.type as keyof typeof nodeColors) || 'person';
          const colors = nodeColors[nodeType] || nodeColors.person;
          const isSelected = selectedNodes.includes(node.id);
          const isInPath = highlightedPath.includes(node.id);
          const connectionCount = connections.filter(c => c.from === node.id || c.to === node.id).length;
          
          // Usar coordenadas corretas baseadas no viewMode + offset por flow no Master View
          let displayX, displayY;
          if (viewMode === 'master') {
            const pos = masterLayoutMap.get(node.id);
            displayX = pos?.x ?? node.x;
            displayY = pos?.y ?? node.y;
          } else {
            displayX = node.x;
            displayY = node.y;
          }
          
          // Tamanho por nível hierárquico
          let baseSize = 40;
          if ((node as any).level === 'center') baseSize = 70;
          else if ((node as any).level === 'inner') baseSize = 55;
          else if ((node as any).level === 'middle') baseSize = 35;
          else if ((node as any).level === 'outer') baseSize = 22;
          else baseSize = 40 + Math.min(connectionCount * 2, 15);
          
          const nodeSize = baseSize;
          const isHovered = hoveredNode === node.id;
          const isCenterNode = (node as any).level === 'center';
          
          return (
            <g 
              key={node.id} 
              transform={`translate(${displayX}, ${displayY})`}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onClick={(e) => handleNodeClick(e, node.id)}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              {/* Nó Central Especial */}
              {isCenterNode && (
                <>
                  <circle 
                    r={nodeSize + 40} 
                    fill="url(#gradientPinkPurple)" 
                    opacity="0.4" 
                    filter="url(#glow)"
                    className="animate-pulse"
                    style={{ animationDuration: '3s' }}
                  />
                  <circle 
                    r={nodeSize + 15} 
                    fill="#8b5cf6" 
                    opacity="0.8" 
                  />
                  <circle 
                    r={nodeSize} 
                    fill="#ec4899" 
                    strokeWidth="3"
                    stroke="white"
                  />
                </>
              )}
              
              {/* Nós Outer (Cyan especial) */}
              {!isCenterNode && (node as any).level === 'outer' && (
                <>
                  <circle
                    r={nodeSize + 15}
                    fill="rgba(6, 182, 212, 0.3)"
                    filter="url(#glow)"
                  />
                  <circle
                    r={nodeSize}
                    fill="rgba(6, 182, 212, 0.2)"
                  />
                  <circle
                    r={nodeSize - 2}
                    fill="#1a1a1a"
                    stroke="#06b6d4"
                    strokeWidth="3"
                  />
                </>
              )}
              
              {/* Yellow highlight for new nodes */}
              {(node as any).isNewHighlight && (
                <circle 
                  r={nodeSize + 10} 
                  fill="none" 
                  stroke="#facc15" 
                  strokeWidth="4" 
                  opacity="0.9"
                  className="animate-pulse"
                />
              )}
              
              {/* Nós Normais (Inner/Middle) */}
              {!isCenterNode && (node as any).level !== 'outer' && (
                <>
                  <circle
                    r={nodeSize + (isInPath ? 35 : (isHovered ? 30 : 20))}
                    fill={isInPath ? 'hsl(var(--connection-path))' : colors.glow}
                    opacity={isInPath ? 0.6 : (isHovered ? 0.5 : 0.3)}
                    filter="url(#glow)"
                  />
                  
                  <circle
                    r={nodeSize + 8}
                    fill={colors.secondary}
                    opacity={isHovered ? 0.4 : 0.25}
                  />
                  
                  {node.imageUrl ? (
                    <>
                      <defs>
                        <clipPath id={`clip-${node.id}`}>
                          <circle r={nodeSize} />
                        </clipPath>
                      </defs>
                      <image
                        href={node.imageUrl}
                        x={-nodeSize}
                        y={-nodeSize}
                        width={nodeSize * 2}
                        height={nodeSize * 2}
                        clipPath={`url(#clip-${node.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                      <circle
                        r={nodeSize}
                        fill="none"
                        stroke={isInPath ? 'hsl(var(--connection-path))' : (isSelected ? 'white' : colors.primary)}
                        strokeWidth={isInPath ? 5 : (isSelected ? 4 : 2)}
                        style={{
                          filter: `drop-shadow(0 0 ${isHovered ? '12' : '6'}px ${colors.primary})`
                        }}
                      />
                    </>
                  ) : (
                    <circle
                      r={nodeSize}
                      fill={colors.primary}
                      stroke={isInPath ? 'hsl(var(--connection-path))' : (isSelected ? 'white' : colors.primary)}
                      strokeWidth={isInPath ? 5 : (isSelected ? 4 : 2)}
                      opacity="0.9"
                      style={{
                        filter: `drop-shadow(0 0 ${isHovered ? '12' : '6'}px ${colors.primary})`
                      }}
                    />
                  )}
                </>
              )}
              
              {!node.imageUrl && node.type === 'person' && (
                <foreignObject x={-14} y={-14} width={28} height={28}>
                  <User size={28} stroke="white" strokeWidth={2} />
                </foreignObject>
              )}
              {!node.imageUrl && node.type === 'project' && (
                <foreignObject x={-14} y={-14} width={28} height={28}>
                  <Target size={28} stroke="white" strokeWidth={2} />
                </foreignObject>
              )}
              {!node.imageUrl && node.type === 'brand' && (
                <foreignObject x={-14} y={-14} width={28} height={28}>
                  <Building2 size={28} stroke="white" strokeWidth={2} />
                </foreignObject>
              )}
              
              {/* Badge de conexões ou Score (nó central) */}
              {isCenterNode ? (
                <>
                  {/* Network Score no centro */}
                  <text
                    y="-8"
                    textAnchor="middle"
                    fill="white"
                    fontSize="26"
                    fontWeight="bold"
                  >
                    {connectionCount > 0 ? Math.min(connectionCount * 10, 99) : 87}
                  </text>
                  <text
                    y="10"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.8)"
                    fontSize="8"
                    letterSpacing="1"
                  >
                    NETWORK SCORE
                  </text>
                </>
              ) : connectionCount > 0 && (
                <>
                  <circle
                    cx={nodeSize - 8}
                    cy={-nodeSize + 8}
                    r="14"
                    fill="rgba(0, 0, 0, 0.9)"
                    stroke={colors.primary}
                    strokeWidth="2"
                  />
                  <text
                    x={nodeSize - 8}
                    y={-nodeSize + 13}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {connectionCount}
                  </text>
                </>
              )}
              
              {/* Alerta visual para nós órfãos */}
              {(node as any).anchorProjectId === null && node.type !== 'project' && (
                <g>
                  <circle 
                    cx={nodeSize - 8} 
                    cy={-nodeSize + 8} 
                    r="12" 
                    fill="#ef4444" 
                    stroke="white" 
                    strokeWidth="2"
                  />
                  <text 
                    x={nodeSize - 8} 
                    y={-nodeSize + 12} 
                    fontSize="14" 
                    fontWeight="bold" 
                    fill="white" 
                    textAnchor="middle"
                  >⚠</text>
                </g>
              )}
              
              {viewMode === 'single' && (
                <circle
                  cx={nodeSize + 10}
                  cy="0"
                  r="9"
                  fill="rgba(59, 130, 246, 0.95)"
                  stroke="white"
                  strokeWidth="2.5"
                  className="cursor-crosshair"
                  onMouseDown={(e) => handleConnectionDotMouseDown(e, node.id)}
                  style={{ pointerEvents: 'all' }}
                />
              )}
              
              <text
                y={nodeSize + (isHovered ? 26 : 24)}
                textAnchor="middle"
                fill="white"
                fontSize={isHovered ? 14 : 13}
                fontWeight={isHovered ? 600 : 500}
              >
                {node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name}
              </text>
              
              {node.category && (
              <text
                y={nodeSize + (isHovered ? 42 : 40)}
                textAnchor="middle"
                fill={colors.primary}
                fontSize="10"
                opacity={isHovered ? 1 : 0.7}
              >
                {node.category}
              </text>
              )}
              
              {/* Indicador de nó copiado */}
              {node.original_node_id && (
                <g>
                  <circle
                    cx={-nodeSize + 10}
                    cy={-nodeSize + 10}
                    r="12"
                    fill="hsl(217 91% 60%)"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <foreignObject x={-nodeSize + 10 - 6} y={-nodeSize + 10 - 6} width={12} height={12}>
                    <Copy size={12} stroke="white" strokeWidth={2.5} />
                  </foreignObject>
                </g>
              )}
              
              {/* Badge Cyan (nível middle/outer) */}
              {((node as any).level === 'middle' || (node as any).level === 'outer') && connectionCount > 0 && (
                <>
                  <circle
                    cx={nodeSize + 10}
                    cy={-nodeSize + 10}
                    r="13"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                  />
                  <text
                    x={nodeSize + 10}
                    y={-nodeSize + 15}
                    textAnchor="middle"
                    fill="#06b6d4"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {Math.min(connectionCount * 15, 99)}%
                  </text>
                </>
              )}
              
              {/* Indicador de múltiplos workflows */}
              {node.workflows && node.workflows.length > 1 && (
                <>
                  <circle
                    cx={nodeSize - 8}
                    cy={nodeSize - 8}
                    r="10"
                    fill="gold"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={nodeSize - 8}
                    y={nodeSize - 4}
                    textAnchor="middle"
                    fill="black"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {node.workflows.length}
                  </text>
                </>
              )}
              
            </g>
          );
        })}
      </g>
    </svg>
    
    {/* Tooltip de conexão */}
    {hoveredConnection && (() => {
      const conn = connections[hoveredConnection.index];
      const from = nodes.find(n => n.id === conn?.from);
      const to = nodes.find(n => n.id === conn?.to);
      
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
