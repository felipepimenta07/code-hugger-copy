import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ZoomIn, ZoomOut, X, Building2, User, FolderKanban, Undo2, Redo2, LayoutGrid, Maximize2, Info, Layers, BarChart3, Route, Sparkles, Target, Save, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
import { LinkedInImportModal } from './LinkedInImportModal';
import { Canvas } from './Canvas';
import { NodeCreationModal } from './NodeCreationModal';
import { ProjectManagerPanel } from './ProjectManagerPanel';
import { AIInsightsPanel } from './AIInsightsPanel';
import { FlowStarterModal } from './FlowStarterModal';
import { PathIndicator } from './PathIndicator';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useNetworkHistory } from '@/hooks/useNetworkHistory';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ParsedLinkedInData, LinkedInImportOptions } from '@/types/linkedin';
import { useProjects } from '@/hooks/useProjects';
import { usePeople } from '@/hooks/usePeople';
import { useBrands } from '@/hooks/useBrands';
import { useConnections } from '@/hooks/useConnections';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingTour } from './OnboardingTour';
import { useDebouncedCallback } from 'use-debounce';

const CATEGORIES = {
  person: ['Pessoal', 'Profissional', 'Cliente', 'Fornecedor', 'Parceiro'],
  brand: ['Bebida', 'Entretenimento', 'Hotelaria', 'Varejo', 'Serviços', 'Tecnologia', 'Alimentação'],
  project: ['P', 'M', 'G']
};

