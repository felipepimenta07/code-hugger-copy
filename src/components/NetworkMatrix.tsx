import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";
import { Canvas } from "./Canvas";
import { applyRadialLayout } from "../lib/layoutUtils";
import { useNetworkState } from "../hooks/useNetworkState";

export default function NetworkMatrix() {
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [brands, setBrands] = useState([]);
  const [flows, setFlows] = useState([]);
  const [connections, setConnections] = useState([]);
  const [viewMode, setViewMode] = useState("master");
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<number[]>([]);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const { state, updateState } = useNetworkState();
  
  const saveToHistory = () => {
    // History functionality can be added here if needed
    console.log("Saving to history");
  };

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsRes, peopleRes, brandsRes, flowsRes, connectionsRes] = await Promise.all([
        supabase.from("projects").select("*"),
        supabase.from("people").select("*"),
        supabase.from("brands").select("*"),
        supabase.from("flows").select("*"),
        supabase.from("connections").select("*")
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (peopleRes.data) setPeople(peopleRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
      if (flowsRes.data) setFlows(flowsRes.data);
      if (connectionsRes.data) setConnections(connectionsRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    }
  };

  const updateNodePosition = (nodeId: number, deltaX: number, deltaY: number) => {
    const updateNode = (node: any) => {
      if (node.id === nodeId) {
        return { ...node, x: node.x + deltaX, y: node.y + deltaY };
      }
      return node;
    };

    setProjects((prev) => prev.map(updateNode));
    setPeople((prev) => prev.map(updateNode));
    setBrands((prev) => prev.map(updateNode));
  };

  // Identificar centers (projetos centrais de cada flow)
  const centerProjectIds = React.useMemo(
    () => new Set(flows.filter((f) => f.center_type === "project").map((f) => f.center_id)),
    [flows],
  );

  const centerProjects = React.useMemo(
    () => projects.filter((p) => centerProjectIds.has(p.id)),
    [projects, centerProjectIds],
  );

  // Função para obter nós do single view
  const getNodesForSingleView = (projectId: string) => {
    const centerProject = projects.find((p) => p.id === projectId);
    if (!centerProject) return [];

    const connectedNodeIds = new Set(
      connections
        .filter((c) => c.from === projectId || c.to === projectId)
        .flatMap((c) => [c.from, c.to])
    );

    const connectedPeople = people.filter((p) => connectedNodeIds.has(p.id));
    const connectedBrands = brands.filter((b) => connectedNodeIds.has(b.id));
    const connectedProjects = projects.filter(
      (p) => p.id !== projectId && connectedNodeIds.has(p.id)
    );

    return [centerProject, ...connectedPeople, ...connectedBrands, ...connectedProjects];
  };

  // Determinar quais nós devem aparecer
  const allNodes = [...projects, ...people, ...brands];
  
  const nodes = viewMode === "master"
    ? allNodes.filter((n) => {
        if (flows.length === 0) return true;
        
        // Mostrar centers
        if (n.type === "project" && centerProjectIds.has(n.id)) return true;
        
        // Mostrar projetos do mesmo flow que os centers
        if (n.type === "project") {
          return flows.some((f) => f.id === n.flow_id);
        }
        
        // Mostrar pessoas e marcas conectadas aos centers
        const connectedToCenters = connections.some((c) => 
          (centerProjectIds.has(c.from) && c.to === n.id) ||
          (centerProjectIds.has(c.to) && c.from === n.id)
        );
        
        return connectedToCenters;
      })
    : activeProjectId
      ? getNodesForSingleView(activeProjectId)
      : [];

  // Organização automática (1 cluster por flow)
  const autoOrganize = React.useCallback(() => {
    const cols = 3;
    const spacingX = 1400;
    const spacingY = 1200;

    if (viewMode === "master") {
      const centersParaUsar = centerProjects.length > 0 ? centerProjects : projects;

      centersParaUsar.forEach((center, index) => {
        const clusterNodes = allNodes.filter(
          (n) =>
            n.id !== center.id &&
            (n.anchorProjectId === center.id ||
              n.flow_id === center.flow_id ||
              n.homeProjectId === center.id ||
              connections.some(
                (c) =>
                  (c.from === center.id && c.to === n.id) ||
                  (c.to === center.id && c.from === n.id)
              ))
        );

        const col = index % cols;
        const row = Math.floor(index / cols);
        const clusterX = col * spacingX + 700;
        const clusterY = row * spacingY + 600;

        const layouted = applyRadialLayout([center, ...clusterNodes], clusterX, clusterY);
        
        layouted.forEach((node) => {
          if (node.type === "project") {
            setProjects((prev) =>
              prev.map((p) => (p.id === node.id ? { ...p, x: node.x, y: node.y } : p))
            );
          } else if (node.type === "person") {
            setPeople((prev) =>
              prev.map((p) => (p.id === node.id ? { ...p, x: node.x, y: node.y } : p))
            );
          } else if (node.type === "brand") {
            setBrands((prev) =>
              prev.map((b) => (b.id === node.id ? { ...b, x: node.x, y: node.y } : b))
            );
          }
        });
      });
    } else if (viewMode === "single" && activeProjectId) {
      const layouted = applyRadialLayout(getNodesForSingleView(activeProjectId), 0, 0);
      layouted.forEach((node) => {
        if (node.type === "project") {
          setProjects((prev) =>
            prev.map((p) => (p.id === node.id ? { ...p, x: node.x, y: node.y } : p))
          );
        } else if (node.type === "person") {
          setPeople((prev) =>
            prev.map((p) => (p.id === node.id ? { ...p, x: node.x, y: node.y } : p))
          );
        } else if (node.type === "brand") {
          setBrands((prev) =>
            prev.map((b) => (b.id === node.id ? { ...b, x: node.x, y: node.y } : b))
          );
        }
      });
    }
  }, [viewMode, centerProjects, projects, allNodes, connections, activeProjectId]);

  // Atualiza layout ao trocar de modo
  React.useEffect(() => {
    autoOrganize();
  }, [viewMode, flows]);

  const handleOpenEditModal = (node: any) => {
    updateState({ editingNode: node });
  };

  const handleGoToProject = (id: number) => {
    setActiveProjectId(id);
    setViewMode("single");
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.1, state.zoom + delta), 2);
    updateState({ zoom: newZoom });
  };

  return (
    <div className="min-h-screen h-screen bg-background flex flex-col overflow-hidden">
      <Canvas
        svgRef={svgRef}
        state={state}
        updateState={updateState}
        viewMode={viewMode}
        workflows={flows}
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
        onOpenEditModal={handleOpenEditModal}
        projects={projects}
        allConnections={connections}
        onGoToProject={handleGoToProject}
        onWheel={handleWheel}
      />
    </div>
  );
}
