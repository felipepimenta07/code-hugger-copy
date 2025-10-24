import React, { useState } from 'react';
import { Layers, X, Search, Plus, Edit, Trash2, MapPin, Filter, ArrowUpDown, Calendar, Target, Building2, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';

interface Flow {
  id: number;
  name: string;
  center_type: 'project' | 'person' | 'brand';
  center_id: number;
  user_id: string;
  created_at: string;
}

interface ProjectManagerPanelProps {
  flows: Flow[];
  projects: any[];
  workflows: any[];
  people: any[];
  brands: any[];
  connections: any[];
  onFlowFocus: (flowId: number) => void;
  onClose: () => void;
}

export const ProjectManagerPanel: React.FC<ProjectManagerPanelProps> = ({
  flows,
  projects,
  workflows,
  people,
  brands,
  connections,
  onFlowFocus,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCenterType, setFilterCenterType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  const getCenterNode = (flow: Flow) => {
    if (flow.center_type === 'project') {
      return projects.find((p: any) => p.id === flow.center_id);
    } else if (flow.center_type === 'person') {
      return people.find((p: any) => p.id === flow.center_id);
    } else if (flow.center_type === 'brand') {
      return brands.find((b: any) => b.id === flow.center_id);
    }
    return null;
  };

  const getFlowStats = (flow: Flow) => {
    const centerNode = getCenterNode(flow);
    if (!centerNode) return { connectedPeople: 0, connectedBrands: 0, connectedProjects: 0, totalNodes: 0 };

    const connectedPeople = connections.filter((c: any) => 
      (c.from === centerNode.id && people.find((p: any) => p.id === c.to)) ||
      (c.to === centerNode.id && people.find((p: any) => p.id === c.from))
    ).length;

    const connectedBrands = connections.filter((c: any) => 
      (c.from === centerNode.id && brands.find((b: any) => b.id === c.to)) ||
      (c.to === centerNode.id && brands.find((b: any) => b.id === c.from))
    ).length;

    const connectedProjects = connections.filter((c: any) => 
      (c.from === centerNode.id && projects.find((p: any) => p.id === c.to)) ||
      (c.to === centerNode.id && projects.find((p: any) => p.id === c.from))
    ).length;

    const totalNodes = connectedPeople + connectedBrands + connectedProjects;

    return { connectedPeople, connectedBrands, connectedProjects, totalNodes };
  };

  const getCenterIcon = (centerType: string) => {
    switch (centerType) {
      case 'project':
        return <Target className="h-4 w-4" />;
      case 'person':
        return <User className="h-4 w-4" />;
      case 'brand':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  const filteredFlows = flows
    .filter(flow => {
      const centerNode = getCenterNode(flow);
      const matchesSearch = flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           centerNode?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCenterType = !filterCenterType || flow.center_type === filterCenterType;
      return matchesSearch && matchesCenterType;
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

  const getCenterTypeLabel = (centerType: string) => {
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
            <Layers className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-bold">Flows</h2>
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
              variant={filterCenterType === null ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterCenterType(null)}
            >
              Todos
            </Button>
            <Button 
              variant={filterCenterType === 'project' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterCenterType(filterCenterType === 'project' ? null : 'project')}
            >
              <Target className="mr-1 h-3 w-3" />
              Projetos
            </Button>
            <Button 
              variant={filterCenterType === 'person' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterCenterType(filterCenterType === 'person' ? null : 'person')}
            >
              <User className="mr-1 h-3 w-3" />
              Pessoas
            </Button>
            <Button 
              variant={filterCenterType === 'brand' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterCenterType(filterCenterType === 'brand' ? null : 'brand')}
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

        {/* Lista de Flows */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {filteredFlows.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum flow encontrado</p>
              </div>
            ) : (
              filteredFlows.map(flow => {
                const stats = getFlowStats(flow);
                const centerNode = getCenterNode(flow);

                return (
                  <div key={flow.id} className="bg-secondary/50 rounded-lg p-3 space-y-2 hover:bg-secondary/70 transition-colors">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        {getCenterIcon(flow.center_type)}
                        {flow.name}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {getCenterTypeLabel(flow.center_type)}
                      </Badge>
                    </div>

                    {centerNode && (
                      <p className="text-xs text-muted-foreground">
                        Centro: {centerNode.name}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>👥 {stats.connectedPeople}</span>
                      <span>🏢 {stats.connectedBrands}</span>
                      <span>📋 {stats.connectedProjects}</span>
                      <span className="font-semibold">Total: {stats.totalNodes}</span>
                    </div>

                    <div className="flex gap-1 pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onFlowFocus(flow.center_id)}
                        className="flex-1"
                      >
                        <MapPin className="mr-1 h-3 w-3" />
                        Ver Flow
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
