import { useRef, useEffect } from 'react';
import { Users, Target, Building2, Briefcase, Trash2, X } from 'lucide-react';

interface Flow {
  id: number;
  name: string;
  center_type: 'person' | 'project' | 'brand';
  center_id: number;
  created_at: string;
  stats?: { people: number; projects: number; brands: number };
  centerName?: string;
}

interface FlowManagerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flows: Flow[];
  onSelectFlow: (flowId: number) => void;
  onDeleteFlow: (flowId: number) => void;
  onHoverFlow?: (flowId: number) => void;
  onHoverFlowEnd?: () => void;
}

export const FlowManagerPanel = ({ open, onOpenChange, flows, onSelectFlow, onDeleteFlow, onHoverFlow, onHoverFlowEnd }: FlowManagerPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const getCenterIcon = (type: string) => {
    switch (type) {
      case 'person': return <Users className="h-3.5 w-3.5" />;
      case 'project': return <Target className="h-3.5 w-3.5" />;
      case 'brand': return <Building2 className="h-3.5 w-3.5" />;
      default: return <Briefcase className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div
      ref={panelRef}
      className="fixed right-0 top-0 h-full w-72 z-50 flex flex-col bg-[hsl(220,20%,8%)]/95 backdrop-blur-md border-l border-border/30 shadow-2xl transition-transform duration-300 ease-out"
      style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-[0.2em]">
            Flows ({flows.length})
          </span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/30"
        >
          <X size={16} />
        </button>
      </div>

      {/* Flow list */}
      <div className="flex-1 overflow-y-auto py-1">
        {flows.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground/50">
            <Briefcase className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">Nenhum flow</p>
          </div>
        ) : (
          flows.map((flow) => {
            const total = (flow.stats?.people || 0) + (flow.stats?.projects || 0) + (flow.stats?.brands || 0);
            return (
              <div
                key={flow.id}
                className="flex items-center gap-2 px-4 py-2.5 hover:bg-secondary/30 transition-colors cursor-pointer group"
                onClick={() => onSelectFlow(flow.id)}
                onMouseEnter={() => onHoverFlow?.(flow.id)}
                onMouseLeave={() => onHoverFlowEnd?.()}
              >
                <span className="text-muted-foreground">{getCenterIcon(flow.center_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{flow.name}</p>
                  <p className="text-xs text-muted-foreground/60 truncate">
                    {flow.centerName} · {total} nós
                  </p>
                </div>
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
            );
          })
        )}
      </div>
    </div>
  );
};
