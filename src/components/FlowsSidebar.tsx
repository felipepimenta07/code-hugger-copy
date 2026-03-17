import { useState, useMemo } from 'react';
import { X, Search, Users, Target, Building2, Briefcase, Trash2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

const FLOW_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C0A1',
];

export function getFlowColor(flowId: number): string {
  return FLOW_COLORS[flowId % FLOW_COLORS.length];
}

interface Flow {
  id: number;
  name: string;
  center_type: string;
  center_id: number;
  created_at: string;
  stats?: { people: number; projects: number; brands: number };
  centerName?: string;
}

interface FlowsSidebarProps {
  open: boolean;
  onClose: () => void;
  flows: Flow[];
  onSelectFlow: (flowId: number) => void;
  onDeleteFlow: (flowId: number) => void;
  hoveredFlowId: number | null;
  onHoverFlow: (flowId: number | null) => void;
  selectedNodeDetail?: any;
  allConnections?: any[];
  allNodes?: any[];
  onCloseDetail?: () => void;
  onEditNode?: (node: any) => void;
  onNavigateToNode?: (nodeRef: string) => void;
}

const getCenterIcon = (type: string) => {
  switch (type) {
    case 'person': return <Users className="h-3.5 w-3.5" />;
    case 'project': return <Target className="h-3.5 w-3.5" />;
    case 'brand': return <Building2 className="h-3.5 w-3.5" />;
    default: return <Briefcase className="h-3.5 w-3.5" />;
  }
};

export function FlowsSidebar({
  open,
  onClose,
  flows,
  onSelectFlow,
  onDeleteFlow,
  hoveredFlowId,
  onHoverFlow,
  selectedNodeDetail,
  allConnections = [],
  allNodes = [],
  onCloseDetail,
  onEditNode,
  onNavigateToNode,
}: FlowsSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return flows;
    const q = search.toLowerCase();
    return flows.filter(f => f.name.toLowerCase().includes(q) || f.centerName?.toLowerCase().includes(q));
  }, [flows, search]);

  // Node detail connections
  const nodeConnections = useMemo(() => {
    if (!selectedNodeDetail) return [];
    const nodeRef = selectedNodeDetail.node_ref;
    return allConnections
      .filter(c => c.from_ref === nodeRef || c.to_ref === nodeRef)
      .map(c => {
        const otherRef = c.from_ref === nodeRef ? c.to_ref : c.from_ref;
        const otherNode = allNodes.find(n => n.node_ref === otherRef);
        return otherNode ? { node: otherNode, type: c.connection_type || c.type } : null;
      })
      .filter(Boolean);
  }, [selectedNodeDetail, allConnections, allNodes]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-[350px] z-50 flex flex-col bg-[hsl(220,20%,6%)]/95 backdrop-blur-xl border-l border-border/20 animate-in slide-in-from-right-full duration-200">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border/15">
        <span className="text-sm font-mono uppercase tracking-[0.15em] text-muted-foreground">
          Flows ({flows.length})
        </span>
        <button onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary/40 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          <Input
            type="text"
            placeholder="Buscar flow..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-secondary/30 border-border/20 rounded-lg"
          />
        </div>
      </div>

      {/* Flow list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground/40">
            <Briefcase className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">{search ? 'Nenhum resultado' : 'Nenhum flow'}</p>
          </div>
        ) : (
          filtered.map((flow) => {
            const total = (flow.stats?.people || 0) + (flow.stats?.projects || 0) + (flow.stats?.brands || 0);
            const color = getFlowColor(flow.id);
            const isHovered = hoveredFlowId === flow.id;
            return (
              <div
                key={flow.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all cursor-pointer group mb-0.5 ${
                  isHovered ? 'bg-secondary/40' : 'hover:bg-secondary/20'
                }`}
                onClick={() => onSelectFlow(flow.id)}
                onMouseEnter={() => onHoverFlow(flow.id)}
                onMouseLeave={() => onHoverFlow(null)}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}50` }}
                />
                <span className="text-muted-foreground flex-shrink-0">{getCenterIcon(flow.center_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{flow.name}</p>
                  <p className="text-xs text-muted-foreground/50 truncate">
                    {flow.centerName} · {total} nós
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {isHovered && (
                    <span className="text-[10px] font-mono text-muted-foreground/40 bg-secondary/40 px-1.5 py-0.5 rounded">
                      {total}
                    </span>
                  )}
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 text-destructive/70 hover:text-destructive transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Deletar "${flow.name}"?`)) onDeleteFlow(flow.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Node detail section */}
      {selectedNodeDetail && (
        <div className="border-t border-border/20 flex flex-col max-h-[45%]">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40">
                {selectedNodeDetail.type === 'person' ? 'Pessoa' : selectedNodeDetail.type === 'project' ? 'Projeto' : 'Marca'}
              </span>
              <h3 className="text-sm font-bold text-foreground truncate">{selectedNodeDetail.name}</h3>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onEditNode && (
                <button onClick={() => onEditNode(selectedNodeDetail)}
                  className="text-[10px] font-mono text-primary hover:text-primary/80 px-2 py-1 rounded hover:bg-primary/10 transition-colors">
                  Editar
                </button>
              )}
              {onCloseDetail && (
                <button onClick={onCloseDetail}
                  className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto px-4 pb-3 space-y-2">
            {/* Node properties */}
            {Object.entries(selectedNodeDetail)
              .filter(([key]) => !['id', 'type', 'node_ref', 'x', 'y', 'master_x', 'master_y', 'user_id', 'flow_id', 'original_node_id', 'created_at', 'isNewHighlight'].includes(key))
              .filter(([, value]) => value !== null && value !== undefined && value !== '')
              .map(([key, value]) => (
                <div key={key} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground/40 font-mono flex-shrink-0 min-w-[80px]">{key}:</span>
                  <span className="text-muted-foreground break-all">{String(value)}</span>
                </div>
              ))
            }

            {/* Connections */}
            {nodeConnections.length > 0 && (
              <>
                <div className="pt-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/30">
                    Conexões ({nodeConnections.length})
                  </span>
                </div>
                {nodeConnections.map((conn: any, i: number) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-secondary/30 transition-colors"
                    onClick={() => onNavigateToNode?.(conn.node.node_ref)}
                  >
                    <ChevronRight size={10} className="text-muted-foreground/30" />
                    <span className="text-xs text-foreground truncate">{conn.node.name}</span>
                    {conn.type !== 'related' && (
                      <span className="text-[10px] text-muted-foreground/30 font-mono ml-auto">{conn.type}</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
