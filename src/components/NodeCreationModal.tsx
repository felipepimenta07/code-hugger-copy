import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface NodeCreationModalProps {
  type: 'person' | 'project' | 'brand';
  getAllCategories: (type: string) => string[];
  onClose: () => void;
  onCreate: (nodeData: any) => void;
  editingNode?: any;
}

export const NodeCreationModal: React.FC<NodeCreationModalProps> = ({
  type,
  getAllCategories,
  onClose,
  onCreate,
  editingNode
}) => {
  const [name, setName] = useState(editingNode?.name || '');
  const [category, setCategory] = useState(editingNode?.category || '');
  const [email, setEmail] = useState(editingNode?.email || '');
  const [company, setCompany] = useState(editingNode?.company || '');
  const [role, setRole] = useState(editingNode?.role || '');
  const [status, setStatus] = useState(editingNode?.projectStatus || '');
  const [startDate, setStartDate] = useState(editingNode?.startDate || '');
  const [website, setWebsite] = useState(editingNode?.website || '');
  const [location, setLocation] = useState(editingNode?.location || '');
  const [notes, setNotes] = useState(editingNode?.notes || '');
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus no campo nome quando o modal abre
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, []);

  const handleCreate = () => {
    const nodeData: any = {
      name: name.trim() || 'Novo Nó',
    };

    if (category) nodeData.category = category;
    if (notes) nodeData.notes = notes;

    // Campos específicos por tipo
    if (type === 'person') {
      if (email) nodeData.email = email;
      if (company) nodeData.company = company;
      if (role) nodeData.role = role;
    } else if (type === 'project') {
      if (status) nodeData.projectStatus = status;
      if (startDate) nodeData.startDate = startDate;
    } else if (type === 'brand') {
      if (website) nodeData.website = website;
      if (location) nodeData.location = location;
    }

    onCreate(nodeData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const typeConfig = {
    person: { emoji: '👤', label: 'Pessoa', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    project: { emoji: '🎯', label: 'Projeto', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
    brand: { emoji: '🏢', label: 'Marca/Local', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
  };

  const config = typeConfig[type];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[440px] max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={`${config.color} border px-3 py-1`}>
                <span className="mr-1.5">{config.emoji}</span>
                {editingNode ? 'Editar' : 'Criar'} {config.label}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-foreground mb-1.5 block">
              Nome
            </Label>
            <Input
              ref={nameInputRef}
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome..."
              className="bg-secondary border-border rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-sm font-medium text-foreground mb-1.5 block">
              Categoria
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-secondary border-border rounded-xl">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {getAllCategories(type).map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'person' && (
            <>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground mb-1.5 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="bg-secondary border-border rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="company" className="text-sm font-medium text-foreground mb-1.5 block">
                  Empresa
                </Label>
                <Input
                  id="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nome da empresa"
                  className="bg-secondary border-border rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="role" className="text-sm font-medium text-foreground mb-1.5 block">
                  Cargo
                </Label>
                <Input
                  id="role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Cargo ou função"
                  className="bg-secondary border-border rounded-xl"
                />
              </div>
            </>
          )}

          {type === 'project' && (
            <>
              <div>
                <Label htmlFor="status" className="text-sm font-medium text-foreground mb-1.5 block">
                  Status
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-secondary border-border rounded-xl">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejamento">Planejamento</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate" className="text-sm font-medium text-foreground mb-1.5 block">
                  Data de Início
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-secondary border-border rounded-xl"
                />
              </div>
            </>
          )}

          {type === 'brand' && (
            <>
              <div>
                <Label htmlFor="website" className="text-sm font-medium text-foreground mb-1.5 block">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="bg-secondary border-border rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="location" className="text-sm font-medium text-foreground mb-1.5 block">
                  Localização
                </Label>
                <Input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Cidade, Estado"
                  className="bg-secondary border-border rounded-xl"
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-foreground mb-1.5 block">
              Notas
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais..."
              className="bg-secondary border-border rounded-xl min-h-[80px] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {editingNode ? 'Salvar Alterações' : 'Criar Nó'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
