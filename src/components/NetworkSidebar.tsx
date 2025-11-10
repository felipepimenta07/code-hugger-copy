import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  Layers, 
  User, 
  Building2, 
  FolderKanban, 
  MessageCircle, 
  LogOut,
  ChevronDown,
  Target
} from 'lucide-react';
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
              centerX = (root.master_x ?? root.x ?? 0);
              centerY = (root.master_y ?? root.y ?? 0);
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
      setMasterViewState({
        zoom: state.zoom,
        pan: state.pan,
        hasBeenOrganized: true
      });
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
    <div className="glass-effect fixed left-0 top-0 h-screen w-80 z-50 flex flex-col">
      {/* Logo/Title */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Network Matrix</h1>
        <div className="text-xs text-muted-foreground mt-0.5 font-medium">VISION ECOSYSTEM</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {/* Novo Flow - Collapsible */}
        <Collapsible open={isNewFlowOpen} onOpenChange={setIsNewFlowOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                <Plus size={18} />
                NOVO FLOW
              </span>
              <ChevronDown size={18} className={`transition-transform ${isNewFlowOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 pl-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm hover:bg-white/5 transition-all duration-300"
              onClick={() => handleCreateFlow('person')}
            >
              <User size={16} className="mr-2" />
              Pessoa
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm hover:bg-white/5 transition-all duration-300"
              onClick={() => handleCreateFlow('brand')}
            >
              <Building2 size={16} className="mr-2" />
              Marca
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm hover:bg-white/5 transition-all duration-300"
              onClick={() => handleCreateFlow('project')}
            >
              <FolderKanban size={16} className="mr-2" />
              Projeto
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Flows */}
        <Button
          variant="outline"
          className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300"
          onClick={() => setShowFlowsManager(true)}
        >
          <Layers size={18} className="mr-2" />
          FLOWS
        </Button>

        {/* Master View */}
        <Button
          variant={viewMode === 'master' ? 'default' : 'outline'}
          className={`w-full justify-start transition-all duration-300 ${
            viewMode === 'master' 
              ? 'glass-nav-link active bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border-l-4 border-purple-500 text-white hover:from-purple-600/40 hover:to-indigo-600/40' 
              : 'glass-nav-link bg-white/5 border-white/10 hover:bg-white/10'
          }`}
          onClick={handleMasterView}
        >
          <Layers size={18} className="mr-2" />
          MASTER VIEW
        </Button>

        {/* Single View */}
        <Button
          variant={viewMode === 'single' ? 'default' : 'outline'}
          className={`w-full justify-start transition-all duration-300 ${
            viewMode === 'single' 
              ? 'glass-nav-link active bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border-l-4 border-blue-500 text-white hover:from-blue-600/40 hover:to-cyan-600/40' 
              : 'glass-nav-link bg-white/5 border-white/10 hover:bg-white/10'
          }`}
          onClick={handleSingleView}
        >
          <Target size={18} className="mr-2" />
          SINGLE VIEW
        </Button>

        {/* WhatsApp */}
        {onOpenWhatsApp && (
          <Button
            variant="outline"
            className="w-full justify-start bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300"
            onClick={onOpenWhatsApp}
          >
            <MessageCircle size={18} className="mr-2 text-green-600" />
            Conectar WhatsApp
          </Button>
        )}
      </div>

      {/* Footer - User Info */}
      <div className="p-6 border-t border-white/10 space-y-2">
        {user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground truncate">
              {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        {onLogout && (
          <Button
            variant="outline"
            className="w-full justify-start bg-white/5 border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all duration-300"
            onClick={onLogout}
          >
            <LogOut size={18} className="mr-2" />
            Sair
          </Button>
        )}
      </div>
    </div>
  );
}
