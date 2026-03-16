import React from 'react';
import { Search, Sparkles, Layers, Target, RotateCcw, Tag, Eye, Plus, LogOut, MessageCircle, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

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
  onAutoOrganize: () => void;
  onMasterView: () => void;
  onSingleView: () => void;
  onNewFlow: (type: 'person' | 'brand' | 'project') => void;
  onOpenFlows: () => void;
  onOpenWhatsApp?: () => void;
  onLogout?: () => void;
  onSearch: () => void;
}

export const NetworkToolbar: React.FC<NetworkToolbarProps> = ({
  viewMode,
  nodeCount,
  connectionCount,
  searchQuery,
  setSearchQuery,
  showLabels,
  setShowLabels,
  showAIInsights,
  setShowAIInsights,
  onFitToScreen,
  onAutoOrganize,
  onMasterView,
  onSingleView,
  onNewFlow,
  onOpenFlows,
  onOpenWhatsApp,
  onLogout,
  onSearch,
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-1.5 bg-[hsl(220,20%,6%)]/95 backdrop-blur-md border-b border-border/20">
      {/* Left section */}
      <div className="flex items-center gap-1">
        {/* View toggles */}
        <button
          onClick={onMasterView}
          className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-all ${
            viewMode === 'master' 
              ? 'bg-primary/20 text-primary' 
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          <span className="flex items-center gap-1">
            <Layers size={10} />
            Master
          </span>
        </button>
        <button
          onClick={onSingleView}
          className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-all ${
            viewMode === 'single' 
              ? 'bg-primary/20 text-primary' 
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          <span className="flex items-center gap-1">
            <Target size={10} />
            Single
          </span>
        </button>

        <div className="h-4 w-px bg-border/30 mx-1" />

        {/* Actions */}
        <button
          onClick={onFitToScreen}
          className="px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded transition-colors"
          title="Ajustar à tela"
        >
          Ajustar
        </button>
        <button
          onClick={onAutoOrganize}
          className="px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded transition-colors"
          title="Reorganizar"
        >
          Reset
        </button>

        <div className="h-4 w-px bg-border/30 mx-1" />

        {/* Toggles */}
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-2 py-1 text-[10px] font-mono rounded transition-all flex items-center gap-1 ${
            showLabels ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          <Tag size={9} />
          Rótulos
        </button>
        <button
          onClick={() => setShowAIInsights(prev => !prev)}
          className={`px-2 py-1 text-[10px] font-mono rounded transition-all flex items-center gap-1 ${
            showAIInsights ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          <Sparkles size={9} />
          IA
        </button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative w-44">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar nó..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                onSearch();
              }
            }}
            className="pl-7 h-6 text-[11px] bg-secondary/30 border-border/20 rounded focus:border-primary/50"
          />
        </div>

        <div className="h-4 w-px bg-border/30" />

        {/* Counter */}
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
          {nodeCount} NÓS · {connectionCount} CONEXÕES
        </span>

        <div className="h-4 w-px bg-border/30" />

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary/40 transition-colors">
              <Menu size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onNewFlow('person')}>
              <Plus size={12} className="mr-2" /> Novo Flow: Pessoa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewFlow('brand')}>
              <Plus size={12} className="mr-2" /> Novo Flow: Marca
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewFlow('project')}>
              <Plus size={12} className="mr-2" /> Novo Flow: Projeto
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenFlows}>
              <Layers size={12} className="mr-2" /> Gerenciar Flows
            </DropdownMenuItem>
            {onOpenWhatsApp && (
              <DropdownMenuItem onClick={onOpenWhatsApp}>
                <MessageCircle size={12} className="mr-2 text-green-500" /> WhatsApp
              </DropdownMenuItem>
            )}
            {onLogout && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive">
                  <LogOut size={12} className="mr-2" /> Sair
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
