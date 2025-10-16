import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ZoomIn, ZoomOut, X, Building2, User, FolderKanban, Undo2, Redo2, LayoutGrid, Download, Upload, Maximize2, Info, Layers, BarChart3, Route, Sparkles, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { useNetworkState } from '@/hooks/useNetworkState';
import { useNetworkHistory } from '@/hooks/useNetworkHistory';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SAMPLE_WORKFLOWS, SAMPLE_PROJECTS, SAMPLE_PEOPLE, SAMPLE_BRANDS, SAMPLE_CONNECTIONS } from '@/data/sampleNetworkData';

const CATEGORIES = {
  person: ['Pessoal', 'Profissional', 'Cliente', 'Fornecedor', 'Parceiro'],
  brand: ['Bebida', 'Entretenimento', 'Hotelaria', 'Varejo', 'Serviços', 'Tecnologia', 'Alimentação'],
  project: ['P', 'M', 'G']
};

export const NetworkMatrix = () => {
  // Nova arquitetura: separar projetos, pessoas e marcas
  const [projects, setProjects] = useState<any[]>(SAMPLE_PROJECTS);
  const [people, setPeople] = useState<any[]>(SAMPLE_PEOPLE);
  const [brands, setBrands] = useState<any[]>(SAMPLE_BRANDS);
  const [allConnections, setAllConnections] = useState(SAMPLE_CONNECTIONS);
  const [workflows, setWorkflows] = useState(SAMPLE_WORKFLOWS);

  const [activeProjectId, setActiveProjectId] = useState<number | null>(SAMPLE_PROJECTS[0]?.id ?? null);
  const [viewMode, setViewMode] = useState('master');
  const [showLegend, setShowLegend] = useState(true);
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

  const { state, updateState } = useNetworkState();
  const svgRef = useRef(null);

  // Combinar todos os nós
  const allNodes = [...projects, ...people, ...brands];

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
  const updateNodePosition = (nodeId: number, deltaX: number, deltaY: number) => {
    const isProject = projects.find(p => p.id === nodeId);
    const isPerson = people.find(p => p.id === nodeId);
    const isBrand = brands.find(b => b.id === nodeId);
    
    if (isProject) {
      setProjects(prev => prev.map(p => 
        p.id === nodeId ? { ...p, x: p.x + deltaX, y: p.y + deltaY, isNewHighlight: false } : p
      ));
    } else if (isPerson) {
      setPeople(prev => prev.map(p => 
        p.id === nodeId ? { ...p, x: p.x + deltaX, y: p.y + deltaY, isNewHighlight: false } : p
      ));
    } else if (isBrand) {
      setBrands(prev => prev.map(b => 
        b.id === nodeId ? { ...b, x: b.x + deltaX, y: b.y + deltaY, isNewHighlight: false } : b
      ));
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
      const timer = setTimeout(() => {
        autoOrganize();
        
        // Após organizar, centralizar todos os projetos na tela
        setTimeout(() => {
          const projectNodes = allNodesWithAnchors.filter(n => n.type === 'project');
          if (projectNodes.length > 0 && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const bounds = calculateBounds(projectNodes);
            const optimalZoom = calculateOptimalZoom(bounds, rect.width, rect.height);
            const centerPan = calculateCenterPan(bounds, optimalZoom, rect.width, rect.height);
            updateState({ zoom: optimalZoom, pan: centerPan });
          }
        }, 100);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

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
        
        // If connection involves the active project, set homeProjectId on the other node
        [fromNode, toNode].forEach(node => {
          if (node && (node.type === 'person' || node.type === 'brand' || node.type === 'project')) {
            const otherNodeId = node.id === conn.from ? conn.to : conn.from;
            if (otherNodeId === activeProjectId && !(node as any).homeProjectId) {
              // Set homeProjectId to keep it visible after connection deletion
              if (node.type === 'person') {
                setPeople(prev => prev.map(p => p.id === node.id ? { ...p, homeProjectId: activeProjectId } : p));
              } else if (node.type === 'brand') {
                setBrands(prev => prev.map(b => b.id === node.id ? { ...b, homeProjectId: activeProjectId } : b));
              } else if (node.type === 'project') {
                setProjects(prev => prev.map(p => p.id === node.id ? { ...p, homeProjectId: activeProjectId } : p));
              }
            }
          }
        });
      }
    }
    
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

  const handleNodeCreation = (nodeData: any) => {
    saveToHistory();
    const newNode: any = {
      id: Date.now(),
      type: nodeCreationType,
      x: nodeCreationPosition.x,
      y: nodeCreationPosition.y,
      isNewHighlight: true,
      ...nodeData
    };

    // Set homeProjectId for nodes created in single view
    if (viewMode === 'single' && activeProjectId) {
      if (nodeCreationType === 'person' || nodeCreationType === 'brand' || nodeCreationType === 'project') {
        newNode.homeProjectId = activeProjectId;
      }
    }

    // Set default fields for projects
    if (nodeCreationType === 'project') {
      newNode.workflows = nodeData.workflows || [];
      newNode.status = nodeData.projectStatus || nodeData.status || 'ativo';
      newNode.deadline = nodeData.startDate || nodeData.deadline || '';
      newNode.category = nodeData.category || 'M';
    }

    setNodes(prevNodes => [...prevNodes, newNode]);
    setShowNodeCreationModal(false);
    
    // If creating a project from Master View, switch to Single View and center on it
    if (nodeCreationType === 'project' && viewMode === 'master') {
      setActiveProjectId(newNode.id);
      setViewMode('single');
      toast.success(`Projeto "${newNode.name}" criado!`);
      
      // First timeout: let React recalculate nodes
      setTimeout(() => {
        autoOrganizeSingle(newNode.id);
      }, 50);
      
      // Second timeout: center view after layout is done
      setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight - 100;
        updateState({
          zoom: 1,
          pan: { 
            x: width / 2 - newNode.x, 
            y: height / 2 - newNode.y 
          }
        });
      }, 250);
    } else {
      // For nodes created in Single View (including projects), just show sidebar
      updateState({ editingNode: newNode, showSidebar: true });
      toast.success(`${newNode.name} criado!`);
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
      setNodes(nodes.map(n => n.id === editingNodeInModal.id ? { ...n, ...updatedData } : n));
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
              <button
                onClick={() => setViewMode('single')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'single' 
                    ? 'bg-blue-600 border border-blue-500 text-white shadow-lg' 
                    : 'bg-transparent border border-blue-500/30 text-blue-400 hover:bg-blue-600/20'
                }`}
              >
                <Target size={16} className="inline mr-2" />
                Single View
              </button>
            </div>
            
            <Button 
              onClick={() => setShowFlowStarterModal(true)}
              variant="outline" 
              size="icon" 
              className="rounded-lg hover:bg-primary/10"
              title="Criar novo flow"
            >
              <Plus size={18} />
            </Button>
            
            <div className="w-px h-8 bg-border mx-1"></div>
            
            <input type="file" id="fileImport" accept=".json" onChange={handleFileImport} className="hidden" />
            <button onClick={() => document.getElementById('fileImport').click()} 
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
              <Upload size={18} />
            </button>
            <button onClick={exportData} 
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
              <Download size={18} />
            </button>
            
            <button onClick={undo} disabled={historyIndex <= 0}
              className={`p-2 rounded-lg transition-all ${historyIndex <= 0 ? 'text-muted' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <Undo2 size={18} />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1}
              className={`p-2 rounded-lg transition-all ${historyIndex >= history.length - 1 ? 'text-muted' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <Redo2 size={18} />
            </button>
            
            <div className="w-px h-8 bg-border mx-1"></div>
            
            <button onClick={() => updateState({ zoom: Math.max(state.zoom / 1.2, 0.3) })} 
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
              <ZoomOut size={18} />
            </button>
            <div className="text-sm text-muted-foreground font-mono px-2 min-w-[50px] text-center">
              {Math.round(state.zoom * 100)}%
            </div>
            <button onClick={() => updateState({ zoom: Math.min(state.zoom * 1.2, 3) })} 
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all">
              <ZoomIn size={18} />
            </button>
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
            
            <div className="w-px h-8 bg-border mx-1"></div>
            
            <button 
              onClick={() => setShowProjectManager(!showProjectManager)}
              className={`p-2 rounded-lg transition-all ${showProjectManager ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <FolderKanban size={18} />
            </button>
            <button 
              onClick={() => updateState({ showAnalytics: !state.showAnalytics, showSidebar: false })}
              className={`p-2 rounded-lg transition-all ${state.showAnalytics ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <BarChart3 size={18} />
            </button>
            <button 
              onClick={() => setShowLegend(!showLegend)}
              className={`p-2 rounded-lg transition-all ${showLegend ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <Info size={18} />
            </button>
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
            updateState({ showSidebar: false });
          }}
          onGoToProject={(id) => {
            setActiveProjectId(id);
            setViewMode('single');
            
            // First timeout: let React recalculate nodes
            setTimeout(() => {
              autoOrganizeSingle(id);
            }, 50);
            
            // Second timeout: center view after layout is done
            setTimeout(() => {
              const project = projects.find(p => p.id === id);
              if (project) {
                const width = window.innerWidth;
                const height = window.innerHeight - 100;
                updateState({
                  zoom: 0.95,
                  pan: { 
                    x: width / 2 - project.x * 0.95, 
                    y: height / 2 - project.y * 0.95 
                  }
                });
              }
            }, 250);
          }}
        />

        {/* Botões flutuantes de ação */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
          {/* Reorganizar Nós */}
          <button
            onClick={autoOrganize}
            className="p-4 bg-primary text-primary-foreground rounded-full shadow-2xl hover:scale-110 transition-all group relative"
            title="Reorganizar Nós (A)"
          >
            <LayoutGrid size={22} className="group-hover:scale-110 transition-transform" />
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Reorganizar Nós
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

        {state.showSidebar && state.editingNode && (
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
          />
        )}

        {state.showAnalytics && (
          <AnalyticsPanel 
            nodes={nodes} 
            connections={connections}
            onClose={() => updateState({ showAnalytics: false })} 
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
              toast.success('Projeto criado com sucesso!');
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
      </div>
    </div>
  );
};
