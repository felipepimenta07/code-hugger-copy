import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GlassButton, GlassFilter } from '@/components/ui/liquid-glass';
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
      <GlassFilter />
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
            <div>
              <GlassButton className="w-full rounded-2xl px-4 py-2">
                <div className="w-full flex justify-between items-center text-white">
                  <span className="flex items-center gap-2">
                    <Plus size={18} />
                    NOVO FLOW
                  </span>
                  <ChevronDown size={18} className={`transition-transform ${isNewFlowOpen ? 'rotate-180' : ''}`} />
                </div>
              </GlassButton>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 pl-4">
            <GlassButton 
              onClick={() => handleCreateFlow('person')}
              className="w-full rounded-2xl px-4 py-2"
            >
              <div className="w-full flex items-center text-white text-sm">
                <User size={16} className="mr-2" />
                Pessoa
              </div>
            </GlassButton>
            <GlassButton 
              onClick={() => handleCreateFlow('brand')}
              className="w-full rounded-2xl px-4 py-2"
            >
              <div className="w-full flex items-center text-white text-sm">
                <Building2 size={16} className="mr-2" />
                Marca
              </div>
            </GlassButton>
            <GlassButton 
              onClick={() => handleCreateFlow('project')}
              className="w-full rounded-2xl px-4 py-2"
            >
              <div className="w-full flex items-center text-white text-sm">
                <FolderKanban size={16} className="mr-2" />
                Projeto
              </div>
            </GlassButton>
          </CollapsibleContent>
        </Collapsible>

        {/* Flows */}
        <GlassButton 
          onClick={() => setShowFlowsManager(true)}
          className="w-full rounded-2xl px-4 py-2"
        >
          <div className="w-full flex items-center text-white">
            <Layers size={18} className="mr-2" />
            FLOWS
          </div>
        </GlassButton>

        {/* Master View */}
        <GlassButton 
          onClick={handleMasterView}
          className={`w-full rounded-2xl px-4 py-2 ${
            viewMode === 'master' ? 'border-l-4 border-purple-500' : ''
          }`}
        >
          <div className="w-full flex items-center text-white">
            <Layers size={18} className="mr-2" />
            MASTER VIEW
          </div>
        </GlassButton>

        {/* Single View */}
        <GlassButton 
          onClick={handleSingleView}
          className={`w-full rounded-2xl px-4 py-2 ${
            viewMode === 'single' ? 'border-l-4 border-blue-500' : ''
          }`}
        >
          <div className="w-full flex items-center text-white">
            <Target size={18} className="mr-2" />
            SINGLE VIEW
          </div>
        </GlassButton>

        {/* WhatsApp */}
        {onOpenWhatsApp && (
          <GlassButton 
            onClick={onOpenWhatsApp}
            className="w-full rounded-2xl px-4 py-2"
          >
            <div className="w-full flex items-center text-white">
              <MessageCircle size={18} className="mr-2 text-green-400" />
              Conectar WhatsApp
            </div>
          </GlassButton>
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
          <GlassButton 
            onClick={onLogout}
            className="w-full rounded-2xl px-4 py-2"
          >
            <div className="w-full flex items-center text-red-400">
              <LogOut size={18} className="mr-2" />
              Sair
            </div>
          </GlassButton>
        )}
      </div>
    </div>
  );
}
