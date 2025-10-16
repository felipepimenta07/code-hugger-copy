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
  setNodes: (updater: any) => void;
  setConnections: (updater: any) => void;
  saveToHistory: () => void;
  onOpenEditModal?: (node: any) => void;
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
  setNodes,
  setConnections,
  saveToHistory,
  onOpenEditModal
}) => {
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
      
      setNodes(nodes.map(n => {
        if (selectedNodes.includes(n.id)) {
          return { ...n, x: n.x + dx, y: n.y + dy };
        }
        return n;
      }));
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

      <g transform={`translate(${state.pan.x}, ${state.pan.y}) scale(${state.zoom})`}>
        <rect x="-5000" y="-5000" width="15000" height="15000" fill="#000000" />
        
        {/* Clusters no Master View */}
        {viewMode === 'master' && workflows.map(workflow => {
          const workflowNodes = nodes.filter(n => n.workflowId === workflow.id);
          if (workflowNodes.length === 0) return null;
          
          const avgX = workflowNodes.reduce((sum, n) => sum + n.x, 0) / workflowNodes.length;
          const avgY = workflowNodes.reduce((sum, n) => sum + n.y, 0) / workflowNodes.length;
          const maxDist = Math.max(...workflowNodes.map(n => 
            Math.sqrt((n.x - avgX) ** 2 + (n.y - avgY) ** 2)
          ));
          const radius = maxDist + 130;

          return (
            <g key={workflow.id}>
              <circle
                cx={avgX}
                cy={avgY}
                r={radius + 30}
                fill={`${workflow.color}20`}
                opacity="0.3"
              />
              <circle
                cx={avgX}
                cy={avgY}
                r={radius}
                fill="none"
                stroke={workflow.color}
                strokeWidth="2"
                strokeDasharray="10,5"
                opacity="0.5"
              />
              <text
                x={avgX}
                y={avgY - radius - 20}
                textAnchor="middle"
                fill={workflow.color}
                fontSize="16"
                fontWeight="bold"
                letterSpacing="2"
              >
                {workflow.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Conexões */}
        {connections.map((conn, idx) => {
          const from = nodes.find(n => n.id === conn.from);
          const to = nodes.find(n => n.id === conn.to);
          if (!from || !to) return null;
          
          const isSelected = selectedConnection === idx;
          const isCrossWorkflow = viewMode === 'master' && from.workflowId !== to.workflowId;
          const isInPath = highlightedPath.length > 0 && 
            highlightedPath.some((id, i) => 
              i < highlightedPath.length - 1 && 
              ((highlightedPath[i] === from.id && highlightedPath[i + 1] === to.id) ||
               (highlightedPath[i] === to.id && highlightedPath[i + 1] === from.id))
            );
          
          let strokeColor;
          if (isInPath) strokeColor = 'hsl(var(--connection-path))';
          else if (isSelected) strokeColor = '#f59e0b';
          else if (isCrossWorkflow) strokeColor = 'hsl(var(--connection-cross))';
          else if (conn.type === 'strong') strokeColor = 'hsl(var(--connection-strong))';
          else strokeColor = 'hsl(var(--connection-weak))';
          
          const strokeWidth = isInPath ? 5 : (isCrossWorkflow ? 4 : (conn.type === 'strong' ? 3 : 2));
          
          return (
            <g key={idx}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="transparent"
                strokeWidth="15"
                className="cursor-pointer"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSelectedConnection(selectedConnection === idx ? null : idx);
                  setSelectedNodes([]);
                }}
              />
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={conn.type === 'weak' && !isCrossWorkflow && !isInPath ? '8,4' : '0'}
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
          const baseSize = 40;
          const sizeBonus = Math.min(connectionCount * 3, 20);
          const nodeSize = baseSize + sizeBonus;
          const isHovered = hoveredNode === node.id;
          
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
              
              {connectionCount > 0 && (
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
            </g>
          );
        })}
      </g>
    </svg>
  );
};
