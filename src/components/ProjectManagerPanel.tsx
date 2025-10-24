import React, { useState } from 'react';
import { Target, X, Search, Plus, Edit, Trash2, MapPin, Filter, ArrowUpDown, Calendar, User, Building2, FolderKanban } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';

interface FlowItem {
  id: number;
  name: string;
  centerType: 'project' | 'person' | 'brand';
  centerId: number;
  category?: string;
  status?: string;
  deadline?: string;
  workflows?: number[];
}

interface ProjectManagerPanelProps {
  flows: any[];
  projects: any[];
  workflows: any[];
  people: any[];
  brands: any[];
  connections: any[];
  onFocusFlow: (centerId: number, centerType: 'project' | 'person' | 'brand') => void;
  onFlowDelete: (flowId: number) => void;
  onClose: () => void;
}

export const ProjectManagerPanel: React.FC<ProjectManagerPanelProps> = ({
  flows,
  projects,
  workflows,
  people,
  brands,
  connections,
  onFocusFlow,
  onFlowDelete,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Transformar flows em FlowItems com dados completos
  const flowItems: FlowItem[] = flows.map(flow => {
    let centerData: any = null;
    
    if (flow.center_type === 'project') {
      centerData = projects.find(p => p.id === flow.center_id);
    } else if (flow.center_type === 'person') {
      centerData = people.find(p => p.id === flow.center_id);
    } else if (flow.center_type === 'brand') {
      centerData = brands.find(b => b.id === flow.center_id);
    }

    return {
      id: flow.id,
      name: flow.name,
      centerType: flow.center_type,
      centerId: flow.center_id,
      category: centerData?.category,
      status: centerData?.status,
      deadline: centerData?.deadline,
      workflows: centerData?.workflows || []
    };
  });

  const handleDelete = (flowId: number, flowName: string) => {
    onFlowDelete(flowId);
    toast.success(`Flow "${flowName}" deletado`);
  };

  const getFlowStats = (flowItem: FlowItem) => {
    // Contar conexões do centro do flow
    const connectedPeople = connections.filter((c: any) => 
      (c.from === flowItem.centerId && c.from_type === flowItem.centerType && people.find((p: any) => p.id === c.to)) ||
      (c.to === flowItem.centerId && c.to_type === flowItem.centerType && people.find((p: any) => p.id === c.from))
    ).length;

    const connectedBrands = connections.filter((c: any) => 
      (c.from === flowItem.centerId && c.from_type === flowItem.centerType && brands.find((b: any) => b.id === c.to)) ||
      (c.to === flowItem.centerId && c.to_type === flowItem.centerType && brands.find((b: any) => b.id === c.from))
    ).length;

    const connectedProjects = connections.filter((c: any) => 
      (c.from === flowItem.centerId && c.from_type === flowItem.centerType && projects.find((p: any) => p.id === c.to)) ||
      (c.to === flowItem.centerId && c.to_type === flowItem.centerType && projects.find((p: any) => p.id === c.from))
    ).length;

    return { connectedPeople, connectedBrands, connectedProjects };
  };

  const filteredFlows = flowItems
    .filter(flowItem => {
      const matchesSearch = flowItem.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !filterType || flowItem.centerType === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'oldest') {
        return a.id - b.id;
      }
      return b.id - a.id;
    });

  const getFlowIcon = (centerType: string) => {
    switch (centerType) {
      case 'project': return <FolderKanban className="h-4 w-4" />;
      case 'person': return <User className="h-4 w-4" />;
      case 'brand': return <Building2 className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getFlowTypeLabel = (centerType: string) => {
    switch (centerType) {
      case 'project': return 'Projeto';
      case 'person': return 'Pessoa';
      case 'brand': return 'Marca';
      default: return centerType;
    }
  };

  return (
    <>
      <div className="fixed left-0 top-0 h-full w-[400px] bg-background border-r border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-bold">Arquivo de Flows</h2>
            <Badge variant="secondary">{flows.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Busca e Filtros */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar flows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={filterType === null ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType(null)}
            >
              Todos
            </Button>
            <Button 
              variant={filterType === 'project' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType(filterType === 'project' ? null : 'project')}
            >
              <FolderKanban className="mr-1 h-3 w-3" />
              Projetos
            </Button>
            <Button 
              variant={filterType === 'person' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType(filterType === 'person' ? null : 'person')}
            >
              <User className="mr-1 h-3 w-3" />
              Pessoas
            </Button>
            <Button 
              variant={filterType === 'brand' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType(filterType === 'brand' ? null : 'brand')}
            >
              <Building2 className="mr-1 h-3 w-3" />
              Marcas
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              variant={sortBy === 'newest' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSortBy('newest')}
              className="flex-1"
            >
              <Calendar className="mr-1 h-3 w-3" />
              Mais Novos
            </Button>
            <Button 
              variant={sortBy === 'oldest' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSortBy('oldest')}
              className="flex-1"
            >
              <Calendar className="mr-1 h-3 w-3" />
              Mais Antigos
            </Button>
          </div>
        </div>

        {/* Lista de Projetos */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {filteredFlows.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum flow encontrado</p>
                <p className="text-xs mt-1">Crie um flow usando o botão "Criar Flow" no menu</p>
              </div>
            ) : (
              filteredFlows.map(flowItem => {
                const stats = getFlowStats(flowItem);

                return (
                  <div key={flowItem.id} className="bg-secondary/50 rounded-lg p-3 space-y-2 hover:bg-secondary/70 transition-colors">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        {getFlowIcon(flowItem.centerType)}
                        {flowItem.name}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {getFlowTypeLabel(flowItem.centerType)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {stats.connectedProjects > 0 && <span>📁 {stats.connectedProjects}</span>}
                      {stats.connectedPeople > 0 && <span>👥 {stats.connectedPeople}</span>}
                      {stats.connectedBrands > 0 && <span>🏢 {stats.connectedBrands}</span>}
                      {stats.connectedProjects === 0 && stats.connectedPeople === 0 && stats.connectedBrands === 0 && (
                        <span className="text-muted-foreground/60">Sem conexões</span>
                      )}
                    </div>

                    <div className="flex gap-1 pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onFocusFlow(flowItem.centerId, flowItem.centerType)}
                        className="flex-1"
                      >
                        <MapPin className="mr-1 h-3 w-3" />
                        Ver Flow
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(flowItem.id, flowItem.name)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};
