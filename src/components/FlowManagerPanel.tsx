import { useState, useRef, useEffect } from 'react';
import { Users, Target, Building2, Briefcase, Trash2 } from 'lucide-react';

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
  anchorRef?: React.RefObject<HTMLElement>;
}

export const FlowManagerPanel = ({ open, onOpenChange, flows, onSelectFlow, onDeleteFlow }: FlowManagerPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    // Delay to avoid immediate close from the click that opened it
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [open, onOpenChange]);

  const getCenterIcon = (type: string) => {
    switch (type) {
      case 'person': return <Users className="h-3.5 w-3.5" />;
      case 'project': return <Target className="h-3.5 w-3.5" />;
      case 'brand': return <Building2 className="h-3.5 w-3.5" />;
      default: return <Briefcase className="h-3.5 w-3.5" />;
    }
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute top-12 left-[120px] z-50 w-72 bg-[hsl(220,20%,8%)]/95 backdrop-blur-md border border-border/30 rounded-xl shadow-2xl overflow-hidden animate-scale-in"
    >
      <div className="px-3 py-2 border-b border-border/20">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {flows.length} flows
        </span>
      </div>

      <div className="max-h-[60vh] overflow-y-auto py-1">
        {flows.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground/50">
            <Briefcase className="h-8 w-8 mb-1 opacity-30" />
            <p className="text-xs">Nenhum flow</p>
          </div>
        ) : (
          flows.map((flow) => {
            const total = (flow.stats?.people || 0) + (flow.stats?.projects || 0) + (flow.stats?.brands || 0);
            return (
              <div
                key={flow.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/30 transition-colors cursor-pointer group"
                onClick={() => onSelectFlow(flow.id)}
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
