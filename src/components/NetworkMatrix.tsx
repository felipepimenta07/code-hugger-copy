import React from "react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";
import Canvas from "./Canvas";
import { applyRadialLayout } from "../lib/layoutUtils";

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
  // 🔹 Identificar centers (projetos centrais de cada flow)
  const centerProjectIds = React.useMemo(
    () => new Set(flows.filter((f) => f.center_type === "project").map((f) => f.center_id)),
    [flows],
  );

  const centerProjects = React.useMemo(
    () => projects.filter((p) => centerProjectIds.has(p.id)),
    [projects, centerProjectIds],
  );

  // 🔹 Determinar quais nós devem aparecer
  const nodes =
    viewMode === "master"
      ? allNodesWithAnchors
          .filter((n) => {
            if (flows.length === 0) return true;
            // Mostrar centers e nós que pertencem ao mesmo flow
            if (n.type === "project") {
              return centerProjectIds.has(n.id) || flows.some((f) => f.id === n.flow_id);
            }
            const project = projects.find((p) => centerProjectIds.has(p.id));
            return (
              project &&
              (n.anchorProjectId === project.id || n.homeProjectId === project.id || n.flow_id === project.flow_id)
            );
          })
          .map((n) => {
            const project =
              projects.find((p) => p.id === n.anchorProjectId) || projects.find((p) => centerProjectIds.has(p.id));
            return {
              ...n,
              projectId: project?.id,
              projectColor: project ? "#8b5cf6" : "#6366f1",
            };
          })
      : activeProjectId
        ? getNodesForSingleView(activeProjectId)
        : [];

  // 🔹 Organização automática (1 cluster por flow)
  const autoOrganize = React.useCallback(() => {
    const cols = 3;
    const spacingX = 1400;
    const spacingY = 1200;

    if (viewMode === "master") {
      const centersParaUsar = centerProjects.length > 0 ? centerProjects : projects;

      centersParaUsar.forEach((center, index) => {
        const clusterNodes = allNodesWithAnchors.filter(
          (n) =>
            n.id !== center.id &&
            (n.anchorProjectId === center.id || n.flow_id === center.flow_id || n.homeProjectId === center.id),
        );

        const col = index % cols;
        const row = Math.floor(index / cols);
        const clusterX = col * spacingX + 700;
        const clusterY = row * spacingY + 600;

        const layouted = applyRadialLayout([center, ...clusterNodes], clusterX, clusterY);
        updateAllNodePositions(layouted);
      });
    } else if (viewMode === "single" && activeProjectId) {
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
  ]);

  // 🗑️ Deletar conexão (sem apagar nós)
  const deleteConnection = async (connectionIndex: number) => {
    saveToHistory();

    const conn = allConnections[connectionIndex];
    if (!conn) return;

    try {
      if (conn.id) {
        const { error } = await supabase.from("connections").delete().eq("id", conn.id);
        if (error) {
          console.error("Erro ao deletar conexão:", error);
          toast.error("Erro ao deletar conexão");
          return;
        }
      }

      if (viewMode === "single" && activeProjectId) {
        const otherId = conn.from === activeProjectId ? conn.to : conn.to === activeProjectId ? conn.from : null;

        if (otherId) {
          const otherNode =
            people.find((p) => p.id === otherId) ||
            brands.find((b) => b.id === otherId) ||
            projects.find((p) => p.id === otherId);

          if (otherNode && !("homeProjectId" in otherNode)) {
            if (otherNode.type === "person") {
              setPeople((prev) => prev.map((p) => (p.id === otherId ? { ...p, homeProjectId: activeProjectId } : p)));
            } else if (otherNode.type === "brand") {
              setBrands((prev) => prev.map((b) => (b.id === otherId ? { ...b, homeProjectId: activeProjectId } : b)));
            } else if (otherNode.type === "project") {
              setProjects((prev) => prev.map((p) => (p.id === otherId ? { ...p, homeProjectId: activeProjectId } : p)));
            }
          }
        }
      }

      setAllConnections((prev) => prev.filter((_, idx) => idx !== connectionIndex));
      toast.success("Conexão deletada!");
    } catch (error) {
      console.error("Erro ao deletar conexão:", error);
      toast.error("Erro inesperado ao deletar conexão");
    }
  };

  // 🧩 Proteger nó central
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

  // 🔁 Atualiza layout ao trocar de modo
  React.useEffect(() => {
    autoOrganize();
  }, [viewMode, projects, flows]);

  return (
    <div className="min-h-screen h-screen bg-background flex flex-col overflow-hidden">
      <Canvas
        nodes={nodes}
        projects={viewMode === "master" && centerProjects.length > 0 ? centerProjects : projects}
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
