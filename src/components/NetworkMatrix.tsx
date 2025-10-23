import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ZoomIn, ZoomOut, X, Building2, User, FolderKanban, Undo2, Redo2, LayoutGrid, Maximize2, Info, Layers, BarChart3, Route, Sparkles, Target, Save, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectNode, PersonNode, BrandNode, NetworkNode, ConnectionEdge, Workflow, Flow } from '@/types/database';
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
import { OnboardingTutorial } from './onboarding/OnboardingTutorial';
import { HelpMenu } from './help/HelpMenu';
import { ContextualHint } from './hints/ContextualHint';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useNetworkHistory } from '@/hooks/useNetworkHistory';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SAMPLE_WORKFLOWS, SAMPLE_PROJECTS, SAMPLE_PEOPLE, SAMPLE_BRANDS, SAMPLE_CONNECTIONS } from '@/data/sampleNetworkData';
import { ParsedLinkedInData, LinkedInImportOptions } from '@/types/linkedin';

const CATEGORIES = {
  person: ['Pessoal', 'Profissional', 'Cliente', 'Fornecedor', 'Parceiro'],
  brand: ['Bebida', 'Entretenimento', 'Hotelaria', 'Varejo', 'Serviços', 'Tecnologia', 'Alimentação'],
  project: ['P', 'M', 'G']
};

