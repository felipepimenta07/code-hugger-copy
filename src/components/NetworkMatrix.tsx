import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ZoomIn, ZoomOut, X, Building2, User, FolderKanban, Undo2, Redo2, LayoutGrid, Maximize2, Info, Layers, BarChart3, Route, Sparkles, Target, Save, MessageCircle, LogOut, Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
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
import { AIConnectionModal } from './AIConnectionModal';
import { FlowStarterModal } from './FlowStarterModal';
import { PathIndicator } from './PathIndicator';
import { FlowManagerPanel } from './FlowManagerPanel';
import { OpportunitiesPanel } from './OpportunitiesPanel';

import { ResetButton } from './ResetButton';
import { DuplicateCheckDialog } from './DuplicateCheckDialog';
import { WhatsAppNotifications } from './WhatsAppNotifications';
import { NetworkSidebar } from './NetworkSidebar';
import { GlassButton } from '@/components/ui/glass-button';
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

interface NetworkMatrixProps {
  onOpenWhatsApp?: () => void;
  onLogout?: () => void;
}

export const NetworkMatrix = ({ onOpenWhatsApp, onLogout }: NetworkMatrixProps = {}) => {
  const { user } = useAuth();
  
  // Nova arquitetura: separar projetos, pessoas e marcas
  const [projects, setProjects] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [allConnections, setAllConnections] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [autoOrganizeEnabled, setAutoOrganizeEnabled] = useState(true);

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
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isCreatingFlowRoot, setIsCreatingFlowRoot] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(false);
  const [aiConnectionModal, setAiConnectionModal] = useState<{
    connection: any;
    nodes: any[];
    type: 'hidden' | 'bridge' | 'opportunity' | 'alert' | 'action';
  } | null>(null);
  // Estado para dialog de duplicatas
  const [duplicateCheckModal, setDuplicateCheckModal] = useState<{
    show: boolean;
    existingNode: any;
    newNodeData: any;
    nodeType: 'person' | 'project' | 'brand';
  } | null>(null);
  
  // Estado para memorizar visualização do Master View
  const [masterViewState, setMasterViewState] = useState<{
    zoom: number;
    pan: { x: number; y: number };
    hasBeenOrganized: boolean;
  } | null>(null);

  // Ref para rastrear mudança de viewMode (Single → Master)
  const prevViewModeRef = useRef<string>(viewMode);

  const { state, updateState } = useNetworkState();
  const svgRef = useRef(null);
  const isDraggingRef = useRef(false);
  // Ignora updates de realtime originados por este cliente por alguns ms
  const recentUpdatesRef = useRef<Set<string>>(new Set());

  // Função para recarregar dados após reset
  const reloadData = async (options?: { forceReset?: boolean }) => {
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
      
      // Apenas resetar view se for um reset explícito (ex: botão Reset)
      // Preservar Single View durante updates normais (drag, edições, etc)
      const shouldResetView = options?.forceReset === true;
      
      if (shouldResetView) {
        setActiveProjectId(null);
        setViewMode('master');
        setSelectedNodes([]);
        setSelectedConnection(null);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Monitorar drag para prevenir reloads durante arrasto
  useEffect(() => {
    isDraggingRef.current = state.dragging !== null;
  }, [state.dragging]);

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
          
          // Auto-organizar Master View na primeira vez (se todas as posições master forem 0,0)
          const needsMasterOrganization = 
            projectsRes.data.every((p: any) => (p.master_x ?? 0) === 0 && (p.master_y ?? 0) === 0) &&
            (!peopleRes.data || peopleRes.data.every((p: any) => (p.master_x ?? 0) === 0 && (p.master_y ?? 0) === 0)) &&
            (!brandsRes.data || brandsRes.data.every((b: any) => (b.master_x ?? 0) === 0 && (b.master_y ?? 0) === 0));
          
          if (needsMasterOrganization) {
            console.log('Organizando Master View automaticamente...');
            
            // Aplicar radial layout nos projetos
            const centerX = 400;
            const centerY = 300;
            const radius = 250;
            const angleStep = (2 * Math.PI) / projectsRes.data.length;
            
            for (let i = 0; i < projectsRes.data.length; i++) {
              const proj = projectsRes.data[i];
              const angle = i * angleStep;
              const newX = centerX + radius * Math.cos(angle);
              const newY = centerY + radius * Math.sin(angle);
              
              await supabase
                .from('projects')
                .update({ master_x: newX, master_y: newY })
                .eq('id', proj.id)
                .eq('user_id', user.id);
            }
            
            toast.success('Master View organizado automaticamente');
          }
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

  // Realtime: escutar mudanças no banco de dados
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('network-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'flows', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Novo flow detectado:', payload.new);
          toast.success('Novo flow criado!');
          reloadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'people', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Nova pessoa detectada:', payload.new);
          reloadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Novo projeto detectado:', payload.new);
          reloadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'brands', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Nova marca detectada:', payload.new);
          reloadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'connections', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Nova conexão detectada:', payload.new);
          reloadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'flows', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const key = `flows:${payload.new.id}`;
          if (recentUpdatesRef.current.has(key) || isDraggingRef.current) return;
          reloadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'people', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const key = `people:${payload.new.id}`;
          if (recentUpdatesRef.current.has(key) || isDraggingRef.current) return;
          reloadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const key = `projects:${payload.new.id}`;
          if (recentUpdatesRef.current.has(key) || isDraggingRef.current) return;
          reloadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'brands', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const key = `brands:${payload.new.id}`;
          if (recentUpdatesRef.current.has(key) || isDraggingRef.current) return;
          reloadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'flows', filter: `user_id=eq.${user.id}` },
        () => {
          toast.info('Flow removido');
          reloadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'people', filter: `user_id=eq.${user.id}` },
        () => reloadData()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` },
        () => reloadData()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'brands', filter: `user_id=eq.${user.id}` },
        () => reloadData()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'connections', filter: `user_id=eq.${user.id}` },
        () => reloadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Garantir que selecionar uma conexão limpa a seleção de nós
  useEffect(() => {
    if (selectedConnection !== null) {
      setSelectedNodes([]);
    }
  }, [selectedConnection]);

  // Combinar todos os nós e mapear posições corretas baseado no viewMode
  const allNodesRaw = [...projects, ...people, ...brands];
  const allNodes = React.useMemo(() => 
    allNodesRaw.map(node => ({
      ...node,
      x: viewMode === 'master' ? (node.master_x ?? node.x) : node.x,
      y: viewMode === 'master' ? (node.master_y ?? node.y) : node.y,
    })),
    [allNodesRaw, viewMode]
  );
  
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

  // Função para importar dados do LinkedIn — persiste no Supabase
  const handleLinkedInImport = async (data: ParsedLinkedInData, options: LinkedInImportOptions) => {
    if (!user) return;
    saveToHistory();

    const sb = supabase as any;
    const toastId = toast.loading(`Importando ${data.totalContacts} contatos do LinkedIn...`);

    try {
      // Passo 1: Criar um flow único para essa importação
      const flowName = `LinkedIn Import - ${new Date().toLocaleDateString('pt-BR')}`;
      const { data: newFlow, error: flowError } = await sb.from('flows').insert({
        user_id: user.id,
        name: flowName,
        center_type: 'person',
        center_id: 1, // placeholder, atualizado abaixo
      }).select().maybeSingle();

      if (flowError || !newFlow) throw flowError || new Error('Falha ao criar flow de importação');

      // Passo 2: Criar marcas (brands) das empresas únicas
      const brandMap = new Map<string, number>();
      if (options.createBrands && data.uniqueCompanies.length > 0) {
        const brandsToInsert = data.uniqueCompanies.map((company) => ({
          user_id: user.id,
          flow_id: newFlow.id,
          name: company,
          category: null,
          x: Math.random() * 400 + 100,
          y: Math.random() * 400 + 100,
          master_x: 0,
          master_y: 0,
        }));
        const { data: createdBrands, error: brandsError } = await sb
          .from('brands').insert(brandsToInsert).select();
        if (brandsError) throw brandsError;
        (createdBrands || []).forEach((b: any, i: number) => {
          brandMap.set(data.uniqueCompanies[i], b.id);
          setBrands(prev => [...prev, { ...b, type: 'brand' }]);
        });
      }

      // Passo 3: Criar pessoas em lote
      const peopleToInsert = data.contacts.map((contact) => ({
        user_id: user.id,
        flow_id: newFlow.id,
        name: `${contact.firstName} ${contact.lastName}`.trim() || 'Contato LinkedIn',
        email: contact.email || null,
        company: contact.company || null,
        category: options.defaultCategory,
        notes: contact.profileUrl ? `LinkedIn: ${contact.profileUrl}` : null,
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
        master_x: 0,
        master_y: 0,
      }));

      const { data: createdPeople, error: peopleError } = await sb
        .from('people').insert(peopleToInsert).select();
      if (peopleError) throw peopleError;

      // Atualizar flow center para a primeira pessoa real
      if (createdPeople && createdPeople.length > 0) {
        await sb.from('flows').update({ center_id: createdPeople[0].id }).eq('id', newFlow.id);
        setPeople(prev => [...prev, ...createdPeople.map((p: any) => ({ ...p, type: 'person' }))]);
      }

      // Passo 4: Criar conexões (pessoa → marca e pessoa → projeto)
      const connectionsToInsert: any[] = [];
      (createdPeople || []).forEach((person: any, i: number) => {
        const contact = data.contacts[i];
        if (contact.company && options.createBrands && brandMap.has(contact.company)) {
          connectionsToInsert.push({
            user_id: user.id,
            flow_id: newFlow.id,
            from_id: person.id,
            from_type: 'person',
            to_id: brandMap.get(contact.company)!,
            to_type: 'brand',
            connection_type: 'works-at',
          });
        }
        if (options.connectToProject && options.projectId) {
          connectionsToInsert.push({
            user_id: user.id,
            flow_id: newFlow.id,
            from_id: person.id,
            from_type: 'person',
            to_id: options.projectId,
            to_type: 'project',
            connection_type: 'related',
          });
        }
      });

      if (connectionsToInsert.length > 0) {
        const { data: createdConns, error: connsError } = await sb
          .from('connections').insert(connectionsToInsert).select();
        if (connsError) throw connsError;
        if (createdConns) {
          setAllConnections(prev => [
            ...prev,
            ...createdConns.map((c: any) => ({
              ...c, from: c.from_id, to: c.to_id, type: c.connection_type
            }))
          ]);
        }
      }

      setFlows(prev => [...prev, newFlow]);

      toast.dismiss(toastId);
      toast.success(
        `LinkedIn importado! ${createdPeople?.length || 0} pessoas` +
        (brandMap.size > 0 ? `, ${brandMap.size} marcas` : '') +
        (connectionsToInsert.length > 0 ? `, ${connectionsToInsert.length} conexões` : '') +
        ` no flow "${flowName}"`
      );
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error('Erro na importação LinkedIn', { description: error?.message });
      console.error('handleLinkedInImport error:', error);
    }
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

  // Helper: Get flow_id from any node type (project, person, or brand)
  const getCurrentFlowIdFromProjectId = (id: number): number | null => {
    // Check in projects first
    const projectFlow = projects.find(p => p.id === id)?.flow_id;
    if (projectFlow) return projectFlow;
    
    // Then check in people
    const personFlow = people.find(p => p.id === id)?.flow_id;
    if (personFlow) return personFlow;
    
    // Finally check in brands
    const brandFlow = brands.find(b => b.id === id)?.flow_id;
    if (brandFlow) return brandFlow;
    
    return null;
  };

  // Helper to get nodes for Single View (filtered by flow_id)
  const getNodesForSingleView = (projectId: number) => {
    const currentFlowId = getCurrentFlowIdFromProjectId(projectId);
    console.log('🔍 Single View Debug:', {
      projectId,
      currentFlowId,
      allNodesCount: allNodes.length,
      projectsCount: projects.length,
      peopleCount: people.length,
      brandsCount: brands.length
    });
    
    if (!currentFlowId) {
      console.log('❌ No flow_id found for project:', projectId);
      return [];
    }
    
    // Filtrar TODOS os nós que pertencem a este flow
    const flowNodes = allNodes.filter(node => node.flow_id === currentFlowId);
    console.log('✅ Flow nodes found:', flowNodes.length, flowNodes);

    // Reordenar garantindo o NÓ RAIZ (flows.center_id/type) na primeira posição
    const flow = flows.find(f => f.id === currentFlowId);
    if (!flow) return flowNodes;

    const getByType = (type: string, id: number) => {
      if (type === 'project') return projects.find(p => p.id === id);
      if (type === 'person') return people.find(p => p.id === id);
      if (type === 'brand') return brands.find(b => b.id === id);
      return null;
    };

    const center = flow.center_id ? getByType(flow.center_type, flow.center_id) : null;
    if (!center) return flowNodes;

    const reordered = [center, ...flowNodes.filter(n => n.id !== center.id)];
    return reordered;
  };

  // Filtrar nós e conexões por projeto/modo
  const nodes = viewMode === 'master'
    ? allNodes.filter(n => n.flow_id !== null && n.flow_id !== undefined) // Mostrar apenas nós com flow_id válido
    : (activeProjectId ? getNodesForSingleView(activeProjectId) : []);

  // Para o PathIndicator
  const selectedNode = selectedNodes.length === 1 
    ? allNodes.find(n => n.id === selectedNodes[0]) 
    : null;

  const centerNode = (viewMode === 'single' && activeProjectId) ? (() => {
    const currentFlowId = getCurrentFlowIdFromProjectId(activeProjectId);
    const flow = flows.find(f => f.id === currentFlowId);
    if (!flow) return null;
    if (flow.center_type === 'project') return projects.find(p => p.id === flow.center_id) || null;
    if (flow.center_type === 'person') return people.find(p => p.id === flow.center_id) || null;
    if (flow.center_type === 'brand') return brands.find(b => b.id === flow.center_id) || null;
    return null;
  })() : null;

  const connections = viewMode === 'master'
    ? allConnections
    : allConnections.filter(c => {
        // Verificar se ambos os nós da conexão pertencem ao flow atual
        const currentFlowId = activeProjectId ? getCurrentFlowIdFromProjectId(activeProjectId) : null;
        
        const fromNode = allNodes.find(n => 
          n.id === c.from && 
          n.flow_id === currentFlowId
        );
        
        const toNode = allNodes.find(n => 
          n.id === c.to && 
          n.flow_id === currentFlowId
        );
        
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
    const delta = e.deltaY > 0 ? 0.97 : 1.03;
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
  const updateNodePosition = async (nodeId: number, deltaX: number, deltaY: number, saveToDb: boolean = false) => {
    if (!user) return;
    
    const isProject = projects.find(p => p.id === nodeId);
    const isPerson = people.find(p => p.id === nodeId);
    const isBrand = brands.find(b => b.id === nodeId);
    
    let newX: number, newY: number;
    let tableName: 'projects' | 'people' | 'brands' | null = null;
    
    // Determinar colunas a atualizar baseado no viewMode
    const xColumn = viewMode === 'master' ? 'master_x' : 'x';
    const yColumn = viewMode === 'master' ? 'master_y' : 'y';
    
    if (isProject) {
      const currentX = viewMode === 'master' ? (isProject.master_x ?? isProject.x) : isProject.x;
      const currentY = viewMode === 'master' ? (isProject.master_y ?? isProject.y) : isProject.y;
      newX = currentX + deltaX;
      newY = currentY + deltaY;
      tableName = 'projects';
      
      setProjects(prev => prev.map(p => 
        p.id === nodeId 
          ? { 
              ...p, 
              ...(viewMode === 'master' ? { master_x: newX, master_y: newY } : { x: newX, y: newY }),
              isNewHighlight: false 
            } 
          : p
      ));
    } else if (isPerson) {
      const currentX = viewMode === 'master' ? (isPerson.master_x ?? isPerson.x) : isPerson.x;
      const currentY = viewMode === 'master' ? (isPerson.master_y ?? isPerson.y) : isPerson.y;
      newX = currentX + deltaX;
      newY = currentY + deltaY;
      tableName = 'people';
      
      setPeople(prev => prev.map(p => 
        p.id === nodeId 
          ? { 
              ...p,
              ...(viewMode === 'master' ? { master_x: newX, master_y: newY } : { x: newX, y: newY }),
              isNewHighlight: false 
            } 
          : p
      ));
    } else if (isBrand) {
      const currentX = viewMode === 'master' ? (isBrand.master_x ?? isBrand.x) : isBrand.x;
      const currentY = viewMode === 'master' ? (isBrand.master_y ?? isBrand.y) : isBrand.y;
      newX = currentX + deltaX;
      newY = currentY + deltaY;
      tableName = 'brands';
      
      setBrands(prev => prev.map(b => 
        b.id === nodeId 
          ? { 
              ...b,
              ...(viewMode === 'master' ? { master_x: newX, master_y: newY } : { x: newX, y: newY }),
              isNewHighlight: false 
            } 
          : b
      ));
    } else {
      return; // Nó não encontrado
    }
    
    // Salvar no Supabase APENAS quando saveToDb = true (ao finalizar drag)
    if (saveToDb && tableName && user) {
      try {
        const { error } = await supabase
          .from(tableName)
          .update({ [xColumn]: newX, [yColumn]: newY })
          .eq('id', nodeId)
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Erro ao salvar posição do nó:', error);
        } else {
          // Marcar este update como "próprio" por alguns ms para evitar reloadData de realtime
          const key = `${tableName}:${nodeId}`;
          recentUpdatesRef.current.add(key);
          setTimeout(() => recentUpdatesRef.current.delete(key), 1200);
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
      // No Single View, usar o flow_id atual; no Master, deixar null
      const flowId = getCurrentFlowId();
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

  const updateAllNodePositions = async (layoutedNodes: any[]) => {
    if (!user) return;
    
    // Determinar colunas baseado no viewMode
    const xColumn = viewMode === 'master' ? 'master_x' : 'x';
    const yColumn = viewMode === 'master' ? 'master_y' : 'y';
    
    for (const node of layoutedNodes) {
      const isProject = projects.find(p => p.id === node.id);
      const isPerson = people.find(p => p.id === node.id);
      const isBrand = brands.find(b => b.id === node.id);
      
      let tableName: 'projects' | 'people' | 'brands' | null = null;
      
      if (isProject) {
        tableName = 'projects';
        setProjects(prev => prev.map(p => 
          p.id === node.id 
            ? { ...p, ...(viewMode === 'master' ? { master_x: node.x, master_y: node.y } : { x: node.x, y: node.y }) } 
            : p
        ));
      } else if (isPerson) {
        tableName = 'people';
        setPeople(prev => prev.map(p => 
          p.id === node.id 
            ? { ...p, ...(viewMode === 'master' ? { master_x: node.x, master_y: node.y } : { x: node.x, y: node.y }) } 
            : p
        ));
      } else if (isBrand) {
        tableName = 'brands';
        setBrands(prev => prev.map(b => 
          b.id === node.id 
            ? { ...b, ...(viewMode === 'master' ? { master_x: node.x, master_y: node.y } : { x: node.x, y: node.y }) } 
            : b
        ));
      }
      
      // Salvar no banco de dados
      if (tableName) {
        await supabase
          .from(tableName)
          .update({ [xColumn]: node.x, [yColumn]: node.y })
          .eq('id', node.id)
          .eq('user_id', user.id);
      }
    }
  };

  const autoOrganizeSingle = async (projectId: number | null) => {
    if (!projectId) return;
    const nodesToLayout = getNodesForSingleView(projectId);
    if (nodesToLayout.length === 0) return;

    // Encontrar o nó central (centro do flow)
    const currentFlowId = getCurrentFlowIdFromProjectId(projectId);
    const flow = flows.find(f => f.id === currentFlowId);
    
    let centerNode = nodesToLayout.find(n => n.id === flow?.center_id && n.type === flow?.center_type);
    if (!centerNode) {
      centerNode = nodesToLayout[0]; // Fallback: primeiro nó
    }
    
    // Reordenar para ter centro primeiro
    const reorderedNodes = [
      centerNode,
      ...nodesToLayout.filter(n => n.id !== centerNode.id)
    ];

    const layouted = applyRadialLayout(reorderedNodes, 500, 300);
    await updateAllNodePositions(layouted);
  };

  // Auto-organização Master View: flows como "sistemas solares"
  const autoOrganizeMaster = async () => {
    if (!user) return;
    
    // Agrupar nós por flow_id
    const nodesByFlow = new Map<number, any[]>();
    
    allNodes.forEach(node => {
      if (!node.flow_id) return;
      
      if (!nodesByFlow.has(node.flow_id)) {
        nodesByFlow.set(node.flow_id, []);
      }
      nodesByFlow.get(node.flow_id)!.push(node);
    });
    
    // Organizar cada flow em um "sistema solar"
    const flowIds = Array.from(nodesByFlow.keys());
    const cols = Math.max(2, Math.ceil(Math.sqrt(flowIds.length)));
    
    // Calcular espaçamento dinâmico baseado no tamanho dos flows
    const maxFlowSize = Math.max(...Array.from(nodesByFlow.values()).map(nodes => nodes.length));
    const baseSpacing = 800; // Espaçamento base
    const dynamicSpacing = Math.max(baseSpacing, maxFlowSize * 120); // Ajusta conforme número de nós
    const flowSpacing = dynamicSpacing * 1.8; // Margem de segurança para evitar sobreposição
    
    const allLayoutedNodes: any[] = [];
    
    for (const [index, flowId] of flowIds.entries()) {
      const flowNodes = nodesByFlow.get(flowId) || [];
      if (flowNodes.length === 0) continue;
      
      // Posição do centro deste flow no grid
      const row = Math.floor(index / cols);
      const col = index % cols;
      const flowCenterX = col * flowSpacing + 500;
      const flowCenterY = row * flowSpacing + 300;
      
      // Encontrar o nó central (centro do flow)
      const flow = flows.find(f => f.id === flowId);
      let centerNode = flowNodes.find(n => n.id === flow?.center_id && n.type === flow?.center_type);
      if (!centerNode) {
        centerNode = flowNodes[0]; // Fallback
      }
      
      // Reordenar: centro primeiro
      const reorderedFlowNodes = [
        centerNode,
        ...flowNodes.filter(n => n.id !== centerNode.id)
      ];
      
      // Aplicar layout radial para este flow
      const layouted = applyRadialLayout(reorderedFlowNodes, flowCenterX, flowCenterY);
      allLayoutedNodes.push(...layouted);
    }
    
    // Atualizar todas as posições no banco
    await updateAllNodePositions(allLayoutedNodes);
    
    toast.success('Flows organizados em sistemas solares!');
  };

  const autoOrganize = async () => {
    if (viewMode === 'single') {
      await autoOrganizeSingle(activeProjectId);
    } else {
      await autoOrganizeMaster();
    }
  };

  // Manter função antiga para compatibilidade (não usada mais)
  const autoOrganizeOld = async () => {
    if (viewMode === 'single') {
      await autoOrganizeSingle(activeProjectId);
    } else {
      // Master View: grid de clusters por projeto com centralização automática
      const cols = Math.max(2, Math.ceil(Math.sqrt(projects.length)));
      
      for (const [pIndex, project] of projects.entries()) {
        const clusterNodes = allNodesWithAnchors.filter(n =>
          n.anchorProjectId === project.id && n.id !== project.id
        );
        const col = pIndex % cols;
        const row = Math.floor(pIndex / cols);
        const clusterX = col * 1400 + 700;
        const clusterY = row * 1200 + 600;
        const layouted = applyRadialLayout([project, ...clusterNodes], clusterX, clusterY);
        await updateAllNodePositions(layouted);
      }
      
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
    
    // No Master View, replicar a geometria do Canvas
    if (viewMode === 'master' && flows) {
      const MASTER_RING_RADIUS = 240;
      const positions: { x: number, y: number }[] = [];
      
      // Replicar getFlowOffset do Canvas
      const getFlowOffset = (flowId: number) => {
        if (!flows || flows.length === 0) return { dx: 0, dy: 0 };
        const idx = Math.max(0, flows.findIndex((f: any) => f.id === flowId));
        const angle = (idx / Math.max(flows.length, 1)) * Math.PI * 2;
        const count = Math.max(flows.length, 1);
        let radius = 0;
        if (count > 1) {
          const filledRadius = MASTER_RING_RADIUS + 40;
          const LABEL_CLEARANCE = 120;
          const safeGap = 16 + LABEL_CLEARANCE;
          const neededChord = 2 * filledRadius + safeGap;
          radius = neededChord / (2 * Math.sin(Math.PI / count));
        }
        return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
      };
      
      // Calcular posições reais de cada nó no Master View
      flows.forEach((flow: any) => {
        const clusterNodes = nodesList.filter((n: any) => n.flow_id === flow.id);
        if (clusterNodes.length === 0) return;
        
        const offset = getFlowOffset(flow.id);
        const centerNode = clusterNodes.find((n: any) => n.id === flow.center_id && n.type === flow.center_type)
          || clusterNodes.find((n: any) => n.type === 'project')
          || clusterNodes[0];
        
        // Posição central do flow
        positions.push({ x: offset.dx, y: offset.dy });
        
        // Posições dos nós no círculo
        const otherNodes = clusterNodes.filter((n: any) => n.id !== centerNode.id);
        otherNodes.forEach((node: any, i: number) => {
          const angle = (i / Math.max(otherNodes.length, 1)) * Math.PI * 2;
          positions.push({
            x: offset.dx + MASTER_RING_RADIUS * Math.cos(angle),
            y: offset.dy + MASTER_RING_RADIUS * Math.sin(angle)
          });
        });
      });
      
      if (positions.length === 0) return { minX: 0, maxX: 1000, minY: 0, maxY: 800 };
      
      const xs = positions.map(p => p.x);
      const ys = positions.map(p => p.y);
      const margin = 400;
      
      return {
        minX: Math.min(...xs) - margin,
        maxX: Math.max(...xs) + margin,
        minY: Math.min(...ys) - margin,
        maxY: Math.max(...ys) + margin
      };
    }
    
    // Single View: usar x/y normal
    const xs = nodesList.map(n => n.x);
    const ys = nodesList.map(n => n.y);
    const margin = 150;
    
    return {
      minX: Math.min(...xs) - margin,
      maxX: Math.max(...xs) + margin,
      minY: Math.min(...ys) - margin,
      maxY: Math.max(...ys) + margin
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
    if (!isLoadingData && allNodes.length > 0 && viewMode === 'master') {
      const timer = setTimeout(async () => {
        // Verificar se precisa organizar (todas as posições master são 0,0)
        const needsOrganization = projects.every(p => (p.master_x ?? 0) === 0 && (p.master_y ?? 0) === 0);
        
        if (needsOrganization) {
          console.log('Organizando Master View automaticamente...');
          await autoOrganize();
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoadingData, viewMode]);

  // Auto-centralizar quando voltar para Master View
  useEffect(() => {
    if (viewMode === 'master' && projects.length > 0 && allNodes.length > 0) {
      
      // Detectar se veio do Single View
      const cameFromSingleView = prevViewModeRef.current === 'single';
      
      // Atualizar ref para próxima vez
      prevViewModeRef.current = viewMode;
      
      // Se veio do Single View, SEMPRE centraliza (ignora estado salvo)
      if (cameFromSingleView) {
        const timer = setTimeout(() => {
          const projectNodes = allNodesWithAnchors.filter(n => n.type === 'project');
          if (projectNodes.length > 0 && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const bounds = calculateBounds(projectNodes);
            const optimalZoom = calculateOptimalZoom(bounds, rect.width, rect.height);
            const centerPan = calculateCenterPan(bounds, optimalZoom, rect.width, rect.height);
            updateState({ zoom: optimalZoom, pan: centerPan });
            
            // Atualizar estado salvo
            setMasterViewState({
              zoom: optimalZoom,
              pan: centerPan,
              hasBeenOrganized: true
            });
          }
        }, 100);
        return () => clearTimeout(timer);
      }
      
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
        // Only center the view, no auto-organization
        const nodesToCenter = getNodesForSingleView(activeProjectId);
        if (nodesToCenter.length > 0 && svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          const bounds = calculateBounds(nodesToCenter);
          const centerPan = calculateCenterPan(bounds, 0.9, rect.width, rect.height);
          updateState({ zoom: 0.9, pan: centerPan });
        }
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

  const deleteNode = async (nodeId: number) => {
    if (!user) return;
    saveToHistory();

    // Determinar o tipo do nó para deletar da tabela correta
    const isProject = projects.some(p => p.id === nodeId);
    const isPerson = people.some(p => p.id === nodeId);
    const isBrand = brands.some(b => b.id === nodeId);

    // Atualizar estado local imediatamente (UX responsiva)
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    updateState({ selectedNode: null, showSidebar: false, editingNode: null });
    setSelectedNodes(prev => prev.filter(id => id !== nodeId));

    // Persistir no banco em background
    try {
      const sb = supabase as any;
      // Deletar conexões relacionadas
      await sb.from('connections')
        .delete()
        .eq('user_id', user.id)
        .or(`from_id.eq.${nodeId},to_id.eq.${nodeId}`);

      // Deletar o nó da tabela correta
      if (isProject) {
        await sb.from('projects').delete().eq('id', nodeId).eq('user_id', user.id);
        setProjects(prev => prev.filter(p => p.id !== nodeId));
      } else if (isPerson) {
        await sb.from('people').delete().eq('id', nodeId).eq('user_id', user.id);
        setPeople(prev => prev.filter(p => p.id !== nodeId));
      } else if (isBrand) {
        await sb.from('brands').delete().eq('id', nodeId).eq('user_id', user.id);
        setBrands(prev => prev.filter(b => b.id !== nodeId));
      }
    } catch (error: any) {
      console.error('Erro ao deletar nó:', error);
      toast.error('Erro ao deletar nó', { description: error?.message });
      // Recarregar para reverter estado local
      reloadData();
    }
  };

  const exportData = () => {
    try {
      const exportPayload = {
        version: 2,
        exportedAt: new Date().toISOString(),
        flows,
        projects,
        people,
        brands,
        allConnections,
        workflows,
      };
      const dataStr = JSON.stringify(exportPayload, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `network-matrix-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Exportação concluída com toda a rede!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar dados');
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
          // Suporte ao novo formato v2 (rede completa)
          if (imported.version === 2) {
            if (imported.flows) setFlows(imported.flows);
            if (imported.projects) setProjects(imported.projects);
            if (imported.people) setPeople(imported.people);
            if (imported.brands) setBrands(imported.brands);
            if (imported.allConnections) setAllConnections(imported.allConnections);
            if (imported.workflows) setWorkflows(imported.workflows);
            toast.success('Rede completa importada com sucesso!');
          } else {
            // Backward compatibility: formato antigo (só workflows)
            setWorkflows(imported);
            toast.success('Dados importados com sucesso!');
          }
        }
      } catch (err) {
        toast.error('Erro ao importar arquivo. Verifique o formato.');
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

  // Função helper para obter flow_id atual
  const getCurrentFlowId = (): number | null => {
    if (viewMode === 'single' && activeProjectId) {
      // Em single view, buscar o flow_id em todas as coleções
      const pFlow = projects.find(p => p.id === activeProjectId)?.flow_id;
      if (pFlow) return pFlow;
      const peFlow = people.find(pe => pe.id === activeProjectId)?.flow_id;
      if (peFlow) return peFlow;
      const bFlow = brands.find(b => b.id === activeProjectId)?.flow_id;
      if (bFlow) return bFlow;
    }
    return null; // Master view não tem flow específico
  };

  // Função para criar nó no banco de dados
  const createNodeInDatabase = async (
    nodeType: 'person' | 'project' | 'brand',
    nodeData: any,
    originalNodeId: number | null = null
  ): Promise<any> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    let currentFlowId = getCurrentFlowId();
    let isNewFlow = false;

    // Se está criando flow root via botão "+", SEMPRE criar novo flow
    if (isCreatingFlowRoot) {
      currentFlowId = null; // Forçar criação de novo flow
    }

    // Proteção: em Single View sem flow selecionado, impedir criação por clique direito
    if (!isCreatingFlowRoot && viewMode === 'single' && !currentFlowId) {
      console.warn('Bloqueado: tentativa de criar nó em Single View sem flow selecionado.');
      toast.error('Selecione um flow antes de criar nós (use o botão + para criar um novo flow).');
      return null;
    }

    // Se não houver flow_id (criando em Master View ou primeiro nó), criar novo flow
    if (!currentFlowId) {
      // Criar novo flow
      const { data: newFlow, error: flowError } = await supabase
        .from('flows')
        .insert([{
          center_id: 0, // Temporário, será atualizado após criar o nó
          center_type: nodeType,
          name: `Flow: ${nodeData.name}`,
          user_id: user.id
        }])
        .select()
        .single();

      if (flowError || !newFlow) {
        console.error('Erro ao criar flow:', flowError);
        toast.error('Erro ao criar flow');
        return null;
      }

      currentFlowId = newFlow.id;
      isNewFlow = true;
    }

    // Preparar dados base - mapear campos corretamente por tipo
    // Se é novo flow (primeiro nó), centralizar na tela
    let centerX = isNewFlow ? 500 : nodeCreationPosition.x;
    let centerY = isNewFlow ? 300 : nodeCreationPosition.y;
    
    // MASTER VIEW: calcular posição em círculo ao redor do centro do flow
    if (viewMode === 'master' && !isNewFlow && currentFlowId) {
      const flow = flows.find(f => f.id === currentFlowId);
      if (flow) {
        // Buscar nó centro do flow
        let centerNode: any = null;
        if (flow.center_type === 'project') {
          centerNode = projects.find(p => p.id === flow.center_id);
        } else if (flow.center_type === 'person') {
          centerNode = people.find(p => p.id === flow.center_id);
        } else if (flow.center_type === 'brand') {
          centerNode = brands.find(b => b.id === flow.center_id);
        }

        if (centerNode) {
          // Usar master_x/master_y do centro
          const flowCenterX = centerNode.master_x ?? centerNode.x ?? 500;
          const flowCenterY = centerNode.master_y ?? centerNode.y ?? 300;

          // Contar nós existentes no flow (excluindo o centro)
          const existingNodesCount = [
            ...projects.filter(p => p.flow_id === currentFlowId && p.id !== flow.center_id),
            ...people.filter(p => p.flow_id === currentFlowId && p.id !== flow.center_id),
            ...brands.filter(b => b.flow_id === currentFlowId && b.id !== flow.center_id)
          ].length;

          // Calcular posição do novo nó em círculo
          const radius = 200;
          const angleStep = (2 * Math.PI) / Math.max(existingNodesCount + 1, 1);
          const angle = existingNodesCount * angleStep - Math.PI / 2;
          
          centerX = flowCenterX + radius * Math.cos(angle);
          centerY = flowCenterY + radius * Math.sin(angle);
        }
      }
    }
    
    let baseData: any = {
      name: nodeData.name,
      x: centerX,
      y: centerY,
      master_x: centerX, // Sincronizar master_x/master_y com x/y
      master_y: centerY,
      user_id: user.id,
      flow_id: currentFlowId,
      category: nodeData.category || null,
      ...(originalNodeId ? { original_node_id: originalNodeId } : {})
    };

    // Adicionar campos específicos por tipo
    if (nodeType === 'project') {
      baseData.status = nodeData.projectStatus || nodeData.status || 'ativo';
      baseData.deadline = nodeData.startDate || nodeData.deadline || null;
    } else if (nodeType === 'person') {
      baseData.email = nodeData.email || null;
      baseData.phone = nodeData.phone || null;
      baseData.company = nodeData.company || null;
    } else if (nodeType === 'brand') {
      baseData.website = nodeData.website || null;
    }

    // Inserir no banco
    const tableName = nodeType === 'person' ? 'people' : 
                     nodeType === 'brand' ? 'brands' : 'projects';
    
    const { data: insertedNode, error } = await supabase
      .from(tableName)
      .insert([baseData])
      .select()
      .single();

    if (error || !insertedNode) {
      console.error(`Erro ao criar ${nodeType}:`, error);
      toast.error(`Erro ao criar ${nodeType}`);
      return null;
    }

    // Se foi criado novo flow, atualizar o center_id com o ID do nó criado
    if (isNewFlow && currentFlowId) {
      const { error: updateFlowError } = await supabase
        .from('flows')
        .update({ center_id: insertedNode.id })
        .eq('id', currentFlowId);

      if (updateFlowError) {
        console.error('Erro ao atualizar flow:', updateFlowError);
      }

      // Atualizar lista de flows local
      const { data: updatedFlow } = await supabase
        .from('flows')
        .select('*')
        .eq('id', currentFlowId)
        .single();

      if (updatedFlow) {
        setFlows(prev => [...prev, updatedFlow]);
      }

      // NÃO mudar para Single View aqui ainda
      // Vai mudar depois que adicionar ao estado local
    }

    return insertedNode;
  };

  // Função separada para criação efetiva do nó
  const handleCreateNode = async (nodeData: any, originalNodeId: number | null) => {
    const insertedNode = await createNodeInDatabase(
      nodeCreationType as 'person' | 'project' | 'brand',
      nodeData,
      originalNodeId
    );

    if (!insertedNode) return;

    // Adicionar ao estado local
    const newNode = {
      ...insertedNode,
      type: nodeCreationType,
      isNewHighlight: true,
      ...(originalNodeId ? { original_node_id: originalNodeId } : {})
    };

    if (nodeCreationType === 'project') {
      setProjects(prev => [...prev, newNode]);
    } else if (nodeCreationType === 'person') {
      setPeople(prev => [...prev, newNode]);
    } else if (nodeCreationType === 'brand') {
      setBrands(prev => [...prev, newNode]);
    }

    // Se criou flow root via botão "+", mudar para Single View imediatamente
    if (isCreatingFlowRoot) {
      setActiveProjectId(insertedNode.id);
      setViewMode('single');
      setIsCreatingFlowRoot(false); // Reset flag
    }

    setShowNodeCreationModal(false);
    
    // Mensagem de sucesso
    const message = originalNodeId 
      ? `Cópia de "${newNode.name}" criada neste flow!`
      : `${newNode.name} criado!`;
    toast.success(message);

    // Centralizar view no novo nó
    setTimeout(() => {
      const zoom = state.zoom;
      updateState({
        pan: {
          x: window.innerWidth / 2 - newNode.x * zoom,
          y: window.innerHeight / 2 - newNode.y * zoom
        }
      });
    }, 50);
  };

  // Handlers para o DuplicateCheckDialog
  const handleDuplicateConfirmSame = async () => {
    if (!duplicateCheckModal) return;

    const { existingNode, newNodeData, nodeType } = duplicateCheckModal;

    // Criar cópia com todos os dados do nó original
    const copiedData = {
      ...newNodeData,
      // Copiar dados relevantes do nó existente
      ...(nodeType === 'person' && {
        email: existingNode.email,
        phone: existingNode.phone,
        company: existingNode.company,
      }),
      ...(nodeType === 'brand' && {
        website: existingNode.website,
      }),
      category: existingNode.category,
    };

    await handleCreateNode(copiedData, existingNode.id);
    setDuplicateCheckModal(null);
  };

  const handleDuplicateConfirmDifferent = async () => {
    if (!duplicateCheckModal) return;

    // Criar nó normalmente sem vinculação
    await handleCreateNode(duplicateCheckModal.newNodeData, null);
    setDuplicateCheckModal(null);
  };

  const handleDuplicateCancel = () => {
    setDuplicateCheckModal(null);
    toast.info('Criação cancelada');
  };

  const handleNodeCreation = async (nodeData: any) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    saveToHistory();

    // 1. VERIFICAR SE JÁ EXISTE NÓ COM MESMO NOME
    const tableName = nodeCreationType === 'person' ? 'people' : 
                     nodeCreationType === 'brand' ? 'brands' : 'projects';
    
    const { data: existingNodes } = await supabase
      .from(tableName)
      .select('*')
      .eq('name', nodeData.name.trim())
      .eq('user_id', user.id)
      .limit(1);

    // 2. SE ENCONTRAR DUPLICATA, MOSTRAR DIALOG
    if (existingNodes && existingNodes.length > 0) {
      setDuplicateCheckModal({
        show: true,
        existingNode: existingNodes[0],
        newNodeData: nodeData,
        nodeType: nodeCreationType as 'person' | 'project' | 'brand'
      });
      return; // Pausar criação até usuário decidir
    }

    // 3. SE NÃO HOUVER DUPLICATA, CRIAR NORMALMENTE
    await handleCreateNode(nodeData, null);
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
    <div className="min-h-screen h-screen flex flex-col overflow-hidden bg-[hsl(220,20%,7%)]">
      {/* No animated background shapes - clean dark bg */}
      
      {state.contextMenu && (
        <ContextMenu 
          contextMenu={state.contextMenu}
          updateState={updateState}
          viewMode={viewMode}
          onCreateNode={(type) => {
            if (state.contextMenu) {
              setIsCreatingFlowRoot(false); // Garantir que não é flow root
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
          onClose={() => {
            setShowFlowStarterModal(false);
            setIsCreatingFlowRoot(false);
          }}
          onSelectType={(type) => {
            setShowFlowStarterModal(false);
            setIsCreatingFlowRoot(true); // Marcar que está criando flow root
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
            setIsCreatingFlowRoot(false); // Reset flag ao fechar
          }}
          onCreate={editingNodeInModal ? handleNodeUpdate : handleNodeCreation}
          editingNode={editingNodeInModal}
          workflows={workflows}
          onAddWorkflow={handleAddWorkflow}
        />
      )}


      {/* Sidebar Esquerda */}
      <NetworkSidebar
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeProjectId={activeProjectId}
        setShowFlowStarterModal={setShowFlowStarterModal}
        setShowFlowsManager={setShowFlowsManager}
        onOpenWhatsApp={onOpenWhatsApp}
        onLogout={onLogout}
        updateState={updateState}
        state={state}
        svgRef={svgRef}
        calculateBounds={calculateBounds}
        calculateOptimalZoom={calculateOptimalZoom}
        calculateCenterPan={calculateCenterPan}
        allNodes={allNodes}
        nodes={nodes}
        flows={flows}
        projects={projects}
        getCurrentFlowIdFromProjectId={getCurrentFlowIdFromProjectId}
        people={people}
        brands={brands}
        setNodeCreationType={setNodeCreationType}
        setMasterViewState={setMasterViewState}
        getNodesForSingleView={getNodesForSingleView}
      />

      {/* Área principal com canvas */}
      <div className="flex-1 flex flex-col relative ml-64">
        
        {/* Compact Toolbar - Top */}
        <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2 bg-[hsl(220,20%,8%)]/90 backdrop-blur-sm border-b border-border/30">
          <div className="flex items-center gap-2">
            {/* View mode indicator */}
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {viewMode === 'master' ? 'Master' : 'Single'}
            </span>
            <div className="h-4 w-px bg-border/50" />
            {/* Search */}
            <div className="relative w-48">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && aiSearchQuery.trim()) {
                    setShowOpportunities(true);
                  }
                }}
                className="pl-7 h-7 text-xs bg-secondary/50 border-border/30 rounded focus:border-primary/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Labels toggle */}
            <button
              onClick={() => setShowLegend(!showLegend)}
              className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${showLegend ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Rótulos
            </button>
            {/* AI button */}
            <button
              onClick={() => setShowAIInsights(prev => !prev)}
              className={`px-2 py-1 text-[10px] font-mono rounded transition-colors flex items-center gap-1 ${showAIInsights ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Sparkles size={10} /> IA
            </button>
            <div className="h-4 w-px bg-border/50" />
            {/* Node/Connection counter */}
            <span className="text-[10px] font-mono text-muted-foreground">
              {nodes.length} NÓS · {connections.length} CONEXÕES
            </span>
          </div>
        </div>

        {/* Canvas */}
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

          {/* Botões Flutuantes com GlassButton - Centro-Inferior */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
            
            {/* Zoom Out */}
            <GlassButton 
              size="icon" 
              onClick={() => {
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
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </GlassButton>
            
            {/* Porcentagem atual (clicável para resetar para 100%) */}
            <GlassButton
              size="default"
              onClick={() => updateState({ zoom: 1 })}
              contentClassName="text-sm font-mono px-4"
              title="Resetar Zoom (100%)"
            >
              {Math.round(state.zoom * 100)}%
            </GlassButton>
            
            {/* Zoom In */}
            <GlassButton 
              size="icon" 
              onClick={() => {
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
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </GlassButton>

            <div className="h-8 w-px bg-primary-foreground/30 mx-1" />
            
            {/* Centralizar */}
            <GlassButton 
              size="icon" 
              onClick={() => {
                const rect = svgRef.current?.getBoundingClientRect();
                const width = rect?.width ?? window.innerWidth;
                const height = rect?.height ?? (window.innerHeight - 100);
                const nodesToCenter = viewMode === 'master' ? allNodes : nodes;
                const bounds = calculateBounds(nodesToCenter);
                const zoom = calculateOptimalZoom(bounds, width, height);
                const pan = calculateCenterPan(bounds, zoom, width, height);
                updateState({ zoom, pan });
              }}
              title="Centralizar"
            >
              <Target size={18} />
            </GlassButton>
          </div>
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
          <FlowManagerPanel
            open={showFlowsManager}
            onOpenChange={setShowFlowsManager}
            flows={flows.map(flow => {
              const allNodes = [...projects, ...people, ...brands];
              const centerNode = allNodes.find(n => 
                n.id === flow.center_id && n.type === flow.center_type
              );
              
              // Count nodes in this flow
              const flowNodes = allNodes.filter(n => n.flow_id === flow.id);
              const peopleCount = flowNodes.filter(n => n.type === 'person').length;
              const projectsCount = flowNodes.filter(n => n.type === 'project').length;
              const brandsCount = flowNodes.filter(n => n.type === 'brand').length;
              
              return {
                ...flow,
                centerName: centerNode?.name || 'Desconhecido',
                stats: {
                  people: peopleCount,
                  projects: projectsCount,
                  brands: brandsCount
                }
              };
            })}
            onSelectFlow={(flowId) => {
              const selectedFlow = flows.find(f => f.id === flowId);
              if (selectedFlow) {
                setActiveProjectId(selectedFlow.center_id);
                setViewMode('single');
                setShowFlowsManager(false);
                
                setTimeout(() => {
                  autoOrganizeSingle(selectedFlow.center_id);
                }, 50);
                
                setTimeout(() => {
                  const width = window.innerWidth;
                  const height = window.innerHeight - 100;
                  const currentNodes = getNodesForSingleView(selectedFlow.center_id);
                  
                  if (currentNodes.length > 0) {
                    const bounds = calculateBounds(currentNodes);
                    const zoom = calculateOptimalZoom(bounds, width, height);
                    const pan = calculateCenterPan(bounds, zoom, width, height);
                    updateState({ zoom, pan });
                  }
                }, 300);
              }
            }}
            onDeleteFlow={async (flowId) => {
              try {
                if (!user) return;
                
                // Deletar o flow do banco
                const { error } = await supabase
                  .from('flows')
                  .delete()
                  .eq('id', flowId)
                  .eq('user_id', user.id);
                
                if (error) {
                  console.error('Erro ao deletar flow:', error);
                  toast.error('Erro ao deletar flow');
                  return;
                }
                
                // Atualizar estado local
                setFlows(prev => prev.filter(f => f.id !== flowId));
                toast.success('Flow deletado com sucesso');
                
                // Se estava visualizando esse flow, voltar ao Master
                const deletedFlow = flows.find(f => f.id === flowId);
                if (deletedFlow && activeProjectId === deletedFlow.center_id) {
                  setViewMode('master');
                  setActiveProjectId(null);
                }
              } catch (error) {
                console.error('Erro ao deletar flow:', error);
                toast.error('Erro ao deletar flow');
              }
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

        {duplicateCheckModal && (
          <DuplicateCheckDialog
            open={duplicateCheckModal.show}
            existingNode={duplicateCheckModal.existingNode}
            nodeType={duplicateCheckModal.nodeType}
            onConfirmSame={handleDuplicateConfirmSame}
            onConfirmDifferent={handleDuplicateConfirmDifferent}
            onCancel={handleDuplicateCancel}
          />
        )}

        {/* Painel de Insights com IA */}
        {showAIInsights && (
          <AIInsightsPanel
            nodes={allNodes}
            connections={allConnections}
            workflows={workflows}
            flows={flows}
            people={people}
            brands={brands}
            projects={projects}
            onHighlightPath={(nodeIds) => setHighlightedPath(nodeIds)}
            onFocusNode={(nodeId) => {
              const node = allNodes.find(n => n.id === nodeId);
              if (node) {
                updateState({ selectedNode: nodeId });
                if (node.flow_id) {
                  const flow = flows.find(f => f.id === node.flow_id);
                  if (flow) {
                    setActiveProjectId(flow.center_id);
                    setViewMode('single');
                  }
                }
              }
            }}
            onClose={() => setShowAIInsights(false)}
            onOpenConnectionModal={(connection, involvedNodes, type) => {
              setShowAIInsights(false);
              setAiConnectionModal({ connection, nodes: involvedNodes, type });
            }}
          />
        )}

        {/* AI Connection Modal */}
        {aiConnectionModal && (
          <AIConnectionModal
            connection={aiConnectionModal.connection}
            involvedNodes={aiConnectionModal.nodes}
            connectionType={aiConnectionModal.type}
            onClose={() => setAiConnectionModal(null)}
            onFocusNode={(nodeId) => {
              setAiConnectionModal(null);
              const node = allNodes.find(n => n.id === nodeId);
              if (node) {
                updateState({ selectedNode: nodeId });
                if (node.flow_id) {
                  const flow = flows.find(f => f.id === node.flow_id);
                  if (flow) {
                    setActiveProjectId(flow.center_id);
                    setViewMode('single');
                  }
                }
              }
            }}
          />
        )}

        {/* Painel de Oportunidades com IA */}
        <OpportunitiesPanel
          isOpen={showOpportunities}
          onClose={() => setShowOpportunities(false)}
          people={people}
          brands={brands}
          projects={projects}
          connections={allConnections}
          onSelectNode={(nodeId) => {
            // Encontrar o nó e destacá-lo
            const node = allNodes.find(n => n.id === nodeId);
            if (node) {
              setSelectedNodes([node]);
              toast.success(`Selecionado: ${node.name}`);
              setShowOpportunities(false);
            }
          }}
        />

        {viewMode === 'single' && (
          <PathIndicator
            selectedNode={selectedNode}
            centerNode={centerNode}
            allNodes={allNodes}
            connections={allConnections}
          />
        )}

        {user && <ResetButton onResetComplete={reloadData} userId={user.id} />}
        
        <WhatsAppNotifications />
      </div>
    </div>
  );
};
