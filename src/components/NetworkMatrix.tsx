// Master View — mostrar todos os nós pertencentes a cada flow real
const nodes =
  viewMode === "master"
    ? allNodesWithAnchors
        .filter((n) => {
          if (flows.length === 0) return true; // fallback: sem flows, mostra tudo

          // Se é projeto central de um flow
          if (flows.some((f) => f.center_type === "project" && f.center_id === n.id)) return true;

          // Se pertence a algum flow via flow_id (pessoa, marca ou projeto-irmão)
          const flow = flows.find((f) => f.center_type === "project" && f.center_id === n.anchorProjectId);
          if (flow) return true;

          // Se é um nó conectado a algum centro
          const connectedToCenter = allConnections.some((c) => {
            const centerIds = flows.map((f) => f.center_id);
            return centerIds.includes(c.from) || centerIds.includes(c.to);
          });

          return connectedToCenter;
        })
        .map((n) => {
          const project = projects.find((p) => p.id === n.anchorProjectId || p.id === n.id);
          return {
            ...n,
            projectId: project?.id,
            projectColor: project ? "#8b5cf6" : "#6366f1",
          };
        })
    : activeProjectId
      ? getNodesForSingleView(activeProjectId)
      : [];
