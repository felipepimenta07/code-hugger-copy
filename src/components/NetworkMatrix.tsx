import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ZoomIn, ZoomOut, X, Building2, User, Target, Undo2, Redo2, Shuffle, Download, Upload, Maximize2, Info, Layers, BarChart3, Route, Sparkles } from 'lucide-react';
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
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [people, setPeople] = useState(SAMPLE_PEOPLE);
  const [brands, setBrands] = useState(SAMPLE_BRANDS);
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

  const { state, updateState } = useNetworkState();
  const svgRef = useRef(null);

  // Combinar todos os nós
  const allNodes = [...projects, ...people, ...brands];

  // Calcular anchorProjectId por nó (useMemo)
  const anchors = React.useMemo(() => {
    const map = new Map<number, number | null>();
    const byId = new Map(allNodes.map(n => [n.id, n]));
    for (const n of allNodes) {
      if (n.type === 'project') { 
        map.set(n.id, n.id); 
        continue; 
      }
      const connectedProjects = allConnections
        .filter(c => c.from === n.id || c.to === n.id)
        .map(c => {
          const other = c.from === n.id ? c.to : c.from;
          const otherNode = byId.get(other);
          return otherNode?.type === 'project' ? other : null;
        })
        .filter(Boolean) as number[];
      map.set(n.id, connectedProjects[0] ?? null);
    }
    return map;
  }, [allNodes, allConnections]);

  // Adicionar anchorProjectId aos nós
  const allNodesWithAnchors = React.useMemo(() => 
    allNodes.map(n => ({ ...n, anchorProjectId: anchors.get(n.id) ?? null })),
    [allNodes, anchors]
  );

  // Filtrar nós e conexões por projeto/modo
  const nodes = viewMode === 'master'
    ? allNodesWithAnchors.map(n => {
        const project = projects.find(p => p.id === n.anchorProjectId);
        return { ...n, projectId: project?.id, projectColor: project ? '#8b5cf6' : '#6366f1' };
      })
    : (() => {
        const activeProject = projects.find(p => p.id === activeProjectId);
        if (!activeProject) return [];
        const neighbors = allNodesWithAnchors.filter(n => 
          allConnections.some(c => 
            (c.from === n.id && c.to === activeProject.id) || 
            (c.to === n.id && c.from === activeProject.id)
          )
        );
        return [{ ...activeProject, anchorProjectId: activeProject.id }, ...neighbors];
      })();

  const connections = viewMode === 'master'
    ? allConnections
    : allConnections.filter(c => {
        const fromInNodes = nodes.some(n => n.id === c.from);
        const toInNodes = nodes.some(n => n.id === c.to);
        return fromInNodes && toInNodes;
      });

  const saveToHistory = () => {};
  const undo = () => {};
  const redo = () => {};
  const history = [];
  const historyIndex = -1;

  // Função para atualizar posição de nós (corrige dragging)
  const updateNodePosition = (nodeId: number, deltaX: number, deltaY: number) => {
    const isProject = projects.find(p => p.id === nodeId);
    const isPerson = people.find(p => p.id === nodeId);
    const isBrand = brands.find(b => b.id === nodeId);
    
    if (isProject) {
      setProjects(prev => prev.map(p => 
        p.id === nodeId ? { ...p, x: p.x + deltaX, y: p.y + deltaY } : p
      ));
    } else if (isPerson) {
      setPeople(prev => prev.map(p => 
        p.id === nodeId ? { ...p, x: p.x + deltaX, y: p.y + deltaY } : p
      ));
    } else if (isBrand) {
      setBrands(prev => prev.map(b => 
        b.id === nodeId ? { ...b, x: b.x + deltaX, y: b.y + deltaY } : b
      ));
    }
  };

  const setNodes = (updater) => {
    // TODO: implementar atualização de nós
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
    
    // Ordenar por importância (número de conexões)
    const sorted = [...nodesToLayout].sort((a, b) => 
      getConnectionCount(b) - getConnectionCount(a)
    );
    
    // Nó central (mais conectado)
    const centerNode = sorted[0];
    const otherNodes = sorted.slice(1);
    
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
    const activeProject = projects.find(p => p.id === projectId);
    if (!activeProject) return;
    
    const neighbors = allNodesWithAnchors.filter(n => 
      allConnections.some(c => 
        (c.from === n.id && c.to === projectId) || 
        (c.to === n.id && c.from === projectId)
      )
    );
    
    const nodesToLayout = [activeProject, ...neighbors];
    const layouted = applyRadialLayout(nodesToLayout, 500, 400);
    updateAllNodePositions(layouted);
  };

  const autoOrganize = () => {
    if (viewMode === 'single') {
      autoOrganizeSingle(activeProjectId);
    } else {
      // Master View: grid de clusters por projeto
      const cols = Math.ceil(Math.sqrt(projects.length));
      projects.forEach((project, pIndex) => {
        const clusterNodes = allNodesWithAnchors.filter(n => 
          n.anchorProjectId === project.id && n.id !== project.id
        );
        if (clusterNodes.length > 0 || true) {
          const col = pIndex % cols;
          const row = Math.floor(pIndex / cols);
          const clusterX = col * 1000 + 500;
          const clusterY = row * 900 + 450;
          const layouted = applyRadialLayout([project, ...clusterNodes], clusterX, clusterY);
          updateAllNodePositions(layouted);
        }
      });
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

  // Ajustar zoom/pan quando mudar de view ou projeto
  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight - 100;
    
    if (viewMode === 'single' && nodes.length > 0) {
      const bounds = calculateBounds(nodes);
      const zoom = calculateOptimalZoom(bounds, width, height);
      const pan = calculateCenterPan(bounds, zoom, width, height);
      updateState({ zoom, pan });
    } else if (viewMode === 'master' && allNodes.length > 0) {
      const bounds = calculateBounds(allNodes);
      const zoom = calculateOptimalZoom(bounds, width, height);
      const pan = calculateCenterPan(bounds, zoom, width, height);
      updateState({ zoom, pan });
    }
  }, [viewMode, activeProjectId]);

  // Auto-organizar ao carregar a página
  useEffect(() => {
    const timer = setTimeout(() => {
      if (allNodes.length > 0) {
        autoOrganize();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

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
    setSelectedConnection,
    setShowPathFinder,
    setHighlightedPath
  });

  const addNode = () => {
    if (state.newNodeName.trim() && viewMode === 'single') {
      saveToHistory();
      const newNode = {
        id: Date.now(),
        name: state.newNodeName,
        type: state.newNodeType,
        x: (window.innerWidth / 2 - state.pan.x) / state.zoom,
        y: (300 - state.pan.y) / state.zoom
      };
      setNodes([...nodes, newNode]);
      updateState({ newNodeName: '', editingNode: newNode, showSidebar: true, showAnalytics: false });
    }
  };

  const deleteNode = (nodeId) => {
    saveToHistory();
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId));
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
    const newNode = {
      id: Date.now(),
      type: nodeCreationType,
      x: nodeCreationPosition.x,
      y: nodeCreationPosition.y,
      ...nodeData
    };
    setNodes([...nodes, newNode]);
    setShowNodeCreationModal(false);
    updateState({ editingNode: newNode, showSidebar: true });
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
      category: 'P',
      status: 'Ativo',
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
            
            <div className="flex gap-2">
              {projects.map(p => (
                <div key={p.id} className="relative group">
                  {editingProjectId === p.id ? (
                    <input
                      type="text"
                      value={editingProjectName}
                      onChange={(e) => setEditingProjectName(e.target.value)}
                      onBlur={() => handleProjectNameChange(p.id, editingProjectName)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleProjectNameChange(p.id, editingProjectName);
                        if (e.key === 'Escape') {
                          setEditingProjectId(null);
                          setEditingProjectName('');
                        }
                      }}
                      autoFocus
                      className="px-3 py-1.5 rounded-lg bg-secondary border border-primary text-xs font-medium outline-none min-w-[100px]"
                      style={{ borderLeft: `3px solid #8b5cf6` }}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setActiveProjectId(p.id);
                        setViewMode('single');
                        setTimeout(() => autoOrganizeSingle(p.id), 100);
                      }}
                      onDoubleClick={() => {
                        setEditingProjectId(p.id);
                        setEditingProjectName(p.name);
                      }}
                      className="relative px-3 py-1.5 rounded-lg transition-all hover:bg-secondary"
                      style={{ 
                        borderLeft: `3px solid #8b5cf6`,
                        opacity: viewMode === 'master' || activeProjectId === p.id ? 1 : 0.5 
                      }}
                    >
                      <div className="text-xs text-muted-foreground group-hover:text-foreground font-medium">
                        {p.name}
                      </div>
                    </button>
                  )}
                  
                  {projects.length > 1 && !editingProjectId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(p.id, p.name);
                      }}
                      className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1 bg-destructive text-destructive-foreground rounded-full transition-all hover:scale-110"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                onClick={handleCreateNewProject}
                className="group px-3 py-1.5 rounded-lg transition-all hover:bg-secondary border border-dashed border-border hover:border-primary"
              >
                <Plus size={14} className="inline text-muted-foreground group-hover:text-foreground" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground ml-1">Novo Projeto</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode(viewMode === 'master' ? 'single' : 'master')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'master' 
                  ? 'bg-primary text-primary-foreground shadow-lg' 
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}>
              <Layers size={16} className="inline mr-2" />
              {viewMode === 'master' ? 'Master View' : 'Single View'}
            </button>
            
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
        
        {viewMode === 'single' && (
          <div className="flex gap-2 items-center">
            <input 
              type="text" 
              value={state.newNodeName} 
              onChange={(e) => updateState({ newNodeName: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && addNode()}
              placeholder="Nome do novo nó"
              className="flex-1 px-4 py-2.5 bg-secondary text-foreground border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
            <select 
              value={state.newNodeType} 
              onChange={(e) => updateState({ newNodeType: e.target.value })}
              className="px-4 py-2.5 bg-secondary text-foreground border border-border rounded-lg text-sm focus:outline-none focus:border-primary">
              <option value="project">🎯 Projeto</option>
              <option value="person">👤 Pessoa</option>
              <option value="brand">🏢 Marca</option>
            </select>
            <button 
              onClick={addNode} 
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all">
              <Plus size={18} />
            </button>
          </div>
        )}
        
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
          onOpenEditModal={(node) => {
            setEditingNodeInModal(node);
            setNodeCreationType(node.type);
            setShowNodeCreationModal(true);
            updateState({ showSidebar: false });
          }}
        />

        {/* Botão flutuante de auto-organizar */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
          <button
            onClick={autoOrganize}
            className="p-4 bg-primary text-primary-foreground rounded-full shadow-2xl hover:scale-110 transition-all group"
            title="Auto-organizar (A)"
          >
            <Shuffle size={22} className="group-hover:rotate-12 transition-transform" />
          </button>
          
          <button
            onClick={() => setShowPathFinder(true)}
            className="p-3.5 bg-secondary text-foreground rounded-full shadow-xl hover:scale-110 transition-all group"
            title="Encontrar Caminho (P)"
          >
            <Route size={20} />
          </button>
          
          <button
            onClick={() => {
              const width = window.innerWidth;
              const height = window.innerHeight - 100;
              const bounds = calculateBounds(viewMode === 'single' ? nodes : allNodes);
              const zoom = calculateOptimalZoom(bounds, width, height);
              const pan = calculateCenterPan(bounds, zoom, width, height);
              updateState({ zoom, pan });
            }}
            className="p-3.5 bg-secondary text-foreground rounded-full shadow-xl hover:scale-110 transition-all group"
            title="Ajustar Tela (F)"
          >
            <Maximize2 size={20} />
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
      </div>
    </div>
  );
};
