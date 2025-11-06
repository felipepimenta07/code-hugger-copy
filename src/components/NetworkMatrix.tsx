import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ZoomIn, ZoomOut, X, Building2, User, FolderKanban, Undo2, Redo2, LayoutGrid, Maximize2, Info, Layers, BarChart3, Route, Sparkles, Target, Save } from 'lucide-react';
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

import { ResetButton } from './ResetButton';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useNetworkHistory } from '@/hooks/useNetworkHistory';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SAMPLE_WORKFLOWS, SAMPLE_PROJECTS, SAMPLE_PEOPLE, SAMPLE_BRANDS, SAMPLE_CONNECTIONS } from '@/data/sampleNetworkData';
import { ParsedLinkedInData, LinkedInImportOptions } from '@/types/linkedin';

const CATEGORIES = {
  person: ['Pessoal', 'Profissional', 'Cliente', 'Fornecedor', 'Parceiro'],
  brand: ['Bebida', 'Entretenimento', 'Hotelaria', 'Varejo', 'Serviços', 'Tecnologia', 'Alimentação'],
  project: ['P', 'M', 'G']
};

export const NetworkMatrix = () => {
  const { user } = useAuth();
  
  // Nova arquitetura: separar projetos, pessoas e marcas
  const [projects, setProjects] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [allConnections, setAllConnections] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

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
  const [showFlowsManager, setShowFlowsManager] = useState(false);
  const [flows, setFlows] = useState<any[]>([]);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showFlowStarterModal, setShowFlowStarterModal] = useState(false);
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);
  
  // Estado para memorizar visualização do Master View
  const [masterViewState, setMasterViewState] = useState<{
    zoom: number;
    pan: { x: number; y: number };
    hasBeenOrganized: boolean;
  } | null>(null);

  const { state, updateState } = useNetworkState();
  const svgRef = useRef(null);

  // Função para recarregar dados após reset
  const reloadData = async () => {
    if (!user) return;
    
    setIsLoadingData(true);
    try {
      const sb = supabase as any;
      const projectsRes = await sb.from('projects').select('*').eq('user_id', user.id);
      const peopleRes = await sb.from('people').select('*').eq('user_id', user.id);
      const brandsRes = await sb.from('brands').select('*').eq('user_id', user.id);
      const connectionsRes = await sb.from('connections').select('*').eq('user_id', user.id);
      const workflowsRes = await sb.from('workflows').select('*').eq('user_id', user.id);
      const flowsRes = await sb.from('flows').select('*').eq('user_id', user.id);

      // Adicionar propriedade 'type' aos dados carregados
      if (projectsRes.data) {
        setProjects(projectsRes.data.map((p: any) => ({ ...p, type: 'project' })));
      } else {
        setProjects([]);
      }
      if (peopleRes.data) {
        setPeople(peopleRes.data.map((p: any) => ({ ...p, type: 'person' })));
      } else {
        setPeople([]);
      }
      if (brandsRes.data) {
        setBrands(brandsRes.data.map((b: any) => ({ ...b, type: 'brand' })));
      } else {
        setBrands([]);
      }
      if (connectionsRes.data) {
        // Normalizar conexões do backend (from_id/to_id) para formato interno (from/to)
        setAllConnections(connectionsRes.data.map((c: any) => ({
          ...c,
          from: c.from_id,
          to: c.to_id,
          type: c.connection_type || 'related'
        })));
      } else {
        setAllConnections([]);
      }
      if (workflowsRes.data) {
        setWorkflows(workflowsRes.data);
      } else {
        setWorkflows([]);
      }
      if (flowsRes.data) {
        setFlows(flowsRes.data);
      } else {
        setFlows([]);
      }
      
      // Resetar view
      setActiveProjectId(null);
      setViewMode('master');
      setSelectedNodes([]);
      setSelectedConnection(null);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Carregar dados do Supabase
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const sb = supabase as any;
        const projectsRes = await sb.from('projects').select('*').eq('user_id', user.id);
        const peopleRes = await sb.from('people').select('*').eq('user_id', user.id);
        const brandsRes = await sb.from('brands').select('*').eq('user_id', user.id);
        const connectionsRes = await sb.from('connections').select('*').eq('user_id', user.id);
        const workflowsRes = await sb.from('workflows').select('*').eq('user_id', user.id);
        const flowsRes = await sb.from('flows').select('*').eq('user_id', user.id);

        // Adicionar propriedade 'type' aos dados carregados
        if (projectsRes.data) {
          setProjects(projectsRes.data.map((p: any) => ({ ...p, type: 'project' })));
        }
        if (peopleRes.data) {
          setPeople(peopleRes.data.map((p: any) => ({ ...p, type: 'person' })));
        }
        if (brandsRes.data) {
          setBrands(brandsRes.data.map((b: any) => ({ ...b, type: 'brand' })));
        }
        if (connectionsRes.data) {
          // Normalizar conexões do backend (from_id/to_id) para formato interno (from/to)
          const normalized = connectionsRes.data.map((c: any) => ({
            id: c.id,
            from: c.from_id,
            to: c.to_id,
            from_type: c.from_type,
            to_type: c.to_type,
            type: c.connection_type || 'related',
            connection_type: c.connection_type
          }));
          setAllConnections(normalized);
        }
        if (workflowsRes.data) setWorkflows(workflowsRes.data);
        if (flowsRes.data) setFlows(flowsRes.data);
        
        if (projectsRes.data && projectsRes.data.length > 0) {
          setActiveProjectId(projectsRes.data[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  // Garantir que selecionar uma conexão limpa a seleção de nós
  useEffect(() => {
    if (selectedConnection !== null) {
      setSelectedNodes([]);
    }
  }, [selectedConnection]);

  // Combinar todos os nós
  const allNodes = [...projects, ...people, ...brands];
  
  // Carregar design salvo ao iniciar
  React.useEffect(() => {
    const savedDesign = localStorage.getItem('networkDesign');
    if (savedDesign) {
      try {
        const parsed = JSON.parse(savedDesign);
        
        // Validar estrutura
        if (!parsed.projects || !parsed.people || !parsed.brands || !parsed.savedAt) {
          console.warn('Design salvo tem estrutura inválida, ignorando...');
          return;
        }
        
        const { projects: savedProjects, people: savedPeople, brands: savedBrands } = parsed;
        
        // Mesclar posições salvas com dados atuais (validar que x e y existem)
        if (Array.isArray(savedProjects)) {
          setProjects(prev => prev.map(p => {
            const saved = savedProjects.find((sp: any) => sp.id === p.id);
            return saved && typeof saved.x === 'number' && typeof saved.y === 'number' 
              ? { ...p, x: saved.x, y: saved.y } 
              : p;
          }));
        }
        
        if (Array.isArray(savedPeople)) {
          setPeople(prev => prev.map(p => {
            const saved = savedPeople.find((sp: any) => sp.id === p.id);
            return saved && typeof saved.x === 'number' && typeof saved.y === 'number'
              ? { ...p, x: saved.x, y: saved.y } 
              : p;
          }));
        }
        
        if (Array.isArray(savedBrands)) {
          setBrands(prev => prev.map(b => {
            const saved = savedBrands.find((sb: any) => sb.id === b.id);
            return saved && typeof saved.x === 'number' && typeof saved.y === 'number'
              ? { ...b, x: saved.x, y: saved.y } 
              : b;
          }));
        }
        
        toast.success('Design carregado com sucesso!');
      } catch (error) {
        console.error('Erro ao carregar design salvo:', error);
        toast.error('Erro ao carregar design salvo');
      }
    }
  }, []);
  
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
    
    // Update state
    setPeople(prev => [...prev, ...newPeople]);
    setBrands(prev => [...prev, ...newBrands]);
    setAllConnections(prev => [...prev, ...newConnections]);
    
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
    
    // 1. Add people/brands AND projects directly connected to the project
    allConnections.forEach(c => {
      if (c.from === projectId) {
        const node = byId.get(c.to);
        if (node) included.add(c.to); // Include all types, including projects
      }
      if (c.to === projectId) {
        const node = byId.get(c.from);
        if (node) included.add(c.from); // Include all types, including projects
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
    
    // 3. Include ALL non-project nodes that belong to this project (even without active connections)
    allNodesWithAnchors.forEach(n => {
      if (n.type !== 'project' && belongsToProject(n, projectId)) {
        included.add(n.id);
      }
    });

    // 4. Include sibling projects that share the same flow_id as the center (if any)
    const centerFlowId = (projectNode as any).flow_id;
    if (centerFlowId) {
      allNodesWithAnchors.forEach(n => {
        if (n.type === 'project' && n.id !== projectId && (n as any).flow_id === centerFlowId) {
          included.add(n.id);
        }
      });
    }
    
    // Return nodes: project first, then others
    return [projectNode, ...Array.from(included).filter(id => id !== projectId).map(id => byId.get(id)!).filter(Boolean)];
  };

  // Filtrar nós e conexões por projeto/modo
  const nodes = viewMode === 'master'
    ? allNodesWithAnchors
        .filter(n => n.type === 'project' || n.anchorProjectId !== null) // Ocultar nós órfãos
        .map(n => {
          const project = projects.find(p => p.id === n.anchorProjectId);
          // Se o nó é um projeto, usa o flow_id dele; se não, usa o flow_id do projeto âncora
          const flowId = n.type === 'project' ? n.flow_id : project?.flow_id;
          return { ...n, projectId: project?.id, projectColor: project ? '#8b5cf6' : '#6366f1', flow_id: flowId };
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
        
        // Mostrar conexão apenas se ambos os nós estão visíveis
        return fromNode && toNode;
      });

  // Real history implementation
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Mouse wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Posição do mouse no espaço do canvas (antes do zoom)
    const worldX = (mouseX - state.pan.x) / state.zoom;
    const worldY = (mouseY - state.pan.y) / state.zoom;
    
    // Calcular novo zoom (scroll up = zoom in, scroll down = zoom out)
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, state.zoom * delta));
    
    // Ajustar pan para manter o mouse sobre o mesmo ponto
    const newPan = {
      x: mouseX - worldX * newZoom,
      y: mouseY - worldY * newZoom
    };
    
    updateState({ zoom: newZoom, pan: newPan });
  };

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
    const isProject = projects.find(p => p.id === nodeId);
    const isPerson = people.find(p => p.id === nodeId);
    const isBrand = brands.find(b => b.id === nodeId);
    
    let newX: number, newY: number;
    let tableName: 'projects' | 'people' | 'brands' | null = null;
    
    if (isProject) {
      newX = isProject.x + deltaX;
      newY = isProject.y + deltaY;
      tableName = 'projects';
      
      setProjects(prev => prev.map(p => 
        p.id === nodeId ? { ...p, x: newX, y: newY, isNewHighlight: false } : p
      ));
    } else if (isPerson) {
      newX = isPerson.x + deltaX;
      newY = isPerson.y + deltaY;
      tableName = 'people';
      
      setPeople(prev => prev.map(p => 
        p.id === nodeId ? { ...p, x: newX, y: newY, isNewHighlight: false } : p
      ));
    } else if (isBrand) {
      newX = isBrand.x + deltaX;
      newY = isBrand.y + deltaY;
      tableName = 'brands';
      
      setBrands(prev => prev.map(b => 
        b.id === nodeId ? { ...b, x: newX, y: newY, isNewHighlight: false } : b
      ));
    } else {
      return; // Nó não encontrado
    }
    
    // Salvar no Supabase apenas no Single View (não bloqueia a UI)
    if (tableName && viewMode === 'single' && user) {
      try {
        const { error } = await supabase
          .from(tableName)
          .update({ x: newX, y: newY })
          .eq('id', nodeId)
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Erro ao salvar posição do nó:', error);
        }
      } catch (err) {
        console.error('Erro ao persistir posição:', err);
      }
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

  const setConnections = async (updater) => {
    const newConnections = typeof updater === 'function' ? updater(allConnections) : updater;
    setAllConnections(newConnections);
    
    // Identificar conexões novas (sem id do Supabase)
    const toCreate = newConnections.filter(c => !c.id);
    if (toCreate.length === 0) return;
    
    // Preparar payload para inserção
    const payload = toCreate.map(c => {
      const fromNode = allNodes.find(n => n.id === c.from);
      const toNode = allNodes.find(n => n.id === c.to);
      // No Single View, usar o flow_id do projeto ativo; no Master, deixar null
      const flowId = viewMode === 'single' 
        ? projects.find(p => p.id === activeProjectId)?.flow_id 
        : null;
      return {
        user_id: user.id,
        from_id: c.from,
        to_id: c.to,
        from_type: fromNode?.type,
        to_type: toNode?.type,
        connection_type: c.type || 'strong',
        flow_id: flowId
      };
    });
    
    // Inserir no banco
    const { data, error } = await supabase
      .from('connections')
      .insert(payload)
      .select();
      
    if (error) {
      console.error('Erro ao criar conexão:', error);
      toast.error('Erro ao criar conexão');
      return;
    }
    
    // Atualizar estado local com IDs do Supabase
    setAllConnections(prev => {
      const updated = [...prev];
      let dataIndex = 0;
      for (let i = 0; i < updated.length; i++) {
        if (!updated[i].id && data && data[dataIndex]) {
          updated[i] = { ...updated[i], id: data[dataIndex].id };
          dataIndex++;
        }
      }
      return updated;
    });
    
    toast.success('Conexão criada!');
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

  // Auto-centralizar quando voltar para Master View
  useEffect(() => {
    if (viewMode === 'master' && projects.length > 0 && allNodes.length > 0) {
      
      // Se já existe estado salvo do Master View, RESTAURAR ao invés de reorganizar
      if (masterViewState && masterViewState.hasBeenOrganized) {
        updateState({
          zoom: masterViewState.zoom,
          pan: masterViewState.pan
        });
        return; // NÃO reorganiza, apenas restaura a view
      }
      
      // Se é a primeira vez (ou clicou em "Centralizar"), organiza tudo
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
            
            // Salvar esse estado inicial como referência
            setMasterViewState({
              zoom: optimalZoom,
              pan: centerPan,
              hasBeenOrganized: true
            });
            
            toast.success('Nós organizados e centralizados!');
          }
        }, 150);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode, masterViewState]);

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

  // Guarda contra reset do flow quando o centro perde conexões
  useEffect(() => {
    if (viewMode === 'single' && activeProjectId) {
      const isCenterStillVisible = allNodesWithAnchors.some(n => n.id === activeProjectId);
      // Só sair do flow se o centro foi realmente removido do estado
      if (!isCenterStillVisible) {
        setActiveProjectId(null);
        setViewMode('master');
      }
    }
  }, [viewMode, activeProjectId, allNodesWithAnchors]);

  // 🧩 Protege o nó central de sumir após deletar conexões
  useEffect(() => {
    if (viewMode === 'single' && activeProjectId) {
      // Verifica se o nó central ainda existe na lista de projetos
      const centerNode = projects.find(p => p.id === activeProjectId);
      if (!centerNode) return; // se realmente foi deletado, sai

      // Verifica se o centro ainda está visível na lista de nós renderizados
      const stillVisible = nodes.some(n => n.id === activeProjectId);

      // Se o nó central existe, mas não está visível, força re-render
      if (!stillVisible) {
        setProjects(prev => {
          const exists = prev.some(p => p.id === centerNode.id);
          return exists ? prev : [...prev, centerNode];
        });
      }
    }
  }, [viewMode, activeProjectId, nodes, projects]);

  // Keyboard shortcuts are initialized after deleteConnection is defined to avoid hoisting issues.

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

  const deleteConnection = async (connectionIndex: number) => {
    // 🔹 Salvar histórico antes da alteração
    saveToHistory();

    const conn = allConnections[connectionIndex];
    if (!conn) return;

    // 🔹 Limpar seleção de nós antes de deletar
    setSelectedNodes([]);

    try {
      // 🔹 Deletar apenas a conexão do Supabase (se tiver ID)
      if (conn.id) {
        const { error } = await supabase
          .from('connections')
          .delete()
          .eq('id', conn.id);

        if (error) {
          console.error('Erro ao deletar conexão:', error);
          toast.error('Erro ao deletar conexão no banco');
          return;
        }
      }

      // 🔹 Fixar "filiação" antes de remover (para manter nó visível em Single View)
      if (viewMode === 'single' && activeProjectId) {
        const otherId =
          conn.from === activeProjectId ? conn.to :
          conn.to === activeProjectId ? conn.from :
          null;

        if (otherId) {
          const otherNode =
            people.find(p => p.id === otherId) ||
            brands.find(b => b.id === otherId) ||
            projects.find(p => p.id === otherId);

          if (otherNode && !('homeProjectId' in otherNode)) {
            if (people.find(p => p.id === otherId)) {
              setPeople(prev => prev.map(p => p.id === otherId ? { ...p, homeProjectId: activeProjectId } : p));
            } else if (brands.find(b => b.id === otherId)) {
              setBrands(prev => prev.map(b => b.id === otherId ? { ...b, homeProjectId: activeProjectId } : b));
            } else if (projects.find(p => p.id === otherId)) {
              setProjects(prev => prev.map(p => p.id === otherId ? { ...p, homeProjectId: activeProjectId } : p));
            }
          }
        }
      }

      // 🔹 Remover conexão apenas do estado local
      setAllConnections(prev => prev.filter((_, idx) => idx !== connectionIndex));

      // 🔹 Limpar seleção de conexão
      setSelectedConnection(null);

      // 🔹 Manter tudo mais como está
      toast.success('Conexão deletada!');
    } catch (err) {
      console.error('Erro ao deletar conexão:', err);
      toast.error('Erro inesperado ao deletar conexão');
    }
  };

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
    deleteConnectionByIndex: deleteConnection,
    setMasterViewState,
    autoOrganize,
  });

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

  const handleNodeCreation = async (nodeData: any) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    saveToHistory();
    
    // Set default fields for projects
    if (nodeCreationType === 'project') {
      const centerFlowId = (viewMode === 'single' && activeProjectId)
        ? (projects.find(p => p.id === activeProjectId)?.flow_id ?? null)
        : null;
      const projectData = {
        name: nodeData.name,
        x: nodeCreationPosition.x,
        y: nodeCreationPosition.y,
        category: nodeData.category || 'M',
        status: nodeData.projectStatus || nodeData.status || 'ativo',
        deadline: nodeData.startDate || nodeData.deadline || null,
        user_id: user.id,
        ...(centerFlowId ? { flow_id: centerFlowId } : {})
      };
      
      // Inserir no Supabase
      const { data: insertedProject, error } = (await (supabase as any)
        .from('projects')
        .insert([projectData])
        .select()
        .maybeSingle());
      
      if (error || !insertedProject) {
        console.error('Erro ao criar projeto:', error);
        toast.error('Erro ao criar projeto');
        return;
      }
      
      // Atualizar com o ID real do banco
      const newNode = {
        ...insertedProject,
        type: 'project',
        workflows: nodeData.workflows || [],
        isNewHighlight: true
      };
      
      // Adicionar ao estado local
      setProjects(prev => [...prev, newNode]);
      setShowNodeCreationModal(false);
      
      // Apenas notificar o usuário - não criar flow automaticamente
      if (viewMode === 'single' && activeProjectId) {
        toast.success(`Projeto "${newNode.name}" adicionado ao flow atual!`);
      } else {
        toast.success(`Projeto "${newNode.name}" criado!`);
      }
    } else if (nodeCreationType === 'person') {
      const personData = {
        name: nodeData.name,
        x: nodeCreationPosition.x,
        y: nodeCreationPosition.y,
        email: nodeData.email || null,
        phone: nodeData.phone || null,
        company: nodeData.company || null,
        category: nodeData.category || null,
        user_id: user.id
      };
      
      // Inserir no Supabase
      const { data: insertedPerson, error } = (await (supabase as any)
        .from('people')
        .insert([personData])
        .select()
        .maybeSingle());
      
      if (error || !insertedPerson) {
        console.error('Erro ao criar pessoa:', error);
        toast.error('Erro ao criar pessoa');
        return;
      }
      
      const newNode = {
        ...insertedPerson,
        type: 'person',
        isNewHighlight: true,
        ...(viewMode === 'single' && activeProjectId ? { homeProjectId: activeProjectId } : {})
      };
      
      setPeople(prev => [...prev, newNode]);
      setShowNodeCreationModal(false);
      
      toast.success(`${newNode.name} criado!`);
      
      // Center view on the new node
      setTimeout(() => {
        const zoom = state.zoom;
        updateState({
          pan: {
            x: window.innerWidth / 2 - newNode.x * zoom,
            y: window.innerHeight / 2 - newNode.y * zoom
          }
        });
      }, 50);
    } else if (nodeCreationType === 'brand') {
      const brandData = {
        name: nodeData.name,
        x: nodeCreationPosition.x,
        y: nodeCreationPosition.y,
        website: nodeData.website || null,
        category: nodeData.category || null,
        user_id: user.id
      };
      
      // Inserir no Supabase
      const { data: insertedBrand, error } = (await (supabase as any)
        .from('brands')
        .insert([brandData])
        .select()
        .maybeSingle());
      
      if (error || !insertedBrand) {
        console.error('Erro ao criar marca:', error);
        toast.error('Erro ao criar marca');
        return;
      }
      
      const newNode = {
        ...insertedBrand,
        type: 'brand',
        isNewHighlight: true,
        ...(viewMode === 'single' && activeProjectId ? { homeProjectId: activeProjectId } : {})
      };
      
      setBrands(prev => [...prev, newNode]);
      setShowNodeCreationModal(false);
      
      toast.success(`${newNode.name} criado!`);
      
      // Center view on the new node
      setTimeout(() => {
        const zoom = state.zoom;
        updateState({
          pan: {
            x: window.innerWidth / 2 - newNode.x * zoom,
            y: window.innerHeight / 2 - newNode.y * zoom
          }
        });
      }, 50);
    }
  };

  const handleAddWorkflow = (name: string, color: string) => {
    const newWorkflow = {
      id: Date.now(),
      name,
      color,
      description: ''
    };
    setWorkflows([...workflows, newWorkflow]);
    toast.success(`Workflow "${name}" criado!`);
  };

  const handleNodeUpdate = (updatedData: any) => {
    if (editingNodeInModal) {
      saveToHistory();
      
      // Update the correct array based on node type
      if (editingNodeInModal.type === 'project') {
        setProjects(prev => prev.map(n => n.id === editingNodeInModal.id ? { ...n, ...updatedData } : n));
      } else if (editingNodeInModal.type === 'person') {
        setPeople(prev => prev.map(n => n.id === editingNodeInModal.id ? { ...n, ...updatedData } : n));
      } else if (editingNodeInModal.type === 'brand') {
        setBrands(prev => prev.map(n => n.id === editingNodeInModal.id ? { ...n, ...updatedData } : n));
      }
      
      setShowNodeCreationModal(false);
      setEditingNodeInModal(null);
      updateState({ showSidebar: false });
    }
  };

  const handleCreateNewProject = () => {
    const newProject = {
      id: Date.now(),
      name: `Projeto ${projects.length + 1}`,
      type: 'project' as const,
      workflows: workflows.length > 0 ? [workflows[0].id] : [],
      category: 'P' as const,
      status: 'Ativo' as const,
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

  const handleDeleteProject = (projectId: number, projectName: string) => {
    if (projects.length <= 1) {
      alert('Você precisa ter pelo menos um projeto!');
      return;
    }
    
    if (confirm(`Deletar projeto "${projectName}"?`)) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (activeProjectId === projectId) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        setActiveProjectId(remainingProjects[0].id);
      }
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
                        // Salvar estado atual do Master View antes de trocar
                        if (viewMode === 'master') {
                          setMasterViewState({
                            zoom: state.zoom,
                            pan: state.pan,
                            hasBeenOrganized: true
                          });
                        }
                        
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
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setShowFlowsManager(!showFlowsManager)}
                    className={`p-2 rounded-lg transition-all ${showFlowsManager ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                    <Layers size={18} />
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
          onWheel={handleWheel}
          selectedConnection={selectedConnection}
          setSelectedConnection={setSelectedConnection}
          highlightedPath={highlightedPath}
          hoveredNode={hoveredNode}
          setHoveredNode={setHoveredNode}
          updateNodePosition={updateNodePosition}
          setConnections={setConnections}
          saveToHistory={saveToHistory}
          projects={projects}
          flows={flows}
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
              // Resetar estado do Master View para forçar reorganização
              setMasterViewState(null);
              
              // Se estiver no Master View, reorganiza imediatamente
              if (viewMode === 'master') {
                autoOrganize();
              } else {
                // Se estiver no Single View, centraliza nele mesmo
                const width = window.innerWidth;
                const height = window.innerHeight - 100;
                const bounds = calculateBounds(nodes);
                const zoom = calculateOptimalZoom(bounds, width, height);
                const pan = calculateCenterPan(bounds, zoom, width, height);
                updateState({ zoom, pan });
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

        {showFlowsManager && (
          <ProjectManagerPanel
            flows={flows}
            projects={projects}
            workflows={workflows}
            people={people}
            brands={brands}
            connections={allConnections}
            onClose={() => setShowFlowsManager(false)}
            onFlowFocus={(centerId) => {
              setActiveProjectId(centerId);
              setViewMode('single');
              setShowFlowsManager(false);
              
              // First timeout: let React recalculate nodes
              setTimeout(() => {
                autoOrganizeSingle(centerId);
              }, 50);
              
              // Second timeout: center view after layout is done
              setTimeout(() => {
                const width = window.innerWidth;
                const height = window.innerHeight - 100;
                
                // Get the actual nodes after layout (recalculated by React)
                const currentNodes = getNodesForSingleView(centerId);
                
                if (currentNodes.length > 0) {
                  const bounds = calculateBounds(currentNodes);
                  const zoom = calculateOptimalZoom(bounds, width, height);
                  const pan = calculateCenterPan(bounds, zoom, width, height);
                  updateState({ zoom, pan });
                }
              }, 300);
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

        {user && <ResetButton onResetComplete={reloadData} userId={user.id} />}
      </div>
    </div>
  );
};
