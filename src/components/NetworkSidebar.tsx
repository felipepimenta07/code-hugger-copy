import { useMemo, useState, useRef, useCallback } from 'react';
import { GripVertical, X } from 'lucide-react';

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
  'Agência': 'hsl(260, 80%, 60%)',
  'Banco': 'hsl(200, 70%, 50%)',
  'Telecomunicação': 'hsl(180, 70%, 45%)',
  'Moda': 'hsl(320, 70%, 55%)',
  'Cosméticos': 'hsl(340, 60%, 60%)',
  'Automotivo': 'hsl(220, 60%, 50%)',
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
}: NetworkSidebarProps) {
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const dragOffset = useRef({ x: 0, y: 0 });

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    const handleMove = (ev: MouseEvent) => {
      setPosition({ x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y });
    };
    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [position]);

  if (!isVisible) {
    return (
      <button
        className="fixed z-50 w-10 h-10 rounded-full bg-secondary/80 backdrop-blur-md border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        style={{ left: 16, top: 80 }}
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
        left: position.x,
        top: position.y,
        width: 200,
        cursor: isDragging ? 'grabbing' : 'auto',
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      {/* Drag handle header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b border-border/20 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-muted-foreground/50" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-[0.15em]">
            Grupos ({totalNodes})
          </span>
        </div>
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
          return (
            <button
              key={name}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md mx-0 transition-all group ${
                isActive
                  ? 'bg-secondary/60 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}
              onClick={() => onFilterCategory?.(isActive ? null : name)}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: data.color, boxShadow: `0 0 6px ${data.color}40` }}
                />
                <span className="truncate text-sm">{name}</span>
              </span>
              <span className="text-xs text-muted-foreground/50 font-mono ml-1 flex-shrink-0">{data.count}</span>
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
