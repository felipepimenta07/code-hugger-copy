import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface NodeCreationModalProps {
  getAllCategories: (type: string) => string[];
  onClose: () => void;
  onCreate: (nodeData: any) => void;
  editingNode?: any;
  isCreatingFlow?: boolean;
  defaultType?: 'person' | 'project' | 'brand';
}

const TYPE_OPTIONS = [
  { value: 'person' as const, emoji: '👤', label: 'Pessoa' },
  { value: 'project' as const, emoji: '🎯', label: 'Projeto' },
  { value: 'brand' as const, emoji: '🏢', label: 'Marca/Local' },
];

export const NodeCreationModal: React.FC<NodeCreationModalProps> = ({
  getAllCategories,
  onClose,
  onCreate,
  editingNode,
  isCreatingFlow = false,
  defaultType = 'person',
}) => {
  const [nodeType, setNodeType] = useState<'person' | 'project' | 'brand'>(editingNode?.type || defaultType);
  const [name, setName] = useState(editingNode?.name || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    editingNode?.category ? editingNode.category.split(',').map((c: string) => c.trim()).filter(Boolean) : []
  );
  const [email, setEmail] = useState(editingNode?.email || '');
  const [company, setCompany] = useState(editingNode?.company || '');
  const [website, setWebsite] = useState(editingNode?.website || '');
  const [notes, setNotes] = useState(editingNode?.notes || '');

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleCreate = () => {
    const nodeData: any = {
      name: name.trim() || 'Novo Nó',
      nodeType,
      category: selectedCategories.join(', ') || null,
    };

    if (notes) nodeData.notes = notes;

    if (nodeType === 'person') {
      if (email) nodeData.email = email;
      if (company) nodeData.company = company;
    } else if (nodeType === 'project') {
      nodeData.projectStatus = 'ativo';
    } else if (nodeType === 'brand') {
      if (website) nodeData.website = website;
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

  const categories = getAllCategories(nodeType);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[420px] max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border"
        onKeyDown={handleKeyDown}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-base">
            {isCreatingFlow ? 'Criar Novo Flow' : editingNode ? 'Editar Nó' : 'Criar Nó'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Type selector */}
          {!editingNode && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
                Tipo
              </Label>
              <div className="flex gap-2">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setNodeType(opt.value); setSelectedCategories([]); }}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all border ${
                      nodeType === opt.value
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-secondary/40 text-muted-foreground border-border/30 hover:bg-secondary/60'
                    }`}
                  >
                    <span className="mr-1.5">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
              Nome
            </Label>
            <Input
              ref={nameInputRef}
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={nodeType === 'person' ? 'Nome da pessoa...' : nodeType === 'project' ? 'Nome do projeto...' : 'Nome da marca/local...'}
              className="bg-secondary/50 border-border/30 rounded-xl"
            />
          </div>

          {/* Categories - multi-select chips */}
          {categories.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
                Classificação <span className="text-muted-foreground/60">(pode escolher várias)</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      selectedCategories.includes(cat)
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-secondary/30 text-muted-foreground border-border/20 hover:bg-secondary/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conditional fields */}
          {nodeType === 'person' && (
            <>
              <div>
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                  Email <span className="text-muted-foreground/60">(opcional)</span>
                </Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com" className="bg-secondary/50 border-border/30 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="company" className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                  Empresa <span className="text-muted-foreground/60">(opcional)</span>
                </Label>
                <Input id="company" type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nome da empresa" className="bg-secondary/50 border-border/30 rounded-xl" />
              </div>
            </>
          )}

          {nodeType === 'brand' && (
            <div>
              <Label htmlFor="website" className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                Website <span className="text-muted-foreground/60">(opcional)</span>
              </Label>
              <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..." className="bg-secondary/50 border-border/30 rounded-xl" />
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
              Notas <span className="text-muted-foreground/60">(opcional)</span>
            </Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais..." className="bg-secondary/50 border-border/30 rounded-xl min-h-[60px] resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleCreate} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
            {isCreatingFlow ? 'Criar Flow' : editingNode ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
