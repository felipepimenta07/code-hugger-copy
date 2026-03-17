import { useState, useRef, useEffect } from 'react';
import { Users, Target, Building2, Briefcase, Trash2, X } from 'lucide-react';

export const FLOW_COLORS: string[] = [
  'hsl(280, 80%, 65%)', 'hsl(210, 100%, 56%)', 'hsl(158, 64%, 52%)',
  'hsl(43, 96%, 56%)', 'hsl(340, 80%, 55%)', 'hsl(27, 96%, 61%)',
  'hsl(190, 80%, 50%)', 'hsl(120, 50%, 50%)', 'hsl(330, 75%, 60%)',
  'hsl(260, 80%, 60%)', 'hsl(15, 85%, 55%)', 'hsl(200, 70%, 50%)',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getFlowColor(name: string, index: number): string {
  return FLOW_COLORS[index % FLOW_COLORS.length];
}

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
  const [hoveredFlow, setHoveredFlow] = useState<Flow | null>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
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
      className="fixed left-0 top-0 h-screen w-[280px] z-50 flex flex-col bg-[hsl(220,20%,6%)]/95 backdrop-blur-xl border-r border-border/20 animate-in slide-in-from-left-full duration-200"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border/15">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-primary" />
          <span className="text-sm font-mono uppercase tracking-[0.15em] text-foreground font-semibold">
            Flows
          </span>
          <span className="text-xs font-mono text-muted-foreground/50 ml-1">
            ({flows.length})
          </span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Flow list */}
      <div className="flex-1 overflow-y-auto py-2">
        {flows.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground/50">
            <Briefcase className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhum flow criado</p>
          </div>
        ) : (
          flows.map((flow, index) => {
            const total = (flow.stats?.people || 0) + (flow.stats?.projects || 0) + (flow.stats?.brands || 0);
            const flowColor = getFlowColor(flow.name, index);
            return (
              <div
                key={flow.id}
                className="relative flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer group"
                onClick={() => onSelectFlow(flow.id)}
                onMouseEnter={() => setHoveredFlow(flow)}
                onMouseLeave={() => setHoveredFlow(null)}
              >
                {/* Color indicator */}
                <span
                  className="w-1 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: flowColor }}
                />
                <span className="text-muted-foreground" style={{ color: flowColor }}>
                  {getCenterIcon(flow.center_type)}
                </span>
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

      {/* Hover preview card - shows to the right of sidebar */}
      {hoveredFlow && (
        <div
          className="fixed z-[60] w-[220px] bg-[hsl(220,20%,10%)]/95 backdrop-blur-md border border-border/30 rounded-xl shadow-2xl p-4 animate-in fade-in duration-100 pointer-events-none"
          style={{
            left: 290,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-muted-foreground">
              {getCenterIcon(hoveredFlow.center_type)}
            </span>
            <h3 className="text-sm font-semibold text-foreground truncate">{hoveredFlow.name}</h3>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground/60">Centro</span>
              <span className="text-foreground">{hoveredFlow.centerName}</span>
            </div>
            {hoveredFlow.stats && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground/60">Pessoas</span>
                  <span className="text-foreground">{hoveredFlow.stats.people}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground/60">Projetos</span>
                  <span className="text-foreground">{hoveredFlow.stats.projects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground/60">Marcas</span>
                  <span className="text-foreground">{hoveredFlow.stats.brands}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
