import React, { useState } from 'react';
import { Target, X, Search, Plus, Edit, Trash2, MapPin, Filter, ArrowUpDown, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';

interface Project {
  id: number;
  name: string;
  type: 'project';
  category: string;
  status?: string;
  deadline?: string;
  workflows: number[];
  x: number;
  y: number;
}

interface ProjectManagerPanelProps {
  projects: Project[];
  workflows: any[];
  people: any[];
  brands: any[];
  connections: any[];
  onProjectUpdate: (id: number, data: Partial<Project>) => void;
  onProjectDelete: (id: number) => void;
  onProjectCreate: (data: Omit<Project, 'id'>) => void;
  onFocusProject: (id: number) => void;
  onClose: () => void;
}

export const ProjectManagerPanel: React.FC<ProjectManagerPanelProps> = ({
  projects,
  workflows,
  people,
  brands,
  connections,
  onProjectUpdate,
  onProjectDelete,
  onProjectCreate,
  onFocusProject,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'M',
    status: 'ativo',
    deadline: '',
    workflows: [] as number[]
  });

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      category: project.category,
      status: project.status || 'ativo',
      deadline: project.deadline || '',
      workflows: project.workflows
    });
  };

  const openCreateDialog = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      category: 'M',
      status: 'ativo',
      deadline: '',
      workflows: []
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome do flow é obrigatório');
      return;
    }

    if (isCreating) {
      onProjectCreate({
        ...formData,
        type: 'project',
        x: 700,
        y: 500
      });
      toast.success('Flow criado!');
    } else if (editingProject) {
      onProjectUpdate(editingProject.id, formData);
      toast.success('Flow atualizado!');
    }

    setEditingProject(null);
    setIsCreating(false);
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Tem certeza que deseja deletar o flow "${name}"?`)) {
      onProjectDelete(id);
      toast.success('Flow deletado');
    }
  };

  const toggleWorkflow = (workflowId: number) => {
    setFormData(prev => ({
      ...prev,
      workflows: prev.workflows.includes(workflowId)
        ? prev.workflows.filter(id => id !== workflowId)
        : [...prev.workflows, workflowId]
    }));
  };

  const getProjectStats = (project: Project) => {
    const connectedPeople = connections.filter((c: any) => 
      (c.from === project.id && people.find((p: any) => p.id === c.to)) ||
      (c.to === project.id && people.find((p: any) => p.id === c.from))
    ).length;

    const connectedBrands = connections.filter((c: any) => 
      (c.from === project.id && brands.find((b: any) => b.id === c.to)) ||
      (c.to === project.id && brands.find((b: any) => b.id === c.from))
    ).length;

    return { connectedPeople, connectedBrands };
  };

  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !filterStatus || project.status === filterStatus;
      const matchesCategory = !filterCategory || project.category === filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // Sort by ID as proxy for creation date (lower ID = older)
      if (sortBy === 'oldest') {
        return a.id - b.id;
      }
      // newest first
      return b.id - a.id;
    });

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case 'G': return 'destructive';
      case 'M': return 'default';
      case 'P': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string = 'ativo') => {
    switch (status) {
      case 'ativo': return 'text-green-500';
      case 'pausado': return 'text-yellow-500';
      case 'concluído': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <>
      <div className="fixed left-0 top-0 h-full w-[400px] bg-background border-r border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-bold">Flows</h2>
            <Badge variant="secondary">{projects.length}</Badge>
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
              variant={filterCategory === null ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterCategory(null)}
            >
              Todos
            </Button>
            <Button 
              variant={filterCategory === 'P' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterCategory(filterCategory === 'P' ? null : 'P')}
            >
              P
            </Button>
            <Button 
              variant={filterCategory === 'M' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterCategory(filterCategory === 'M' ? null : 'M')}
            >
              M
            </Button>
            <Button 
              variant={filterCategory === 'G' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterCategory(filterCategory === 'G' ? null : 'G')}
            >
              G
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

          <Button onClick={openCreateDialog} className="w-full" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Novo Flow
          </Button>
        </div>

        {/* Lista de Projetos */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {filteredProjects.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum flow encontrado</p>
              </div>
            ) : (
              filteredProjects.map(project => {
                const stats = getProjectStats(project);

                const projectWorkflows = workflows.filter((w: any) => (project.workflows || []).includes(w.id));

                return (
                  <div key={project.id} className="bg-secondary/50 rounded-lg p-3 space-y-2 hover:bg-secondary/70 transition-colors">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        {project.name}
                        <Badge variant={getCategoryBadgeVariant(project.category)}>
                          {project.category}
                        </Badge>
                      </h3>
                      <span className={`text-xs font-medium ${getStatusColor(project.status)}`}>
                        ● {project.status || 'ativo'}
                      </span>
                    </div>

                    {project.deadline && (
                      <p className="text-xs text-muted-foreground">
                        📅 {new Date(project.deadline).toLocaleDateString('pt-BR')}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {projectWorkflows.map((w: any) => (
                        <Badge 
                          key={w.id} 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: w.color, color: w.color }}
                        >
                          {w.name}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>👥 {stats.connectedPeople}</span>
                      <span>🏢 {stats.connectedBrands}</span>
                    </div>

                    <div className="flex gap-1 pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onFocusProject(project.id)}
                        className="flex-1"
                      >
                        <MapPin className="mr-1 h-3 w-3" />
                        Ver Flow
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditDialog(project)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(project.id, project.name)}
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

      {/* Dialog de Edição/Criação */}
      <Dialog open={editingProject !== null || isCreating} onOpenChange={() => { setEditingProject(null); setIsCreating(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Criar Flow' : `Editar: ${editingProject?.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome do Flow</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do flow"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="P">P - Pequeno</option>
                  <option value="M">M - Médio</option>
                  <option value="G">G - Grande</option>
                </select>
              </div>

              <div>
                <Label>Status</Label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ativo">Ativo</option>
                  <option value="pausado">Pausado</option>
                  <option value="concluído">Concluído</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Deadline (opcional)</Label>
              <Input 
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>

            <div>
              <Label>Aparece nos Workflows</Label>
              <div className="space-y-2 mt-2">
                {workflows.map((w: any) => (
                  <div key={w.id} className="flex items-center space-x-2">
                    <Checkbox 
                      checked={formData.workflows.includes(w.id)}
                      onCheckedChange={() => toggleWorkflow(w.id)}
                    />
                    <label className="text-sm flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: w.color }}
                      />
                      {w.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => { setEditingProject(null); setIsCreating(false); }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1">
                {isCreating ? 'Criar' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
