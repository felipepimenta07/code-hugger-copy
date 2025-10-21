import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, ZoomIn, ZoomOut, X, Building2, User, FolderKanban, LayoutGrid, Maximize2, Info, Layers, BarChart3, Route, Sparkles, Target, Save, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { usePeople } from '@/hooks/usePeople';
import { useBrands } from '@/hooks/useBrands';
import { useConnections } from '@/hooks/useConnections';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { NodeEditor } from './NodeEditor';
import { AnalyticsPanel } from './AnalyticsPanel';
import { ContextMenu } from './ContextMenu';
import { PathFinderModal } from './PathFinderModal';
import { Legend } from './Legend';
import { QuickActionsMenu } from './QuickActionsMenu';
import { Canvas } from './Canvas';
import { NodeCreationModal } from './NodeCreationModal';
import { ProjectManagerPanel } from './ProjectManagerPanel';
import { AIInsightsPanel } from './AIInsightsPanel';
import { FlowStarterModal } from './FlowStarterModal';
import { PathIndicator } from './PathIndicator';
import { OnboardingTour } from './OnboardingTour';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const CATEGORIES = {
  person: ['Pessoal', 'Profissional', 'Cliente', 'Fornecedor', 'Parceiro'],
  brand: ['Bebida', 'Entretenimento', 'Hotelaria', 'Varejo', 'Serviços', 'Tecnologia', 'Alimentação'],
  project: ['P', 'M', 'G']
};

