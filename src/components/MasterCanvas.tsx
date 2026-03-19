import React, { useEffect, useRef, useCallback } from 'react';
import { select, selectAll } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';
import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceLink,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';

interface MasterNode extends SimulationNodeDatum {
  nodeRef: string;
  name: string;
  type: string;
  category: string | null;
  flowId: number | null;
  profilePictureUrl: string | null;
  masterX: number | null;
  masterY: number | null;
}

interface MasterLink extends SimulationLinkDatum<MasterNode> {
  source: string | MasterNode;
  target: string | MasterNode;
  connectionType: string;
  id: number;
}

interface MasterCanvasProps {
  allNodes: any[];
  allConnections: any[];
  flows: any[];
  onNodeClick: (node: any) => void;
  onNodeDoubleClick: (node: any) => void;
}

const TYPE_COLORS: Record<string, string> = {
  person: 'hsl(328, 86%, 61%)',
  project: 'hsl(158, 64%, 52%)',
  brand: 'hsl(258, 90%, 66%)',
};

const TYPE_STROKE: Record<string, string> = {
  person: 'hsl(328, 86%, 61%)',
  project: 'hsl(158, 64%, 52%)',
  brand: 'hsl(258, 90%, 66%)',
};

const CONNECTION_COLORS: Record<string, string> = {
  strong: 'hsl(210, 100%, 56%)',
  weak: 'hsl(215, 16%, 47%)',
  'works-at': 'hsl(158, 64%, 52%)',
  related: 'hsl(220, 10%, 40%)',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase();
}

