import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

const SEED_COLORS: string[] = [
  'hsl(210, 100%, 56%)', 'hsl(158, 64%, 52%)', 'hsl(43, 96%, 56%)',
  'hsl(27, 96%, 61%)', 'hsl(258, 90%, 66%)', 'hsl(340, 80%, 55%)',
  'hsl(280, 70%, 60%)', 'hsl(190, 80%, 50%)', 'hsl(30, 90%, 55%)',
  'hsl(170, 60%, 50%)', 'hsl(210, 90%, 55%)', 'hsl(15, 85%, 55%)',
  'hsl(260, 80%, 60%)', 'hsl(200, 70%, 50%)', 'hsl(180, 70%, 45%)',
  'hsl(320, 70%, 55%)', 'hsl(340, 60%, 60%)', 'hsl(220, 60%, 50%)',
  'hsl(120, 50%, 50%)', 'hsl(45, 90%, 55%)', 'hsl(0, 70%, 55%)',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getColor(category: string): string {
  return SEED_COLORS[hashStr(category) % SEED_COLORS.length];
}

interface NetworkSidebarProps {
  viewMode: string;
  allNodes: any[];
  nodes: any[];
  onFilterCategory?: (category: string | null) => void;
  activeCategory?: string | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onHighlightCategory?: (category: string | null) => void;
}

export function NetworkSidebar({
  viewMode,
  allNodes,
  nodes,
  onFilterCategory,
  activeCategory,
}: NetworkSidebarProps) {
  const [isVisible, setIsVisible] = useState(true);

  const categoryGroups = useMemo(() => {
    const groups: Record<string, { count: number; color: string }> = {};
    const activeNodes = viewMode === 'master' ? allNodes : nodes;
    activeNodes.forEach(node => {
      const cat = node.category || 'Sem categoria';
      if (!groups[cat]) groups[cat] = { count: 0, color: getColor(cat) };
      groups[cat].count++;
    });
    return Object.entries(groups).sort((a, b) => b[1].count - a[1].count);
  }, [allNodes, nodes, viewMode]);

  const totalNodes = viewMode === 'master' ? allNodes.length : nodes.length;

  if (!isVisible) {
    return (
      <button
        className="fixed z-50 w-10 h-10 rounded-full bg-secondary/80 backdrop-blur-md border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        style={{ left: 16, bottom: 16 }}
        onClick={() => setIsVisible(true)}
        title="Mostrar grupos"
      >
        <span className="text-xs font-mono font-bold">{totalNodes}</span>
      </button>
    );
  }

  return (
    <div
      className="fixed z-50 flex flex-col bg-[hsl(220,20%,8%)]/90 backdrop-blur-md border border-border/30 rounded-xl shadow-2xl overflow-hidden"
      style={{
        left: 16,
        bottom: 16,
        width: 200,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/20">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-[0.15em]">
          Grupos ({totalNodes})
        </span>
        <button
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Category list */}
      <div className="max-h-[50vh] overflow-y-auto py-1.5">
        {categoryGroups.map(([name, data]) => {
          const isActive = activeCategory === name;
          const pct = totalNodes > 0 ? Math.round((data.count / totalNodes) * 100) : 0;
          return (
            <button
              key={name}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md mx-0 transition-all duration-150 group relative overflow-hidden ${
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{
                backgroundColor: isActive ? `${data.color}20` : undefined,
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = `${data.color}12`;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => onFilterCategory?.(isActive ? null : name)}
            >
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r transition-all duration-150"
                style={{
                  backgroundColor: data.color,
                  height: isActive ? '70%' : '0%',
                  opacity: isActive ? 1 : 0,
                }}
              />
              <span
                className="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform duration-150 group-hover:scale-125"
                style={{
                  backgroundColor: data.color,
                  boxShadow: `0 0 8px ${data.color}50`,
                }}
              />
              <span className="truncate text-sm flex-1 text-left">{name}</span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs font-mono font-semibold" style={{ color: data.color }}>
                  {data.count}
                </span>
                <span className="text-[10px] text-muted-foreground/30 font-mono w-7 text-right">
                  {pct}%
                </span>
              </span>
            </button>
          );
        })}
        {categoryGroups.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground/30 italic text-center">
            Nenhum grupo
          </div>
        )}
      </div>
    </div>
  );
}
