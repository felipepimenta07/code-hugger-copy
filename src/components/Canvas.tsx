import React from 'react';
import { User, Target, Building2 } from 'lucide-react';

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
  allConnections?: any[];
  onGoToProject?: (id: number) => void;
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
  allConnections = [],
  onGoToProject
}) => {
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
    if (!e.shiftKey && !state.isDraggingConnection && viewMode === 'single') {
      updateState({ editingNode: nodes.find(n => n.id === nodeId), showSidebar: true, showAnalytics: false });
    }
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    if (viewMode === 'single' && onOpenEditModal) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        onOpenEditModal(node);
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
    <svg
      ref={svgRef}
      className="w-full h-full cursor-move"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleCanvasContextMenu}
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
        
        {/* Red dotted lines between projects that share nodes (Master View) */}
        {viewMode === 'master' && (() => {
          const projectNodes = nodes.filter(n => n.type === 'project');
          const projectLinks: Array<{A: any, B: any, shared: any[]}> = [];
          
          for (let i = 0; i < projectNodes.length; i++) {
            for (let j = i + 1; j < projectNodes.length; j++) {
              const A = projectNodes[i];
              const B = projectNodes[j];
              
              // Find shared person/brand nodes
              const shared = nodes.filter(n => n.type !== 'project').filter(n =>
                allConnections.some(c => 
                  (c.from === n.id && c.to === A.id) || (c.to === n.id && c.from === A.id)
                ) &&
                allConnections.some(c => 
                  (c.from === n.id && c.to === B.id) || (c.to === n.id && c.from === B.id)
                )
              );
              
              if (shared.length > 0) {
                projectLinks.push({ A, B, shared });
              }
            }
          }
          
          return projectLinks.map((link, idx) => {
            const { A, B, shared } = link;
            const pathData = `M ${A.x},${A.y} Q ${(A.x + B.x) / 2},${(A.y + B.y) / 2 - 60} ${B.x},${B.y}`;
            const tooltipText = `${shared.length} conexões: ${shared.slice(0, 5).map(x => x.name).join(', ')}${shared.length > 5 ? ` +${shared.length - 5}` : ''}`;
            
            return (
              <path
                key={`project-link-${idx}`}
                d={pathData}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="6,6"
                opacity="0.7"
                fill="none"
              >
                <title>{tooltipText}</title>
              </path>
            );
          });
        })()}
        
        {/* Clusters no Master View (por projeto) */}
        {viewMode === 'master' && projects.map(project => {
          const clusterNodes = nodes.filter(n => n.projectId === project.id);
          if (clusterNodes.length === 0 && !nodes.some(n => n.id === project.id)) return null;
          
          const projectNode = nodes.find(n => n.id === project.id);
          const allClusterNodes = projectNode ? [projectNode, ...clusterNodes] : clusterNodes;
          
          const avgX = allClusterNodes.reduce((sum, n) => sum + n.x, 0) / allClusterNodes.length;
          const avgY = allClusterNodes.reduce((sum, n) => sum + n.y, 0) / allClusterNodes.length;
          const maxDist = Math.max(...allClusterNodes.map(n => 
            Math.sqrt((n.x - avgX) ** 2 + (n.y - avgY) ** 2)
          ), 200);
          const radius = maxDist + 150;

          return (
            <g key={project.id}>
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
              
              {/* Label do projeto */}
              <text
                x={avgX}
                y={avgY - radius - 30}
                textAnchor="middle"
                fill="#8b5cf6"
                fontSize="18"
                fontWeight="bold"
                letterSpacing="3"
              >
                {project.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Conexões */}
        {connections.map((conn, idx) => {
          const from = nodes.find(n => n.id === conn.from);
          const to = nodes.find(n => n.id === conn.to);
          if (!from || !to) return null;
          
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
          
          // Detectar cross-projeto: pessoa/marca conectando para projeto diferente do anchor
          const getAssignment = (node: any) => {
            if (node.type === 'project') return node.id;
            return node.anchorProjectId ?? node.homeProjectId ?? null;
          };
          const fromProj = getAssignment(from);
          const toProj = getAssignment(to);
          const isCrossProject = viewMode === 'master' && (
            ((from.type === 'person' || from.type === 'brand') && to.type === 'project' && fromProj && fromProj !== toProj) ||
            ((to.type === 'person' || to.type === 'brand') && from.type === 'project' && toProj && fromProj !== toProj)
          );
          
          const isInPath = highlightedPath.length > 0 && 
            highlightedPath.some((id, i) => 
              i < highlightedPath.length - 1 && 
              ((highlightedPath[i] === from.id && highlightedPath[i + 1] === to.id) ||
               (highlightedPath[i] === to.id && highlightedPath[i + 1] === from.id))
            );
          
          // Styling based on priority: path > selected > cross-project > depth-based
          let strokeColor;
          let strokeWidth;
          let strokeDasharray = '0';
          let opacity = 1;
          
          if (isInPath) {
            strokeColor = '#10b981';
            strokeWidth = 5;
          } else if (isSelected) {
            strokeColor = '#f59e0b';
            strokeWidth = isCrossProject ? 4 : (conn.type === 'strong' ? 3 : 2);
          } else if (isCrossProject) {
            strokeColor = 'hsl(var(--connection-cross))';
            strokeWidth = 4;
          } else {
            // Normal connection - apply depth-based styling
            strokeColor = conn.type === 'strong' ? '#a855f7' : '#6366f1';
            const baseWidth = conn.type === 'strong' ? 3 : 2;
            
            if (viewMode === 'single' && connectionLevel > 0) {
              if (connectionLevel === 1) {
                // Level 1: thinner by 1 point
                strokeWidth = baseWidth - 1;
              } else if (connectionLevel === 2) {
                // Level 2: dotted
                strokeWidth = baseWidth;
                strokeDasharray = '8,6';
              } else {
                // Level 3+: reduced opacity progressively
                strokeWidth = baseWidth;
                opacity = connectionLevel === 3 ? 0.7 : connectionLevel === 4 ? 0.55 : 0.4;
              }
            } else {
              strokeWidth = baseWidth;
            }
          }
          
          const controlX = (from.x + to.x) / 2;
          const controlY = (from.y + to.y) / 2 - 80;
          const pathData = `M ${from.x},${from.y} Q ${controlX},${controlY} ${to.x},${to.y}`;
          
          return (
            <g key={idx}>
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
              />
              <path
                d={pathData}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={strokeDasharray}
                opacity={opacity}
                markerEnd={conn.directional ? 'url(#arrowhead)' : ''}
                className="pointer-events-none"
              />
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
          const colors = nodeColors[node.type as keyof typeof nodeColors];
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
                </>
              )}
              
              {node.type === 'person' && (
                <foreignObject x={-14} y={-14} width={28} height={28}>
                  <User size={28} stroke="white" strokeWidth={2} />
                </foreignObject>
              )}
              {node.type === 'project' && (
                <foreignObject x={-14} y={-14} width={28} height={28}>
                  <Target size={28} stroke="white" strokeWidth={2} />
                </foreignObject>
              )}
              {node.type === 'brand' && (
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
              
              {/* Eye icon for project nodes to navigate */}
              {node.type === 'project' && onGoToProject && (
                <g 
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoToProject(node.id);
                  }} 
                  className="cursor-pointer"
                  opacity={isHovered ? 1 : 0.7}
                >
                  <circle 
                    cx={nodeSize + 12} 
                    cy={-nodeSize + 12} 
                    r="10" 
                    fill="rgba(0,0,0,.7)" 
                    stroke="white" 
                    strokeWidth="2" 
                  />
                  <text 
                    x={nodeSize + 12} 
                    y={-nodeSize + 16} 
                    textAnchor="middle" 
                    fill="white" 
                    fontSize="12"
                  >
                    👁
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};
