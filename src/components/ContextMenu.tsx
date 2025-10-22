import React from 'react';

interface ContextMenuProps {
  contextMenu: { x: number; y: number; canvasX: number; canvasY: number; type: string };
  updateState: (updates: any) => void;
  onCreateNode: (type: string) => void;
  viewMode: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ contextMenu, updateState, onCreateNode, viewMode }) => {
  const isInProject = viewMode === 'single';
  
  return (
    <div className="fixed inset-0 z-50" onClick={() => updateState({ contextMenu: null })}>
      <div 
        className="absolute bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border"
        style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px`, width: isInProject ? '240px' : '280px' }}
        onClick={(e) => e.stopPropagation()}>
        
        {isInProject ? (
          <>
            <div className="text-muted-foreground text-xs font-semibold p-3 border-b border-border">
              Criar dentro deste flow:
            </div>
            <div className="p-2">
              <button onClick={() => onCreateNode('project')} 
                className="w-full text-left px-3 py-2.5 text-foreground hover:bg-secondary rounded-xl flex items-center gap-2 mb-1 transition-all">
                🎯 Projeto Filho
              </button>
              <button onClick={() => onCreateNode('person')} 
                className="w-full text-left px-3 py-2.5 text-foreground hover:bg-secondary rounded-xl flex items-center gap-2 mb-1 transition-all">
                👤 Pessoa
              </button>
              <button onClick={() => onCreateNode('brand')} 
                className="w-full text-left px-3 py-2.5 text-foreground hover:bg-secondary rounded-xl flex items-center gap-2 transition-all">
                🏢 Marca/Local
              </button>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Use o botão <span className="font-bold text-foreground">+</span> no menu para criar um novo flow
          </div>
        )}
      </div>
    </div>
  );
};
