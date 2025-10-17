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
      
      if (isTyping) return;

      // Delete/Backspace - delete selected nodes or connection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedConnection !== null) {
          saveToHistory();
          setConnections((prev: any[]) => prev.filter((_, idx) => idx !== selectedConnection));
          setSelectedConnection(null);
        } else if (selectedNodes.length > 0) {
          saveToHistory();
          const idsToDelete = new Set(selectedNodes);
          setNodes((prev: any[]) => prev.filter((n: any) => !idsToDelete.has(n.id)));
          setConnections((prev: any[]) => 
            prev.filter((c: any) => !idsToDelete.has(c.from) && !idsToDelete.has(c.to))
          );
          setSelectedNodes([]);
        }
      }

      // Undo - Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo - Ctrl+Y or Cmd+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }

      // Escape - clear all selections
      if (e.key === 'Escape') {
        setSelectedNodes([]);
        setSelectedConnection(null);
        setShowPathFinder(false);
        setHighlightedPath([]);
        updateState({ showSidebar: false, showAnalytics: false });
      }

      // C - center view
      if (e.key === 'c' || e.key === 'C') {
        const width = window.innerWidth;
        const height = window.innerHeight - 100;
        const nodesToCenter = viewMode === 'single' ? (nodes || []) : (allNodes || []);
        
        if (nodesToCenter.length > 0) {
          const xs = nodesToCenter.map((n: any) => n.x);
          const ys = nodesToCenter.map((n: any) => n.y);
          const bounds = {
            minX: Math.min(...xs) - 150,
            maxX: Math.max(...xs) + 150,
            minY: Math.min(...ys) - 150,
            maxY: Math.max(...ys) + 150
          };
          
          const scaleX = (width * 0.85) / (bounds.maxX - bounds.minX);
          const scaleY = (height * 0.85) / (bounds.maxY - bounds.minY);
          const newZoom = Math.min(scaleX, scaleY, 1.2);
          
          const centerX = (bounds.minX + bounds.maxX) / 2;
          const centerY = (bounds.minY + bounds.maxY) / 2;
          
          updateState({
            zoom: newZoom,
            pan: {
              x: width / 2 - centerX * newZoom,
              y: height / 2 - centerY * newZoom
            }
          });
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
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
  ]);
};
