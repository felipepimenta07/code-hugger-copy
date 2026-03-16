import React from 'react';

interface ContextMenuProps {
  contextMenu: { x: number; y: number; canvasX: number; canvasY: number; type: string };
  updateState: (updates: any) => void;
  onCreateNode: () => void;
  viewMode: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ contextMenu, updateState, onCreateNode, viewMode }) => {
  return (
    <div className="fixed inset-0 z-50" onClick={() => updateState({ contextMenu: null })}>
      <div 
        className="absolute bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border"
        style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px`, width: '200px' }}
        onClick={(e) => e.stopPropagation()}>
        
        {viewMode === 'single' ? (
          <div className="p-2">
            <button onClick={onCreateNode} 
              className="w-full text-left px-3 py-2.5 text-foreground hover:bg-secondary rounded-xl flex items-center gap-2 transition-all text-sm">
              ＋ Criar Nó
            </button>
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Use o menu <span className="font-bold text-foreground">☰</span> para criar um novo flow
          </div>
        )}
      </div>
    </div>
  );
};
