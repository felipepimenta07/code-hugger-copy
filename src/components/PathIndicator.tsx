import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';

interface PathIndicatorProps {
  selectedNode: any | null;
  centerNode: any;
  allNodes: any[];
  connections: any[];
}

// BFS para encontrar o caminho mais curto usando node_ref
function findShortestPath(startRef: string, endRef: string, nodes: any[], connections: any[]): any[] {
  if (startRef === endRef) return [];
  
  const queue: [string, string[]][] = [[startRef, [startRef]]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [currentRef, path] = queue.shift()!;
    
    if (currentRef === endRef) {
      return path.map(ref => nodes.find(n => n.node_ref === ref)).filter(Boolean);
    }

    if (visited.has(currentRef)) continue;
    visited.add(currentRef);

    const neighbors = connections
      .filter(c => c.from_ref === currentRef || c.to_ref === currentRef)
      .map(c => c.from_ref === currentRef ? c.to_ref : c.from_ref);

    for (const neighborRef of neighbors) {
      if (!visited.has(neighborRef)) {
        queue.push([neighborRef, [...path, neighborRef]]);
      }
    }
  }

  return [];
}

export const PathIndicator: React.FC<PathIndicatorProps> = ({ 
  selectedNode, 
  centerNode, 
  allNodes, 
  connections 
}) => {
  const [path, setPath] = useState<any[]>([]);
  const [degree, setDegree] = useState<number>(0);

  useEffect(() => {
    if (!selectedNode || !centerNode || selectedNode.node_ref === centerNode.node_ref) {
      setPath([]);
      setDegree(0);
      return;
    }

    const calculatedPath = findShortestPath(selectedNode.node_ref, centerNode.node_ref, allNodes, connections);
    setPath(calculatedPath);
    setDegree(calculatedPath.length - 1);
  }, [selectedNode, centerNode, allNodes, connections]);

  if (!selectedNode || path.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-fade-in">
      <div className="bg-background/80 backdrop-blur-md border border-primary/30 rounded-lg px-4 py-3 shadow-2xl max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">
            Caminho de Conexão
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <span className="text-foreground font-medium">{selectedNode.name}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-primary">Grau {degree}</span>
        </div>
        
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="opacity-70">vindo de</span>
          {path.slice(0, -1).reverse().map((node, idx) => (
            <React.Fragment key={node.node_ref}>
              {idx > 0 && <span className="text-primary">›</span>}
              <span className="text-foreground font-medium">{node.name}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
