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

  const [activeWorkflowId, setActiveWorkflowId] = useState(1);
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
  const [editingWorkflowId, setEditingWorkflowId] = useState<number | null>(null);
  const [editingWorkflowName, setEditingWorkflowName] = useState('');
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  const { state, updateState } = useNetworkState();
  const svgRef = useRef(null);

  // Combinar todos os nós
  const allNodes = [...projects, ...people, ...brands];

  // Filtrar nós e conexões por workflow/modo
  const nodes = viewMode === 'master'
    ? allNodes.map(n => {
        const nodeWorkflows = n.workflows || [];
        const workflow = workflows.find(w => nodeWorkflows.includes(w.id));
        return { ...n, workflowId: workflow?.id, workflowColor: workflow?.color };
      })
    : allNodes.filter(n => n.workflows?.includes(activeWorkflowId));

  const connections = viewMode === 'master'
    ? allConnections
    : allConnections.filter(c => {
        const fromNode = allNodes.find(n => n.id === c.from);
        const toNode = allNodes.find(n => n.id === c.to);
        return fromNode?.workflows?.includes(activeWorkflowId) && 
               toNode?.workflows?.includes(activeWorkflowId);
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

  const autoOrganize = () => {
    if (viewMode === 'single') {
      const layouted = applyRadialLayout(nodes, 500, 400);
      updateAllNodePositions(layouted);
    } else {
      // Master View: grid de clusters radiais
      const cols = Math.ceil(Math.sqrt(workflows.length));
      workflows.forEach((workflow, wIndex) => {
        const workflowNodes = allNodes.filter(n => n.workflows?.includes(workflow.id));
        if (workflowNodes.length > 0) {
          const col = wIndex % cols;
          const row = Math.floor(wIndex / cols);
          const clusterX = col * 1000 + 500;
          const clusterY = row * 900 + 450;
          const layouted = applyRadialLayout(workflowNodes, clusterX, clusterY);
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

  // Ajustar zoom/pan quando mudar de view ou workflow
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
  }, [viewMode, activeWorkflowId]);

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

  const handleCreateNewWorkflow = () => {
    const colors = ['#EC4899', '#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EF4444'];
    const usedColors = workflows.map(w => w.color);
    const availableColor = colors.find(c => !usedColors.includes(c)) || colors[0];
    
    const newWorkflow = {
      id: Date.now(),
      name: `Workflow ${workflows.length + 1}`,
      color: availableColor,
      description: ''
    };
    
    setWorkflows([...workflows, newWorkflow]);
    setActiveWorkflowId(newWorkflow.id);
    setViewMode('single');
    
    setTimeout(() => {
      setEditingWorkflowId(newWorkflow.id);
      setEditingWorkflowName(newWorkflow.name);
    }, 100);
  };

  const handleWorkflowNameChange = (workflowId: number, newName: string) => {
    if (newName.trim()) {
      setWorkflows(prev => 
        prev.map(w => w.id === workflowId ? { ...w, name: newName.trim() } : w)
      );
    }
    setEditingWorkflowId(null);
    setEditingWorkflowName('');
  };

  const handleDeleteWorkflow = (workflowId: number, workflowName: string) => {
    if (workflows.length <= 1) {
      alert('Você precisa ter pelo menos um workflow!');
      return;
    }
    
    if (confirm(`Deletar workflow "${workflowName}"?`)) {
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      if (activeWorkflowId === workflowId) {
        const remainingWorkflows = workflows.filter(w => w.id !== workflowId);
        setActiveWorkflowId(remainingWorkflows[0].id);
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
              {workflows.map(w => (
                <div key={w.id} className="relative group">
                  {editingWorkflowId === w.id ? (
                    <input
                      type="text"
                      value={editingWorkflowName}
                      onChange={(e) => setEditingWorkflowName(e.target.value)}
                      onBlur={() => handleWorkflowNameChange(w.id, editingWorkflowName)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleWorkflowNameChange(w.id, editingWorkflowName);
                        if (e.key === 'Escape') {
                          setEditingWorkflowId(null);
                          setEditingWorkflowName('');
                        }
                      }}
                      autoFocus
                      className="px-3 py-1.5 rounded-lg bg-secondary border border-primary text-xs font-medium outline-none min-w-[100px]"
                      style={{ borderLeft: `3px solid ${w.color}` }}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setActiveWorkflowId(w.id);
                        setViewMode('single');
                      }}
                      onDoubleClick={() => {
                        setEditingWorkflowId(w.id);
                        setEditingWorkflowName(w.name);
                      }}
                      className="relative px-3 py-1.5 rounded-lg transition-all hover:bg-secondary"
                      style={{ 
                        borderLeft: `3px solid ${w.color}`,
                        opacity: viewMode === 'master' || activeWorkflowId === w.id ? 1 : 0.5 
                      }}
                    >
                      <div className="text-xs text-muted-foreground group-hover:text-foreground font-medium">
                        {w.name}
                      </div>
                    </button>
                  )}
                  
                  {workflows.length > 1 && !editingWorkflowId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorkflow(w.id, w.name);
                      }}
                      className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1 bg-destructive text-destructive-foreground rounded-full transition-all hover:scale-110"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                onClick={handleCreateNewWorkflow}
                className="group px-3 py-1.5 rounded-lg transition-all hover:bg-secondary border border-dashed border-border hover:border-primary"
              >
                <Plus size={14} className="inline text-muted-foreground group-hover:text-foreground" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground ml-1">Nova Aba</span>
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
