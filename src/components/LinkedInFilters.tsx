import React, { useState, useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LinkedInFilterState } from '@/types/linkedin';

interface LinkedInFiltersProps {
  allNodes: any[];
  filters: LinkedInFilterState;
  onFiltersChange: (filters: LinkedInFilterState) => void;
}

export const LinkedInFilters: React.FC<LinkedInFiltersProps> = ({ allNodes, filters, onFiltersChange }) => {
  const [open, setOpen] = useState(false);

  // Extract unique values from linkedin nodes
  const { companies, sectors, countries } = useMemo(() => {
    const linkedinNodes = allNodes.filter(n => n.category === 'linkedin');
    const companies = new Set<string>();
    const sectors = new Set<string>();
    const countries = new Set<string>();

    for (const n of linkedinNodes) {
      if (n.type === 'brand') companies.add(n.name);
      if (n.department) sectors.add(n.department);
      // We store country info in notes or department for now
    }

    return {
      companies: Array.from(companies).sort(),
      sectors: Array.from(sectors).sort(),
      countries: Array.from(countries).sort(),
    };
  }, [allNodes]);

  const hasLinkedIn = allNodes.some(n => n.category === 'linkedin');
  if (!hasLinkedIn) return null;

  const activeCount = filters.companies.size + filters.sectors.size + filters.countries.size;

  const toggleItem = (set: Set<string>, item: string, key: keyof LinkedInFilterState) => {
    const newSet = new Set(set);
    if (newSet.has(item)) newSet.delete(item);
    else newSet.add(item);
    onFiltersChange({ ...filters, [key]: newSet });
  };

  const clearAll = () => {
    onFiltersChange({ companies: new Set(), sectors: new Set(), countries: new Set() });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={`px-2.5 py-1.5 text-sm font-mono rounded transition-all flex items-center gap-1.5 ${
          activeCount > 0 ? 'bg-[#0A66C2]/20 text-[#0A66C2]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
        }`}>
          <Filter size={14} />
          Filtros
          {activeCount > 0 && (
            <span className="bg-[#0A66C2] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Filtros LinkedIn</p>
          {activeCount > 0 && (
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X size={12} /> Limpar
            </button>
          )}
        </div>

        {companies.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Empresas</p>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {companies.map(c => (
                <div key={c} className="flex items-center gap-2">
                  <Checkbox
                    id={`co-${c}`}
                    checked={filters.companies.has(c)}
                    onCheckedChange={() => toggleItem(filters.companies, c, 'companies')}
                  />
                  <Label htmlFor={`co-${c}`} className="text-xs cursor-pointer truncate">{c}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {sectors.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Setores</p>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {sectors.map(s => (
                <div key={s} className="flex items-center gap-2">
                  <Checkbox
                    id={`sec-${s}`}
                    checked={filters.sectors.has(s)}
                    onCheckedChange={() => toggleItem(filters.sectors, s, 'sectors')}
                  />
                  <Label htmlFor={`sec-${s}`} className="text-xs cursor-pointer truncate">{s}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {countries.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Países</p>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {countries.map(c => (
                <div key={c} className="flex items-center gap-2">
                  <Checkbox
                    id={`ctry-${c}`}
                    checked={filters.countries.has(c)}
                    onCheckedChange={() => toggleItem(filters.countries, c, 'countries')}
                  />
                  <Label htmlFor={`ctry-${c}`} className="text-xs cursor-pointer truncate">{c}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {companies.length === 0 && sectors.length === 0 && countries.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum filtro disponível ainda.</p>
        )}
      </PopoverContent>
    </Popover>
  );
};
