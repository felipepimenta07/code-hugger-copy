import React from 'react';
import { X, User, Target, Building2 } from 'lucide-react';

interface LegendProps {
  nodes: any[];
  setShowLegend: (show: boolean) => void;
}

export const Legend: React.FC<LegendProps> = ({ nodes, setShowLegend }) => {
  return (
    <div className="fixed top-24 left-6 bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-6 z-30 w-72 shadow-2xl">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">Stakeholders</h3>
        <button onClick={() => setShowLegend(false)} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--node-person))]/10 border-2 border-[hsl(var(--node-person))] flex items-center justify-center">
            <User size={20} className="text-[hsl(var(--node-person))]" />
          </div>
          <div>
            <div className="text-foreground text-sm font-semibold">Pessoas</div>
            <div className="text-muted-foreground text-xs">Comunidade & Time</div>
          </div>
          <div className="ml-auto text-[hsl(var(--node-person))] font-bold text-lg">
            {nodes.filter(n => n.type === 'person').length}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--node-project))]/10 border-2 border-[hsl(var(--node-project))] flex items-center justify-center">
            <Target size={20} className="text-[hsl(var(--node-project))]" />
          </div>
          <div>
            <div className="text-foreground text-sm font-semibold">Projetos</div>
            <div className="text-muted-foreground text-xs">Iniciativas Ativas</div>
          </div>
          <div className="ml-auto text-[hsl(var(--node-project))] font-bold text-lg">
            {nodes.filter(n => n.type === 'project').length}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--node-brand))]/10 border-2 border-[hsl(var(--node-brand))] flex items-center justify-center">
            <Building2 size={20} className="text-[hsl(var(--node-brand))]" />
          </div>
          <div>
            <div className="text-foreground text-sm font-semibold">Marcas</div>
            <div className="text-muted-foreground text-xs">Empresas & Locais</div>
          </div>
          <div className="ml-auto text-[hsl(var(--node-brand))] font-bold text-lg">
            {nodes.filter(n => n.type === 'brand').length}
          </div>
        </div>
      </div>
    </div>
  );
};
