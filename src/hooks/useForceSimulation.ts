import { useRef, useEffect, useCallback, useState } from 'react';
import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceLink,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';

export interface ForceNode extends SimulationNodeDatum {
  id: number;
  type: string;
  depth?: number;
  isCenterNode?: boolean;
  // Initial positions from DB
  initialX: number;
  initialY: number;
}

export interface ForceLink extends SimulationLinkDatum<ForceNode> {
  source: number | ForceNode;
  target: number | ForceNode;
}

interface UseForceSimulationOptions {
  nodes: any[];
  connections: any[];
  viewMode: string;
  enabled: boolean;
  centerNodeId?: number | null;
}

interface ForcePositions {
  [nodeId: number]: { x: number; y: number };
}

export const useForceSimulation = ({
  nodes,
  connections,
  viewMode,
  enabled,
  centerNodeId,
}: UseForceSimulationOptions) => {
  const simulationRef = useRef<Simulation<ForceNode, ForceLink> | null>(null);
  const [positions, setPositions] = useState<ForcePositions>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const tickCountRef = useRef(0);
  const nodesRef = useRef<ForceNode[]>([]);

  // Calculate node depths via BFS from center
  const calculateDepths = useCallback((nodeList: any[], conns: any[], centerId?: number | null) => {
    const depths = new Map<number, number>();
    if (!centerId || nodeList.length === 0) return depths;

    const queue: Array<{ id: number; depth: number }> = [{ id: centerId, depth: 0 }];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      depths.set(current.id, current.depth);

      conns
        .filter((c: any) => c.from === current.id || c.to === current.id)
        .forEach((c: any) => {
          const neighborId = c.from === current.id ? c.to : c.from;
          if (!visited.has(neighborId) && nodeList.some((n: any) => n.id === neighborId)) {
            queue.push({ id: neighborId, depth: current.depth + 1 });
          }
        });
    }
    return depths;
  }, []);

  // Build/rebuild simulation when nodes or connections change
  useEffect(() => {
    if (!enabled || viewMode !== 'single' || nodes.length === 0) {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      // For non-force modes, just pass through original positions
      if (nodes.length > 0) {
        const pos: ForcePositions = {};
        nodes.forEach((n: any) => {
          pos[n.id] = { x: n.x, y: n.y };
        });
        setPositions(pos);
      }
      return;
    }

    const depths = calculateDepths(nodes, connections, centerNodeId);

    // Create force nodes, preserving existing simulation positions if available
    const forceNodes: ForceNode[] = nodes.map((n: any) => {
      const existing = nodesRef.current.find((fn) => fn.id === n.id);
      const depth = depths.get(n.id) ?? 3;
      const isCenter = n.id === centerNodeId;

      return {
        id: n.id,
        type: n.type,
        depth,
        isCenterNode: isCenter,
        initialX: n.x,
        initialY: n.y,
        x: existing?.x ?? n.x,
        y: existing?.y ?? n.y,
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
        // Fix center node
        ...(isCenter ? { fx: n.x, fy: n.y } : {}),
      };
    });

    nodesRef.current = forceNodes;

    // Create force links
    const forceLinks: ForceLink[] = connections
      .filter((c: any) => {
        return forceNodes.some((n) => n.id === c.from) && forceNodes.some((n) => n.id === c.to);
      })
      .map((c: any) => ({
        source: c.from,
        target: c.to,
      }));

    // Stop existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = forceSimulation<ForceNode>(forceNodes)
      // Repulsion: variable by depth (center most repulsive)
      .force(
        'charge',
        forceManyBody<ForceNode>().strength((d) => {
          if (d.isCenterNode) return -1500;
          switch (d.depth) {
            case 1: return -700;
            case 2: return -400;
            default: return -250;
          }
        })
      )
      // Weak center gravity — keeps everything visible
      .force(
        'center',
        forceCenter(
          centerNodeId ? (nodes.find((n: any) => n.id === centerNodeId)?.x ?? 500) : 500,
          centerNodeId ? (nodes.find((n: any) => n.id === centerNodeId)?.y ?? 300) : 300
        ).strength(0.04)
      )
      // Collision avoidance
      .force(
        'collision',
        forceCollide<ForceNode>().radius((d) => {
          const connectionCount = connections.filter(
            (c: any) => c.from === d.id || c.to === d.id
          ).length;
          const baseSize = 20 + Math.min(connectionCount * 4, 25);
          return (d.isCenterNode ? Math.max(baseSize, 45) : baseSize) + 15;
        })
      )
      // Elastic connections
      .force(
        'link',
        forceLink<ForceNode, ForceLink>(forceLinks)
          .id((d) => d.id)
          .distance((link) => {
            const s = link.source as ForceNode;
            const t = link.target as ForceNode;
            const sDepth = s.depth ?? 0;
            const tDepth = t.depth ?? 0;
            const maxDepth = Math.max(sDepth, tDepth);
            // Closer nodes = shorter links
            if (maxDepth <= 1) return 150;
            if (maxDepth <= 2) return 220;
            return 300;
          })
          .strength(0.6)
      )
      // Pull nodes toward their initial positions gently (stabilizer)
      .force(
        'x',
        forceX<ForceNode>((d) => d.initialX).strength(0.02)
      )
      .force(
        'y',
        forceY<ForceNode>((d) => d.initialY).strength(0.02)
      )
      .alpha(0.8)
      .alphaDecay(0.02)
      .velocityDecay(0.3);

    tickCountRef.current = 0;
    setIsSimulating(true);

    sim.on('tick', () => {
      tickCountRef.current++;
      // Update positions every 2 ticks for performance
      if (tickCountRef.current % 2 === 0 || tickCountRef.current < 10) {
        const pos: ForcePositions = {};
        forceNodes.forEach((n) => {
          pos[n.id] = { x: n.x ?? n.initialX, y: n.y ?? n.initialY };
        });
        setPositions(pos);
      }
    });

    sim.on('end', () => {
      setIsSimulating(false);
      // Final position update
      const pos: ForcePositions = {};
      forceNodes.forEach((n) => {
        pos[n.id] = { x: n.x ?? n.initialX, y: n.y ?? n.initialY };
      });
      setPositions(pos);
    });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [enabled, viewMode, nodes.length, connections.length, centerNodeId]);

  // Drag handlers for force interaction
  const onDragStart = useCallback((nodeId: number) => {
    if (!simulationRef.current) return;
    simulationRef.current.alphaTarget(0.3).restart();
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
  }, []);

  const onDrag = useCallback((nodeId: number, x: number, y: number) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }, []);

  const onDragEnd = useCallback((nodeId: number) => {
    if (!simulationRef.current) return;
    simulationRef.current.alphaTarget(0);
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node && !node.isCenterNode) {
      // Release — let physics take over again
      node.fx = null;
      node.fy = null;
    }
  }, []);

  // Reheat simulation (e.g. after adding a node)
  const reheat = useCallback((alpha = 0.5) => {
    if (simulationRef.current) {
      simulationRef.current.alpha(alpha).restart();
      setIsSimulating(true);
    }
  }, []);

  // Get position for a specific node (with fallback)
  const getNodePosition = useCallback(
    (nodeId: number, fallbackX: number, fallbackY: number) => {
      const pos = positions[nodeId];
      return pos ?? { x: fallbackX, y: fallbackY };
    },
    [positions]
  );

  return {
    positions,
    isSimulating,
    getNodePosition,
    onDragStart,
    onDrag,
    onDragEnd,
    reheat,
  };
};
