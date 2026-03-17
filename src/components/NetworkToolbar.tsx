import React from 'react';
import { Search, Sparkles, LayoutGrid, Target, Tag, LogOut, MessageCircle, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface NetworkToolbarProps {
  viewMode: string;
  nodeCount: number;
  connectionCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  showAIInsights: boolean;
  setShowAIInsights: (show: boolean | ((prev: boolean) => boolean)) => void;
  onFitToScreen: () => void;
  onMasterView: () => void;
  onSingleView: () => void;
  onOpenFlows: () => void;
  onOpenWhatsApp?: () => void;
  onOpenLinkedIn?: () => void;
  onLogout?: () => void;
  onSearch: () => void;
}

export const NetworkToolbar: React.FC<NetworkToolbarProps> = ({
  viewMode, nodeCount, connectionCount, searchQuery, setSearchQuery,
  showLabels, setShowLabels, showAIInsights, setShowAIInsights,
  onFitToScreen, onMasterView, onSingleView,
  onOpenFlows, onOpenWhatsApp, onLogout, onSearch,
}) => {
  const btnClass = "px-2.5 py-1.5 text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded transition-colors flex items-center gap-1.5";

  return (
    <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2 bg-[hsl(220,20%,6%)]/95 backdrop-blur-md border-b border-border/20">
      {/* Left section — view modes (leave space for Flows overlay) */}
      <div className="flex items-center gap-1.5">
        <button onClick={onOpenFlows}
          className="px-3 py-1.5 text-sm font-mono uppercase tracking-wider rounded transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/40">
          <span className="flex items-center gap-1.5"><Briefcase size={14} /> Flows</span>
        </button>

        <div className="h-5 w-px bg-border/30 mx-1" />
        <button onClick={onMasterView}
          className={`px-3 py-1.5 text-sm font-mono uppercase tracking-wider rounded transition-all ${
            viewMode === 'master' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}>
          <span className="flex items-center gap-1.5"><LayoutGrid size={14} /> Master</span>
        </button>
        <button onClick={onSingleView}
          className={`px-3 py-1.5 text-sm font-mono uppercase tracking-wider rounded transition-all ${
            viewMode === 'single' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}>
          <span className="flex items-center gap-1.5"><Target size={14} /> Single</span>
        </button>

        <div className="h-5 w-px bg-border/30 mx-1" />

        <button onClick={onFitToScreen} className={btnClass} title="Ajustar à tela">Ajustar</button>

        <div className="h-5 w-px bg-border/30 mx-1" />

        <button onClick={() => setShowLabels(!showLabels)}
          className={`px-2.5 py-1.5 text-sm font-mono rounded transition-all flex items-center gap-1.5 ${
            showLabels ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}>
           <Tag size={14} /> Conexões
        </button>
        <button onClick={() => setShowAIInsights(prev => !prev)}
          className={`px-2.5 py-1.5 text-sm font-mono rounded transition-all flex items-center gap-1.5 ${
            showAIInsights ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}>
          <Sparkles size={14} /> IA
        </button>

        {onOpenWhatsApp && (
          <>
            <div className="h-5 w-px bg-border/30 mx-1" />
            <button onClick={onOpenWhatsApp} className={btnClass}>
              <MessageCircle size={14} className="text-green-500" /> WhatsApp
            </button>
          </>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="text" placeholder="Buscar nó..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) onSearch(); }}
            className="pl-8 h-8 text-base bg-secondary/30 border-border/20 rounded focus:border-primary/50" />
        </div>

        <div className="h-5 w-px bg-border/30" />

        <span className="text-sm font-mono text-muted-foreground tracking-wider">
          {nodeCount} NÓS · {connectionCount} CONEXÕES
        </span>

        {onLogout && (
          <>
            <div className="h-5 w-px bg-border/30" />
            <button onClick={onLogout} className="px-2.5 py-1.5 text-sm font-mono text-destructive hover:text-destructive hover:bg-destructive/10 rounded transition-colors flex items-center gap-1.5">
              <LogOut size={14} /> Sair
            </button>
          </>
        )}
      </div>
    </div>
  );
};
