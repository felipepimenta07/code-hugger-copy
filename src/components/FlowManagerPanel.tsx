import { useState, useRef, useEffect } from 'react';
import { Users, Target, Building2, Briefcase, Trash2, ChevronDown } from 'lucide-react';

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
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const isVisible = isPinned || isHovering;

  // Close pinned panel on click outside
  useEffect(() => {
    if (!isPinned) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsPinned(false);
        onOpenChange(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [isPinned, onOpenChange]);

  // Sync external open state
  useEffect(() => {
    if (!open) { setIsPinned(false); }
  }, [open]);

  const handleMouseEnter = () => {
    clearTimeout(hoverTimeoutRef.current);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 200);
  };

  const handleTriggerClick = () => {
    setIsPinned(prev => !prev);
    onOpenChange(!isPinned);
  };

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
      className="absolute top-2 left-3 z-50"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger button */}
      <div ref={triggerRef}>
        <button
          onClick={handleTriggerClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-mono uppercase tracking-wider rounded-lg transition-all ${
            isPinned
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          <Briefcase size={14} />
          Flows
          <ChevronDown size={12} className={`transition-transform ${isVisible ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown panel */}
      {isVisible && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-1 w-72 bg-[hsl(220,20%,8%)]/95 backdrop-blur-md border border-border/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-[0.2em]">
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
                    onClick={() => { onSelectFlow(flow.id); if (!isPinned) setIsHovering(false); }}
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
      )}
    </div>
  );
};