export const NetworkMatrix = () => {
  const { signOut } = useAuth();
  
  // Hooks Supabase
  const { projects = [], isLoading: loadingProjects, createProject, updateProject, deleteProject } = useProjects();
  const { people = [], isLoading: loadingPeople, createPerson, updatePerson, deletePerson } = usePeople();
  const { brands = [], isLoading: loadingBrands, createBrand, updateBrand, deleteBrand } = useBrands();
  const { connections: allConnections = [], isLoading: loadingConnections, createConnection, deleteConnection: removeConnection } = useConnections();
  const { workflows = [], isLoading: loadingWorkflows, createWorkflow, updateWorkflow, deleteWorkflow } = useWorkflows();
  const { showTour, completeTour, reopenTour } = useOnboarding();

  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState('master');
  const [showLegend, setShowLegend] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [customCategories, setCustomCategories] = useState({ person: [], brand: [], project: [] });
  const [showPathFinder, setShowPathFinder] = useState(false);
  const [pathStart, setPathStart] = useState(null);
  const [pathEnd, setPathEnd] = useState(null);
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showNodeCreationModal, setShowNodeCreationModal] = useState(false);
  const [nodeCreationType, setNodeCreationType] = useState<'person' | 'project' | 'brand'>('person');
  const [nodeCreationPosition, setNodeCreationPosition] = useState({ x: 0, y: 0 });
  const [editingNodeInModal, setEditingNodeInModal] = useState<any>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showFlowStarterModal, setShowFlowStarterModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { state, updateState } = useNetworkState();
  const svgRef = useRef(null);

  const allNodes = [...projects, ...people, ...brands];
  
  // Auto-save debounced for node positions
  const debouncedUpdatePosition = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (id: number, type: string, x: number, y: number) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (type === 'project') {
            updateProject.mutate({ id, x, y });
          } else if (type === 'person') {
            updatePerson.mutate({ id, x, y });
          } else if (type === 'brand') {
            updateBrand.mutate({ id, x, y });
          }
        }, 1000);
      };
    })(),
    [updateProject, updatePerson, updateBrand]
  );

  // Set first project as active when data loads
  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  // Loading state
  if (loadingProjects || loadingPeople || loadingBrands || loadingConnections || loadingWorkflows) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando seu workspace...</p>
        </div>
      </div>
    );
  }

  // Calculate anchors
  const anchors = React.useMemo(() => {
    const map = new Map<number, number | null>();
    const byId = new Map(allNodes.map(n => [n.id, n]));
    
    for (const n of allNodes) {
      if (n.type === 'project') { 
        map.set(n.id, n.id); 
        continue; 
      }
      
      const directProjects = allConnections
        .filter(c => c.from === n.id || c.to === n.id)
        .map(c => {
          const otherId = c.from === n.id ? c.to : c.from;
          const otherNode = byId.get(otherId);
          return otherNode?.type === 'project' ? otherId : null;
        })
        .filter(Boolean) as number[];
      
      if (directProjects.length > 0) {
        map.set(n.id, directProjects[0]);
        continue;
      }
      
      map.set(n.id, null);
    }
    return map;
  }, [allNodes, allConnections]);

  const allNodesWithAnchors = React.useMemo(() => 
    allNodes.map(n => ({ ...n, anchorProjectId: anchors.get(n.id) ?? null })),
    [allNodes, anchors]
  );

  const getNodesForSingleView = (projectId: number) => {
    const byId = new Map(allNodesWithAnchors.map(n => [n.id, n]));
    const projectNode = byId.get(projectId);
    if (!projectNode) return [];
    
    const included = new Set<number>([projectId]);
    
    allConnections.forEach(c => {
      if (c.from === projectId) {
        const node = byId.get(c.to);
        if (node && node.type !== 'project') included.add(c.to);
      }
      if (c.to === projectId) {
        const node = byId.get(c.from);
        if (node && node.type !== 'project') included.add(c.from);
      }
    });
    
    return [projectNode, ...Array.from(included).filter(id => id !== projectId).map(id => byId.get(id)!).filter(Boolean)];
  };

  const nodes = viewMode === 'master'
    ? allNodesWithAnchors.filter(n => n.type === 'project' || n.anchorProjectId !== null)
    : (activeProjectId ? getNodesForSingleView(activeProjectId) : []);

  const selectedNode = selectedNodes.length === 1 
    ? allNodes.find(n => n.id === selectedNodes[0]) 
    : null;

  const centerNode = viewMode === 'single' && activeProjectId
    ? projects.find(p => p.id === activeProjectId)
    : null;

  const connections = viewMode === 'master'
    ? allConnections
    : allConnections.filter(c => {
        const fromNode = nodes.find(n => n.id === c.from);
        const toNode = nodes.find(n => n.id === c.to);
        return fromNode && toNode;
      });

  const handleNodeCreation = (nodeData: any) => {
    const newNode: any = {
      id: Date.now(),
      x: nodeCreationPosition.x,
      y: nodeCreationPosition.y,
      name: nodeData.name || nodeData.nodeName || 'Novo Nó',
      category: nodeData.category || 'A',
    };

    if (nodeCreationType === 'project') {
      newNode.status = nodeData.status || 'ativo';
      newNode.deadline = nodeData.deadline || '';
      createProject.mutate(newNode);
      setActiveProjectId(newNode.id);
      setViewMode('single');
    } else if (nodeCreationType === 'person') {
      newNode.company = nodeData.company || '';
      newNode.email = nodeData.email || '';
      newNode.phone = nodeData.phone || '';
      createPerson.mutate(newNode);
    } else if (nodeCreationType === 'brand') {
      newNode.website = nodeData.website || '';
      createBrand.mutate(newNode);
    }

    setShowNodeCreationModal(false);
  };

  const handleNodeUpdate = (updatedData: any) => {
    if (editingNodeInModal) {
      if (editingNodeInModal.type === 'project') {
        updateProject.mutate({ id: editingNodeInModal.id, ...updatedData });
      } else if (editingNodeInModal.type === 'person') {
        updatePerson.mutate({ id: editingNodeInModal.id, ...updatedData });
      } else if (editingNodeInModal.type === 'brand') {
        updateBrand.mutate({ id: editingNodeInModal.id, ...updatedData });
      }
      
      setShowNodeCreationModal(false);
      setEditingNodeInModal(null);
      updateState({ showSidebar: false });
    }
  };

  const handleDeleteNode = (nodeId: number) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'project') {
      deleteProject.mutate(nodeId);
    } else if (node.type === 'person') {
      deletePerson.mutate(nodeId);
    } else if (node.type === 'brand') {
      deleteBrand.mutate(nodeId);
    }

    // Delete associated connections
    const connIds = allConnections.filter(c => c.from === nodeId || c.to === nodeId).map(c => c.id);
    connIds.forEach(id => removeConnection.mutate(id));
  };

  const handleAddWorkflow = (name: string, color: string) => {
    createWorkflow.mutate({ name, color, description: '' });
  };

  const getAllCategories = (type: 'person' | 'brand' | 'project') => {
    return [...CATEGORIES[type], ...(customCategories[type] || [])];
  };

  const addCustomCategory = (type: 'person' | 'brand' | 'project', category: string) => {
    setCustomCategories(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), category]
    }));
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: number) => {
    if (e.button !== 0) return;
    
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    updateState({
      dragging: nodeId,
      offset: {
        x: (e.clientX - rect.left) / state.zoom - node.x,
        y: (e.clientY - rect.top) / state.zoom - node.y
      }
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = (e.clientX - rect.left - state.pan.x) / state.zoom;
    const mouseY = (e.clientY - rect.top - state.pan.y) / state.zoom;

    if (state.dragging !== null) {
      const node = allNodes.find(n => n.id === state.dragging);
      if (node) {
        const newX = mouseX - state.offset.x;
        const newY = mouseY - state.offset.y;
        
        // Temporary update for smooth dragging
        if (node.type === 'project') {
          projects.find(p => p.id === node.id)!.x = newX;
          projects.find(p => p.id === node.id)!.y = newY;
        } else if (node.type === 'person') {
          people.find(p => p.id === node.id)!.x = newX;
          people.find(p => p.id === node.id)!.y = newY;
        } else if (node.type === 'brand') {
          brands.find(b => b.id === node.id)!.x = newX;
          brands.find(b => b.id === node.id)!.y = newY;
        }
      }
    } else if (state.isPanning) {
      updateState({
        pan: {
          x: e.clientX - state.panStart.x,
          y: e.clientY - state.panStart.y
        }
      });
    } else if (state.isDraggingConnection && state.connectionStart) {
      updateState({ connectionEnd: { x: mouseX, y: mouseY } });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (state.dragging !== null) {
      const node = allNodes.find(n => n.id === state.dragging);
      if (node) {
        debouncedUpdatePosition(node.id, node.type, node.x, node.y);
      }
    }

    if (state.isDraggingConnection && state.connectionStart) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = (e.clientX - rect.left - state.pan.x) / state.zoom;
      const mouseY = (e.clientY - rect.top - state.pan.y) / state.zoom;

      const targetNode = allNodes.find(n => {
        const dx = n.x - mouseX;
        const dy = n.y - mouseY;
        return Math.sqrt(dx * dx + dy * dy) < 30 && n.id !== state.connectionStart!.id;
      });

      if (targetNode) {
        createConnection.mutate({
          from: state.connectionStart.id,
          to: targetNode.id,
          type: 'strong'
        });
      }
    }

    updateState({
      dragging: null,
      isPanning: false,
      isDraggingConnection: false,
      connectionStart: null
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <TooltipProvider>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Network Matrix</h1>
              
              {viewMode === 'single' && centerNode && (
                <PathIndicator
                  selectedNode={selectedNode}
                  centerNode={centerNode}
                />
              )}
            </div>

            <div className="flex items-center gap-2" data-tour="create-buttons">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNodeCreationType('person');
                  setNodeCreationPosition({ x: 300, y: 300 });
                  setShowNodeCreationModal(true);
                }}
              >
                <User className="w-4 h-4 mr-2" />
                Pessoa
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNodeCreationType('project');
                  setNodeCreationPosition({ x: 500, y: 400 });
                  setShowNodeCreationModal(true);
                }}
              >
                <FolderKanban className="w-4 h-4 mr-2" />
                Projeto
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNodeCreationType('brand');
                  setNodeCreationPosition({ x: 700, y: 300 });
                  setShowNodeCreationModal(true);
                }}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Marca
              </Button>

              <div className="w-px h-6 bg-border" />

              <Button
                variant="outline"
                size="sm"
                data-tour="workflows"
                onClick={() => setShowFlowStarterModal(true)}
              >
                <Layers className="w-4 h-4" />
              </Button>

              <div className="flex gap-1" data-tour="views">
                <Button
                  variant={viewMode === 'master' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('master')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => activeProjectId && setViewMode('single')}
                  disabled={!activeProjectId}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-border" />

              <Button
                variant="outline"
                size="sm"
                data-tour="project-manager"
                onClick={() => setShowProjectManager(true)}
              >
                <Target className="w-4 h-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-tour="more-tools">
                    <Info className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowAnalytics(true)}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAIInsights(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Insights
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowPathFinder(true)}>
                    <Route className="w-4 h-4 mr-2" />
                    Path Finder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={reopenTour}>
                    <Info className="w-4 h-4 mr-2" />
                    Ver Tour
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          data-tour="canvas"
          className="absolute inset-0 pt-16"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Canvas
            svgRef={svgRef}
            nodes={nodes}
            connections={connections}
            state={state}
            updateState={updateState}
            selectedNodes={selectedNodes}
            setSelectedNodes={setSelectedNodes}
            selectedConnection={selectedConnection}
            setSelectedConnection={setSelectedConnection}
            highlightedPath={highlightedPath}
            workflows={workflows}
            hoveredNode={hoveredNode}
            setHoveredNode={setHoveredNode}
          />
        </div>

        {/* Modals */}
        {showFlowStarterModal && (
          <FlowStarterModal
            isOpen={showFlowStarterModal}
            onClose={() => setShowFlowStarterModal(false)}
            workflows={workflows}
            onAddWorkflow={handleAddWorkflow}
          />
        )}

        {showProjectManager && (
          <ProjectManagerPanel
            projects={projects}
            workflows={workflows}
            people={people}
            brands={brands}
            connections={allConnections}
            onClose={() => setShowProjectManager(false)}
            onFocusProject={(projectId) => {
              setActiveProjectId(projectId);
              setViewMode('single');
              setShowProjectManager(false);
            }}
            onProjectCreate={(data) => {
              createProject.mutate(data);
              toast.success('Projeto criado!');
            }}
            onProjectUpdate={(id, updates) => {
              updateProject.mutate({ id, ...updates });
            }}
            onProjectDelete={(id) => {
              deleteProject.mutate(id);
            }}
          />
        )}

        {showTour && (
          <OnboardingTour
            onComplete={completeTour}
            onSkip={completeTour}
          />
        )}
      </TooltipProvider>
    </div>
  );
};
