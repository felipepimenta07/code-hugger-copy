import React, { useState } from 'react';
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
  
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
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
    
    // Duplo clique SEMPRE entra no flow
    if (onGoToProject) {
      // Se o nó for um projeto, entra diretamente nele
      if (node.type === 'project') {
        onGoToProject(node.id);
      } 
      // Se for pessoa ou marca, encontra o projeto do flow atual
      else if (node.flow_id) {
        onGoToProject(node.flow_id);
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
          setConnections([...connections, { 
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
        
        
        {/* Clusters no Master View (por flow) */}
        {viewMode === 'master' && flows.map(flow => {
          const clusterNodes = nodes.filter(n => n.flow_id === flow.id);
          if (clusterNodes.length === 0) return null;
          
          const avgX = clusterNodes.reduce((sum, n) => sum + n.x, 0) / clusterNodes.length;
          const avgY = clusterNodes.reduce((sum, n) => sum + n.y, 0) / clusterNodes.length;
          const maxDist = Math.max(...clusterNodes.map(n => 
            Math.sqrt((n.x - avgX) ** 2 + (n.y - avgY) ** 2)
          ), 200);
          const radius = maxDist + 150;

          return (
            <g key={flow.id}>
              {/* Anel rosa/roxo decorativo */}
              <circle
                cx={avgX}
                cy={avgY}
                r={radius * 0.4}
                fill="none"
                stroke="url(#gradientPinkPurple)"
                strokeWidth="15"
                opacity="0.15"
              />
              
              {/* Círculo preenchido */}
              <circle
                cx={avgX}
                cy={avgY}
                r={radius + 40}
                fill="#8b5cf615"
                opacity="0.2"
              />
              
              {/* Círculo pontilhado externo */}
              <circle
                cx={avgX}
                cy={avgY}
                r={radius}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeDasharray="10,5"
                opacity="0.35"
              />
              
              {/* Label do flow */}
              <text
                x={avgX}
                y={avgY - radius - 30}
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
          
          // Allow project-to-project connections in single view when one is the center
          if (from.type === 'project' && to.type === 'project') {
            const centerId = viewMode === 'single' && nodes.length > 0 ? nodes[0].id : null;
            // Only render if in single view and one of them is the center project
            if (!(viewMode === 'single' && centerId && (from.id === centerId || to.id === centerId))) {
              return null;
            }
          }
          
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
          
          // Detectar cross-flow: nós de projetos diferentes (exceto projeto↔projeto)
          const getAssignment = (node: any) => {
            if (node.type === 'project') return node.id;
            // No master view, projectId já vem calculado
            return node.projectId ?? node.anchorProjectId ?? node.homeProjectId ?? null;
          };
          const fromProj = getAssignment(from);
          const toProj = getAssignment(to);
          
          const isCrossFlow = viewMode === 'master' &&
            fromProj && toProj && fromProj !== toProj &&
            !(from.type === 'project' && to.type === 'project');
          
          const isInPath = highlightedPath.length > 0 && 
            highlightedPath.some((id, i) => 
              i < highlightedPath.length - 1 && 
              ((highlightedPath[i] === from.id && highlightedPath[i + 1] === to.id) ||
                (highlightedPath[i] === to.id && highlightedPath[i + 1] === from.id))
            );
          
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
          
          const controlX = (from.x + to.x) / 2;
          const controlY = (from.y + to.y) / 2 - 80;
          const pathData = `M ${from.x},${from.y} Q ${controlX},${controlY} ${to.x},${to.y}`;
          
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
                      const midX = ((from.x + to.x) / 2) * state.zoom + state.pan.x + rect.left;
                      const midY = ((from.y + to.y) / 2 - 80) * state.zoom + state.pan.y + rect.top;
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
                      const midX = ((from.x + to.x) / 2) * state.zoom + state.pan.x + rect.left;
                      const midY = ((from.y + to.y) / 2 - 80) * state.zoom + state.pan.y + rect.top;
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
              transform={`translate(${node.x}, ${node.y})`}
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
