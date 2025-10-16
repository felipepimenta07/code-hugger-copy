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
  setHighlightedPath
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
    };
    
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [selectedNodes, selectedConnection, historyIndex, history]);
};
