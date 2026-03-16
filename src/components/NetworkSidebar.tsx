import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Layers, User, Building2, FolderKanban, MessageCircle, LogOut, ChevronDown, Target, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface NetworkSidebarProps {
  viewMode: string;
  setViewMode: (mode: string) => void;
  activeProjectId: number | null;
  setShowFlowStarterModal: (show: boolean) => void;
  setShowFlowsManager: (show: boolean) => void;
  onOpenWhatsApp?: () => void;
  onLogout?: () => void;
  updateState: (updates: any) => void;
  state: any;
  svgRef: React.RefObject<SVGSVGElement>;
  calculateBounds: (nodes: any[]) => any;
  calculateOptimalZoom: (bounds: any, w: number, h: number) => number;
  calculateCenterPan: (bounds: any, zoom: number, w: number, h: number) => any;
  allNodes: any[];
  nodes: any[];
  flows: any[];
  projects: any[];
  getCurrentFlowIdFromProjectId: (id: number) => number | null;
  people: any[];
  brands: any[];
  setNodeCreationType: (type: 'person' | 'brand' | 'project') => void;
  setMasterViewState: (state: any) => void;
  getNodesForSingleView: (projectId: number) => any[];
}

// Category color map
const CATEGORY_COLORS: Record<string, string> = {
  'Pessoal': 'hsl(210, 100%, 56%)',
  'Profissional': 'hsl(158, 64%, 52%)',
  'Cliente': 'hsl(43, 96%, 56%)',
  'Fornecedor': 'hsl(27, 96%, 61%)',
  'Parceiro': 'hsl(258, 90%, 66%)',
  'Bebida': 'hsl(340, 80%, 55%)',
  'Entretenimento': 'hsl(280, 70%, 60%)',
  'Hotelaria': 'hsl(190, 80%, 50%)',
  'Varejo': 'hsl(30, 90%, 55%)',
  'Serviços': 'hsl(170, 60%, 50%)',
  'Tecnologia': 'hsl(210, 90%, 55%)',
  'Alimentação': 'hsl(15, 85%, 55%)',
  'P': 'hsl(120, 50%, 50%)',
  'M': 'hsl(45, 90%, 55%)',
  'G': 'hsl(0, 70%, 55%)',
};

function getColor(category: string): string {
  return CATEGORY_COLORS[category] || 'hsl(220, 10%, 55%)';
}

