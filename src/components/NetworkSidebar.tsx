import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Category color map
const CATEGORY_COLORS: Record<string, string> = {
  'Pessoal': 'hsl(210, 100%, 56%)',
  'Profissional': 'hsl(158, 64%, 52%)',
  'Cliente': 'hsl(43, 96%, 56%)',
  'Fornecedor': 'hsl(27, 96%, 61%)',
  'Parceiro': 'hsl(258, 90%, 66%)',
  'Bebida': 'hsl(340, 80%, 55%)',
  'Entretenimento': 'hsl(280, 70%, 60%)',
  'Hotelaria': 'hsl(190, 80%, 50%)',
  'Varejo': 'hsl(30, 90%, 55%)',
  'Serviços': 'hsl(170, 60%, 50%)',
  'Tecnologia': 'hsl(210, 90%, 55%)',
  'Alimentação': 'hsl(15, 85%, 55%)',
  'P': 'hsl(120, 50%, 50%)',
  'M': 'hsl(45, 90%, 55%)',
  'G': 'hsl(0, 70%, 55%)',
};

function getColor(category: string): string {
  return CATEGORY_COLORS[category] || 'hsl(220, 10%, 55%)';
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
  collapsed = false,
  onToggleCollapse,
}: NetworkSidebarProps) {
  const categoryGroups = useMemo(() => {
    const groups: Record<string, { count: number; color: string }> = {};
    const activeNodes = viewMode === 'master' ? allNodes : nodes;
    
    activeNodes.forEach(node => {
      const cat = node.category || 'Sem categoria';
      if (!groups[cat]) {
        groups[cat] = { count: 0, color: getColor(cat) };
      }
      groups[cat].count++;
    });
    
    return Object.entries(groups).sort((a, b) => b[1].count - a[1].count);
  }, [allNodes, nodes, viewMode]);

  const totalNodes = viewMode === 'master' ? allNodes.length : nodes.length;
  const sidebarWidth = collapsed ? 48 : 220;

  return (
    <div
      className="fixed left-0 top-0 h-screen z-50 flex flex-col bg-[hsl(220,20%,6%)] border-r border-border/30 transition-all duration-200"
      style={{ width: sidebarWidth }}
    >
      {/* Header */}
      {!collapsed && (
        <div className="px-4 py-5 border-b border-border/20">
          <h1 className="text-sm font-bold text-foreground tracking-[0.2em] font-mono uppercase">
            Network Matrix
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-0.5 tracking-wider uppercase">
            Mapa de Conexões
          </p>
        </div>
      )}

      {collapsed && (
        <div className="h-[65px] border-b border-border/20 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground font-mono">NM</span>
        </div>
      )}

      {/* Groups */}
      <div className="flex-1 overflow-y-auto px-1 py-3">
        {!collapsed && (
          <div className="px-2 mb-2">
            <span className="text-sm font-mono text-muted-foreground/50 uppercase tracking-[0.15em]">
              Grupos ({totalNodes})
            </span>
          </div>
        )}
        
        <div className="space-y-px">
          {categoryGroups.map(([name, data]) => {
            const isActive = activeCategory === name;
            
            if (collapsed) {
              return (
                <button
                  key={name}
                  className={`w-full flex items-center justify-center py-2.5 rounded transition-all ${
                    isActive ? 'bg-secondary/60' : 'hover:bg-secondary/30'
                  }`}
                  onClick={() => onFilterCategory?.(isActive ? null : name)}
                  title={`${name} (${data.count})`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: data.color }}
                  />
                </button>
              );
            }

            return (
              <button
                key={name}
                className={`w-full flex items-center justify-between px-3 py-2 text-base rounded transition-all group ${
                  isActive 
                    ? 'bg-secondary/60 text-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
                onClick={() => onFilterCategory?.(isActive ? null : name)}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: data.color }}
                  />
                  <span className="truncate">{name}</span>
                </span>
                <span className="text-sm text-muted-foreground/50 font-mono ml-1 flex-shrink-0">{data.count}</span>
              </button>
            );
          })}
          {categoryGroups.length === 0 && !collapsed && (
            <div className="px-3 py-4 text-sm text-muted-foreground/30 italic text-center">
              Nenhum grupo
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-border/20 p-2">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center py-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </div>
  );
}
