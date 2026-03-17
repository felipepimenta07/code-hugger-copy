import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Canvas } from './Canvas';
import { NetworkToolbar } from './NetworkToolbar';
import { NetworkModals } from './NetworkModals';
import { NetworkSidebar } from './NetworkSidebar';
import { NodeDetailPanel } from './NodeDetailPanel';
import { PathIndicator } from './PathIndicator';
import { FlowManagerPanel } from './FlowManagerPanel';
import { WhatsAppNotifications } from './WhatsAppNotifications';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAuth } from '@/hooks/useAuth';
import { useForceSimulation } from '@/hooks/useForceSimulation';
import { supabase } from '@/integrations/supabase/client';
import { ParsedLinkedInData, LinkedInImportOptions } from '@/types/linkedin';
import { makeRef, parseRef, getTableName } from '@/utils/nodeRef';

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
  
  // Data state
  const [projects, setProjects] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [allConnections, setAllConnections] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // View state
  const [activeNodeRef, setActiveNodeRef] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState('master');
  const [showLabels, setShowLabels] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [customCategories, setCustomCategories] = useState({ person: [], brand: [], project: [] });
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredFlowId, setHoveredFlowId] = useState<number | null>(null);
  const [flows, setFlows] = useState<any[]>([]);

  // Modal/panel state
  const [showPathFinder, setShowPathFinder] = useState(false);
  const [pathStart, setPathStart] = useState<string | null>(null);
  const [pathEnd, setPathEnd] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showNodeCreationModal, setShowNodeCreationModal] = useState(false);
  const [nodeCreationType, setNodeCreationType] = useState<'person' | 'project' | 'brand'>('person');
  const [nodeCreationPosition, setNodeCreationPosition] = useState({ x: 0, y: 0 });
  const [editingNodeInModal, setEditingNodeInModal] = useState<any>(null);
  const [showFlowsManager, setShowFlowsManager] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showFlowStarterModal, setShowFlowStarterModal] = useState(false);
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isCreatingFlowRoot, setIsCreatingFlowRoot] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(false);
  const [aiConnectionModal, setAiConnectionModal] = useState<any>(null);
  const [duplicateCheckModal, setDuplicateCheckModal] = useState<any>(null);
  const [masterViewState, setMasterViewState] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detailPanelNode, setDetailPanelNode] = useState<any>(null);

  const prevViewModeRef = useRef<string>(viewMode);
  const { state, updateState } = useNetworkState();
  const svgRef = useRef(null);
  const isDraggingRef = useRef(false);
  const recentUpdatesRef = useRef<Set<string>>(new Set());
  const isResettingRef = useRef(false);

  // Force simulation center node ref
  const centerNodeRefForForce = (viewMode === 'single' && activeNodeRef) ? (() => {
    const currentFlowId = getCurrentFlowIdFromRef(activeNodeRef);
    const flow = flows.find(f => f.id === currentFlowId);
    return flow ? makeRef(flow.center_type, flow.center_id) : null;
  })() : null;

  // ===== HELPERS =====
  function getCurrentFlowIdFromRef(ref: string | null): number | null {
    if (!ref) return null;
    const { type, id } = parseRef(ref);
    const node = type === 'project' ? projects.find(p => p.id === id)
      : type === 'person' ? people.find(p => p.id === id)
      : brands.find(b => b.id === id);
    return node?.flow_id ?? null;
  }

  const addNodeRefs = (items: any[], type: string) => 
    items.map(item => ({ ...item, type, node_ref: makeRef(type, item.id) }));
  
  const addConnRefs = (conns: any[]) => 
    conns.map(c => ({
      ...c,
      from: c.from_id, to: c.to_id,
      from_ref: makeRef(c.from_type, c.from_id),
      to_ref: makeRef(c.to_type, c.to_id),
      type: c.connection_type || 'related',
      connection_type: c.connection_type
    }));

  // ===== DATA LOADING =====
  const reloadData = async (options?: { forceReset?: boolean }) => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const sb = supabase as any;
      const [projectsRes, peopleRes, brandsRes, connectionsRes, workflowsRes, flowsRes] = await Promise.all([
        sb.from('projects').select('*').eq('user_id', user.id),
        sb.from('people').select('*').eq('user_id', user.id),
        sb.from('brands').select('*').eq('user_id', user.id),
        sb.from('connections').select('*').eq('user_id', user.id),
        sb.from('workflows').select('*').eq('user_id', user.id),
        sb.from('flows').select('*').eq('user_id', user.id),
      ]);

      setProjects(addNodeRefs(projectsRes.data || [], 'project'));
      setPeople(addNodeRefs(peopleRes.data || [], 'person'));
      setBrands(addNodeRefs(brandsRes.data || [], 'brand'));
      setAllConnections(addConnRefs(connectionsRes.data || []));
      setWorkflows(workflowsRes.data || []);
      setFlows(flowsRes.data || []);
      
      if (options?.forceReset) {
        setActiveNodeRef(null);
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

  useEffect(() => { isDraggingRef.current = state.dragging !== null; }, [state.dragging]);

  const initialLoadDoneRef = useRef(false);

  // Initial load
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const sb = supabase as any;
        const [projectsRes, peopleRes, brandsRes, connectionsRes, workflowsRes, flowsRes] = await Promise.all([
          sb.from('projects').select('*').eq('user_id', user.id),
          sb.from('people').select('*').eq('user_id', user.id),
          sb.from('brands').select('*').eq('user_id', user.id),
          sb.from('connections').select('*').eq('user_id', user.id),
          sb.from('workflows').select('*').eq('user_id', user.id),
          sb.from('flows').select('*').eq('user_id', user.id),
        ]);

        if (projectsRes.data) setProjects(addNodeRefs(projectsRes.data, 'project'));
        if (peopleRes.data) setPeople(addNodeRefs(peopleRes.data, 'person'));
        if (brandsRes.data) setBrands(addNodeRefs(brandsRes.data, 'brand'));
        if (connectionsRes.data) setAllConnections(addConnRefs(connectionsRes.data));
        if (workflowsRes.data) setWorkflows(workflowsRes.data);
        if (flowsRes.data) setFlows(flowsRes.data);
        
        if (flowsRes.data?.length > 0) {
          const firstFlow = flowsRes.data[0];
          setActiveNodeRef(makeRef(firstFlow.center_type, firstFlow.center_id));
        }
        initialLoadDoneRef.current = true;
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [user]);


  // Realtime
  useEffect(() => {
    if (!user) return;
    const guardedReload = () => { if (!isResettingRef.current) reloadData(); };
    const channel = supabase
      .channel('network-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flows', filter: `user_id=eq.${user.id}` }, () => { if (!isResettingRef.current) { toast.success('Novo flow criado!'); reloadData(); } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'people', filter: `user_id=eq.${user.id}` }, guardedReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, guardedReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'brands', filter: `user_id=eq.${user.id}` }, guardedReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connections', filter: `user_id=eq.${user.id}` }, guardedReload)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'people', filter: `user_id=eq.${user.id}` }, (p) => { if (!recentUpdatesRef.current.has(`people:${p.new.id}`) && !isDraggingRef.current && !isResettingRef.current) reloadData(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, (p) => { if (!recentUpdatesRef.current.has(`projects:${p.new.id}`) && !isDraggingRef.current && !isResettingRef.current) reloadData(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'brands', filter: `user_id=eq.${user.id}` }, (p) => { if (!recentUpdatesRef.current.has(`brands:${p.new.id}`) && !isDraggingRef.current && !isResettingRef.current) reloadData(); })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'flows', filter: `user_id=eq.${user.id}` }, () => { if (!isResettingRef.current) { toast.info('Flow removido'); reloadData(); } })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'people', filter: `user_id=eq.${user.id}` }, guardedReload)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, guardedReload)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'brands', filter: `user_id=eq.${user.id}` }, guardedReload)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'connections', filter: `user_id=eq.${user.id}` }, guardedReload)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => { if (selectedConnection !== null) setSelectedNodes([]); }, [selectedConnection]);

  // ===== COMPUTED DATA =====
  const allNodesRaw = [...projects, ...people, ...brands];
  const allNodes = React.useMemo(() => 
    allNodesRaw.map(node => ({
      ...node,
      x: viewMode === 'master' ? (node.master_x ?? node.x) : node.x,
      y: viewMode === 'master' ? (node.master_y ?? node.y) : node.y,
    })),
    [allNodesRaw, viewMode]
  );

  const getNodesForSingleView = (ref: string) => {
    const currentFlowId = getCurrentFlowIdFromRef(ref);
    if (!currentFlowId) return [];
    const flowNodes = allNodes.filter(node => node.flow_id === currentFlowId);
    const flow = flows.find(f => f.id === currentFlowId);
    if (!flow) return flowNodes;
    const center = flowNodes.find(n => n.id === flow.center_id && n.type === flow.center_type);
    if (!center) return flowNodes;
    const others = flowNodes.filter(n => n.node_ref !== center.node_ref);
    return [{ ...center, type: flow.center_type }, ...others];
  };

  const nodes = viewMode === 'master'
    ? allNodes.filter(n => n.flow_id !== null && n.flow_id !== undefined)
    : (activeNodeRef ? getNodesForSingleView(activeNodeRef) : []);

  const selectedNode = selectedNodes.length === 1 ? allNodes.find(n => n.node_ref === selectedNodes[0]) : null;

  const centerNode = (viewMode === 'single' && activeNodeRef) ? (() => {
    const currentFlowId = getCurrentFlowIdFromRef(activeNodeRef);
    const flow = flows.find(f => f.id === currentFlowId);
    if (!flow) return null;
    return allNodes.find(n => n.id === flow.center_id && n.type === flow.center_type) || null;
  })() : null;

  const connections = viewMode === 'master'
    ? allConnections
    : allConnections.filter(c => {
        const currentFlowId = activeNodeRef ? getCurrentFlowIdFromRef(activeNodeRef) : null;
        return allNodes.find(n => n.node_ref === c.from_ref && n.flow_id === currentFlowId) 
            && allNodes.find(n => n.node_ref === c.to_ref && n.flow_id === currentFlowId);
      });

  // Force simulation for organic layout
  const {
    positions: forcePositions,
    isSimulating,
    onDragStart: onForceDragStart,
    onDrag: onForceDrag,
    onDragEnd: onForceDragEnd,
    reheat: reheatSimulation,
  } = useForceSimulation({
    nodes,
    connections,
    viewMode,
    enabled: viewMode === 'single',
    centerNodeRef: centerNodeRefForForce,
  });

  // ===== HISTORY =====
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = () => {
    const snapshot = { projects: [...projects], people: [...people], brands: [...brands], allConnections: [...allConnections], viewMode, activeNodeRef };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const s = history[historyIndex - 1];
      setProjects(s.projects); setPeople(s.people); setBrands(s.brands); setAllConnections(s.allConnections);
      setViewMode(s.viewMode); setActiveNodeRef(s.activeNodeRef);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const s = history[historyIndex + 1];
      setProjects(s.projects); setPeople(s.people); setBrands(s.brands); setAllConnections(s.allConnections);
      setViewMode(s.viewMode); setActiveNodeRef(s.activeNodeRef);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // ===== ZOOM/PAN =====
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - state.pan.x) / state.zoom;
    const worldY = (mouseY - state.pan.y) / state.zoom;
    const delta = e.deltaY > 0 ? 0.97 : 1.03;
    const newZoom = Math.max(0.1, Math.min(5, state.zoom * delta));
    updateState({ zoom: newZoom, pan: { x: mouseX - worldX * newZoom, y: mouseY - worldY * newZoom } });
  };

  // ===== NODE POSITION =====
  const updateNodePosition = async (nodeRef: string, deltaX: number, deltaY: number, saveToDb: boolean = false) => {
    if (!user) return;
    const { type, id } = parseRef(nodeRef);
    const xColumn = viewMode === 'master' ? 'master_x' : 'x';
    const yColumn = viewMode === 'master' ? 'master_y' : 'y';
    const tableName = getTableName(type);
    
    let node: any;
    let setter: any;
    if (type === 'project') { node = projects.find(p => p.id === id); setter = setProjects; }
    else if (type === 'person') { node = people.find(p => p.id === id); setter = setPeople; }
    else { node = brands.find(b => b.id === id); setter = setBrands; }
    
    if (!node) return;
    
    const cx = viewMode === 'master' ? (node.master_x ?? node.x) : node.x;
    const cy = viewMode === 'master' ? (node.master_y ?? node.y) : node.y;
    const newX = cx + deltaX;
    const newY = cy + deltaY;
    
    setter(prev => prev.map(p => p.id === id ? { 
      ...p, 
      ...(viewMode === 'master' ? { master_x: newX, master_y: newY } : { x: newX, y: newY }),
      isNewHighlight: false 
    } : p));
    
    if (saveToDb) {
      try {
        const { error } = await (supabase as any).from(tableName).update({ [xColumn]: newX, [yColumn]: newY }).eq('id', id).eq('user_id', user.id);
        if (!error) {
          const key = `${tableName}:${id}`;
          recentUpdatesRef.current.add(key);
          setTimeout(() => recentUpdatesRef.current.delete(key), 1200);
        }
      } catch (err) { console.error('Erro ao persistir posição:', err); }
    }
  };

  const setNodes = (updater) => {
    const newNodes = typeof updater === 'function' ? updater([...projects, ...people, ...brands]) : updater;
    setProjects(newNodes.filter(n => n.type === 'project'));
    setPeople(newNodes.filter(n => n.type === 'person'));
    setBrands(newNodes.filter(n => n.type === 'brand'));
  };

  const setConnections = async (updater) => {
    const newConnections = typeof updater === 'function' ? updater(allConnections) : updater;
    setAllConnections(newConnections);
    const toCreate = newConnections.filter(c => !c.id);
    if (toCreate.length === 0) return;
    const payload = toCreate.map(c => {
      const fromType = c.from_type || (c.from_ref ? parseRef(c.from_ref).type : null);
      const toType = c.to_type || (c.to_ref ? parseRef(c.to_ref).type : null);
      const fromId = c.from || (c.from_ref ? parseRef(c.from_ref).id : null);
      const toId = c.to || (c.to_ref ? parseRef(c.to_ref).id : null);
      return { user_id: user.id, from_id: fromId, to_id: toId, from_type: fromType, to_type: toType, connection_type: c.type || 'strong', flow_id: getCurrentFlowId() };
    });
    const { data, error } = await supabase.from('connections').insert(payload).select();
    if (error) { console.error('Erro ao criar conexão:', error); toast.error('Erro ao criar conexão'); return; }
    setAllConnections(prev => {
      const updated = [...prev]; let dataIndex = 0;
      for (let i = 0; i < updated.length; i++) { 
        if (!updated[i].id && data && data[dataIndex]) { 
          const d = data[dataIndex];
          updated[i] = { ...updated[i], id: d.id, from_ref: makeRef(d.from_type, d.from_id), to_ref: makeRef(d.to_type, d.to_id) }; 
          dataIndex++; 
        } 
      }
      return updated;
    });
    toast.success('Conexão criada!');
  };

  const getCurrentFlowId = (): number | null => {
    if (viewMode === 'single' && activeNodeRef) {
      return getCurrentFlowIdFromRef(activeNodeRef);
    }
    return null;
  };

  // ===== LAYOUT =====
  const distributeInCircle = (nodesToLayout: any[], centerX: number, centerY: number, radius: number) => {
    if (nodesToLayout.length === 0) return [];
    const angleStep = (2 * Math.PI) / nodesToLayout.length;
    return nodesToLayout.map((node, index) => ({
      ...node, x: centerX + (radius + (Math.random() - 0.5) * 30) * Math.cos(index * angleStep - Math.PI / 2 + (Math.random() - 0.5) * 0.2),
      y: centerY + (radius + (Math.random() - 0.5) * 30) * Math.sin(index * angleStep - Math.PI / 2 + (Math.random() - 0.5) * 0.2)
    }));
  };

  const applyRadialLayout = (nodesToLayout: any[], centerX: number, centerY: number) => {
    if (nodesToLayout.length === 0) return [];
    const centerNode = nodesToLayout[0];
    const otherNodes = nodesToLayout.slice(1);
    const innerRing = otherNodes.slice(0, Math.min(6, otherNodes.length));
    const middleRing = otherNodes.slice(6, Math.min(18, otherNodes.length));
    const outerRing = otherNodes.slice(18);
    return [
      { ...centerNode, x: centerX, y: centerY, level: 'center' },
      ...distributeInCircle(innerRing, centerX, centerY, 200).map(n => ({ ...n, level: 'inner' })),
      ...distributeInCircle(middleRing, centerX, centerY, 350).map(n => ({ ...n, level: 'middle' })),
      ...distributeInCircle(outerRing, centerX, centerY, 520).map(n => ({ ...n, level: 'outer' }))
    ];
  };

  const updateAllNodePositions = async (layoutedNodes: any[]) => {
    if (!user) return;
    const xColumn = viewMode === 'master' ? 'master_x' : 'x';
    const yColumn = viewMode === 'master' ? 'master_y' : 'y';
    for (const node of layoutedNodes) {
      const tableName = getTableName(node.type);
      const updateFn = node.type === 'project' ? setProjects : node.type === 'person' ? setPeople : setBrands;
      updateFn(prev => prev.map(p => p.id === node.id ? { ...p, ...(viewMode === 'master' ? { master_x: node.x, master_y: node.y } : { x: node.x, y: node.y }) } : p));
      await (supabase.from as any)(tableName).update({ [xColumn]: node.x, [yColumn]: node.y }).eq('id', node.id).eq('user_id', user.id);
    }
  };

  const autoOrganizeSingle = async (ref: string | null) => {
    if (!ref) return;
    const nodesToLayout = getNodesForSingleView(ref);
    if (nodesToLayout.length === 0) return;
    const flowId = getCurrentFlowIdFromRef(ref);
    const flow = flows.find(f => f.id === flowId);
    let cn = nodesToLayout.find(n => n.id === flow?.center_id && n.type === flow?.center_type) || nodesToLayout[0];
    const reordered = [cn, ...nodesToLayout.filter(n => n.node_ref !== cn.node_ref)];
    await updateAllNodePositions(applyRadialLayout(reordered, 500, 300));
  };

  const autoOrganizeMaster = async () => {
    if (!user) return;
    const nodesByFlow = new Map<number, any[]>();
    allNodes.forEach(node => { if (!node.flow_id) return; if (!nodesByFlow.has(node.flow_id)) nodesByFlow.set(node.flow_id, []); nodesByFlow.get(node.flow_id)!.push(node); });
    const flowIds = Array.from(nodesByFlow.keys());
    const cols = Math.max(2, Math.ceil(Math.sqrt(flowIds.length)));
    const maxFlowSize = Math.max(...Array.from(nodesByFlow.values()).map(n => n.length));
    const flowSpacing = Math.max(800, maxFlowSize * 120) * 1.8;
    const allLayoutedNodes: any[] = [];
    for (const [index, flowId] of flowIds.entries()) {
      const flowNodes = nodesByFlow.get(flowId) || [];
      if (flowNodes.length === 0) continue;
      const flow = flows.find(f => f.id === flowId);
      let cn = flowNodes.find(n => n.id === flow?.center_id && n.type === flow?.center_type) || flowNodes[0];
      const reordered = [cn, ...flowNodes.filter(n => n.node_ref !== cn.node_ref)];
      const row = Math.floor(index / cols); const col = index % cols;
      allLayoutedNodes.push(...applyRadialLayout(reordered, col * flowSpacing + 500, row * flowSpacing + 300));
    }
    await updateAllNodePositions(allLayoutedNodes);
    toast.success('Flows organizados!');
  };

  const autoOrganize = async () => { viewMode === 'single' ? await autoOrganizeSingle(activeNodeRef) : await autoOrganizeMaster(); };

  const calculateBounds = (nodesList: any[]) => {
    if (nodesList.length === 0) return { minX: 0, maxX: 1000, minY: 0, maxY: 800 };
    const MASTER_RING_RADIUS = 240;
    if (viewMode === 'master' && flows) {
      const positions: { x: number; y: number }[] = [];
      const getFlowOffset = (flowId: number) => {
        const idx = Math.max(0, flows.findIndex(f => f.id === flowId));
        const angle = (idx / Math.max(flows.length, 1)) * Math.PI * 2;
        const count = Math.max(flows.length, 1);
        let radius = 0;
        if (count > 1) { radius = (2 * (MASTER_RING_RADIUS + 40) + 136) / (2 * Math.sin(Math.PI / count)); }
        return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
      };
      flows.forEach((flow: any) => {
        const clusterNodes = nodesList.filter(n => n.flow_id === flow.id);
        if (clusterNodes.length === 0) return;
        const offset = getFlowOffset(flow.id);
        positions.push({ x: offset.dx, y: offset.dy });
        const otherNodes = clusterNodes.slice(1);
        otherNodes.forEach((_, i) => {
          const angle = (i / Math.max(otherNodes.length, 1)) * Math.PI * 2;
          positions.push({ x: offset.dx + MASTER_RING_RADIUS * Math.cos(angle), y: offset.dy + MASTER_RING_RADIUS * Math.sin(angle) });
        });
      });
      if (positions.length === 0) return { minX: 0, maxX: 1000, minY: 0, maxY: 800 };
      const margin = 400;
      return { minX: Math.min(...positions.map(p => p.x)) - margin, maxX: Math.max(...positions.map(p => p.x)) + margin, minY: Math.min(...positions.map(p => p.y)) - margin, maxY: Math.max(...positions.map(p => p.y)) + margin };
    }
    const xs = nodesList.map(n => n.x); const ys = nodesList.map(n => n.y);
    const margin = 150;
    return { minX: Math.min(...xs) - margin, maxX: Math.max(...xs) + margin, minY: Math.min(...ys) - margin, maxY: Math.max(...ys) + margin };
  };

  const calculateOptimalZoom = (bounds: any, width: number, height: number) => Math.min((width * 0.85) / (bounds.maxX - bounds.minX), (height * 0.85) / (bounds.maxY - bounds.minY), 1.2);

  const calculateCenterPan = (bounds: any, zoom: number, width: number, height: number) => ({
    x: width / 2 - ((bounds.minX + bounds.maxX) / 2) * zoom,
    y: height / 2 - ((bounds.minY + bounds.maxY) / 2) * zoom
  });

  // ===== VIEW EFFECTS =====
  useEffect(() => {
    if (!isLoadingData && allNodes.length > 0 && viewMode === 'master') {
      const timer = setTimeout(async () => {
        if (projects.every(p => (p.master_x ?? 0) === 0 && (p.master_y ?? 0) === 0)) await autoOrganize();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingData, viewMode]);

  useEffect(() => {
    if (viewMode === 'master' && projects.length > 0 && allNodes.length > 0) {
      const cameFromSingleView = prevViewModeRef.current === 'single';
      prevViewModeRef.current = viewMode;
      if (cameFromSingleView) {
        const timer = setTimeout(() => {
          if (svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const bounds = calculateBounds(allNodes);
            const zoom = calculateOptimalZoom(bounds, rect.width, rect.height);
            const pan = calculateCenterPan(bounds, zoom, rect.width, rect.height);
            updateState({ zoom, pan });
            setMasterViewState({ zoom, pan, hasBeenOrganized: true });
          }
        }, 100);
        return () => clearTimeout(timer);
      }
      if (masterViewState?.hasBeenOrganized) { updateState({ zoom: masterViewState.zoom, pan: masterViewState.pan }); return; }
    }
  }, [viewMode, masterViewState]);

  useEffect(() => {
    if (viewMode === 'single' && activeNodeRef && allNodes.length > 0) {
      const timer = setTimeout(() => {
        const nodesToCenter = getNodesForSingleView(activeNodeRef);
        if (nodesToCenter.length > 0 && svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          const bounds = calculateBounds(nodesToCenter);
          const pan = calculateCenterPan(bounds, 0.9, rect.width, rect.height);
          updateState({ zoom: 0.9, pan });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode, activeNodeRef]);
  // Auto-center on initial load
  useEffect(() => {
    if (!isLoadingData && initialLoadDoneRef.current && allNodes.length > 0) {
      const timer = setTimeout(() => {
        if (svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          const nodesToCenter = viewMode === 'master' ? allNodes : nodes;
          const bounds = calculateBounds(nodesToCenter);
          const zoom = calculateOptimalZoom(bounds, rect.width, rect.height);
          const pan = calculateCenterPan(bounds, zoom, rect.width, rect.height);
          updateState({ zoom, pan });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoadingData, allNodes.length]);

  // ===== DELETE =====
  const deleteConnection = async (connectionIndex: number) => {
    saveToHistory();
    const conn = allConnections[connectionIndex];
    if (!conn) return;
    setSelectedNodes([]);
    try {
      if (conn.id) { await supabase.from('connections').delete().eq('id', conn.id); }
      setAllConnections(prev => prev.filter((_, idx) => idx !== connectionIndex));
      setSelectedConnection(null);
      toast.success('Conexão deletada!');
    } catch { toast.error('Erro ao deletar conexão'); }
  };

  const deleteNode = async (nodeRef: string) => {
    if (!user) return;
    saveToHistory();
    const { type, id } = parseRef(nodeRef);
    const tableName = getTableName(type);
    setNodes(prev => prev.filter(n => n.node_ref !== nodeRef));
    setConnections(prev => prev.filter(c => c.from_ref !== nodeRef && c.to_ref !== nodeRef));
    updateState({ selectedNode: null, showSidebar: false, editingNode: null });
    setSelectedNodes(prev => prev.filter(r => r !== nodeRef));
    try {
      const sb = supabase as any;
      await sb.from('connections').delete().eq('user_id', user.id).or(`and(from_id.eq.${id},from_type.eq.${type}),and(to_id.eq.${id},to_type.eq.${type})`);
      if (tableName) await sb.from(tableName).delete().eq('id', id).eq('user_id', user.id);
    } catch (error: any) { toast.error('Erro ao deletar nó'); reloadData(); }
  };

  useKeyboardShortcuts({
    selectedNodes, setSelectedNodes, setNodes, setConnections, updateState, undo, redo,
    historyIndex, history, saveToHistory, selectedConnection, setSelectedConnection,
    setShowPathFinder, setHighlightedPath, nodes, allNodes, viewMode, zoom: state.zoom,
    deleteConnectionByIndex: deleteConnection, setMasterViewState, autoOrganize,
  });

  // ===== NODE CREATION =====
  const createNodeInDatabase = async (nodeType: 'person' | 'project' | 'brand', nodeData: any, originalNodeId: number | null = null): Promise<any> => {
    if (!user) return null;
    let currentFlowId = getCurrentFlowId();
    let isNewFlow = false;
    if (isCreatingFlowRoot) currentFlowId = null;
    if (!isCreatingFlowRoot && viewMode === 'single' && !currentFlowId) { toast.error('Selecione um flow antes de criar nós.'); return null; }
    
    if (!currentFlowId) {
      const { data: newFlow, error } = await supabase.from('flows').insert([{ center_id: 0, center_type: nodeType, name: `Flow: ${nodeData.name}`, user_id: user.id }]).select().single();
      if (error || !newFlow) { toast.error('Erro ao criar flow'); return null; }
      currentFlowId = newFlow.id; isNewFlow = true;
    }

    let centerX = isNewFlow ? 500 : nodeCreationPosition.x;
    let centerY = isNewFlow ? 300 : nodeCreationPosition.y;
    
    if (viewMode === 'master' && !isNewFlow && currentFlowId) {
      const flow = flows.find(f => f.id === currentFlowId);
      if (flow) {
        const cn = allNodes.find(n => n.id === flow.center_id && n.type === flow.center_type);
        if (cn) {
          const existing = allNodes.filter(n => n.flow_id === currentFlowId && n.node_ref !== cn.node_ref).length;
          const angle = existing * (2 * Math.PI) / Math.max(existing + 1, 1) - Math.PI / 2;
          centerX = (cn.master_x ?? cn.x ?? 500) + 200 * Math.cos(angle);
          centerY = (cn.master_y ?? cn.y ?? 300) + 200 * Math.sin(angle);
        }
      }
    }
    
    let baseData: any = { name: nodeData.name, x: centerX, y: centerY, master_x: centerX, master_y: centerY, user_id: user.id, flow_id: currentFlowId, category: nodeData.category || null, ...(originalNodeId ? { original_node_id: originalNodeId } : {}) };
    if (nodeType === 'project') { baseData.status = nodeData.projectStatus || nodeData.status || 'ativo'; baseData.deadline = nodeData.startDate || nodeData.deadline || null; }
    else if (nodeType === 'person') { baseData.email = nodeData.email || null; baseData.phone = nodeData.phone || null; baseData.company = nodeData.company || null; }
    else if (nodeType === 'brand') { baseData.website = nodeData.website || null; }

    const tableName = getTableName(nodeType);
    const { data: insertedNode, error } = await (supabase.from as any)(tableName).insert([baseData]).select().single();
    if (error || !insertedNode) { toast.error(`Erro ao criar ${nodeType}`); return null; }

    if (isNewFlow && currentFlowId) {
      await supabase.from('flows').update({ center_id: (insertedNode as any).id }).eq('id', currentFlowId);
      const { data: updatedFlow } = await supabase.from('flows').select('*').eq('id', currentFlowId).single();
      if (updatedFlow) setFlows(prev => [...prev, updatedFlow]);
    }
    return { ...insertedNode, type: nodeType, node_ref: makeRef(nodeType, (insertedNode as any).id) };
  };

  const handleCreateNode = async (nodeData: any, originalNodeId: number | null) => {
    const nodeType = nodeData.nodeType || 'person';
    const insertedNode = await createNodeInDatabase(nodeType, nodeData, originalNodeId);
    if (!insertedNode) return;
    const newNode = { ...insertedNode, isNewHighlight: true };
    if (nodeType === 'project') setProjects(prev => [...prev, newNode]);
    else if (nodeType === 'person') setPeople(prev => [...prev, newNode]);
    else setBrands(prev => [...prev, newNode]);
    if (isCreatingFlowRoot) { setActiveNodeRef(newNode.node_ref); setViewMode('single'); setIsCreatingFlowRoot(false); }
    setShowNodeCreationModal(false);
    toast.success(originalNodeId ? `Cópia criada!` : `${newNode.name} criado!`);
  };

  const handleNodeCreation = async (nodeData: any) => {
    if (!user) return;
    saveToHistory();
    const nodeType = nodeData.nodeType || 'person';
    const tableName = getTableName(nodeType);
    const { data: existingNodes } = await (supabase.from as any)(tableName).select('*').eq('name', nodeData.name.trim()).eq('user_id', user.id).limit(1);
    if (existingNodes?.length > 0) { setDuplicateCheckModal({ show: true, existingNode: existingNodes[0], newNodeData: nodeData, nodeType }); return; }
    await handleCreateNode(nodeData, null);
  };

  const handleDuplicateConfirmSame = async () => {
    if (!duplicateCheckModal) return;
    const { existingNode, newNodeData, nodeType } = duplicateCheckModal;
    const copiedData = { ...newNodeData, ...(nodeType === 'person' && { email: existingNode.email, phone: existingNode.phone, company: existingNode.company }), ...(nodeType === 'brand' && { website: existingNode.website }), category: existingNode.category };
    await handleCreateNode(copiedData, existingNode.id);
    setDuplicateCheckModal(null);
  };

  const handleDuplicateConfirmDifferent = async () => { if (duplicateCheckModal) { await handleCreateNode(duplicateCheckModal.newNodeData, null); setDuplicateCheckModal(null); } };
  const handleDuplicateCancel = () => { setDuplicateCheckModal(null); toast.info('Criação cancelada'); };

  const handleNodeUpdate = (updatedData: any) => {
    if (!editingNodeInModal) return;
    saveToHistory();
    if (editingNodeInModal.type === 'project') setProjects(prev => prev.map(n => n.id === editingNodeInModal.id ? { ...n, ...updatedData } : n));
    else if (editingNodeInModal.type === 'person') setPeople(prev => prev.map(n => n.id === editingNodeInModal.id ? { ...n, ...updatedData } : n));
    else setBrands(prev => prev.map(n => n.id === editingNodeInModal.id ? { ...n, ...updatedData } : n));
    setShowNodeCreationModal(false); setEditingNodeInModal(null); updateState({ showSidebar: false });
  };

  const handleAddWorkflow = (name: string, color: string) => { setWorkflows([...workflows, { id: Date.now(), name, color, description: '' }]); toast.success(`Workflow "${name}" criado!`); };

  const getAllCategories = (type) => [...CATEGORIES[type], ...(customCategories[type] || [])];
  const addCustomCategory = (type, category) => { if (category && !getAllCategories(type).includes(category)) { setCustomCategories(prev => ({ ...prev, [type]: [...(prev[type] || []), category] })); return true; } return false; };

  const exportData = () => {
    const dataStr = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), flows, projects, people, brands, allConnections, workflows }, null, 2);
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
    link.download = `network-matrix-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success('Exportação concluída!');
  };

  // LinkedIn import
  const handleLinkedInImport = async (data: ParsedLinkedInData, options: LinkedInImportOptions) => {
    if (!user) return;
    saveToHistory();
    const sb = supabase as any;
    const toastId = toast.loading(`Importando ${data.totalContacts} contatos...`);
    try {
      const { data: newFlow, error: flowError } = await sb.from('flows').insert({ user_id: user.id, name: `LinkedIn Import - ${new Date().toLocaleDateString('pt-BR')}`, center_type: 'person', center_id: 1 }).select().maybeSingle();
      if (flowError || !newFlow) throw flowError;
      const brandMap = new Map<string, number>();
      if (options.createBrands && data.uniqueCompanies.length > 0) {
        const { data: createdBrands } = await sb.from('brands').insert(data.uniqueCompanies.map(c => ({ user_id: user.id, flow_id: newFlow.id, name: c, x: Math.random() * 400 + 100, y: Math.random() * 400 + 100, master_x: 0, master_y: 0 }))).select();
        (createdBrands || []).forEach((b: any, i: number) => { brandMap.set(data.uniqueCompanies[i], b.id); setBrands(prev => [...prev, { ...b, type: 'brand', node_ref: makeRef('brand', b.id) }]); });
      }
      const { data: createdPeople } = await sb.from('people').insert(data.contacts.map(c => ({ user_id: user.id, flow_id: newFlow.id, name: `${c.firstName} ${c.lastName}`.trim() || 'Contato', email: c.email || null, company: c.company || null, category: options.defaultCategory, notes: c.profileUrl ? `LinkedIn: ${c.profileUrl}` : null, x: Math.random() * 400 + 100, y: Math.random() * 400 + 100, master_x: 0, master_y: 0 }))).select();
      if (createdPeople?.length > 0) {
        await sb.from('flows').update({ center_id: createdPeople[0].id }).eq('id', newFlow.id);
        setPeople(prev => [...prev, ...createdPeople.map((p: any) => ({ ...p, type: 'person', node_ref: makeRef('person', p.id) }))]);
      }
      const connsToInsert: any[] = [];
      (createdPeople || []).forEach((person: any, i: number) => {
        const contact = data.contacts[i];
        if (contact.company && options.createBrands && brandMap.has(contact.company)) connsToInsert.push({ user_id: user.id, flow_id: newFlow.id, from_id: person.id, from_type: 'person', to_id: brandMap.get(contact.company)!, to_type: 'brand', connection_type: 'works-at' });
        if (options.connectToProject && options.projectId) connsToInsert.push({ user_id: user.id, flow_id: newFlow.id, from_id: person.id, from_type: 'person', to_id: options.projectId, to_type: 'project', connection_type: 'related' });
      });
      if (connsToInsert.length > 0) {
        const { data: createdConns } = await sb.from('connections').insert(connsToInsert).select();
        if (createdConns) setAllConnections(prev => [...prev, ...createdConns.map((c: any) => ({ ...c, from: c.from_id, to: c.to_id, from_ref: makeRef(c.from_type, c.from_id), to_ref: makeRef(c.to_type, c.to_id), type: c.connection_type }))]);
      }
      setFlows(prev => [...prev, newFlow]);
      toast.dismiss(toastId);
      toast.success(`LinkedIn importado! ${createdPeople?.length || 0} contatos`);
    } catch (error: any) { toast.dismiss(toastId); toast.error('Erro na importação', { description: error?.message }); }
  };

  // ===== TOOLBAR HANDLERS =====
  const handleFitToScreen = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    const width = rect?.width ?? window.innerWidth;
    const height = rect?.height ?? (window.innerHeight - 100);
    const nodesToCenter = viewMode === 'master' ? allNodes : nodes;
    const bounds = calculateBounds(nodesToCenter);
    const zoom = calculateOptimalZoom(bounds, width, height);
    const pan = calculateCenterPan(bounds, zoom, width, height);
    updateState({ zoom, pan });
  };

  const handleMasterView = () => {
    setViewMode('master');
  };

  const handleSingleView = () => {
    if (!activeNodeRef) { toast.error('Selecione um flow para entrar no Single View.'); return; }
    if (viewMode === 'master') setMasterViewState({ zoom: state.zoom, pan: state.pan, hasBeenOrganized: true });
    setViewMode('single');
  };

  const handleNewFlow = () => {
    setIsCreatingFlowRoot(true);
    setNodeCreationPosition({ x: (window.innerWidth / 2 - state.pan.x) / state.zoom, y: ((window.innerHeight - 100) / 2 - state.pan.y) / state.zoom });
    setShowNodeCreationModal(true);
  };

  // Flow manager data
  const flowsForManager = flows.map(flow => {
    const an = [...projects, ...people, ...brands];
    const centerNode = an.find(n => n.id === flow.center_id && n.type === flow.center_type);
    const flowNodes = an.filter(n => n.flow_id === flow.id);
    return { ...flow, centerName: centerNode?.name || 'Desconhecido', stats: { people: flowNodes.filter(n => n.type === 'person').length, projects: flowNodes.filter(n => n.type === 'project').length, brands: flowNodes.filter(n => n.type === 'brand').length } };
  });

  // ===== RENDER =====
  return (
    <div className="min-h-screen h-screen flex flex-col overflow-hidden"
      style={{ background: viewMode === 'single' ? 'hsl(225, 22%, 9%)' : 'hsl(220, 20%, 7%)' }}>
      {/* Sidebar - Groups only */}
      <NetworkSidebar viewMode={viewMode} allNodes={allNodes} nodes={nodes} />

      {/* Main area */}
      <div className="flex-1 flex flex-col relative">
        {/* Toolbar */}
        <NetworkToolbar
          viewMode={viewMode}
          nodeCount={nodes.length}
          connectionCount={connections.length}
          searchQuery={aiSearchQuery}
          setSearchQuery={setAiSearchQuery}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          showAIInsights={showAIInsights}
          setShowAIInsights={setShowAIInsights}
          onFitToScreen={handleFitToScreen}
          onMasterView={handleMasterView}
          onSingleView={handleSingleView}
          onOpenFlows={() => setShowFlowsManager(prev => !prev)}
          onOpenWhatsApp={onOpenWhatsApp}
          onLogout={onLogout}
          onSearch={() => setShowOpportunities(true)}
        />

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
            showLabels={showLabels}
            onOpenEditModal={(node) => { setEditingNodeInModal(node); setNodeCreationType(node.type); setShowNodeCreationModal(true); }}
            onSingleClick={(node) => { setDetailPanelNode(node); }}
            onGoToFlow={(flowId) => { 
              setDetailPanelNode(null); 
              const flow = flows.find(f => f.id === flowId);
              if (flow) {
                setActiveNodeRef(makeRef(flow.center_type, flow.center_id)); 
                setViewMode('single'); 
              }
            }}
            forcePositions={forcePositions}
            onForceDragStart={onForceDragStart}
            onForceDrag={onForceDrag}
            onForceDragEnd={onForceDragEnd}
            useForceLayout={viewMode === 'single'}
            hoveredFlowId={hoveredFlowId}
          />

          {/* Compact zoom - bottom right */}
          <div className="absolute bottom-16 right-4 flex items-center gap-1.5 z-30">
            <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { const w = window.innerWidth; const h = window.innerHeight - 100; const nz = Math.max(state.zoom / 1.2, 0.3); const cx = (w / 2 - state.pan.x) / state.zoom; const cy = (h / 2 - state.pan.y) / state.zoom; updateState({ zoom: nz, pan: { x: w / 2 - cx * nz, y: h / 2 - cy * nz } }); }}>
              <ZoomOut size={16} />
            </button>
            <button className="h-9 px-2 flex items-center justify-center rounded-lg bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors text-sm font-mono"
              onClick={() => updateState({ zoom: 1 })}>
              {Math.round(state.zoom * 100)}%
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { const w = window.innerWidth; const h = window.innerHeight - 100; const nz = Math.min(state.zoom * 1.2, 3); const cx = (w / 2 - state.pan.x) / state.zoom; const cy = (h / 2 - state.pan.y) / state.zoom; updateState({ zoom: nz, pan: { x: w / 2 - cx * nz, y: h / 2 - cy * nz } }); }}>
              <ZoomIn size={16} />
            </button>
            <div className="h-5 w-px bg-border/20 mx-0.5" />
            <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleFitToScreen}>
              <Target size={16} />
            </button>
          </div>

          {/* FABs — bottom center */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
            {viewMode === 'single' && (
              <button
                className="px-4 py-2.5 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-mono flex items-center gap-2 border border-primary/30"
                onClick={() => {
                  setIsCreatingFlowRoot(false);
                  const w = window.innerWidth; const h = window.innerHeight;
                  const cx = (w / 2 - state.pan.x) / state.zoom;
                  const cy = (h / 2 - state.pan.y) / state.zoom;
                  setNodeCreationPosition({ x: cx, y: cy });
                  setShowNodeCreationModal(true);
                }}
              >
                + Criar Nó
              </button>
            )}
            <button
              className="px-4 py-2.5 rounded-full bg-secondary/60 text-foreground hover:bg-secondary/80 transition-colors text-sm font-mono flex items-center gap-2 border border-border/30"
              onClick={handleNewFlow}
            >
              + Novo Flow
            </button>
          </div>

        </div>

        {/* Flow Manager Panel - top left overlay */}
        <FlowManagerPanel
          open={showFlowsManager}
          onOpenChange={setShowFlowsManager}
          flows={flowsForManager}
          onSelectFlow={(flowId) => {
            const sf = flows.find(f => f.id === flowId);
            if (sf) { setActiveNodeRef(makeRef(sf.center_type, sf.center_id)); setViewMode('single'); }
          }}
          onDeleteFlow={async (flowId) => {
            if (!user) return;
            const { error } = await supabase.from('flows').delete().eq('id', flowId).eq('user_id', user.id);
            if (error) { toast.error('Erro ao deletar flow'); return; }
            setFlows(prev => prev.filter(f => f.id !== flowId));
            toast.success('Flow deletado');
            const df = flows.find(f => f.id === flowId);
            if (df && activeNodeRef === makeRef(df.center_type, df.center_id)) { setViewMode('master'); setActiveNodeRef(null); }
          }}
        />

        {/* Node Detail Panel */}
        {detailPanelNode && (
          <NodeDetailPanel
            node={detailPanelNode}
            connections={allConnections}
            allNodes={allNodes}
            onClose={() => setDetailPanelNode(null)}
            onNavigateToNode={(nodeRef) => {
              const targetNode = allNodes.find(n => n.node_ref === nodeRef);
              if (targetNode) {
                setDetailPanelNode(targetNode);
                setSelectedNodes([nodeRef]);
              }
            }}
            onEdit={(node) => {
              setDetailPanelNode(null);
              setEditingNodeInModal(node);
              setNodeCreationType(node.type);
              setShowNodeCreationModal(true);
            }}
          />
        )}

        {/* Path indicator */}
        {viewMode === 'single' && (
          <PathIndicator selectedNode={selectedNode} centerNode={centerNode} allNodes={allNodes} connections={allConnections} />
        )}

        <WhatsAppNotifications />
      </div>

      {/* All modals extracted */}
      <NetworkModals
        contextMenu={state.contextMenu}
        updateState={updateState}
        viewMode={viewMode}
        onContextCreateNode={() => {
          if (state.contextMenu) {
            setIsCreatingFlowRoot(false);
            setNodeCreationPosition({ x: state.contextMenu.canvasX, y: state.contextMenu.canvasY });
            setShowNodeCreationModal(true);
            updateState({ contextMenu: null });
          }
        }}
        showPathFinder={showPathFinder}
        setShowPathFinder={setShowPathFinder}
        pathStart={pathStart}
        pathEnd={pathEnd}
        setPathStart={setPathStart}
        setPathEnd={setPathEnd}
        setHighlightedPath={setHighlightedPath}
        nodes={nodes}
        connections={connections}
        showQuickActions={showQuickActions}
        setShowQuickActions={setShowQuickActions}
        onAutoOrganize={autoOrganize}
        onFitToScreen={handleFitToScreen}
        onExport={exportData}
        setIsCreatingFlowRoot={setIsCreatingFlowRoot}
        isCreatingFlow={isCreatingFlowRoot}
        showNodeCreationModal={showNodeCreationModal}
        setShowNodeCreationModal={setShowNodeCreationModal}
        editingNodeInModal={editingNodeInModal}
        setEditingNodeInModal={setEditingNodeInModal}
        getAllCategories={getAllCategories}
        onCreateNode={handleNodeCreation}
        onUpdateNode={handleNodeUpdate}
        showFlowsManager={showFlowsManager}
        setShowFlowsManager={setShowFlowsManager}
        flowsForManager={flowsForManager}
        onSelectFlow={(flowId) => {
          const sf = flows.find(f => f.id === flowId);
          if (sf) { setActiveNodeRef(makeRef(sf.center_type, sf.center_id)); setViewMode('single'); setShowFlowsManager(false); setTimeout(() => autoOrganizeSingle(makeRef(sf.center_type, sf.center_id)), 50); }
        }}
        onDeleteFlow={async (flowId) => {
          if (!user) return;
          const { error } = await supabase.from('flows').delete().eq('id', flowId).eq('user_id', user.id);
          if (error) { toast.error('Erro ao deletar flow'); return; }
          setFlows(prev => prev.filter(f => f.id !== flowId));
          toast.success('Flow deletado');
          const df = flows.find(f => f.id === flowId);
          if (df && activeNodeRef === makeRef(df.center_type, df.center_id)) { setViewMode('master'); setActiveNodeRef(null); }
        }}
        showLinkedInImport={showLinkedInImport}
        setShowLinkedInImport={setShowLinkedInImport}
        onLinkedInImport={handleLinkedInImport}
        projects={projects}
        duplicateCheckModal={duplicateCheckModal}
        onDuplicateConfirmSame={handleDuplicateConfirmSame}
        onDuplicateConfirmDifferent={handleDuplicateConfirmDifferent}
        onDuplicateCancel={handleDuplicateCancel}
        workflows={workflows}
        showAIInsights={showAIInsights}
        setShowAIInsights={setShowAIInsights}
        allNodes={allNodes}
        allConnections={allConnections}
        flows={flows}
        people={people}
        brands={brands}
        onHighlightPath={(ids) => setHighlightedPath(ids)}
        onFocusNode={(nodeRef) => {
          const node = allNodes.find(n => n.node_ref === nodeRef);
          if (node) { updateState({ selectedNode: nodeRef }); if (node.flow_id) { const flow = flows.find(f => f.id === node.flow_id); if (flow) { setActiveNodeRef(makeRef(flow.center_type, flow.center_id)); setViewMode('single'); } } }
        }}
        onOpenConnectionModal={(conn, involvedNodes, type) => { setShowAIInsights(false); setAiConnectionModal({ connection: conn, nodes: involvedNodes, type }); }}
        aiConnectionModal={aiConnectionModal}
        setAiConnectionModal={setAiConnectionModal}
        onAiConnectionFocusNode={(nodeRef) => {
          setAiConnectionModal(null);
          const node = allNodes.find(n => n.node_ref === nodeRef);
          if (node) { updateState({ selectedNode: nodeRef }); if (node.flow_id) { const flow = flows.find(f => f.id === node.flow_id); if (flow) { setActiveNodeRef(makeRef(flow.center_type, flow.center_id)); setViewMode('single'); } } }
        }}
        showOpportunities={showOpportunities}
        setShowOpportunities={setShowOpportunities}
        onSelectOpportunityNode={(nodeRef) => { const node = allNodes.find(n => n.node_ref === nodeRef); if (node) { setSelectedNodes([nodeRef]); toast.success(`Selecionado: ${node.name}`); setShowOpportunities(false); } }}
        showSidebar={state.showSidebar}
        editingNode={state.editingNode}
        addCustomCategory={addCustomCategory}
        onNodeEditorUpdate={(field, value) => {
          const updated = { ...state.editingNode, [field]: value };
          updateState({ editingNode: updated });
          setNodes(n => n.map(nd => nd.node_ref === updated.node_ref ? updated : nd));
        }}
        onNodeEditorClose={() => updateState({ showSidebar: false, editingNode: null })}
        onNodeEditorDelete={() => deleteNode(state.editingNode.node_ref)}
        onNodeEditorConfirm={() => { updateState({ showSidebar: false, editingNode: null }); toast.success('Alterações salvas!'); }}
      />
    </div>
  );
};