export const NetworkMatrix = () => {
  const { user, signOut } = useAuth();
  
  // Nova arquitetura: separar flows, pessoas e marcas
  const [projects, setProjects] = useState<ProjectNode[]>([]);
  const [people, setPeople] = useState<PersonNode[]>([]);
  const [brands, setBrands] = useState<BrandNode[]>([]);
  const [allConnections, setAllConnections] = useState<ConnectionEdge[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeCenter, setActiveCenter] = useState<{ id: number; type: 'project' | 'person' | 'brand' } | null>(null);
  const didInitialFit = React.useRef(false);
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
  
  // Onboarding and hints states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    has_seen_onboarding: false,
    show_hints: true
  });

  const { state, updateState } = useNetworkState();
  const svgRef = useRef(null);

  // Combinar todos os nós
  const allNodes = [...projects, ...people, ...brands];
  
  // Carregar dados do banco ao iniciar
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Carregar workflows
        const { data: workflowsData, error: workflowsError } = await (supabase as any)
          .from('workflows')
          .select('*')
          .eq('user_id', user.id);
        
        if (workflowsError) throw workflowsError;
        setWorkflows(workflowsData || []);

        // Carregar flows
        const { data: flowsData, error: flowsError } = await (supabase as any)
          .from('flows')
          .select('*')
          .eq('user_id', user.id);
        
        if (flowsError) throw flowsError;
        setFlows(flowsData || []);

        // Carregar projects
        const { data: projectsData, error: projectsError } = await (supabase as any)
          .from('projects')
          .select('*')
          .eq('user_id', user.id);
        
        if (projectsError) throw projectsError;
        const loadedProjects: ProjectNode[] = (projectsData || []).map((p: any) => ({
          ...p,
          type: 'project' as const,
          x: Number(p.x) || 0,
          y: Number(p.y) || 0
        }));
        setProjects(loadedProjects);

        // Carregar people
        const { data: peopleData, error: peopleError } = await (supabase as any)
          .from('people')
          .select('*')
          .eq('user_id', user.id);
        
        if (peopleError) throw peopleError;
        const loadedPeople: PersonNode[] = (peopleData || []).map((p: any) => ({
          ...p,
          type: 'person' as const,
          x: Number(p.x) || 0,
          y: Number(p.y) || 0
        }));
        setPeople(loadedPeople);

        // Carregar brands
        const { data: brandsData, error: brandsError} = await (supabase as any)
          .from('brands')
          .select('*')
          .eq('user_id', user.id);
        
        if (brandsError) throw brandsError;
        const loadedBrands: BrandNode[] = (brandsData || []).map((b: any) => ({
          ...b,
          type: 'brand' as const,
          x: Number(b.x) || 0,
          y: Number(b.y) || 0
        }));
        setBrands(loadedBrands);

        // Carregar connections
        const { data: connectionsData, error: connectionsError } = await (supabase as any)
          .from('connections')
          .select('*')
          .eq('user_id', user.id);
        
        if (connectionsError) throw connectionsError;
        const loadedConnections: ConnectionEdge[] = (connectionsData || []).map((c: any) => ({
          from: c.from_id,
          to: c.to_id,
          type: c.connection_type || 'strong',
          id: c.id
        }));
        setAllConnections(loadedConnections);

        toast.success('Dados carregados!');
      } catch (error: any) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados', { description: error.message });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Carregar preferências do usuário
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await (supabase as any)
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setUserPreferences(data);
          if (!data.has_seen_onboarding) {
            setShowOnboarding(true);
          }
        } else {
          // Criar preferências padrão
          await (supabase as any)
            .from('user_preferences')
            .insert({ user_id: user.id });
        }
      } catch (error: any) {
        console.error('Erro ao carregar preferências:', error);
      }
    };

    loadUserPreferences();
  }, [user]);

  // Sistema de hints contextuais
  useEffect(() => {
    if (!userPreferences.show_hints || showOnboarding) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowHint(true);
      }, 10000); // Mostrar hint após 10 segundos de inatividade
    };
    
    const handleActivity = () => {
      setShowHint(false);
      resetTimer();
    };
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    
    resetTimer();
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [userPreferences.show_hints, showOnboarding]);

  const handleCompleteOnboarding = async () => {
    if (!user) return;
    
    try {
      await (supabase as any)
        .from('user_preferences')
        .update({ has_seen_onboarding: true })
        .eq('user_id', user.id);
      
      setUserPreferences(prev => ({ ...prev, has_seen_onboarding: true }));
      setShowOnboarding(false);
      toast.success('Tutorial concluído!', {
        description: 'Você pode sempre acessar o menu de ajuda (?) no canto superior direito.'
      });
    } catch (error: any) {
      console.error('Erro ao atualizar preferências:', error);
    }
  };

  const handleSkipOnboarding = async () => {
    if (!user) return;
    
    try {
      await (supabase as any)
        .from('user_preferences')
        .update({ has_seen_onboarding: true })
        .eq('user_id', user.id);
      
      setUserPreferences(prev => ({ ...prev, has_seen_onboarding: true }));
      setShowOnboarding(false);
    } catch (error: any) {
      console.error('Erro ao atualizar preferências:', error);
    }
  };

  const handleDisableHints = async () => {
    if (!user) return;
    
    try {
      await (supabase as any)
        .from('user_preferences')
        .update({ show_hints: false })
        .eq('user_id', user.id);
      
      setUserPreferences(prev => ({ ...prev, show_hints: false }));
      setShowHint(false);
      toast.success('Dicas desabilitadas');
    } catch (error: any) {
      console.error('Erro ao atualizar preferências:', error);
    }
  };

  const handleShowTutorial = () => {
    setShowOnboarding(true);
  };
  
  // Função para salvar design atual
  const saveCurrentDesign = () => {
    try {
      const designData = {
        projects: projects.map(p => ({ id: p.id, x: p.x, y: p.y })),
        people: people.map(p => ({ id: p.id, x: p.x, y: p.y })),
        brands: brands.map(b => ({ id: b.id, x: b.x, y: b.y })),
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem('networkDesign', JSON.stringify(designData));
      toast.success('Design salvo com sucesso!', {
        description: 'As posições dos nós foram salvas.'
      });
      console.log('Design salvo:', designData);
    } catch (error) {
      console.error('Erro ao salvar design:', error);
      toast.error('Erro ao salvar design', {
        description: 'Não foi possível salvar o design atual.'
      });
    }
  };

  const handleLinkedInImport = async (data: ParsedLinkedInData, options: LinkedInImportOptions) => {
    if (!user) return;
    saveToHistory();
    
    const newPeople: any[] = [];
    const newBrands: any[] = [];
    const newConnections: any[] = [];
    
    try {
      // Create brands from unique companies if option is enabled
      if (options.createBrands) {
        for (const company of data.uniqueCompanies) {
          const { data: brandData, error } = await (supabase as any)
            .from('brands')
            .insert([{
              name: company,
              user_id: user.id,
              x: Math.random() * 400 + 100,
              y: Math.random() * 400 + 100,
              category: 'A'
            }] as any)
            .select()
            .single();
          
          if (error || !brandData) throw error || new Error('No data returned');
          const brand: BrandNode = { 
            ...brandData, 
            type: 'brand' as const, 
            x: Number(brandData.x), 
            y: Number(brandData.y) 
          };
          newBrands.push(brand);
        }
      }
      
      // Create person nodes from contacts
      for (const contact of data.contacts) {
        const fullName = `${contact.firstName} ${contact.lastName}`.trim();
        
        const { data: personData, error } = await (supabase as any)
          .from('people')
          .insert([{
            name: fullName || `Contato LinkedIn`,
            user_id: user.id,
            x: Math.random() * 400 + 100,
            y: Math.random() * 400 + 100,
            company: contact.company,
            email: contact.email,
            category: options.defaultCategory
          }] as any)
          .select()
          .single();
        
        if (error || !personData) throw error || new Error('No data returned');
        const person: PersonNode = { 
          ...personData, 
          type: 'person' as const, 
          x: Number(personData.x), 
          y: Number(personData.y) 
        };
        newPeople.push(person);
      }
      
      // Update state
      setPeople(prev => [...prev, ...newPeople]);
      setBrands(prev => [...prev, ...newBrands]);
      
      // Show success message
      toast.success(
        `Importação concluída! ${newPeople.length} pessoas` +
        (newBrands.length > 0 ? `, ${newBrands.length} marcas` : '')
      );
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar do LinkedIn', { description: error.message });
    }
  };

  // Calcular anchorProjectId por nó com busca de 2º grau (useMemo)
  const anchors = React.useMemo(() => {
    const map = new Map<number, number | null>();
    const byId = new Map(allNodes.map(n => [n.id, n]));
    
    for (const n of allNodes) {
      // Flows se ancoram neles mesmos
      if (n.type === 'project') { 
        map.set(n.id, n.id); 
        continue; 
      }
      
      // 1º grau: buscar flow conectado diretamente
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
      
      // 2º grau: buscar via vizinhos (pessoas/marcas conectadas a flows)
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

  // Helper: get nodes for ANY center type (person, brand, or project)
  const getNodesForCenter = (centerId: number, centerType: 'project' | 'person' | 'brand') => {
    const byId = new Map(allNodesWithAnchors.map(n => [n.id, n]));
    const centerNode = byId.get(centerId);
    if (!centerNode) return [];
    
    const included = new Set<number>([centerId]);
    
    // 1. Add all nodes directly connected to the center (1st degree)
    allConnections.forEach(c => {
      if (c.from === centerId) {
        const node = byId.get(c.to);
        if (node) included.add(c.to);
      }
      if (c.to === centerId) {
        const node = byId.get(c.from);
        if (node) included.add(c.from);
      }
    });
    
    // 2. Add connections between already included nodes (2nd degree - limited)
    let changed = true;
    let iterations = 0;
    const maxIterations = 2;
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      allConnections.forEach(c => {
        const fromNode = byId.get(c.from);
        const toNode = byId.get(c.to);
        
        if (fromNode && toNode) {
          if (included.has(c.from) && !included.has(c.to)) {
            included.add(c.to);
            changed = true;
          }
          if (included.has(c.to) && !included.has(c.from)) {
            included.add(c.from);
            changed = true;
          }
        }
      });
    }
    
    // Return nodes: center first (for radial layout), then others
    return [centerNode, ...Array.from(included).filter(id => id !== centerId).map(id => byId.get(id)!).filter(Boolean)];
  };

  // Filtrar nós e conexões por flow/modo
  const nodes = viewMode === 'master'
    ? allNodesWithAnchors
        .filter(n => n.type === 'project' || n.anchorProjectId !== null) // Ocultar nós órfãos
        .map(n => {
          const project = projects.find(p => p.id === n.anchorProjectId);
          return { ...n, projectId: project?.id, projectColor: project ? '#8b5cf6' : '#6366f1' };
        })
    : (activeCenter 
        ? (activeCenter.type === 'project' 
            ? getNodesForSingleView(activeCenter.id) 
            : getNodesForCenter(activeCenter.id, activeCenter.type))
        : []);
  
  // Debug: Log dos nodes no Single View
  React.useEffect(() => {
    if (viewMode === 'single') {
      console.log('🔍 Single View - activeProjectId:', activeProjectId);
      console.log('🔍 Nodes filtrados:', nodes.map(n => ({ id: n.id, name: n.name, type: n.type })));
    }
  }, [viewMode, activeProjectId, nodes]);

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
    if (historyIndex > 0) {
      const snapshot = history[historyIndex - 1];
      setProjects(snapshot.projects);
      setPeople(snapshot.people);
      setBrands(snapshot.brands);
      setAllConnections(snapshot.allConnections);
      setViewMode(snapshot.viewMode);
      setActiveProjectId(snapshot.activeProjectId);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const snapshot = history[historyIndex + 1];
      setProjects(snapshot.projects);
      setPeople(snapshot.people);
      setBrands(snapshot.brands);
      setAllConnections(snapshot.allConnections);
      setViewMode(snapshot.viewMode);
      setActiveProjectId(snapshot.activeProjectId);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Função para atualizar posição de nós (corrige dragging) and clear highlight
  const updateNodePosition = async (nodeId: number, deltaX: number, deltaY: number) => {
    if (!user) return;
    
    const isProject = projects.find(p => p.id === nodeId);
    const isPerson = people.find(p => p.id === nodeId);
    const isBrand = brands.find(b => b.id === nodeId);
    
    if (isProject) {
      const newX = isProject.x + deltaX;
      const newY = isProject.y + deltaY;
      setProjects(prev => prev.map(p => 
        p.id === nodeId ? { ...p, x: newX, y: newY, isNewHighlight: false } : p
      ));
      
      // Debounce database update
      setTimeout(async () => {
        await (supabase as any)
          .from('projects')
          .update({ x: newX, y: newY } as any)
          .eq('id', nodeId)
          .eq('user_id', user.id);
      }, 500);
    } else if (isPerson) {
      const newX = isPerson.x + deltaX;
      const newY = isPerson.y + deltaY;
      setPeople(prev => prev.map(p => 
        p.id === nodeId ? { ...p, x: newX, y: newY, isNewHighlight: false } : p
      ));
      
      // Debounce database update
      setTimeout(async () => {
        await (supabase as any)
          .from('people')
          .update({ x: newX, y: newY } as any)
          .eq('id', nodeId)
          .eq('user_id', user.id);
      }, 500);
    } else if (isBrand) {
      const newX = isBrand.x + deltaX;
      const newY = isBrand.y + deltaY;
      setBrands(prev => prev.map(b => 
        b.id === nodeId ? { ...b, x: newX, y: newY, isNewHighlight: false } : b
      ));
      
      // Debounce database update
      setTimeout(async () => {
        await (supabase as any)
          .from('brands')
          .update({ x: newX, y: newY } as any)
          .eq('id', nodeId)
          .eq('user_id', user.id);
      }, 500);
    }
  };

  const setNodes = (updater) => {
    const newNodes = typeof updater === 'function' ? updater(allNodesWithAnchors) : updater;
    
    const newProjects = newNodes.filter(n => n.type === 'project');
    const newPeople = newNodes.filter(n => n.type === 'person');
    const newBrands = newNodes.filter(n => n.type === 'brand');
    
    setProjects(newProjects);
    setPeople(newPeople);
    setBrands(newBrands);
  };

  const setConnections = (updater) => {
    setAllConnections(typeof updater === 'function' ? updater(allConnections) : updater);
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
      const isProject = projects.find(p => p.id === node.id);
      const isPerson = people.find(p => p.id === node.id);
      const isBrand = brands.find(b => b.id === node.id);
      
      if (isProject) {
        setProjects(prev => prev.map(p => p.id === node.id ? { ...p, x: node.x, y: node.y } : p));
      } else if (isPerson) {
        setPeople(prev => prev.map(p => p.id === node.id ? { ...p, x: node.x, y: node.y } : p));
      } else if (isBrand) {
        setBrands(prev => prev.map(b => b.id === node.id ? { ...b, x: node.x, y: node.y } : b));
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
      // Master View: grid de clusters por flow com centralização automática
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
        const zoom = calculateOptimalZoom(bounds, width, height);
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

  // Fit-to-screen inicial após carregar os dados
  useEffect(() => {
    if (!isLoading && !didInitialFit.current && viewMode === 'master' && allNodes.length > 0 && svgRef.current) {
      const timer = setTimeout(() => {
        const rect = svgRef.current!.getBoundingClientRect();
        const bounds = calculateBounds(allNodes);
        const optimalZoom = calculateOptimalZoom(bounds, rect.width, rect.height);
        const centerPan = calculateCenterPan(bounds, optimalZoom, rect.width, rect.height);
        updateState({ zoom: optimalZoom, pan: centerPan });
        didInitialFit.current = true;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, viewMode, allNodes.length]);

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
            const bounds = calculateBounds(projectNodes);
            const optimalZoom = calculateOptimalZoom(bounds, rect.width, rect.height);
            const centerPan = calculateCenterPan(bounds, optimalZoom, rect.width, rect.height);
            updateState({ zoom: optimalZoom, pan: centerPan });
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
    zoom: state.zoom
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
                if (node.type === 'person') {
                  setPeople(prev => prev.map(p => p.id === node.id ? { ...p, homeProjectId: activeProjectId } : p));
                } else if (node.type === 'brand') {
                  setBrands(prev => prev.map(b => b.id === node.id ? { ...b, homeProjectId: activeProjectId } : b));
                } else if (node.type === 'project') {
                  setProjects(prev => prev.map(p => p.id === node.id ? { ...p, homeProjectId: activeProjectId } : p));
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

  const deleteNode = async (nodeId) => {
    if (!user) return;
    saveToHistory();
    
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;
    
    try {
      // Delete from appropriate table
      if (node.type === 'project') {
        await (supabase as any).from('projects').delete().eq('id', nodeId).eq('user_id', user.id);
      } else if (node.type === 'person') {
        await (supabase as any).from('people').delete().eq('id', nodeId).eq('user_id', user.id);
      } else if (node.type === 'brand') {
        await (supabase as any).from('brands').delete().eq('id', nodeId).eq('user_id', user.id);
      }
      
      // Delete all connections involving this node
      await (supabase as any)
        .from('connections')
        .delete()
        .or(`from_id.eq.${nodeId},to_id.eq.${nodeId}`)
        .eq('user_id', user.id);
      
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
      updateState({ selectedNode: null, showSidebar: false, editingNode: null });
      setSelectedNodes(prev => prev.filter(id => id !== nodeId));
      
      toast.success('Nó deletado!');
    } catch (error: any) {
      console.error('Erro ao deletar nó:', error);
      toast.error('Erro ao deletar nó', { description: error.message });
    }
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
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result === 'string') {
          const imported = JSON.parse(result);
          setWorkflows(imported);
          alert('Dados importados com sucesso!');
        }
      } catch (err) {
        alert('Erro ao importar arquivo.');
      }
    };
    reader.readAsText(file);
  };

  const getAllCategories = (type) => [...CATEGORIES[type], ...(customCategories[type] || [])];

  const addCustomCategory = (type, category) => {
    if (category && !getAllCategories(type).includes(category)) {
      setCustomCategories(prev => ({ ...prev, [type]: [...(prev[type] || []), category] }));
      return true;
    }
    return false;
  };

  const handleNodeCreation = async (nodeData: any, explicitType?: 'person' | 'project' | 'brand') => {
    if (!user) return;
    saveToHistory();
    
    // Use explicitType se fornecido, caso contrário use nodeCreationType
    const actualType = explicitType || nodeCreationType;
    console.log('🔍 DEBUG - Criando nó:', { explicitType, nodeCreationType, actualType, nodeData });
    
    const newNode: any = {
      type: actualType,
      x: nodeCreationPosition.x,
      y: nodeCreationPosition.y,
      isNewHighlight: true,
      ...nodeData
    };

    // Set homeProjectId for nodes created in single view
    if (viewMode === 'single' && activeProjectId) {
      if (actualType === 'person' || actualType === 'brand' || actualType === 'project') {
        newNode.homeProjectId = activeProjectId;
      }
    }

    try {
      // Set default fields for projects
      if (actualType === 'project') {
        newNode.status = nodeData.projectStatus || nodeData.status || 'ativo';
        newNode.deadline = nodeData.startDate || nodeData.deadline || null;
        newNode.category = nodeData.category || 'M';
        
        const { data, error } = await (supabase as any)
          .from('projects')
          .insert([{
            name: newNode.name,
            user_id: user.id,
            x: newNode.x,
            y: newNode.y,
            status: newNode.status,
            deadline: newNode.deadline,
            category: newNode.category
          }] as any)
          .select()
          .single();
        
        if (error || !data) throw error || new Error('No data returned');
        
        const createdProject: ProjectNode = { 
          ...data, 
          type: 'project' as const, 
          x: Number(data.x), 
          y: Number(data.y) 
        };
        setProjects(prev => [...prev, createdProject]);
        
        // Criar registro na tabela flows se estiver no Master View
        if (viewMode === 'master') {
          try {
            const { data: flowData, error: flowError } = await (supabase as any)
              .from('flows')
              .insert([{
                user_id: user.id,
                name: createdProject.name,
                center_type: 'project',
                center_id: createdProject.id
              }] as any)
              .select()
              .single();
            
            if (!flowError && flowData) {
              setFlows(prev => [...prev, flowData]);
            }
          } catch (e) {
            console.error('Erro ao criar flow:', e);
          }
        }
        
        setShowNodeCreationModal(false);
        
        console.log('✅ Projeto criado com sucesso:', createdProject);
        
        // Comportamento baseado no contexto
        if (viewMode === 'master') {
          // No master view, entra no novo flow imediatamente
          setActiveCenter({ id: createdProject.id, type: 'project' });
          setActiveProjectId(createdProject.id);
          setViewMode('single');
          toast.success(`Flow "${createdProject.name}" criado!`);
        } else {
          // Se criando dentro de outro flow (flow filho), entra no novo
          setActiveCenter({ id: createdProject.id, type: 'project' });
          setActiveProjectId(createdProject.id);
          setViewMode('single');
          toast.success(`Flow Filho "${createdProject.name}" criado!`);
        }
      } else if (actualType === 'person') {
        const { data, error } = await (supabase as any)
          .from('people')
          .insert([{
            name: newNode.name,
            user_id: user.id,
            x: newNode.x,
            y: newNode.y,
            email: newNode.email || null,
            phone: newNode.phone || null,
            company: newNode.company || null,
            category: newNode.category || null
          }] as any)
          .select()
          .single();
        
        if (error || !data) throw error || new Error('No data returned');
        
        const createdPerson: PersonNode = { 
          ...data, 
          type: 'person' as const, 
          x: Number(data.x), 
          y: Number(data.y) 
        };
        
        // Preserve homeProjectId for Single View visibility if created inside a flow
        const createdPersonWithHome: any = { ...createdPerson };
        if (viewMode === 'single' && activeProjectId) {
          createdPersonWithHome.homeProjectId = activeProjectId;
        }
        
        setPeople(prev => [...prev, createdPersonWithHome]);
        
        // Criar flow se estiver no Master View
        if (viewMode === 'master') {
          try {
            const { data: flowData, error: flowError } = await (supabase as any)
              .from('flows')
              .insert([{
                user_id: user.id,
                name: createdPerson.name,
                center_type: 'person',
                center_id: createdPerson.id
              }] as any)
              .select()
              .single();
            
            if (!flowError && flowData) {
              setFlows(prev => [...prev, flowData]);
            }
          } catch (e) {
            console.error('Erro ao criar flow:', e);
          }
          
          // Entrar no Single View do novo flow
          setActiveCenter({ id: createdPerson.id, type: 'person' });
          setViewMode('single');
          toast.success(`Flow "${createdPerson.name}" criado!`);
        } else {
          // Se estiver dentro de um flow, conectar automaticamente ao projeto ativo
          if (activeProjectId) {
            try {
              const { data: conn, error: connError } = await (supabase as any)
                .from('connections')
                .insert([{
                  user_id: user.id,
                  from_id: createdPersonWithHome.id,
                  from_type: 'person',
                  to_id: activeProjectId,
                  to_type: 'project',
                  connection_type: 'strong'
                }] as any)
                .select()
                .single();
              if (!connError && conn) {
                setAllConnections(prev => [...prev, { id: conn.id, from: conn.from_id, to: conn.to_id, type: conn.connection_type || 'strong' }]);
              }
            } catch (e) {
              console.error('Erro ao conectar pessoa ao flow:', e);
            }
          }
          toast.success(`${createdPersonWithHome.name} criado!`);
        }
        
        setShowNodeCreationModal(false);
        console.log('✅ Pessoa criada com sucesso:', createdPersonWithHome);
        
        // Center view on the new node
        setTimeout(() => {
          const zoom = state.zoom;
          updateState({
            pan: {
              x: window.innerWidth / 2 - createdPersonWithHome.x * zoom,
              y: window.innerHeight / 2 - createdPersonWithHome.y * zoom
            }
          });
        }, 50);
      } else if (actualType === 'brand') {
        const { data, error } = await (supabase as any)
          .from('brands')
          .insert([{
            name: newNode.name,
            user_id: user.id,
            x: newNode.x,
            y: newNode.y,
            category: newNode.category || null,
            website: newNode.website || null
          }] as any)
          .select()
          .single();
        
        if (error || !data) throw error || new Error('No data returned');
        
        const createdBrand: BrandNode = { 
          ...data, 
          type: 'brand' as const, 
          x: Number(data.x), 
          y: Number(data.y) 
        };
        
        const createdBrandWithHome: any = { ...createdBrand };
        if (viewMode === 'single' && activeProjectId) {
          createdBrandWithHome.homeProjectId = activeProjectId;
        }
        
        setBrands(prev => [...prev, createdBrandWithHome]);
        
        // Criar flow se estiver no Master View
        if (viewMode === 'master') {
          try {
            const { data: flowData, error: flowError } = await (supabase as any)
              .from('flows')
              .insert([{
                user_id: user.id,
                name: createdBrand.name,
                center_type: 'brand',
                center_id: createdBrand.id
              }] as any)
              .select()
              .single();
            
            if (!flowError && flowData) {
              setFlows(prev => [...prev, flowData]);
            }
          } catch (e) {
            console.error('Erro ao criar flow:', e);
          }
          
          setActiveCenter({ id: createdBrand.id, type: 'brand' });
          setViewMode('single');
          toast.success(`Flow "${createdBrand.name}" criado!`);
        } else {
          if (activeProjectId) {
            try {
              const { data: conn, error: connError } = await (supabase as any)
                .from('connections')
                .insert([{
                  user_id: user.id,
                  from_id: createdBrandWithHome.id,
                  from_type: 'brand',
                  to_id: activeProjectId,
                  to_type: 'project',
                  connection_type: 'strong'
                }] as any)
                .select()
                .single();
              if (!connError && conn) {
                setAllConnections(prev => [...prev, { id: conn.id, from: conn.from_id, to: conn.to_id, type: conn.connection_type || 'strong' }]);
              }
            } catch (e) {
              console.error('Erro ao conectar marca ao flow:', e);
            }
          }
          toast.success(`${createdBrandWithHome.name} criado!`);
        }
        
        setShowNodeCreationModal(false);
        console.log('✅ Marca criada com sucesso:', createdBrandWithHome);
      }
    } catch (error: any) {
      console.error('Erro ao criar nó:', error);
      toast.error('Erro ao criar', { description: error.message });
    }
  };

  const handleAddWorkflow = async (name: string, color: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('workflows')
        .insert([{
          name,
          color,
          user_id: user.id,
          description: ''
        }] as any)
        .select()
        .single();
      
      if (error) throw error;
      
      setWorkflows([...workflows, data]);
      toast.success(`Workflow "${name}" criado!`);
    } catch (error: any) {
      console.error('Erro ao criar workflow:', error);
      toast.error('Erro ao criar workflow', { description: error.message });
    }
  };

  const handleNodeUpdate = async (updatedData: any) => {
    if (!editingNodeInModal || !user) return;
    
    saveToHistory();
    
    try {
      // Update the correct array based on node type
      if (editingNodeInModal.type === 'project') {
        await (supabase as any)
          .from('projects')
          .update({
            name: updatedData.name,
            status: updatedData.status,
            deadline: updatedData.deadline || null,
            category: updatedData.category
          } as any)
          .eq('id', editingNodeInModal.id)
          .eq('user_id', user.id);
        
        setProjects(prev => prev.map(n => n.id === editingNodeInModal.id ? { ...n, ...updatedData } : n));
      } else if (editingNodeInModal.type === 'person') {
        await (supabase as any)
          .from('people')
          .update({
            name: updatedData.name,
            email: updatedData.email || null,
            phone: updatedData.phone || null,
            company: updatedData.company || null,
            category: updatedData.category
          } as any)
          .eq('id', editingNodeInModal.id)
          .eq('user_id', user.id);
        
        setPeople(prev => prev.map(n => n.id === editingNodeInModal.id ? { ...n, ...updatedData } : n));
      } else if (editingNodeInModal.type === 'brand') {
        await (supabase as any)
          .from('brands')
          .update({
            name: updatedData.name,
            category: updatedData.category,
            website: updatedData.website || null
          } as any)
          .eq('id', editingNodeInModal.id)
          .eq('user_id', user.id);
        
        setBrands(prev => prev.map(n => n.id === editingNodeInModal.id ? { ...n, ...updatedData } : n));
      }
      
      setShowNodeCreationModal(false);
      setEditingNodeInModal(null);
      updateState({ showSidebar: false });
      toast.success(`${updatedData.name} atualizado!`);
    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar', { description: error.message });
    }
  };

  const handleCreateNewProject = () => {
    if (!user) return;
    
    const newProject: ProjectNode = {
      id: Date.now(),
      user_id: user.id,
      name: `Flow ${projects.length + 1}`,
      type: 'project' as const,
      workflows: workflows.length > 0 ? [workflows[0].id] : [],
      category: 'P',
      status: 'Ativo',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      x: 500,
      y: 400
    };
    
    setProjects([...projects, newProject]);
    setActiveProjectId(newProject.id);
    setViewMode('single');
    
    setTimeout(() => {
      setEditingProjectId(newProject.id);
      setEditingProjectName(newProject.name);
      autoOrganizeSingle(newProject.id);
    }, 100);
  };

  const handleProjectNameChange = (projectId: number, newName: string) => {
    if (newName.trim()) {
      setProjects(prev => 
        prev.map(p => p.id === projectId ? { ...p, name: newName.trim() } : p)
      );
    }
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Mouse position in screen coordinates
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Mouse position in world/canvas coordinates (before zoom)
    const worldX = (mouseX - state.pan.x) / state.zoom;
    const worldY = (mouseY - state.pan.y) / state.zoom;
    
    // Zoom delta (negative deltaY = zoom in, positive = zoom out)
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(state.zoom * zoomFactor, 0.1), 3);
    
    // Adjust pan to keep mouse position fixed in world coordinates
    const newPan = {
      x: mouseX - worldX * newZoom,
      y: mouseY - worldY * newZoom
    };
    
    updateState({ zoom: newZoom, pan: newPan });
  };

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    if (!user) return;
    
    try {
      await (supabase as any)
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);
      
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (activeProjectId === projectId) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        if (remainingProjects.length > 0) {
          setActiveProjectId(remainingProjects[0].id);
        } else {
          setActiveProjectId(null);
        }
      }
      toast.success('Flow deletado!');
    } catch (error: any) {
      console.error('Erro ao deletar flow:', error);
      toast.error('Erro ao deletar flow', { description: error.message });
    }
  };

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
          onCreate={editingNodeInModal 
            ? handleNodeUpdate 
            : (nodeData) => handleNodeCreation(nodeData, editingNodeInModal?.type || nodeCreationType)
          }
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
                      onClick={() => {
                        setActiveProjectId(null);
                        setViewMode('master');
                      }}
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
                    <p>Ver todos os flows</p>
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
                    <p>Ver flow específico</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
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
            
            <HelpMenu onShowTutorial={handleShowTutorial} />
            
            <div className="w-px h-8 bg-border mx-1"></div>
            
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all flex items-center gap-2">
                        <User size={18} />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Conta do usuário</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user?.email}
                </div>
                <DropdownMenuItem 
                  onClick={signOut}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut size={16} className="mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="w-px h-8 bg-border mx-1"></div>

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
                  <p>Gerenciar Flows</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

      <div className="flex-1 relative overflow-hidden">
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
          onWheel={handleWheel}
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
            projects={projects as any}
            workflows={workflows}
            people={people}
            brands={brands}
            connections={allConnections}
            onClose={() => setShowProjectManager(false)}
            onFocusProject={(projectId) => {
              console.log('🎯 onFocusProject chamado:', projectId);
              console.log('📊 Estado atual - activeProjectId:', activeProjectId);
              console.log('📊 Projetos disponíveis:', projects.map(p => ({ id: p.id, name: p.name })));
              
              setShowProjectManager(false);
              setActiveProjectId(projectId);
              setViewMode('single');
              
              // Aguardar React atualizar o estado antes de reorganizar
              setTimeout(() => {
                console.log('📊 Após timeout - activeProjectId:', projectId);
                autoOrganizeSingle(projectId);
              }, 100);
              
              // Second timeout: center view after layout is done
              setTimeout(() => {
                const width = window.innerWidth;
                const height = window.innerHeight - 100;
                
                // Get the actual nodes after layout (recalculated by React)
                const currentNodes = getNodesForSingleView(projectId);
                
                if (currentNodes.length > 0) {
                  const bounds = calculateBounds(currentNodes);
                  const zoom = calculateOptimalZoom(bounds, width, height);
                  const pan = calculateCenterPan(bounds, zoom, width, height);
                  updateState({ zoom, pan });
                }
              }, 300);
            }}
            onProjectCreate={(data) => {
              const newProject = {
                id: Date.now(),
                type: 'project' as const,
                x: 500,
                y: 400,
                ...data,
              };
              setProjects([...projects, newProject as any]);
              setActiveProjectId(newProject.id);
              setViewMode('single');
              setTimeout(() => autoOrganizeSingle(newProject.id), 100);
              toast.success('Flow criado com sucesso!');
            }}
            onProjectUpdate={(id, updates) => {
              setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates as any } : p));
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

        <OnboardingTutorial
          open={showOnboarding}
          onComplete={handleCompleteOnboarding}
          onSkip={handleSkipOnboarding}
        />

        <ContextualHint
          show={showHint}
          onDismiss={() => setShowHint(false)}
          onDisable={handleDisableHints}
        />
      </div>
    </div>
  );
};
