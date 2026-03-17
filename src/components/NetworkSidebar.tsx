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
        className="fixed z-50 bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-secondary/80 backdrop-blur-md border border-border/30 text-muted-foreground hover:text-foreground transition-colors text-xs font-mono"
        onClick={() => setIsVisible(true)}
        title="Mostrar grupos"
      >
        {totalNodes} nós · {categoryGroups.length} grupos
      </button>
    );
  }

  return (
    <div
      className="fixed z-50 bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[hsl(220,20%,8%)]/90 backdrop-blur-md border border-border/30 rounded-2xl shadow-2xl px-2 py-1.5"
      style={{ maxWidth: '90vw' }}
    >
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-secondary/40 transition-colors"
      >
        <X size={12} />
      </button>

      {/* Scrollable category chips */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {categoryGroups.map(([name, data]) => {
          const isActive = activeCategory === name;
          return (
            <button
              key={name}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{
                backgroundColor: isActive ? `${data.color}25` : undefined,
                border: isActive ? `1px solid ${data.color}40` : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = `${data.color}15`;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => onFilterCategory?.(isActive ? null : name)}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: data.color,
                  boxShadow: `0 0 6px ${data.color}50`,
                }}
              />
              <span>{name}</span>
              <span className="font-mono font-semibold" style={{ color: data.color }}>
                {data.count}
              </span>
            </button>
          );
        })}
        {categoryGroups.length === 0 && (
          <span className="px-3 py-1.5 text-xs text-muted-foreground/30 italic">
            Nenhum grupo
          </span>
        )}
      </div>
    </div>
  );
}
