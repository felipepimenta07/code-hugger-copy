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
  nodeRef: string;
  type: string;
  depth?: number;
  isCenterNode?: boolean;
  initialX: number;
  initialY: number;
}

export interface ForceLink extends SimulationLinkDatum<ForceNode> {
  source: string | ForceNode;
  target: string | ForceNode;
}

interface UseForceSimulationOptions {
  nodes: any[];
  connections: any[];
  viewMode: string;
  enabled: boolean;
  centerNodeRef?: string | null;
}

interface ForcePositions {
  [nodeRef: string]: { x: number; y: number };
}

export const useForceSimulation = ({
  nodes,
  connections,
  viewMode,
  enabled,
  centerNodeRef,
}: UseForceSimulationOptions) => {
  const simulationRef = useRef<Simulation<ForceNode, ForceLink> | null>(null);
  const [positions, setPositions] = useState<ForcePositions>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const tickCountRef = useRef(0);
  const nodesRef = useRef<ForceNode[]>([]);
  const connectionsRef = useRef<any[]>([]);
  const prevNodesLengthRef = useRef(0);

  const calculateDepths = useCallback((nodeList: any[], conns: any[], centerRef?: string | null) => {
    const depths = new Map<string, number>();
    if (!centerRef || nodeList.length === 0) return depths;
    const queue: Array<{ ref: string; depth: number }> = [{ ref: centerRef, depth: 0 }];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.ref)) continue;
      visited.add(current.ref);
      depths.set(current.ref, current.depth);
      conns
        .filter((c: any) => c.from_ref === current.ref || c.to_ref === current.ref)
        .forEach((c: any) => {
          const neighborRef = c.from_ref === current.ref ? c.to_ref : c.from_ref;
          if (!visited.has(neighborRef) && nodeList.some((n: any) => n.node_ref === neighborRef)) {
            queue.push({ ref: neighborRef, depth: current.depth + 1 });
          }
        });
    }
    return depths;
  }, []);

  // Build simulation when nodes change
  useEffect(() => {
    if (!enabled || viewMode !== 'single' || nodes.length === 0) {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      if (nodes.length > 0) {
        const pos: ForcePositions = {};
        nodes.forEach((n: any) => { pos[n.node_ref] = { x: n.x, y: n.y }; });
        setPositions(pos);
      }
      return;
    }

    const depths = calculateDepths(nodes, connections, centerNodeRef);
    connectionsRef.current = connections;

    const forceNodes: ForceNode[] = nodes.map((n: any) => {
      const nodeRef = n.node_ref;
      const existing = nodesRef.current.find((fn) => fn.nodeRef === nodeRef);
      const depth = depths.get(nodeRef) ?? 3;
      const isCenter = nodeRef === centerNodeRef;

      return {
        id: n.id,
        nodeRef,
        type: n.type,
        depth,
        isCenterNode: isCenter,
        initialX: n.x,
        initialY: n.y,
        x: existing?.x ?? n.x,
        y: existing?.y ?? n.y,
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
        ...(isCenter ? { fx: existing?.x ?? n.x, fy: existing?.y ?? n.y } : {}),
      };
    });

    nodesRef.current = forceNodes;

    const forceLinks: ForceLink[] = connections
      .filter((c: any) => forceNodes.some((n) => n.nodeRef === c.from_ref) && forceNodes.some((n) => n.nodeRef === c.to_ref))
      .map((c: any) => ({ source: c.from_ref, target: c.to_ref }));

    if (simulationRef.current) simulationRef.current.stop();

    const centerNode = nodes.find((n: any) => n.node_ref === centerNodeRef);

    const sim = forceSimulation<ForceNode>(forceNodes)
      .force('charge', forceManyBody<ForceNode>().strength((d) => {
        if (d.isCenterNode) return -1500;
        switch (d.depth) {
          case 1: return -700;
          case 2: return -400;
          default: return -250;
        }
      }))
      .force('center', forceCenter(
        centerNode ? (centerNode.x ?? 500) : 500,
        centerNode ? (centerNode.y ?? 300) : 300
      ).strength(0.04))
      .force('collision', forceCollide<ForceNode>().radius((d) => {
        const connectionCount = connections.filter((c: any) => c.from_ref === d.nodeRef || c.to_ref === d.nodeRef).length;
        const baseSize = 20 + Math.min(connectionCount * 4, 25);
        return (d.isCenterNode ? Math.max(baseSize, 45) : baseSize) + 15;
      }))
      .force('link', forceLink<ForceNode, ForceLink>(forceLinks)
        .id((d) => d.nodeRef)
        .distance((link) => {
          const s = link.source as ForceNode;
          const t = link.target as ForceNode;
          const maxDepth = Math.max(s.depth ?? 0, t.depth ?? 0);
          if (maxDepth <= 1) return 150;
          if (maxDepth <= 2) return 220;
          return 300;
        })
        .strength(0.6)
      )
      .force('x', forceX<ForceNode>((d) => d.initialX).strength(0.02))
      .force('y', forceY<ForceNode>((d) => d.initialY).strength(0.02))
      .alpha(0.5)
      .alphaDecay(0.05)
      .velocityDecay(0.45);

    tickCountRef.current = 0;
    setIsSimulating(true);

    sim.on('tick', () => {
      tickCountRef.current++;
      if (tickCountRef.current % 2 === 0 || tickCountRef.current < 10) {
        const pos: ForcePositions = {};
        forceNodes.forEach((n) => { pos[n.nodeRef] = { x: n.x ?? n.initialX, y: n.y ?? n.initialY }; });
        setPositions(pos);
      }
    });

    sim.on('end', () => {
      setIsSimulating(false);
      const pos: ForcePositions = {};
      forceNodes.forEach((n) => { pos[n.nodeRef] = { x: n.x ?? n.initialX, y: n.y ?? n.initialY }; });
      setPositions(pos);
    });

    simulationRef.current = sim;
    prevNodesLengthRef.current = nodes.length;

    return () => { sim.stop(); };
  }, [enabled, viewMode, nodes.length, centerNodeRef]);

  // Separate effect for connection changes — gentle reheat only
  useEffect(() => {
    if (!simulationRef.current || !enabled || viewMode !== 'single') return;
    
    connectionsRef.current = connections;
    const forceLinks: ForceLink[] = connections
      .filter((c: any) => nodesRef.current.some((n) => n.nodeRef === c.from_ref) && nodesRef.current.some((n) => n.nodeRef === c.to_ref))
      .map((c: any) => ({ source: c.from_ref, target: c.to_ref }));

    const linkForce = simulationRef.current.force('link') as any;
    if (linkForce) {
      linkForce.links(forceLinks);
    }
    simulationRef.current.alpha(0.15).restart();
    setIsSimulating(true);
  }, [connections.length, enabled, viewMode]);

  const onDragStart = useCallback((nodeRef: string) => {
    if (!simulationRef.current) return;
    simulationRef.current.alphaTarget(0.3).restart();
    const node = nodesRef.current.find((n) => n.nodeRef === nodeRef);
    if (node) { node.fx = node.x; node.fy = node.y; }
  }, []);

  const onDrag = useCallback((nodeRef: string, x: number, y: number) => {
    const node = nodesRef.current.find((n) => n.nodeRef === nodeRef);
    if (node) { node.fx = x; node.fy = y; }
  }, []);

  const onDragEnd = useCallback((nodeRef: string) => {
    if (!simulationRef.current) return;
    simulationRef.current.alphaTarget(0);
    const node = nodesRef.current.find((n) => n.nodeRef === nodeRef);
    if (node && !node.isCenterNode) {
      node.fx = null;
      node.fy = null;
    }
  }, []);

  const reheat = useCallback((alpha = 0.3) => {
    if (simulationRef.current) {
      simulationRef.current.alpha(alpha).restart();
      setIsSimulating(true);
    }
  }, []);

  const getNodePosition = useCallback(
    (nodeRef: string, fallbackX: number, fallbackY: number) => {
      const pos = positions[nodeRef];
      return pos ?? { x: fallbackX, y: fallbackY };
    },
    [positions]
  );

  return { positions, isSimulating, getNodePosition, onDragStart, onDrag, onDragEnd, reheat };
};
