import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';

interface Opportunity {
  type: string;
  id: number;
  name: string;
  relevanceScore: number;
  reason: string;
  connectionPath: string[];
  actionSuggestion: string;
  category?: string;
  company?: string;
}

interface OpportunityGraphProps {
  opportunities: Opportunity[];
  onNodeClick?: (nodeId: number) => void;
}

export const OpportunityGraph: React.FC<OpportunityGraphProps> = ({ 
  opportunities, 
  onNodeClick 
}) => {
  const graphData = useMemo(() => {
    const width = 700;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 150;

    // Nó central (Você)
    const centerNode = {
      id: 'center',
      name: 'Você',
      x: centerX,
      y: centerY,
      color: 'hsl(var(--primary))',
      isCenter: true
    };

    // Distribuir oportunidades em círculo
    const nodes = opportunities.slice(0, 8).map((opp, idx) => {
      const angle = (idx / opportunities.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      // Cor baseada no score
      let color = 'hsl(var(--connection-weak))';
      if (opp.relevanceScore >= 80) color = 'hsl(var(--connection-path))';
      else if (opp.relevanceScore >= 60) color = 'hsl(var(--connection-cross))';

      return {
        id: opp.id,
        name: opp.name,
        x,
        y,
        color,
        score: opp.relevanceScore,
        category: opp.category,
        isCenter: false
      };
    });

    // Linhas de conexão
    const lines = nodes.map(node => ({
      x1: centerX,
      y1: centerY,
      x2: node.x,
      y2: node.y,
      color: node.color,
      opacity: node.score / 100
    }));

    return { centerNode, nodes, lines, width, height };
  }, [opportunities]);

  if (opportunities.length === 0) return null;

  return (
    <Card className="p-4 bg-muted/20">
      <div className="flex items-center justify-center">
        <svg
          width={graphData.width}
          height={graphData.height}
          className="overflow-visible"
        >
          {/* Linhas de conexão */}
          {graphData.lines.map((line, idx) => (
            <line
              key={`line-${idx}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.color}
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity={line.opacity}
            />
          ))}

          {/* Nós das oportunidades */}
          {graphData.nodes.map((node, idx) => (
            <g
              key={`node-${node.id}-${idx}`}
              onClick={() => onNodeClick?.(node.id)}
              className="cursor-pointer transition-transform hover:scale-110"
            >
              {/* Círculo do nó */}
              <circle
                cx={node.x}
                cy={node.y}
                r="25"
                fill={node.color}
                opacity="0.2"
              />
              <circle
                cx={node.x}
                cy={node.y}
                r="20"
                fill={node.color}
                stroke="white"
                strokeWidth="2"
              />
              
              {/* Label do nome */}
              <text
                x={node.x}
                y={node.y + 35}
                textAnchor="middle"
                className="text-xs font-medium fill-foreground"
              >
                {node.name.length > 15 ? node.name.substring(0, 15) + '...' : node.name}
              </text>
              
              {/* Score */}
              <text
                x={node.x}
                y={node.y + 48}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground"
              >
                {node.score}%
              </text>
            </g>
          ))}

          {/* Nó central (Você) */}
          <g>
            <circle
              cx={graphData.centerNode.x}
              cy={graphData.centerNode.y}
              r="35"
              fill={graphData.centerNode.color}
              opacity="0.2"
            />
            <circle
              cx={graphData.centerNode.x}
              cy={graphData.centerNode.y}
              r="30"
              fill={graphData.centerNode.color}
              stroke="white"
              strokeWidth="3"
            />
            <text
              x={graphData.centerNode.x}
              y={graphData.centerNode.y + 5}
              textAnchor="middle"
              className="text-sm font-bold fill-white"
            >
              {graphData.centerNode.name}
            </text>
          </g>
        </svg>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--connection-path))' }} />
          <span className="text-muted-foreground">Alta relevância (80%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--connection-cross))' }} />
          <span className="text-muted-foreground">Média (60-80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--connection-weak))' }} />
          <span className="text-muted-foreground">Potencial (&lt;60%)</span>
        </div>
      </div>
    </Card>
  );
};