export function NetworkSidebar({
  viewMode,
  setViewMode,
  activeProjectId,
  setShowFlowStarterModal,
  setShowFlowsManager,
  onOpenWhatsApp,
  onLogout,
  updateState,
  state,
  svgRef,
  calculateBounds,
  calculateOptimalZoom,
  calculateCenterPan,
  allNodes,
  nodes,
  flows,
  projects,
  getCurrentFlowIdFromProjectId,
  people,
  brands,
  setNodeCreationType,
  setMasterViewState,
  getNodesForSingleView
}: NetworkSidebarProps) {
  const { user } = useAuth();
  const [isNewFlowOpen, setIsNewFlowOpen] = useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = useState(true);

  // Build category groups from current nodes
  const categoryGroups = useMemo(() => {
    const groups: Record<string, { count: number; color: string; type: string }> = {};
    
    const activeNodes = viewMode === 'master' ? allNodes : nodes;
    
    activeNodes.forEach(node => {
      const cat = node.category || 'Sem categoria';
      if (!groups[cat]) {
        groups[cat] = { count: 0, color: getColor(cat), type: node.type };
      }
      groups[cat].count++;
    });
    
    return Object.entries(groups).sort((a, b) => b[1].count - a[1].count);
  }, [allNodes, nodes, viewMode]);

  const handleCreateFlow = (type: 'person' | 'brand' | 'project') => {
    setNodeCreationType(type);
    setShowFlowStarterModal(true);
    setIsNewFlowOpen(false);
  };

  const handleMasterView = () => {
    setViewMode('master');
    setTimeout(() => {
      try {
        const width = window.innerWidth;
        const height = window.innerHeight - 100;
        let centerX = 0, centerY = 0;
        let found = false;
        if (activeProjectId) {
          const currentFlowId = getCurrentFlowIdFromProjectId(activeProjectId);
          const flow = flows.find(f => f.id === currentFlowId);
          if (flow) {
            const getRoot = () => {
              if (flow.center_type === 'project') return projects.find(p => p.id === flow.center_id);
              if (flow.center_type === 'person') return people.find(p => p.id === flow.center_id);
              if (flow.center_type === 'brand') return brands.find(b => b.id === flow.center_id);
              return null;
            };
            const root = getRoot();
            if (root) {
              centerX = root.master_x ?? root.x ?? 0;
              centerY = root.master_y ?? root.y ?? 0;
              found = true;
            }
          }
        }
        if (!found && allNodes.length > 0) {
          centerX = allNodes[0].x ?? 0;
          centerY = allNodes[0].y ?? 0;
        }
        const zoom = state.zoom;
        const pan = { x: width / 2 - centerX * zoom, y: height / 2 - centerY * zoom };
        updateState({ pan });
      } catch {}
    }, 50);
  };

  const handleSingleView = () => {
    if (!activeProjectId) {
      toast.error('Selecione um flow para entrar no Single View.');
      return;
    }
    if (viewMode === 'master') {
      setMasterViewState({ zoom: state.zoom, pan: state.pan, hasBeenOrganized: true });
    }
    setViewMode('single');
    setTimeout(() => {
      const width = window.innerWidth;
      const height = window.innerHeight - 100;
      const currentNodes = getNodesForSingleView(activeProjectId);
      if (currentNodes.length > 0 && svgRef.current) {
        const bounds = calculateBounds(currentNodes);
        const zoom = calculateOptimalZoom(bounds, width, height);
        const pan = calculateCenterPan(bounds, zoom, width, height);
        updateState({ zoom, pan });
      }
    }, 50);
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-64 z-50 flex flex-col bg-[hsl(220,20%,8%)] border-r border-border/50">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border/50">
        <h1 className="text-base font-semibold text-foreground tracking-wide font-mono">NETWORK MATRIX</h1>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {/* New Flow */}
        <Collapsible open={isNewFlowOpen} onOpenChange={setIsNewFlowOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors">
              <span className="flex items-center gap-2">
                <Plus size={14} />
                NOVO FLOW
              </span>
              <ChevronDown size={14} className={`transition-transform ${isNewFlowOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-0.5 pl-3">
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors" onClick={() => handleCreateFlow('person')}>
              <User size={12} /> Pessoa
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors" onClick={() => handleCreateFlow('brand')}>
              <Building2 size={12} /> Marca
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors" onClick={() => handleCreateFlow('project')}>
              <FolderKanban size={12} /> Projeto
            </button>
          </CollapsibleContent>
        </Collapsible>

        {/* Flows */}
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors" onClick={() => setShowFlowsManager(true)}>
          <Layers size={14} />
          FLOWS
        </button>

        {/* View Mode */}
        <div className="pt-2 pb-1">
          <div className="text-[10px] font-mono text-muted-foreground/60 px-3 uppercase tracking-widest mb-1">Visualização</div>
          <button
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
              viewMode === 'master' 
                ? 'bg-primary/15 text-primary border-l-2 border-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
            onClick={handleMasterView}
          >
            <Layers size={14} /> Master View
          </button>
          <button
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
              viewMode === 'single' 
                ? 'bg-primary/15 text-primary border-l-2 border-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
            onClick={handleSingleView}
          >
            <Target size={14} /> Single View
          </button>
        </div>

        {/* Groups */}
        <div className="pt-3">
          <Collapsible open={isGroupsOpen} onOpenChange={setIsGroupsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest hover:text-muted-foreground transition-colors">
                <span>Grupos</span>
                <ChevronRight size={12} className={`transition-transform ${isGroupsOpen ? 'rotate-90' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5">
              {categoryGroups.map(([name, data]) => (
                <button
                  key={name}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 rounded transition-colors group"
                >
                  <span className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: data.color }}
                    />
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 font-mono">{data.count}</span>
                </button>
              ))}
              {categoryGroups.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground/40 italic">Nenhum grupo</div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* WhatsApp */}
        {onOpenWhatsApp && (
          <div className="pt-2">
            <button 
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
              onClick={onOpenWhatsApp}
            >
              <MessageCircle size={14} className="text-green-500" />
              WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border/50 space-y-2">
        {user && (
          <div className="px-3 mb-1">
            <p className="text-xs font-medium text-foreground truncate">
              {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        {onLogout && (
          <button 
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
            onClick={onLogout}
          >
            <LogOut size={12} />
            Sair
          </button>
        )}
      </div>
    </div>
  );
}
