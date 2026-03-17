import React, { useMemo } from 'react';
import { X, User, Building2, FolderKanban, Mail, Phone, Globe, MapPin, ExternalLink, Linkedin, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIConnectionModalProps {
  connection: any;
  involvedNodes: any[];
  connectionType: 'hidden' | 'bridge' | 'opportunity' | 'alert' | 'action';
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
}

const NODE_COLORS = {
  person: { bg: 'hsl(217 91% 60% / 0.2)', stroke: 'hsl(217 91% 60%)', icon: '👤', label: 'Pessoa' },
  brand: { bg: 'hsl(32 95% 60% / 0.2)', stroke: 'hsl(32 95% 60%)', icon: '🏢', label: 'Marca' },
  project: { bg: 'hsl(142 71% 45% / 0.2)', stroke: 'hsl(142 71% 45%)', icon: '📁', label: 'Projeto' },
};

const TYPE_LABELS: Record<string, string> = {
  hidden: '🔗 Conexão Oculta',
  bridge: '🌉 Ponte Estratégica',
  opportunity: '🎯 Oportunidade',
  alert: '⚠️ Alerta',
  action: '⚡ Ação Prioritária',
};

const MiniGraph: React.FC<{ nodes: any[] }> = ({ nodes }) => {
  const svgW = 560;
  const svgH = 180;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const radius = nodes.length <= 2 ? 130 : nodes.length <= 4 ? 100 : 80;

  const positions = useMemo(() => {
    if (nodes.length === 0) return [];
    if (nodes.length === 1) return [{ x: cx, y: cy }];
    if (nodes.length === 2) return [
      { x: cx - radius, y: cy },
      { x: cx + radius, y: cy },
    ];
    return nodes.map((_, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, [nodes.length, cx, cy, radius]);

  const pairs: [number, number][] = [];
  for (let i = 0; i < positions.length - 1; i++) {
    pairs.push([i, i + 1]);
  }
  if (positions.length > 2) pairs.push([positions.length - 1, 0]);

  return (
    <svg width={svgW} height={svgH} className="overflow-visible mx-auto block">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="hsl(270 60% 60%)" />
        </marker>
      </defs>

      {/* Connection lines */}
      {pairs.map(([a, b], idx) => (
        <line
          key={idx}
          x1={positions[a].x}
          y1={positions[a].y}
          x2={positions[b].x}
          y2={positions[b].y}
          stroke="hsl(270 60% 60%)"
          strokeWidth="2"
          strokeDasharray="6,4"
          opacity="0.6"
        />
      ))}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const pos = positions[i];
        const nodeType = node.type || 'person';
        const colors = NODE_COLORS[nodeType as keyof typeof NODE_COLORS] || NODE_COLORS.person;
        return (
          <g key={node.id || i}>
            {/* Outer glow ring */}
            <circle cx={pos.x} cy={pos.y} r="30" fill={colors.bg} />
            {/* Main circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r="24"
              fill={colors.bg}
              stroke={colors.stroke}
              strokeWidth="2.5"
            />
            {/* Icon */}
            <text x={pos.x} y={pos.y + 6} textAnchor="middle" fontSize="16">
              {colors.icon}
            </text>
            {/* Name label below */}
            <text
              x={pos.x}
              y={pos.y + 46}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="hsl(var(--foreground))"
            >
              {(node.name || '').length > 14 ? node.name.substring(0, 13) + '…' : node.name}
            </text>
            {/* Type chip */}
            <text
              x={pos.x}
              y={pos.y + 59}
              textAnchor="middle"
              fontSize="9"
              fill={colors.stroke}
            >
              {colors.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const NodeCard: React.FC<{ node: any; onFocusNode: (id: number) => void; onClose: () => void }> = ({
  node,
  onFocusNode,
  onClose,
}) => {
  const nodeType = node.type || 'person';
  const colors = NODE_COLORS[nodeType as keyof typeof NODE_COLORS] || NODE_COLORS.person;

  const handleFocus = () => {
    onFocusNode(node.id);
    onClose();
  };

  return (
    <div
      className="rounded-xl border border-border p-4 space-y-3 flex-1 min-w-[200px] max-w-[260px]"
      style={{ background: colors.bg }}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ background: colors.stroke + '33', border: `2px solid ${colors.stroke}` }}
        >
          {colors.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{node.name}</p>
          <p className="text-xs" style={{ color: colors.stroke }}>
            {colors.label}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {node.company && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{node.company}</span>
          </div>
        )}
        {node.category && (
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {node.category}
            </Badge>
          </div>
        )}
        {node.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 shrink-0" />
            <a href={`mailto:${node.email}`} className="truncate hover:underline text-primary">
              {node.email}
            </a>
          </div>
        )}
        {node.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />
            <a href={`tel:${node.phone}`} className="hover:underline text-primary">
              {node.phone}
            </a>
          </div>
        )}
        {node.website && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 shrink-0" />
            <a
              href={node.website.startsWith('http') ? node.website : `https://${node.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:underline text-primary"
            >
              {node.website}
            </a>
          </div>
        )}
        {node.address && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{node.address}</span>
          </div>
        )}
        {node.status && (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {node.status}
            </Badge>
          </div>
        )}
        {node.notes && (
          <p className="text-[10px] text-muted-foreground italic line-clamp-2 border-t border-border pt-1 mt-1">
            {node.notes}
          </p>
        )}
      </div>

      {/* Action */}
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs h-7 gap-1"
        onClick={handleFocus}
      >
        <ExternalLink className="h-3 w-3" />
        Ver no mapa
      </Button>
    </div>
  );
};

export const AIConnectionModal: React.FC<AIConnectionModalProps> = ({
  connection,
  involvedNodes,
  connectionType,
  onClose,
  onFocusNode,
}) => {
  if (!connection) return null;

  const title =
    connection.title ||
    connection.person_name ||
    connection.action ||
    'Detalhe da Conexão';

  const description =
    connection.description ||
    connection.importance ||
    connection.potential ||
    connection.reason ||
    '';

  const actionText =
    connection.action ||
    connection.suggestion ||
    connection.next_step ||
    '';

  const hasNodes = involvedNodes.length > 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden max-h-[90vh] flex flex-col z-[60]">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-gradient-to-r from-purple-500/10 to-blue-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-lg">
              {TYPE_LABELS[connectionType]?.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {TYPE_LABELS[connectionType]}
              </p>
              <DialogTitle className="text-base font-bold leading-tight">{title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Mini Graph */}
            {hasNodes && (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
                  Mapa da Conexão
                </p>
                <MiniGraph nodes={involvedNodes} />
              </div>
            )}

            {/* AI Reasoning */}
            {(description || actionText) && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🧠</span>
                  <p className="text-sm font-semibold">Raciocínio da IA</p>
                </div>
                {description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                )}

                {/* Path visualization for opportunities */}
                {connection.path?.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-2">
                    <span className="text-xs text-muted-foreground mr-1">Caminho:</span>
                    {connection.path.map((id: number, i: number) => {
                      const node = involvedNodes.find(n => n.id === id);
                      return (
                        <React.Fragment key={id}>
                          <Badge variant="outline" className="text-xs">
                            {node?.name || `#${id}`}
                          </Badge>
                          {i < connection.path.length - 1 && (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {/* Workflows connected for bridges */}
                {connection.connects_workflows?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Conecta:</span>
                    {connection.connects_workflows.map((wf: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {wf}
                      </Badge>
                    ))}
                  </div>
                )}

                {actionText && (
                  <div className="border-t border-purple-500/20 pt-3 mt-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      Ação Sugerida
                    </p>
                    <p className="text-sm font-medium text-primary">{actionText}</p>
                  </div>
                )}
              </div>
            )}

            {/* Contact Cards */}
            {hasNodes && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">👥</span>
                  <p className="text-sm font-semibold">
                    Contatos Envolvidos
                    <span className="text-muted-foreground font-normal ml-1 text-xs">
                      ({involvedNodes.length})
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {involvedNodes.map((node) => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      onFocusNode={onFocusNode}
                      onClose={onClose}
                    />
                  ))}
                </div>
              </div>
            )}

            {!hasNodes && (
              <div className="text-center text-muted-foreground py-6">
                <p className="text-sm">Nenhum contato específico identificado nesta conexão.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 shrink-0 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