export const MasterCanvas: React.FC<MasterCanvasProps> = ({
  allNodes,
  allConnections,
  flows,
  onNodeClick,
  onNodeDoubleClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<any>(null);
  const nodesDataRef = useRef<MasterNode[]>([]);
  const linksDataRef = useRef<MasterLink[]>([]);

  // Map raw data to simulation-friendly format
  const buildData = useCallback(() => {
    const masterNodes: MasterNode[] = allNodes
      .filter(n => n.flow_id != null)
      .map(n => {
        // Preserve existing positions from prior simulation
        const existing = nodesDataRef.current.find(e => e.nodeRef === n.node_ref);
        return {
          nodeRef: n.node_ref,
          name: n.name,
          type: n.type,
          category: n.category || null,
          flowId: n.flow_id,
          profilePictureUrl: n.profile_picture_url || null,
          masterX: n.master_x,
          masterY: n.master_y,
          x: existing?.x ?? n.master_x ?? n.x ?? 0,
          y: existing?.y ?? n.master_y ?? n.y ?? 0,
          vx: existing?.vx ?? 0,
          vy: existing?.vy ?? 0,
        } as MasterNode;
      });

    const nodeRefSet = new Set(masterNodes.map(n => n.nodeRef));
    const masterLinks: MasterLink[] = allConnections
      .filter(c => nodeRefSet.has(c.from_ref) && nodeRefSet.has(c.to_ref))
      .map(c => ({
        source: c.from_ref,
        target: c.to_ref,
        connectionType: c.connection_type || c.type || 'related',
        id: c.id,
      }));

    return { masterNodes, masterLinks };
  }, [allNodes, allConnections]);

  useEffect(() => {
    if (!svgRef.current || allNodes.length === 0) return;

    const width = svgRef.current.clientWidth || window.innerWidth;
    const height = svgRef.current.clientHeight || window.innerHeight;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs for clip paths and filters
    const defs = svg.append('defs');

    // Container for zoom/pan
    const g = svg.append('g');

    // Background rect for pan
    g.append('rect')
      .attr('width', 20000)
      .attr('height', 20000)
      .attr('x', -10000)
      .attr('y', -10000)
      .attr('fill', 'transparent');

    // Zoom behavior
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Build data
    const { masterNodes, masterLinks } = buildData();
    nodesDataRef.current = masterNodes;
    linksDataRef.current = masterLinks;

    // Create clip paths for each node
    masterNodes.forEach(n => {
      defs.append('clipPath')
        .attr('id', `master-clip-${n.nodeRef.replace(/:/g, '-')}`)
        .append('circle')
        .attr('r', 20);
    });

    // Links group
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup
      .selectAll('line')
      .data(masterLinks)
      .join('line')
      .attr('stroke', d => CONNECTION_COLORS[d.connectionType] || 'hsl(220, 10%, 30%)')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5);

    // Nodes group
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup
      .selectAll<SVGGElement, MasterNode>('g')
      .data(masterNodes, d => d.nodeRef)
      .join('g')
      .attr('class', 'master-node')
      .style('cursor', 'pointer');

    // Outer circle (glow ring)
    node.append('circle')
      .attr('r', 24)
      .attr('fill', 'hsl(220, 20%, 6%)')
      .attr('stroke', d => TYPE_STROKE[d.type] || '#94a3b8')
      .attr('stroke-width', 1.5)
      .style('filter', d => `drop-shadow(0 0 4px ${TYPE_COLORS[d.type] || '#94a3b8'}40)`);

    // Avatar images for person nodes with profile_picture_url
    node.filter(d => d.type === 'person' && !!d.profilePictureUrl)
      .append('image')
      .attr('xlink:href', d => d.profilePictureUrl!)
      .attr('x', -20)
      .attr('y', -20)
      .attr('width', 40)
      .attr('height', 40)
      .attr('clip-path', d => `url(#master-clip-${d.nodeRef.replace(/:/g, '-')})`);

    // Fallback circles for nodes without avatar
    node.filter(d => d.type !== 'person' || !d.profilePictureUrl)
      .append('circle')
      .attr('r', 18)
      .attr('fill', d => {
        const c = TYPE_COLORS[d.type] || '#94a3b8';
        return c.replace(')', ', 0.15)').replace('hsl(', 'hsla(');
      });

    // Initials text for fallback
    node.filter(d => d.type !== 'person' || !d.profilePictureUrl)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', d => TYPE_COLORS[d.type] || '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text(d => getInitials(d.name));

    // Labels
    const labels = node.append('g').attr('transform', 'translate(0, 34)');

    labels.append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(0, 0%, 90%)')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .text(d => d.name.length > 14 ? d.name.substring(0, 12) + '…' : d.name);

    labels.append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(220, 10%, 45%)')
      .attr('font-size', '8px')
      .attr('dy', '12px')
      .attr('pointer-events', 'none')
      .text(d => d.category || '');

    // Click handlers
    let clickTimer: any = null;
    node.on('click', (event, d) => {
      event.stopPropagation();
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
      clickTimer = setTimeout(() => {
        clickTimer = null;
        const originalNode = allNodes.find(n => n.node_ref === d.nodeRef);
        if (originalNode) onNodeClick(originalNode);
      }, 250);
    });

    node.on('dblclick', (event, d) => {
      event.stopPropagation();
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      const originalNode = allNodes.find(n => n.node_ref === d.nodeRef);
      if (originalNode) onNodeDoubleClick(originalNode);
    });

    // Hover highlight
    node.on('mouseenter', (event, d) => {
      const connectedRefs = new Set<string>();
      connectedRefs.add(d.nodeRef);
      masterLinks.forEach(l => {
        const sRef = typeof l.source === 'string' ? l.source : l.source.nodeRef;
        const tRef = typeof l.target === 'string' ? l.target : l.target.nodeRef;
        if (sRef === d.nodeRef) connectedRefs.add(tRef);
        if (tRef === d.nodeRef) connectedRefs.add(sRef);
      });

      node.style('opacity', n => connectedRefs.has(n.nodeRef) ? 1 : 0.15);
      link.style('opacity', l => {
        const sRef = typeof l.source === 'string' ? l.source : (l.source as MasterNode).nodeRef;
        const tRef = typeof l.target === 'string' ? l.target : (l.target as MasterNode).nodeRef;
        return sRef === d.nodeRef || tRef === d.nodeRef ? 0.6 : 0.03;
      });
    });

    node.on('mouseleave', () => {
      node.style('opacity', 1);
      link.style('opacity', null).attr('stroke-opacity', 0.2);
    });

    // Drag behavior
    const dragBehavior = d3Drag<SVGGElement, MasterNode>()
      .on('start', (event) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on('drag', (event) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on('end', (event) => {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });

    node.call(dragBehavior as any);

    // Force simulation
    const simulation = forceSimulation<MasterNode>(masterNodes)
      .force('link', forceLink<MasterNode, MasterLink>(masterLinks)
        .id(d => d.nodeRef)
        .distance(120)
        .strength(0.4)
      )
      .force('charge', forceManyBody<MasterNode>().strength(-400))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collision', forceCollide<MasterNode>().radius(50))
      .force('x', forceX<MasterNode>(width / 2).strength(0.03))
      .force('y', forceY<MasterNode>(height / 2).strength(0.03))
      .alpha(0.8)
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as MasterNode).x!)
        .attr('y1', d => (d.source as MasterNode).y!)
        .attr('x2', d => (d.target as MasterNode).x!)
        .attr('y2', d => (d.target as MasterNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    simulationRef.current = simulation;

    // Fit to screen after simulation stabilizes
    setTimeout(() => {
      simulation.alpha(0.05);
      // Auto-fit zoom
      const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
      masterNodes.forEach(n => {
        if (n.x! < bounds.minX) bounds.minX = n.x!;
        if (n.x! > bounds.maxX) bounds.maxX = n.x!;
        if (n.y! < bounds.minY) bounds.minY = n.y!;
        if (n.y! > bounds.maxY) bounds.maxY = n.y!;
      });
      const bw = bounds.maxX - bounds.minX + 200;
      const bh = bounds.maxY - bounds.minY + 200;
      const scale = Math.min(width / bw, height / bh, 1.5) * 0.85;
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;

      svg.call(
        zoomBehavior.transform,
        zoomIdentity.translate(width / 2 - cx * scale, height / 2 - cy * scale).scale(scale)
      );
    }, 2500);

    return () => {
      simulation.stop();
    };
  }, [allNodes.length, allConnections.length, flows.length]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'hsl(220, 20%, 4%)' }}>
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(hsl(220, 10%, 40%) 1px, transparent 1px),
            linear-gradient(90deg, hsl(220, 10%, 40%) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      <svg ref={svgRef} className="w-full h-full" />
      {/* Node hover CSS */}
      <style>{`
        .master-node:hover circle:first-child {
          stroke-width: 3px;
          filter: drop-shadow(0 0 10px currentColor) !important;
          transition: all 0.15s ease;
        }
      `}</style>
    </div>
  );
};
