import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Target, Users, Building2, Briefcase, Calendar, Trash2 } from 'lucide-react';

interface Flow {
  id: number;
  name: string;
  center_type: 'person' | 'project' | 'brand';
  center_id: number;
  created_at: string;
  stats?: {
    people: number;
    projects: number;
    brands: number;
  };
  centerName?: string;
}

interface FlowManagerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flows: Flow[];
  onSelectFlow: (flowId: number) => void;
  onDeleteFlow: (flowId: number) => void;
}

type FilterType = 'all' | 'person' | 'project' | 'brand';
type SortType = 'newest' | 'oldest';

export const FlowManagerPanel = ({ open, onOpenChange, flows, onSelectFlow, onDeleteFlow }: FlowManagerPanelProps) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');

  const getCenterIcon = (type: string) => {
    switch (type) {
      case 'person': return <Users className="h-4 w-4" />;
      case 'project': return <Target className="h-4 w-4" />;
      case 'brand': return <Building2 className="h-4 w-4" />;
      default: return <Briefcase className="h-4 w-4" />;
    }
  };

  const getCenterLabel = (type: string) => {
    switch (type) {
      case 'person': return 'Pessoa';
      case 'project': return 'Projeto';
      case 'brand': return 'Marca';
      default: return type;
    }
  };

  const filteredFlows = flows
    .filter(flow => {
      const matchesSearch = flow.name.toLowerCase().includes(search.toLowerCase()) ||
                          flow.centerName?.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'all' || flow.center_type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortType === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const totalCount = filteredFlows.reduce((acc, flow) => {
    return acc + (flow.stats?.people || 0) + (flow.stats?.projects || 0) + (flow.stats?.brands || 0);
  }, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[600px] sm:w-[600px] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Flows
              <Badge variant="secondary">{filteredFlows.length}</Badge>
            </SheetTitle>
          </SheetHeader>

          <div className="px-6 py-4 space-y-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar flows..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                Todos
              </Button>
              <Button
                variant={filterType === 'project' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('project')}
                className="gap-2"
              >
                <Target className="h-3 w-3" />
                Projetos
              </Button>
              <Button
                variant={filterType === 'person' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('person')}
                className="gap-2"
              >
                <Users className="h-3 w-3" />
                Pessoas
              </Button>
              <Button
                variant={filterType === 'brand' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('brand')}
                className="gap-2"
              >
                <Building2 className="h-3 w-3" />
                Marcas
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={sortType === 'newest' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortType('newest')}
                className="flex-1 gap-2"
              >
                <Calendar className="h-3 w-3" />
                Mais Novos
              </Button>
              <Button
                variant={sortType === 'oldest' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortType('oldest')}
                className="flex-1 gap-2"
              >
                <Calendar className="h-3 w-3" />
                Mais Antigos
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {filteredFlows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Briefcase className="h-12 w-12 mb-2 opacity-20" />
                <p>Nenhum flow encontrado</p>
              </div>
            ) : (
              filteredFlows.map((flow) => (
                <div
                  key={flow.id}
                  className="border rounded-lg p-4 hover:border-primary/50 transition-colors bg-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getCenterIcon(flow.center_type)}
                      <h3 className="font-semibold">{flow.name}</h3>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {getCenterLabel(flow.center_type)}
                    </Badge>
                  </div>

                  <p className="text-base text-muted-foreground mb-3">
                    Centro: {flow.centerName || `ID ${flow.center_id}`}
                  </p>

                  {flow.stats && (
                    <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {flow.stats.people}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {flow.stats.projects}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {flow.stats.brands}
                      </span>
                      <span className="ml-auto font-medium">
                        Total: {flow.stats.people + flow.stats.projects + flow.stats.brands}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => {
                        onSelectFlow(flow.id);
                        onOpenChange(false);
                      }}
                    >
                      <Target className="h-3 w-3" />
                      Ver Flow
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Deseja deletar o flow "${flow.name}"? Esta ação não pode ser desfeita.`)) {
                          onDeleteFlow(flow.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