export const NetworkMatrix = () => {
  const { signOut } = useAuth();
  
  // Hooks Supabase para dados
  const { projects, isLoading: loadingProjects, createProject, updateProject, deleteProject } = useProjects();
  const { people, isLoading: loadingPeople, createPerson, updatePerson, deletePerson } = usePeople();
  const { brands, isLoading: loadingBrands, createBrand, updateBrand, deleteBrand } = useBrands();
  const { connections: allConnections, isLoading: loadingConnections, createConnection, deleteConnection: deleteConnectionMutation } = useConnections();
  const { workflows, isLoading: loadingWorkflows, createWorkflow, updateWorkflow, deleteWorkflow } = useWorkflows();
  const { showTour, loading: loadingOnboarding, completeTour, reopenTour } = useOnboarding();

  const [activeProjectId, setActiveProjectId] = useState<number | null>(projects[0]?.id ?? null);
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
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);

  const { state, updateState } = useNetworkState();
  const svgRef = useRef(null);

  // Combinar todos os nós
  const allNodes = [...projects, ...people, ...brands];
  
  // Loading state (DEPOIS de todos os hooks)
  const isLoadingData = loadingProjects || loadingPeople || loadingBrands || loadingConnections || loadingWorkflows || loadingOnboarding;

  // Debounced auto-save para posições dos nós
  const debouncedUpdatePosition = useDebouncedCallback((id: number, type: string, x: number, y: number) => {
    if (type === 'project') {
      updateProject.mutate({ id, x, y });
    } else if (type === 'person') {
      updatePerson.mutate({ id, x, y });
    } else if (type === 'brand') {
      updateBrand.mutate({ id, x, y });
    }
  }, 1000);
  
  // Removido: localStorage design loading (agora vem do Supabase)
  
  // Função para salvar design atual
  const saveCurrentDesign = () => {
    toast.success('Salvando automaticamente...', {
      description: 'Suas alterações são salvas em tempo real.'
    });
  };

  // Função para importar dados do LinkedIn
  const handleLinkedInImport = (data: ParsedLinkedInData, options: LinkedInImportOptions) => {
    saveToHistory();
    
    const newPeople: any[] = [];
    const newBrands: any[] = [];
    const newConnections: any[] = [];
    
    // Create brands from unique companies if option is enabled
    const brandMap = new Map<string, number>();
    if (options.createBrands) {
      data.uniqueCompanies.forEach((company, index) => {
        const brandId = Date.now() + index + 10000;
        const brand = {
          id: brandId,
          type: 'brand',
          name: company,
          x: Math.random() * 400 + 100,
          y: Math.random() * 400 + 100,
          category: 'A',
          workflowId: workflows[0]?.id
        };
        newBrands.push(brand);
        brandMap.set(company, brandId);
      });
    }
    
    // Create person nodes from contacts
    data.contacts.forEach((contact, index) => {
      const personId = Date.now() + index + 20000;
      const fullName = `${contact.firstName} ${contact.lastName}`.trim();
      
      const person = {
        id: personId,
        type: 'person',
        name: fullName || `Contato LinkedIn ${index + 1}`,
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
        category: options.defaultCategory,
        workflowId: workflows[0]?.id,
        company: contact.company,
        role: contact.position,
        email: contact.email,
        notes: contact.profileUrl ? `LinkedIn: ${contact.profileUrl}` : undefined,
        homeProjectId: options.connectToProject ? options.projectId : undefined
      };
      newPeople.push(person);
      
      // Create connection to brand if company exists and brands were created
      if (contact.company && options.createBrands && brandMap.has(contact.company)) {
        newConnections.push({
          from: personId,
          to: brandMap.get(contact.company)!,
          type: 'works-at'
        });
      }
      
      // Create connection to project if option is enabled
      if (options.connectToProject && options.projectId) {
        newConnections.push({
          from: personId,
          to: options.projectId,
          type: 'related'
        });
      }
    });
    
    // Create nodes and connections in Backend (sanitized payloads)
    newPeople.forEach(p =>
      createPerson.mutate({
        name: p.name,
        company: p.company || null,
        email: p.email || null,
        phone: null,
        category: p.category || null,
        x: p.x,
        y: p.y,
      })
    );
    newBrands.forEach(b =>
      createBrand.mutate({
        name: b.name,
        website: b.website || null,
        category: b.category || null,
        x: b.x,
        y: b.y,
      })
    );
    newConnections.forEach(c => createConnection.mutate(c));
    
    // Show success message
    toast.success(
      `Importação concluída! ${newPeople.length} pessoas` +
      (newBrands.length > 0 ? `, ${newBrands.length} marcas` : '') +
      (newConnections.length > 0 ? `, ${newConnections.length} conexões` : '')
    );
    
    // Auto-organize and center view on new nodes
    setTimeout(() => {
      const allNewNodes = [...newPeople, ...newBrands];
      if (allNewNodes.length > 0) {
        const avgX = allNewNodes.reduce((sum, n) => sum + n.x, 0) / allNewNodes.length;
        const avgY = allNewNodes.reduce((sum, n) => sum + n.y, 0) / allNewNodes.length;
        updateState({
          pan: { x: window.innerWidth / 2 - avgX * state.zoom, y: window.innerHeight / 2 - avgY * state.zoom }
        });
      }
    }, 100);
  };

  // Calcular anchorProjectId por nó com busca de 2º grau (useMemo)
  const anchors = React.useMemo(() => {
    const map = new Map<number, number | null>();
    const byId = new Map(allNodes.map(n => [n.id, n]));
    
    for (const n of allNodes) {
      // Projetos se ancoram neles mesmos
      if (n.type === 'project') { 
        map.set(n.id, n.id); 
        continue; 
      }
      
      // 1º grau: buscar projeto conectado diretamente
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
      
      // 2º grau: buscar via vizinhos (pessoas/marcas conectadas a projetos)
      const neighbors = allConnections
        .filter(c => c.from === n.id || c.to === n.id)
        .map(c => c.from === n.id ? c.to : c.from);
      
      let foundProject: number | null = null;
      for (const neighborId of neighbors) {
        const neighborProjects = allConnections
          .filter(c => c.from === neighborId || c.to === neighborId)
          .map(c => {
            const otherId = c.from === neighborId ? c.to : c.from;
            const otherNode = byId.get(otherId);
            return otherNode?.type === 'project' ? otherId : null;
          })
          .filter(Boolean) as number[];
        
        if (neighborProjects.length > 0) {
          foundProject = neighborProjects[0];
          break;
        }
      }
      
      map.set(n.id, foundProject);
    }
    return map;
  }, [allNodes, allConnections]);

  // Adicionar anchorProjectId aos nós
  const allNodesWithAnchors = React.useMemo(() => 
    allNodes.map(n => ({ ...n, anchorProjectId: anchors.get(n.id) ?? null })),
    [allNodes, anchors]
  );

  // Helper: determine if a non-project node belongs to a project (strict isolation)
  const belongsToProject = (n: any, pid: number) =>
    n?.type !== 'project' && (
      (n as any).homeProjectId === pid ||
      (n as any).anchorProjectId === pid ||
      allConnections.some(c => (c.from === n.id && c.to === pid) || (c.to === n.id && c.from === pid))
    );

  // Helper to get nodes for Single View (isolated per project, no cross-project traversal)
  const getNodesForSingleView = (projectId: number) => {
    const byId = new Map(allNodesWithAnchors.map(n => [n.id, n]));
    const projectNode = byId.get(projectId);
    if (!projectNode) return [];
    
    // Start with the active project
    const included = new Set<number>([projectId]);
    
    // 1. Add people/brands directly connected to the project
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
    
    // 2. Add connections between people/brands already included (within project only)
    let changed = true;
    let iterations = 0;
    const maxIterations = 3; // limit depth for performance
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      allConnections.forEach(c => {
        const fromNode = byId.get(c.from);
        const toNode = byId.get(c.to);
        
        // Connection between two non-projects where at least one is already included
        if (fromNode?.type !== 'project' && toNode?.type !== 'project') {
          if (included.has(c.from) && !included.has(c.to) && toNode && belongsToProject(toNode, projectId)) {
            included.add(c.to);
            changed = true;
          }
          if (included.has(c.to) && !included.has(c.from) && fromNode && belongsToProject(fromNode, projectId)) {
            included.add(c.from);
            changed = true;
          }
        }
      });
    }
    
    // 3. Include "orphan" nodes with homeProjectId (nodes created in project without connection)
    allNodesWithAnchors.forEach(n => {
      if ((n as any).homeProjectId === projectId && n.type !== 'project') {
        included.add(n.id);
      }
    });
    
    // Return nodes: project first, then others
    return [projectNode, ...Array.from(included).filter(id => id !== projectId).map(id => byId.get(id)!).filter(Boolean)];
  };

  // Filtrar nós e conexões por projeto/modo
  const nodes = viewMode === 'master'
    ? allNodesWithAnchors
        .filter(n => n.type === 'project' || n.anchorProjectId !== null) // Ocultar nós órfãos
        .map(n => {
          const project = projects.find(p => p.id === n.anchorProjectId);
          return { ...n, projectId: project?.id, projectColor: project ? '#8b5cf6' : '#6366f1' };
        })
    : (activeProjectId ? getNodesForSingleView(activeProjectId) : []);

  // Para o PathIndicator
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
        
        // Both nodes must be in the filtered list
        if (!fromNode || !toNode) return false;
        
        // If connection involves another project (not the active one), exclude it
        if (fromNode.type === 'project' && fromNode.id !== activeProjectId) return false;
        if (toNode.type === 'project' && toNode.id !== activeProjectId) return false;
        
        return true;
      });

  // Real history implementation
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = () => {
    const snapshot = {
      projects: [...projects],
      people: [...people],
      brands: [...brands],
      allConnections: [...allConnections],
      viewMode,
      activeProjectId
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    // Undo desabilitado temporariamente (requer sincronização com Supabase)
    toast.info('Undo/Redo em desenvolvimento');
  };

  const redo = () => {
    toast.info('Undo/Redo em desenvolvimento');
  };

  // Função para atualizar posição de nós (corrige dragging) and clear highlight
  const updateNodePosition = (nodeId: number, deltaX: number, deltaY: number) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const newX = node.x + deltaX;
    const newY = node.y + deltaY;
    
    // Atualizar localmente (otimista)
    if (node.type === 'project') {
      updateProject.mutate({ id: nodeId, x: newX, y: newY });
    } else if (node.type === 'person') {
      updatePerson.mutate({ id: nodeId, x: newX, y: newY });
    } else if (node.type === 'brand') {
      updateBrand.mutate({ id: nodeId, x: newX, y: newY });
    }
    
    // Chamar auto-save debounced
    debouncedUpdatePosition(nodeId, node.type, newX, newY);
  };

  const setNodes = (updater) => {
    const newNodes = typeof updater === 'function' ? updater(allNodesWithAnchors) : updater;
    
    // Deletar nós que foram removidos
    const newNodeIds = new Set(newNodes.map((n: any) => n.id));
    
    projects.forEach(p => {
      if (!newNodeIds.has(p.id)) deleteProject.mutate(p.id);
    });
    people.forEach(p => {
      if (!newNodeIds.has(p.id)) deletePerson.mutate(p.id);
    });
    brands.forEach(b => {
      if (!newNodeIds.has(b.id)) deleteBrand.mutate(b.id);
    });
  };

  const setConnections = (updater) => {
    const newConnections = typeof updater === 'function' ? updater(allConnections) : updater;
    
    // Deletar conexões removidas
    const newConnIds = new Set(newConnections.map((c: any) => c.id));
    allConnections.forEach(c => {
      if (c.id && !newConnIds.has(c.id)) {
        deleteConnectionMutation.mutate(c.id);
      }
    });
  };

  // Helper: Contar conexões
  const getConnectionCount = (node: any) => {
    return allConnections.filter(c => c.from === node.id || c.to === node.id).length;
  };

  // Helper: Distribuir nós em círculo
  const distributeInCircle = (nodesToLayout: any[], centerX: number, centerY: number, radius: number) => {
    if (nodesToLayout.length === 0) return [];
    const angleStep = (2 * Math.PI) / nodesToLayout.length;
    return nodesToLayout.map((node, index) => {
      // Adicionar variação orgânica (jitter)
      const radiusVariation = (Math.random() - 0.5) * 30;
      const angleVariation = (Math.random() - 0.5) * 0.2;
      const finalRadius = radius + radiusVariation;
      const finalAngle = index * angleStep - Math.PI / 2 + angleVariation;
      
      return {
        ...node,
        x: centerX + finalRadius * Math.cos(finalAngle),
        y: centerY + finalRadius * Math.sin(finalAngle)
      };
    });
  };

  // Layout radial hierárquico (3 níveis: inner, middle, outer)
  const applyRadialLayout = (nodesToLayout: any[], centerX: number, centerY: number) => {
    if (nodesToLayout.length === 0) return [];
    
    // FIXED: Use the first node as center (active project), don't reorder
    const centerNode = nodesToLayout[0];
    const otherNodes = nodesToLayout.slice(1);
    
    // Dividir em 3 anéis
    const innerRing = otherNodes.slice(0, Math.min(6, otherNodes.length));
    const middleRing = otherNodes.slice(6, Math.min(18, otherNodes.length));
    const outerRing = otherNodes.slice(18);
    
    const result = [
      { ...centerNode, x: centerX, y: centerY, level: 'center' },
      ...distributeInCircle(innerRing, centerX, centerY, 200).map(n => ({ ...n, level: 'inner' })),
      ...distributeInCircle(middleRing, centerX, centerY, 350).map(n => ({ ...n, level: 'middle' })),
      ...distributeInCircle(outerRing, centerX, centerY, 520).map(n => ({ ...n, level: 'outer' }))
    ];
    
    return result;
  };

  const updateAllNodePositions = (layoutedNodes: any[]) => {
    layoutedNodes.forEach(node => {
      if (node.type === 'project') {
        updateProject.mutate({ id: node.id, x: node.x, y: node.y });
      } else if (node.type === 'person') {
        updatePerson.mutate({ id: node.id, x: node.x, y: node.y });
      } else if (node.type === 'brand') {
        updateBrand.mutate({ id: node.id, x: node.x, y: node.y });
      }
    });
  };

  const autoOrganizeSingle = (projectId: number | null) => {
    if (!projectId) return;
    const nodesToLayout = getNodesForSingleView(projectId);
    if (nodesToLayout.length === 0) return;

    const layouted = applyRadialLayout(nodesToLayout, 500, 400);
    updateAllNodePositions(layouted);
  };

  const autoOrganize = () => {
    if (viewMode === 'single') {
      autoOrganizeSingle(activeProjectId);
    } else {
      // Master View: grid de clusters por projeto com centralização automática
      const cols = Math.max(2, Math.ceil(Math.sqrt(projects.length)));
      
      projects.forEach((project, pIndex) => {
        const clusterNodes = allNodesWithAnchors.filter(n => 
          n.anchorProjectId === project.id && n.id !== project.id
        );
        const col = pIndex % cols;
        const row = Math.floor(pIndex / cols);
        const clusterX = col * 1400 + 700;
        const clusterY = row * 1200 + 600;
        const layouted = applyRadialLayout([project, ...clusterNodes], clusterX, clusterY);
        updateAllNodePositions(layouted);
      });
      
      // Centralizar view após organizar
      setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight - 100;
        const bounds = calculateBounds(allNodes);
        const computed = calculateOptimalZoom(bounds, width, height);
        const zoom = Math.min(computed, 0.5);
        const pan = calculateCenterPan(bounds, zoom, width, height);
        updateState({ zoom, pan });
      }, 100);
    }
  };

  // Funções auxiliares para zoom/pan automático
  const calculateBounds = (nodesList: any[]) => {
    if (nodesList.length === 0) return { minX: 0, maxX: 1000, minY: 0, maxY: 800 };
    const xs = nodesList.map(n => n.x);
    const ys = nodesList.map(n => n.y);
    return {
      minX: Math.min(...xs) - 150,
      maxX: Math.max(...xs) + 150,
      minY: Math.min(...ys) - 150,
      maxY: Math.max(...ys) + 150
    };
  };

  const calculateOptimalZoom = (bounds: any, width: number, height: number) => {
    const scaleX = (width * 0.85) / (bounds.maxX - bounds.minX);
    const scaleY = (height * 0.85) / (bounds.maxY - bounds.minY);
    return Math.min(scaleX, scaleY, 1.2);
  };

  const calculateCenterPan = (bounds: any, zoom: number, width: number, height: number) => {
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    return {
      x: width / 2 - centerX * zoom,
      y: height / 2 - centerY * zoom
    };
  };

  // Removed problematic useEffect that caused race conditions with view switching

  // Auto-organizar ao carregar a página
  useEffect(() => {
    const timer = setTimeout(() => {
      if (allNodes.length > 0) {
        autoOrganize();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Auto-centralizar quando voltar para Master View
  useEffect(() => {
    if (viewMode === 'master' && projects.length > 0 && allNodes.length > 0) {
      const timer = setTimeout(() => {
        // First organize master view
        const cols = Math.max(2, Math.ceil(Math.sqrt(projects.length)));
        
        projects.forEach((project, pIndex) => {
          const clusterNodes = allNodesWithAnchors.filter(n => 
            n.anchorProjectId === project.id && n.id !== project.id
          );
          const col = pIndex % cols;
          const row = Math.floor(pIndex / cols);
          const clusterX = col * 1400 + 700;
          const clusterY = row * 1200 + 600;
          const layouted = applyRadialLayout([project, ...clusterNodes], clusterX, clusterY);
          updateAllNodePositions(layouted);
        });
        
        // Then center - single flow after organization completes
        setTimeout(() => {
          const projectNodes = allNodesWithAnchors.filter(n => n.type === 'project');
          if (projectNodes.length > 0 && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const bounds = calculateBounds(allNodes);
            const computed = calculateOptimalZoom(bounds, rect.width, rect.height);
            const zoom = Math.min(computed, 0.5);
            const centerPan = calculateCenterPan(bounds, zoom, rect.width, rect.height);
            updateState({ zoom, pan: centerPan });
            toast.success('Nós organizados e centralizados!');
          }
        }, 150);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  // Auto-centralizar quando entrar em Single View
  useEffect(() => {
    if (viewMode === 'single' && activeProjectId && allNodes.length > 0) {
      const timer = setTimeout(() => {
        // First organize single view
        autoOrganizeSingle(activeProjectId);
        
        // Then center after organization completes
        setTimeout(() => {
          const nodesToCenter = getNodesForSingleView(activeProjectId);
          if (nodesToCenter.length > 0 && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const bounds = calculateBounds(nodesToCenter);
            const centerPan = calculateCenterPan(bounds, 0.9, rect.width, rect.height);
            updateState({ zoom: 0.9, pan: centerPan });
          }
        }, 150);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode, activeProjectId]);

  useKeyboardShortcuts({
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
    setHighlightedPath,
    nodes,
    allNodes,
    viewMode,
    zoom: state.zoom,
    pan: state.pan
  });

  const addNode = () => {
    if (state.newNodeName.trim() && viewMode === 'single') {
      saveToHistory();
      const newNode: any = {
        id: Date.now(),
        name: state.newNodeName,
        type: state.newNodeType,
        x: (window.innerWidth / 2 - state.pan.x) / state.zoom,
        y: (300 - state.pan.y) / state.zoom,
        isNewHighlight: true
      };

      // Set homeProjectId for person/brand nodes created in single view
      if (activeProjectId && (state.newNodeType === 'person' || state.newNodeType === 'brand')) {
        newNode.homeProjectId = activeProjectId;
      }

      // Set default fields for projects
      if (state.newNodeType === 'project') {
        newNode.workflows = workflows.length > 0 ? [workflows[0].id] : [];
        newNode.status = 'ativo';
        newNode.deadline = '';
      }

      setNodes(prevNodes => [...prevNodes, newNode]);
      updateState({ newNodeName: '', editingNode: newNode, showSidebar: true, showAnalytics: false });
      toast.success(`${newNode.name} criado!`);
    }
  };

  const deleteConnection = (connectionIndex: number) => {
    saveToHistory();
    
    // Before deleting, check if we need to set homeProjectId to keep nodes visible in Single View
    if (viewMode === 'single' && activeProjectId) {
      const conn = allConnections[connectionIndex];
      if (conn) {
        const fromNode = allNodesWithAnchors.find(n => n.id === conn.from);
        const toNode = allNodesWithAnchors.find(n => n.id === conn.to);
        
        // If connection involves the active project, set homeProjectId on the other node BEFORE deleting connection
        [fromNode, toNode].forEach(node => {
          if (node && (node.type === 'person' || node.type === 'brand' || node.type === 'project')) {
            const otherNodeId = node.id === conn.from ? conn.to : conn.from;
            // Check if this node is connected to the active project and will become orphaned
            if (otherNodeId === activeProjectId) {
              // Check if node will have any other connections to the project after this deletion
              const otherConnectionsToProject = allConnections.filter(
                (c, idx) => idx !== connectionIndex && 
                ((c.from === node.id && c.to === activeProjectId) || (c.to === node.id && c.from === activeProjectId))
              );
              
              // Only set homeProjectId if this is the last connection to the project
              if (otherConnectionsToProject.length === 0 && !(node as any).homeProjectId) {
                const updateData = { id: node.id, homeProjectId: activeProjectId };
                if (node.type === 'person') {
                  updatePerson.mutate(updateData);
                } else if (node.type === 'brand') {
                  updateBrand.mutate(updateData);
                } else if (node.type === 'project') {
                  updateProject.mutate(updateData);
                }
              }
            }
          }
        });
      }
    }
    
    // Delete connection after homeProjectId is set
    setConnections(prev => prev.filter((_, idx) => idx !== connectionIndex));
    setSelectedConnection(null);
  };

  const deleteNode = (nodeId) => {
    saveToHistory();
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    updateState({ selectedNode: null, showSidebar: false, editingNode: null });
    setSelectedNodes(prev => prev.filter(id => id !== nodeId));
  };

  const exportData = () => {
    try {
      const dataStr = JSON.stringify(workflows, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `network-matrix-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    toast.info('Import em desenvolvimento');
  };

  const getAllCategories = (type) => [...CATEGORIES[type], ...(customCategories[type] || [])];

  const addCustomCategory = (type, category) => {
    if (category && !getAllCategories(type).includes(category)) {
      setCustomCategories(prev => ({ ...prev, [type]: [...(prev[type] || []), category] }));
      return true;
    }
    return false;
  };

  const handleNodeCreation = (nodeData: any) => {
    saveToHistory();
    const newNode: any = {
      type: nodeCreationType,
      x: nodeCreationPosition.x,
      y: nodeCreationPosition.y,
      ...nodeData
    };

    // Set homeProjectId for nodes created in single view
    if (viewMode === 'single' && activeProjectId) {
      if (nodeCreationType === 'person' || nodeCreationType === 'brand' || nodeCreationType === 'project') {
        newNode.homeProjectId = activeProjectId;
      }
    }

    // Criar no Backend com payloads válidos por tabela
    if (nodeCreationType === 'project') {
      const projectData = {
        name: newNode.name,
        category: nodeData.category || 'M',
        status: nodeData.projectStatus || nodeData.status || 'ativo',
        deadline: (nodeData.startDate || nodeData.deadline) || null,
        x: newNode.x,
        y: newNode.y,
      };

      createProject.mutate(projectData, {
        onSuccess: (createdProject: any) => {
          setShowNodeCreationModal(false);
          setViewMode('single');
          setActiveProjectId(createdProject.id);
          setEditingProjectId(createdProject.id);
          setEditingProjectName(createdProject.name);
          setTimeout(() => autoOrganizeSingle(createdProject.id), 100);
        },
      });
    } else if (nodeCreationType === 'person') {
      const personData = {
        name: newNode.name,
        company: newNode.company || nodeData.company || null,
        email: newNode.email || null,
        phone: newNode.phone || null,
        category: nodeData.category || newNode.category || null,
        x: newNode.x,
        y: newNode.y,
      };
      createPerson.mutate(personData, {
        onSuccess: () => setShowNodeCreationModal(false),
      });
    } else if (nodeCreationType === 'brand') {
      const brandData = {
        name: newNode.name,
        website: newNode.website || null,
        category: nodeData.category || newNode.category || null,
        x: newNode.x,
        y: newNode.y,
      };
      createBrand.mutate(brandData, {
        onSuccess: () => setShowNodeCreationModal(false),
      });
    }
  };

  const handleAddWorkflow = (name: string, color: string) => {
    const newWorkflow = {
      name,
      color,
      description: ''
    };
    createWorkflow.mutate(newWorkflow);
  };

  const handleNodeUpdate = (updatedData: any) => {
    if (editingNodeInModal) {
      saveToHistory();
      
      // Update no Supabase
      const updateData = { id: editingNodeInModal.id, ...updatedData };
      if (editingNodeInModal.type === 'project') {
        updateProject.mutate(updateData);
      } else if (editingNodeInModal.type === 'person') {
        updatePerson.mutate(updateData);
      } else if (editingNodeInModal.type === 'brand') {
        updateBrand.mutate(updateData);
      }
      
      setShowNodeCreationModal(false);
      setEditingNodeInModal(null);
      updateState({ showSidebar: false });
    }
  };

  const handleCreateNewProject = () => {
    const newProject = {
      name: `Projeto ${projects.length + 1}`,
      category: 'P' as const,
      status: 'Ativo' as const,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      x: 500,
      y: 400
    };
    
    createProject.mutate(newProject, {
      onSuccess: (createdProject) => {
        setViewMode('single');
        setActiveProjectId(createdProject.id);
        setEditingProjectId(createdProject.id);
        setEditingProjectName(createdProject.name);
        setTimeout(() => autoOrganizeSingle(createdProject.id), 100);
      }
    });
  };

  const handleProjectNameChange = (projectId: number, newName: string) => {
    if (newName.trim()) {
      updateProject.mutate({ id: projectId, name: newName.trim() });
    }
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const handleDeleteProject = (projectId: number, projectName: string) => {
    if (projects.length <= 1) {
      alert('Você precisa ter pelo menos um projeto!');
      return;
    }
    
    if (confirm(`Deletar projeto "${projectName}"?`)) {
      deleteProject.mutate(projectId);
      if (activeProjectId === projectId) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        if (remainingProjects.length > 0) {
          setActiveProjectId(remainingProjects[0].id);
        }
      }
    }
  };

  // Loading screen
  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Carregando seu workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen bg-background flex flex-col overflow-hidden">
      {state.contextMenu && (
        <ContextMenu 
          contextMenu={state.contextMenu}
          updateState={updateState}
          viewMode={viewMode}
          onCreateNode={(type) => {
            if (state.contextMenu) {
              setNodeCreationType(type as 'person' | 'project' | 'brand');
              setNodeCreationPosition({
                x: state.contextMenu.canvasX,
                y: state.contextMenu.canvasY
              });
              setShowNodeCreationModal(true);
              updateState({ contextMenu: null });
            }
          }}
        />
      )}

      {showPathFinder && (
        <PathFinderModal
          nodes={nodes}
          connections={connections}
          pathStart={pathStart}
          pathEnd={pathEnd}
          setPathStart={setPathStart}
          setPathEnd={setPathEnd}
          setShowPathFinder={setShowPathFinder}
          setHighlightedPath={setHighlightedPath}
        />
      )}

      {showQuickActions && (
        <QuickActionsMenu
          setShowQuickActions={setShowQuickActions}
          onAutoOrganize={autoOrganize}
          onShowPathFinder={() => setShowPathFinder(true)}
          onFitToScreen={() => {
            const width = window.innerWidth;
            const height = window.innerHeight - 100;
            const bounds = calculateBounds(viewMode === 'single' ? nodes : allNodes);
            const zoom = calculateOptimalZoom(bounds, width, height);
            const pan = calculateCenterPan(bounds, zoom, width, height);
            updateState({ zoom, pan });
          }}
          onExport={exportData}
        />
      )}

      {showFlowStarterModal && (
        <FlowStarterModal
          isOpen={showFlowStarterModal}
          onClose={() => setShowFlowStarterModal(false)}
          onSelectType={(type) => {
            setShowFlowStarterModal(false);
            const width = window.innerWidth;
            const height = window.innerHeight - 100;
            setNodeCreationType(type);
            setNodeCreationPosition({
              x: (width / 2 - state.pan.x) / state.zoom,
              y: (height / 2 - state.pan.y) / state.zoom
            });
            setShowNodeCreationModal(true);
          }}
        />
      )}

      {showNodeCreationModal && (
        <NodeCreationModal
          type={editingNodeInModal?.type || nodeCreationType}
          getAllCategories={getAllCategories}
          onClose={() => {
            setShowNodeCreationModal(false);
            setEditingNodeInModal(null);
          }}
          onCreate={editingNodeInModal ? handleNodeUpdate : handleNodeCreation}
          editingNode={editingNodeInModal}
          workflows={workflows}
          onAddWorkflow={handleAddWorkflow}
        />
      )}

      {/* Header */}
      <div className="bg-card/80 backdrop-blur-xl border-b border-border px-6 py-4 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Network Matrix</h1>
              <div className="text-xs text-muted-foreground mt-0.5 font-medium">VISION ECOSYSTEM</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode('master')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'master' 
                          ? 'bg-purple-600 border border-purple-500 text-white shadow-lg' 
                          : 'bg-transparent border border-purple-500/30 text-purple-400 hover:bg-purple-600/20'
                      }`}
                    >
                      <Layers size={16} className="inline mr-2" />
                      Master View
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ver todos os projetos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setViewMode('single');
                        
                        // Centralizar quando mudar para single view
                        setTimeout(() => {
                          if (activeProjectId) {
                            autoOrganizeSingle(activeProjectId);
                          }
                        }, 50);
                        
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
                        }, 300);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'single' 
                          ? 'bg-blue-600 border border-blue-500 text-white shadow-lg' 
                          : 'bg-transparent border border-blue-500/30 text-blue-400 hover:bg-blue-600/20'
                      }`}
                    >
                      <Target size={16} className="inline mr-2" />
                      Single View
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ver projeto específico</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div data-tour="create-buttons">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => setShowFlowStarterModal(true)}
                      variant="outline" 
                      size="icon" 
                      className="rounded-lg hover:bg-primary/10"
                    >
                      <Plus size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Criar novo flow</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => setShowLinkedInImport(true)}
                    variant="outline" 
                    size="icon" 
                    className="rounded-lg bg-[#0A66C2]/10 border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/20"
                  >
                    <Building2 size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Importar LinkedIn</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="w-px h-8 bg-border mx-1"></div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={undo} disabled={historyIndex <= 0}
                    className={`p-2 rounded-lg transition-all ${historyIndex <= 0 ? 'text-muted' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                    <Undo2 size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Desfazer (Ctrl+Z)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={redo} disabled={historyIndex >= history.length - 1}
                    className={`p-2 rounded-lg transition-all ${historyIndex >= history.length - 1 ? 'text-muted' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                    <Redo2 size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refazer (Ctrl+Y)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="w-px h-8 bg-border mx-1"></div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => {
                    const width = window.innerWidth;
                    const height = window.innerHeight - 100;
                    const newZoom = Math.max(state.zoom / 1.2, 0.3);
                    const centerX = (width / 2 - state.pan.x) / state.zoom;
                    const centerY = (height / 2 - state.pan.y) / state.zoom;
                    updateState({ 
                      zoom: newZoom,
                      pan: {
                        x: width / 2 - centerX * newZoom,
                        y: height / 2 - centerY * newZoom
                      }
                    });
                  }} 
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
                    <ZoomOut size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reduzir zoom</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="text-sm text-muted-foreground font-mono px-2 min-w-[50px] text-center">
              {Math.round(state.zoom * 100)}%
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => {
                    const width = window.innerWidth;
                    const height = window.innerHeight - 100;
                    const newZoom = Math.min(state.zoom * 1.2, 3);
                    const centerX = (width / 2 - state.pan.x) / state.zoom;
                    const centerY = (height / 2 - state.pan.y) / state.zoom;
                    updateState({ 
                      zoom: newZoom,
                      pan: {
                        x: width / 2 - centerX * newZoom,
                        y: height / 2 - centerY * newZoom
                      }
                    });
                  }} 
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
                    <ZoomIn size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Aumentar zoom</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => {
                    const width = window.innerWidth;
                    const height = window.innerHeight - 100;
                    const bounds = calculateBounds(viewMode === 'single' ? nodes : allNodes);
                    const zoom = calculateOptimalZoom(bounds, width, height);
                    const pan = calculateCenterPan(bounds, zoom, width, height);
                    updateState({ zoom, pan });
                  }} 
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
                    <Maximize2 size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ajustar à tela</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="w-px h-8 bg-border mx-1"></div>
            
            <div data-tour="workflows">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => setShowProjectManager(!showProjectManager)}
                      className={`p-2 rounded-lg transition-all ${showProjectManager ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                      <FolderKanban size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gerenciar Projetos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div data-tour="tools">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => updateState({ showAnalytics: !state.showAnalytics, showSidebar: false })}
                      className={`p-2 rounded-lg transition-all ${state.showAnalytics ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                      <BarChart3 size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Análises Inteligentes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => setShowLegend(!showLegend)}
                      className={`p-2 rounded-lg transition-all ${showLegend ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                      <Info size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Stakeholders</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="w-px h-8 bg-border mx-1"></div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={reopenTour}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
                    <Info size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver tour novamente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => {
                      signOut();
                      toast('Logout realizado com sucesso!');
                    }}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all">
                    <LogOut size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sair</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        
        {selectedNodes.length > 0 && (
          <div className="mt-2 text-sm text-primary flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            {selectedNodes.length} nó(s) selecionado(s) • Shift+Click para adicionar • Backspace para deletar
          </div>
        )}
        
      </div>

      {showLegend && (
        <Legend nodes={nodes} setShowLegend={setShowLegend} />
      )}

      <div className="flex-1 relative overflow-hidden" data-tour="canvas">
        <Canvas
          svgRef={svgRef}
          state={state}
          updateState={updateState}
          viewMode={viewMode}
          workflows={workflows}
          nodes={nodes}
          connections={connections}
          selectedNodes={selectedNodes}
          setSelectedNodes={setSelectedNodes}
          selectedConnection={selectedConnection}
          setSelectedConnection={setSelectedConnection}
          highlightedPath={highlightedPath}
          hoveredNode={hoveredNode}
          setHoveredNode={setHoveredNode}
          updateNodePosition={updateNodePosition}
          setConnections={setConnections}
          saveToHistory={saveToHistory}
          projects={projects}
          allConnections={allConnections}
          onOpenEditModal={(node) => {
            setEditingNodeInModal(node);
            setNodeCreationType(node.type);
            setShowNodeCreationModal(true);
          }}
          onGoToProject={(id) => {
            setActiveProjectId(id);
            setViewMode('single');
            // useEffect will handle centering automatically
          }}
        />

        {/* Botões flutuantes de ação */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
          {/* Reorganizar Nós */}
          <button
            onClick={() => {
              toast.info('Organizando nós...');
              autoOrganize();
            }}
            className="p-4 bg-primary text-primary-foreground rounded-full shadow-2xl hover:scale-110 transition-all group relative"
            title="Reorganizar Nós (A)"
          >
            <LayoutGrid size={22} className="group-hover:scale-110 transition-transform" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Reorganizar Nós
            </span>
          </button>
          
          {/* Salvar Design */}
          <button
            onClick={saveCurrentDesign}
            className="p-4 bg-green-600 text-white rounded-full shadow-2xl hover:scale-110 transition-all group relative"
            title="Salvar Design (S)"
          >
            <Save size={22} className="group-hover:scale-110 transition-transform" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Salvar Design
            </span>
          </button>
          
          {/* Centralizar View (NOVO) */}
          <button
            onClick={() => {
              const width = window.innerWidth;
              const height = window.innerHeight - 100;
              const currentNodes = viewMode === 'single' ? nodes : allNodes;
              
              if (currentNodes.length > 0) {
                const bounds = calculateBounds(currentNodes);
                const centerX = (bounds.minX + bounds.maxX) / 2;
                const centerY = (bounds.minY + bounds.maxY) / 2;
                
                updateState({
                  pan: {
                    x: width / 2 - centerX * state.zoom,
                    y: height / 2 - centerY * state.zoom
                  }
                });
              }
            }}
            className="p-3.5 bg-accent text-accent-foreground rounded-full shadow-xl hover:scale-110 transition-all group relative"
            title="Centralizar (C)"
          >
            <Target size={20} />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Centralizar
            </span>
          </button>
          
          {/* Encontrar Caminho */}
          <button
            onClick={() => setShowPathFinder(true)}
            className="p-3.5 bg-secondary text-foreground rounded-full shadow-xl hover:scale-110 transition-all group relative"
            title="Encontrar Caminho (P)"
          >
            <Route size={20} />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Encontrar Caminho
            </span>
          </button>
          
          {/* Encaixar Tudo */}
          <button
            onClick={() => {
              const width = window.innerWidth;
              const height = window.innerHeight - 100;
              const bounds = calculateBounds(viewMode === 'single' ? nodes : allNodes);
              const zoom = calculateOptimalZoom(bounds, width, height);
              const pan = calculateCenterPan(bounds, zoom, width, height);
              updateState({ zoom, pan });
            }}
            className="p-3.5 bg-secondary text-foreground rounded-full shadow-xl hover:scale-110 transition-all group relative"
            title="Encaixar Tudo (F)"
          >
            <Maximize2 size={20} />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Encaixar Tudo
            </span>
          </button>
        </div>

        <Drawer open={state.showSidebar && state.editingNode !== null} onOpenChange={(open) => {
          if (!open) updateState({ showSidebar: false, editingNode: null });
        }}>
          <DrawerContent className="h-[90vh]">
            {state.editingNode && (
              <NodeEditor 
                node={state.editingNode} 
                getAllCategories={getAllCategories}
                addCustomCategory={addCustomCategory}
                onUpdate={(field, value) => {
                  const updated = { ...state.editingNode, [field]: value };
                  updateState({ editingNode: updated });
                  setNodes(nodes.map(n => n.id === updated.id ? updated : n));
                }}
                onClose={() => updateState({ showSidebar: false, editingNode: null })}
                onDelete={() => deleteNode(state.editingNode.id)}
                onConfirm={() => {
                  updateState({ showSidebar: false, editingNode: null });
                  toast.success('Alterações salvas!');
                }}
              />
            )}
          </DrawerContent>
        </Drawer>

        {state.showAnalytics && (
          <AnalyticsPanel 
            nodes={nodes} 
            connections={connections}
            onClose={() => updateState({ showAnalytics: false })} 
          />
        )}

        {showProjectManager && (
          <ProjectManagerPanel
            projects={projects.map(p => ({ ...p, type: 'project' as const, workflows: [] }))}
            workflows={workflows}
            people={people}
            brands={brands}
            connections={allConnections}
            onClose={() => setShowProjectManager(false)}
            onFocusProject={(projectId) => {
              setActiveProjectId(projectId);
              setViewMode('single');
              setShowProjectManager(false);
              
              // First timeout: let React recalculate nodes
              setTimeout(() => {
                autoOrganizeSingle(projectId);
              }, 50);
              
              // Second timeout: center view after layout is done
              setTimeout(() => {
                const width = window.innerWidth;
                const height = window.innerHeight - 100;
                
                // Get the actual nodes after layout (recalculated by React)
                const currentNodes = getNodesForSingleView(projectId);
                
                if (currentNodes.length > 0) {
                  const bounds = calculateBounds(currentNodes);
                  const zoom = 0.9;
                  const pan = calculateCenterPan(bounds, zoom, width, height);
                  updateState({ zoom, pan });
                }
              }, 300);
            }}
            onProjectCreate={(data) => {
              createProject.mutate({ x: 500, y: 400, ...data });
              setViewMode('single');
            }}
            onProjectUpdate={(id, updates) => {
              updateProject.mutate({ id, ...updates });
            }}
            onProjectDelete={(id) => {
              const project = projects.find(p => p.id === id);
              if (project) handleDeleteProject(id, project.name);
            }}
          />
        )}

        {showLinkedInImport && (
          <LinkedInImportModal
            open={showLinkedInImport}
            onOpenChange={setShowLinkedInImport}
            onImport={handleLinkedInImport}
            projects={projects}
          />
        )}

        {viewMode === 'single' && (
          <PathIndicator
            selectedNode={selectedNode}
            centerNode={centerNode}
            allNodes={allNodes}
            connections={allConnections}
          />
        )}
      </div>
      
      {/* Onboarding Tour */}
      {showTour && (
        <OnboardingTour
          onComplete={completeTour}
          onSkip={completeTour}
        />
      )}
    </div>
  );
};
