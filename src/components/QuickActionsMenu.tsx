import React from 'react';
import { X, Shuffle, Route, Maximize2, Download } from 'lucide-react';

interface QuickActionsMenuProps {
  setShowQuickActions: (show: boolean) => void;
  onAutoOrganize: () => void;
  onShowPathFinder: () => void;
  onFitToScreen: () => void;
  onExport: () => void;
}

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  setShowQuickActions,
  onAutoOrganize,
  onShowPathFinder,
  onFitToScreen,
  onExport
}) => {
  return (
    <div className="fixed bottom-24 right-6 bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 z-30 w-64 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-foreground font-bold text-sm">Ações Rápidas</h3>
        <button onClick={() => setShowQuickActions(false)} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
      <div className="space-y-2">
        <button onClick={() => { onAutoOrganize(); setShowQuickActions(false); }}
          className="w-full px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg flex items-center gap-2 text-sm transition-all">
          <Shuffle size={16} />
          Auto-organizar
        </button>
        <button onClick={() => { onShowPathFinder(); setShowQuickActions(false); }}
          className="w-full px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg flex items-center gap-2 text-sm transition-all">
          <Route size={16} />
          Encontrar Caminho
        </button>
        <button onClick={() => { onFitToScreen(); setShowQuickActions(false); }}
          className="w-full px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg flex items-center gap-2 text-sm transition-all">
          <Maximize2 size={16} />
          Ajustar Tela
        </button>
        <button onClick={() => { onExport(); setShowQuickActions(false); }}
          className="w-full px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg flex items-center gap-2 text-sm transition-all">
          <Download size={16} />
          Exportar
        </button>
      </div>
    </div>
  );
};
