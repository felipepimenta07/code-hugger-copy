import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  selectedNodes: number[];
  setSelectedNodes: (nodes: number[]) => void;
  setNodes: (updater: any) => void;
  setConnections: (updater: any) => void;
  updateState: (updates: any) => void;
  undo: () => void;
  redo: () => void;
  historyIndex: number;
  history: any[];
  saveToHistory: () => void;
  selectedConnection: number | null;
  setSelectedConnection: (connection: any) => void;
  setShowPathFinder: (show: boolean) => void;
  setHighlightedPath: (path: number[]) => void;
  nodes?: any[];
  allNodes?: any[];
  viewMode?: string;
  zoom?: number;
}

export const useKeyboardShortcuts = ({
  selectedNodes,
  setSelectedNodes,
  setNodes,
  setConnections,
  updateState,
  undo,
  redo,
  historyIndex,
  history,
  saveToHistory,
  selectedConnection,
  setSelectedConnection,
  setShowPathFinder,
  setHighlightedPath,
  nodes,
  allNodes,
  viewMode,
  zoom
}: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
        e.preventDefault();
        
        if (selectedConnection !== null) {
          saveToHistory();
          setConnections((prev: any[]) => prev.filter((_, idx) => idx !== selectedConnection));
          setSelectedConnection(null);
          return;
        }
        
        if (selectedNodes.length > 0) {
          saveToHistory();
          setNodes((prev: any[]) => prev.filter(n => !selectedNodes.includes(n.id)));
          setConnections((prev: any[]) => prev.filter(c => !selectedNodes.includes(c.from) && !selectedNodes.includes(c.to)));
          setSelectedNodes([]);
          updateState({ showSidebar: false, editingNode: null });
        }
        return;
      }
      
      if (!isTyping) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
          e.preventDefault();
          redo();
        }
      }
      
      if (e.key === 'Escape') {
        setSelectedNodes([]);
        setSelectedConnection(null);
        updateState({ contextMenu: null, showSidebar: false });
        setShowPathFinder(false);
        setHighlightedPath([]);
      }
      
      // Centralizar view (tecla C)
      if ((e.key === 'c' || e.key === 'C') && !isTyping && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const width = window.innerWidth;
        const height = window.innerHeight - 100;
        const currentNodes = viewMode === 'single' ? (nodes || []) : (allNodes || []);
        
        if (currentNodes.length > 0 && zoom) {
          const xs = currentNodes.map((n: any) => n.x);
          const ys = currentNodes.map((n: any) => n.y);
          const minX = Math.min(...xs) - 150;
          const maxX = Math.max(...xs) + 150;
          const minY = Math.min(...ys) - 150;
          const maxY = Math.max(...ys) + 150;
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          updateState({
            pan: {
              x: width / 2 - centerX * zoom,
              y: height / 2 - centerY * zoom
            }
          });
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [selectedNodes, selectedConnection, historyIndex, history]);
};
