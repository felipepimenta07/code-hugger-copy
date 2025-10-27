import React from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import Canvas from "./Canvas";
import { applyRadialLayout } from "@/lib/layoutUtils";

export default function NetworkMatrix({
  projects,
  people,
  brands,
  flows,
  allNodesWithAnchors,
  allConnections,
  updateAllNodePositions,
  setAllConnections,
  setProjects,
  setPeople,
  setBrands,
  viewMode,
  setViewMode,
  activeProjectId,
  setActiveProjectId,
  getNodesForSingleView,
  saveToHistory,
}) {
  // 🔹 Identificar os centros de cada flow (1 cluster por flow)
  const centerProjectIds = React.useMemo(
    () => new Set(flows.filter((f) => f.center_type === "project").map((f) => f.center_id)),
    [flows],
  );

  const centerProjects = React.useMemo(
    () => projects.filter((p) => centerProjectIds.has(p.id)),
    [projects, centerProjectIds],
  );

  // 🔹 Seleção dos nós visíveis
  const nodes =
    viewMode === "master"
      ? allNodesWithAnchors
          .filter((n) => {
            if (flows.length === 0) return true; // fallback
            // Mostra o centro
            if (centerProjectIds.has(n.id)) return true;
            // Mostra quem pertence a esse flow
            const inFlow = flows.some(
              (f) => f.center_id === (n.anchorProjectId ?? n.homeProjectId) || (n.flow_id && n.flow_id === f.id),
            );
            return inFlow;
          })
          .map((n) => {
            const project = projects.find((p) => p.id === n.anchorProjectId) || projects.find((p) => p.id === n.id);
            const flowColor = project ? "#8b5cf6" : "#6366f1";
            return { ...n, projectId: project?.id, projectColor: flowColor };
          })
      : activeProjectId
        ? getNodesForSingleView(activeProjectId)
        : [];

  // 🧩 Função de auto-organização visual
  const autoOrganize = React.useCallback(() => {
    const cols = 3;
    const spacingX = 1400;
    const spacingY = 1200;

    if (viewMode === "master") {
      const centersParaUsar = centerProjects.length > 0 ? centerProjects : projects;

      centersParaUsar.forEach((center, pIndex) => {
        // Pegar todos os nós do mesmo flow (incluindo projetos irmãos)
        const clusterNodes = allNodesWithAnchors.filter((n) => {
          if (n.id === center.id) return false;
          return (
            n.anchorProjectId === center.id ||
            (n.flow_id && flows.some((f) => f.center_id === center.id && f.id === n.flow_id))
          );
        });

        const col = pIndex % cols;
        const row = Math.floor(pIndex / cols);
        const clusterX = col * spacingX + 700;
        const clusterY = row * spacingY + 600;

        const layouted = applyRadialLayout([center, ...clusterNodes], clusterX, clusterY);
        updateAllNodePositions(layouted);
      });
    } else if (viewMode === "single" && activeProjectId) {
      // Organizar Single View normalmente
      const layouted = applyRadialLayout(getNodesForSingleView(activeProjectId), 0, 0);
      updateAllNodePositions(layouted);
    }
  }, [
    viewMode,
    centerProjects,
    projects,
    allNodesWithAnchors,
    updateAllNodePositions,
    getNodesForSingleView,
    activeProjectId,
    flows,
  ]);

  // 🗑️ Deletar conexão sem remover nós
  const deleteConnection = async (connectionIndex: number) => {
    saveToHistory();

    const conn = allConnections[connectionIndex];
    if (!conn) return;

    setSelectedNodes?.([]);

    try {
      if (conn.id) {
        const { error } = await supabase.from("connections").delete().eq("id", conn.id);
        if (error) {
          console.error("Erro ao deletar conexão:", error);
          toast.error("Erro ao deletar conexão");
          return;
        }
      }

      // Apenas remove a linha da conexão
      setAllConnections((prev) => prev.filter((_, idx) => idx !== connectionIndex));

      toast.success("Conexão deletada!");
    } catch (error) {
      console.error("Erro ao deletar conexão:", error);
      toast.error("Erro inesperado ao deletar conexão");
    }
  };

  // 🧩 Protege o nó central de sumir após deleção de conexões
  React.useEffect(() => {
    if (viewMode === "single" && activeProjectId) {
      const centerNode = projects.find((p) => p.id === activeProjectId);
      if (!centerNode) return;

      const stillVisible = nodes.some((n) => n.id === activeProjectId);
      if (!stillVisible) {
        setProjects((prev) => {
          const exists = prev.some((p) => p.id === centerNode.id);
          return exists ? prev : [...prev, centerNode];
        });
      }
    }
  }, [viewMode, activeProjectId, nodes, projects, setProjects]);

  // 🔁 Atualiza o layout automaticamente ao mudar de modo
  React.useEffect(() => {
    autoOrganize();
  }, [viewMode, projects, flows]);

  return (
    <div className="min-h-screen h-screen bg-background flex flex-col overflow-hidden">
      <Canvas
        nodes={nodes}
        projects={viewMode === "master" ? centerProjects : projects}
        people={people}
        brands={brands}
        connections={allConnections}
        deleteConnection={deleteConnection}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        flows={flows}
      />
    </div>
  );
}
