import React from 'react';
import { Route } from 'lucide-react';

interface PathFinderModalProps {
  nodes: any[];
  connections: any[];
  pathStart: string | null;
  pathEnd: string | null;
  setPathStart: (ref: string | null) => void;
  setPathEnd: (ref: string | null) => void;
  setShowPathFinder: (show: boolean) => void;
  setHighlightedPath: (path: string[]) => void;
}

export const PathFinderModal: React.FC<PathFinderModalProps> = ({
  nodes,
  connections,
  pathStart,
  pathEnd,
  setPathStart,
  setPathEnd,
  setShowPathFinder,
  setHighlightedPath
}) => {
  const findShortestPath = (startRef: string, endRef: string): string[] | null => {
    if (startRef === endRef) return [startRef];
    const visited = new Set<string>();
    const queue: string[][] = [[startRef]];
    
    while (queue.length > 0) {
      const path = queue.shift()!;
      const nodeRef = path[path.length - 1];
      
      if (nodeRef === endRef) return path;
      
      if (!visited.has(nodeRef)) {
        visited.add(nodeRef);
        const neighbors = connections
          .filter(c => c.from_ref === nodeRef || c.to_ref === nodeRef)
          .map(c => c.from_ref === nodeRef ? c.to_ref : c.from_ref)
          .filter(n => !visited.has(n));
        
        neighbors.forEach(neighbor => queue.push([...path, neighbor]));
      }
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={() => setShowPathFinder(false)}>
      <div className="bg-card rounded-2xl p-6 w-96 border border-border shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Route size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Encontrar Caminho</h3>
            <p className="text-xs text-muted-foreground">Descubra conexões entre nós</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2 font-medium">De:</label>
            <select 
              value={pathStart || ''} 
              onChange={(e) => setPathStart(e.target.value || null)}
              className="w-full px-4 py-2.5 bg-secondary text-foreground border border-border rounded-xl focus:outline-none focus:border-primary">
              <option value="">Selecione um nó...</option>
              {nodes.map(n => <option key={n.node_ref} value={n.node_ref}>{n.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-2 font-medium">Para:</label>
            <select 
              value={pathEnd || ''} 
              onChange={(e) => setPathEnd(e.target.value || null)}
              className="w-full px-4 py-2.5 bg-secondary text-foreground border border-border rounded-xl focus:outline-none focus:border-primary">
              <option value="">Selecione um nó...</option>
              {nodes.map(n => <option key={n.node_ref} value={n.node_ref}>{n.name}</option>)}
            </select>
          </div>
          <button
            onClick={() => {
              if (pathStart && pathEnd) {
                const path = findShortestPath(pathStart, pathEnd);
                setHighlightedPath(path || []);
                if (!path) {
                  alert('Nenhum caminho encontrado entre esses nós!');
                } else {
                  alert(`Caminho encontrado com ${path.length} nós!`);
                }
                setShowPathFinder(false);
              }
            }}
            disabled={!pathStart || !pathEnd}
            className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${
              pathStart && pathEnd 
                ? 'bg-primary hover:opacity-90 text-primary-foreground' 
                : 'bg-secondary text-muted cursor-not-allowed'
            }`}>
            Encontrar Caminho
          </button>
        </div>
      </div>
    </div>
  );
};
