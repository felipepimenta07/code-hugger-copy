/**
 * Algoritmos de Grafo para Network Matrix
 * Implementações de afinidade, detecção de comunidades, centralidade e importância
 */

interface GraphNode {
  id: number;
  node_ref?: string;
  type?: string;
  [key: string]: any;
}

interface GraphEdge {
  from: number;
  to: number;
  from_ref?: string;
  to_ref?: string;
  type?: string;
  [key: string]: any;
}

/**
 * Calcula a afinidade entre dois nós baseada em conexões compartilhadas
 * (Coeficiente de Jaccard)
 */
export const calculateAffinity = (
  nodeA: number,
  nodeB: number,
  connections: GraphEdge[]
): number => {
  const neighborsA = new Set(
    connections
      .filter(c => c.from === nodeA || c.to === nodeA)
      .map(c => (c.from === nodeA ? c.to : c.from))
  );
  const neighborsB = new Set(
    connections
      .filter(c => c.from === nodeB || c.to === nodeB)
      .map(c => (c.from === nodeB ? c.to : c.from))
  );

  const intersection = new Set([...neighborsA].filter(x => neighborsB.has(x)));
  const union = new Set([...neighborsA, ...neighborsB]);

  return union.size === 0 ? 0 : intersection.size / union.size;
};

/**
 * Detecta comunidades usando propagação de rótulos (Label Propagation)
 * Retorna Map de nodeId → communityId
 */
export const detectCommunities = (
  nodes: GraphNode[],
  connections: GraphEdge[]
): Map<number, number> => {
  const labels = new Map<number, number>();
  nodes.forEach(n => labels.set(n.id, n.id));

  const adjacency = new Map<number, number[]>();
  nodes.forEach(n => adjacency.set(n.id, []));
  connections.forEach(c => {
    adjacency.get(c.from)?.push(c.to);
    adjacency.get(c.to)?.push(c.from);
  });

  // Iterate until convergence or max iterations
  for (let iter = 0; iter < 10; iter++) {
    let changed = false;
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);

    for (const node of shuffled) {
      const neighbors = adjacency.get(node.id) || [];
      if (neighbors.length === 0) continue;

      // Count label frequencies among neighbors
      const freq = new Map<number, number>();
      for (const nId of neighbors) {
        const label = labels.get(nId) ?? nId;
        freq.set(label, (freq.get(label) || 0) + 1);
      }

      // Pick most frequent label
      let maxFreq = 0;
      let bestLabel = labels.get(node.id)!;
      for (const [label, count] of freq) {
        if (count > maxFreq) {
          maxFreq = count;
          bestLabel = label;
        }
      }

      if (bestLabel !== labels.get(node.id)) {
        labels.set(node.id, bestLabel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  return labels;
};

/**
 * Calcula betweenness centrality simplificada (BFS-based)
 * Retorna Map de nodeId → score normalizado [0, 1]
 */
export const calculateBetweennessCentrality = (
  nodes: GraphNode[],
  connections: GraphEdge[]
): Map<number, number> => {
  const centrality = new Map<number, number>();
  nodes.forEach(n => centrality.set(n.id, 0));

  const adjacency = new Map<number, number[]>();
  nodes.forEach(n => adjacency.set(n.id, []));
  connections.forEach(c => {
    adjacency.get(c.from)?.push(c.to);
    adjacency.get(c.to)?.push(c.from);
  });

  // Simplified: for each pair, do BFS and count intermediaries
  for (const source of nodes) {
    const dist = new Map<number, number>();
    const paths = new Map<number, number>();
    const queue: number[] = [source.id];
    dist.set(source.id, 0);
    paths.set(source.id, 1);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        if (!dist.has(neighbor)) {
          dist.set(neighbor, dist.get(current)! + 1);
          paths.set(neighbor, paths.get(current)!);
          queue.push(neighbor);
        } else if (dist.get(neighbor) === dist.get(current)! + 1) {
          paths.set(neighbor, paths.get(neighbor)! + paths.get(current)!);
        }
      }
    }

    // Accumulate dependencies (simplified Brandes)
    const sorted = [...dist.entries()].sort((a, b) => b[1] - a[1]);
    const dependency = new Map<number, number>();
    nodes.forEach(n => dependency.set(n.id, 0));

    for (const [nodeId] of sorted) {
      if (nodeId === source.id) continue;
      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (dist.get(neighbor) === dist.get(nodeId)! - 1) {
          const ratio = (paths.get(neighbor) || 1) / (paths.get(nodeId) || 1);
          dependency.set(neighbor, (dependency.get(neighbor) || 0) + ratio * (1 + (dependency.get(nodeId) || 0)));
        }
      }
      centrality.set(nodeId, (centrality.get(nodeId) || 0) + (dependency.get(nodeId) || 0));
    }
  }

  // Normalize
  const maxVal = Math.max(1, ...centrality.values());
  for (const [key, val] of centrality) {
    centrality.set(key, val / maxVal);
  }

  return centrality;
};

/**
 * Calcula importância composta de um nó
 * Combina: grau de conexão, centralidade e tipo do nó
 */
export const calculateNodeImportance = (
  node: GraphNode,
  connections: GraphEdge[],
  centrality?: Map<number, number>
): number => {
  const degree = connections.filter(c => c.from === node.id || c.to === node.id).length;
  const maxDegree = Math.max(1, degree);
  const degreeScore = Math.min(degree / 10, 1);

  const centralityScore = centrality?.get(node.id) ?? 0;

  // Type bonus: projects are inherently more important in this network
  const typeBonus = node.type === 'project' ? 0.3 : node.type === 'brand' ? 0.1 : 0;

  return Math.min(1, degreeScore * 0.4 + centralityScore * 0.4 + typeBonus + 0.1);
};
