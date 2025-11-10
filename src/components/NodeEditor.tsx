import React, { useState, useEffect } from 'react';
import { X, Target, User, Building2, Plus, Trash2, Upload, ImageIcon, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface NodeEditorProps {
  node: any;
  getAllCategories: (type: string) => string[];
  addCustomCategory: (type: string, category: string) => boolean;
  onUpdate: (field: string, value: any) => void;
  onClose: () => void;
  onDelete: () => void;
  onConfirm?: () => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({
  node,
  getAllCategories,
  addCustomCategory,
  onUpdate,
  onClose,
  onDelete,
  onConfirm
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const categories = getAllCategories(node.type);

  // Estado local para armazenar mudanças antes de confirmar
  const [localChanges, setLocalChanges] = useState<any>({});
  const [imagePreview, setImagePreview] = useState<string>(node.imageUrl || '');

  // Resetar mudanças locais quando o nó mudar
  useEffect(() => {
    setLocalChanges({});
    setImagePreview(node.imageUrl || '');
  }, [node.id]);

  const handleLocalUpdate = (field: string, value: any) => {
    setLocalChanges((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    // Aplicar todas as mudanças locais
    Object.entries(localChanges).forEach(([field, value]) => {
      onUpdate(field, value);
    });
    if (onConfirm) {
      onConfirm();
    }
  };

  const getCurrentValue = (field: string) => {
    return localChanges.hasOwnProperty(field) ? localChanges[field] : node[field];
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        handleLocalUpdate('imageUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-96 bg-card/95 backdrop-blur-xl border-l border-border p-6 overflow-y-auto h-full shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold ${
          node.type === 'project' ? 'bg-[hsl(var(--node-project))]/20 text-[hsl(var(--node-project))] border border-[hsl(var(--node-project))]/50' :
          node.type === 'person' ? 'bg-[hsl(var(--node-person))]/20 text-[hsl(var(--node-person))] border border-[hsl(var(--node-person))]/50' : 
          'bg-[hsl(var(--node-brand))]/20 text-[hsl(var(--node-brand))] border border-[hsl(var(--node-brand))]/50'
        }`}>
          {node.type === 'project' ? <Target size={16} /> : node.type === 'person' ? <User size={16} /> : <Building2 size={16} />}
          {node.type === 'project' ? 'Projeto' : node.type === 'person' ? 'Pessoa' : 'Marca'}
        </div>
        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl text-muted-foreground">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 pb-5 border-b border-border">
          <Avatar className="h-24 w-24">
            <AvatarImage src={imagePreview} alt={getCurrentValue('name')} />
            <AvatarFallback className="bg-secondary text-2xl">
              {node.type === 'project' ? <Target size={32} /> : node.type === 'person' ? <User size={32} /> : <Building2 size={32} />}
            </AvatarFallback>
          </Avatar>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-medium transition-colors">
              <Upload size={16} />
              {imagePreview ? 'Alterar Foto' : 'Adicionar Foto'}
            </div>
          </label>
          {imagePreview && (
            <button
              onClick={() => {
                setImagePreview('');
                handleLocalUpdate('imageUrl', '');
              }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Remover foto
            </button>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Nome</label>
          <input 
            type="text" 
            value={getCurrentValue('name')} 
            onChange={(e) => handleLocalUpdate('name', e.target.value)}
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Categoria</label>
          {!showCustomCategory ? (
            <select 
              value={getCurrentValue('category') || ''} 
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setShowCustomCategory(true);
                } else {
                  handleLocalUpdate('category', e.target.value);
                }
              }}
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Selecione...</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              <option value="__custom__">+ Criar nova</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nova categoria"
                className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button 
                onClick={() => {
                  if (addCustomCategory(node.type, newCategory)) {
                    handleLocalUpdate('category', newCategory);
                    setNewCategory('');
                    setShowCustomCategory(false);
                  }
                }}
                className="px-3 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90">
                <Plus size={18} />
              </button>
              <button 
                onClick={() => { setShowCustomCategory(false); setNewCategory(''); }} 
                className="px-3 py-2.5 bg-secondary text-foreground rounded-xl hover:bg-secondary/80">
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {node.type === 'person' && (
          <>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</label>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Telefone Principal</label>
                  <input 
                    type="tel" 
                    value={getCurrentValue('phone') || ''} 
                    onChange={(e) => handleLocalUpdate('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Telefone Secundário</label>
                  <input 
                    type="tel" 
                    value={getCurrentValue('phone_secondary') || ''} 
                    onChange={(e) => handleLocalUpdate('phone_secondary', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Telefone Comercial</label>
                  <input 
                    type="tel" 
                    value={getCurrentValue('phone_work') || ''} 
                    onChange={(e) => handleLocalUpdate('phone_work', e.target.value)}
                    placeholder="(00) 0000-0000"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email Principal</label>
                  <input 
                    type="email" 
                    value={getCurrentValue('email') || ''} 
                    onChange={(e) => handleLocalUpdate('email', e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email Secundário</label>
                  <input 
                    type="email" 
                    value={getCurrentValue('email_secondary') || ''} 
                    onChange={(e) => handleLocalUpdate('email_secondary', e.target.value)}
                    placeholder="email2@exemplo.com"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profissional</label>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Empresa</label>
                  <input 
                    type="text" 
                    value={getCurrentValue('company') || ''} 
                    onChange={(e) => handleLocalUpdate('company', e.target.value)}
                    placeholder="Nome da empresa"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Cargo</label>
                  <input 
                    type="text" 
                    value={getCurrentValue('role') || ''} 
                    onChange={(e) => handleLocalUpdate('role', e.target.value)}
                    placeholder="Cargo ou função"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Departamento</label>
                  <input 
                    type="text" 
                    value={getCurrentValue('department') || ''} 
                    onChange={(e) => handleLocalUpdate('department', e.target.value)}
                    placeholder="Departamento"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outros Detalhes</label>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Website</label>
                  <input 
                    type="url" 
                    value={getCurrentValue('website') || ''} 
                    onChange={(e) => handleLocalUpdate('website', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {getCurrentValue('website') && (
                    <a 
                      href={getCurrentValue('website')} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      Abrir website →
                    </a>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Endereço</label>
                  <textarea 
                    value={getCurrentValue('address') || ''} 
                    onChange={(e) => handleLocalUpdate('address', e.target.value)}
                    rows={2}
                    placeholder="Endereço completo"
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Data de Aniversário</label>
                  <input 
                    type="date" 
                    value={getCurrentValue('birthday') || ''} 
                    onChange={(e) => handleLocalUpdate('birthday', e.target.value)}
                    className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {node.type === 'project' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Status</label>
              <select 
                value={getCurrentValue('status') || 'ativo'} 
                onChange={(e) => handleLocalUpdate('status', e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="planejamento">Planejamento</option>
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Prazo</label>
              <input 
                type="date" 
                value={getCurrentValue('deadline') || ''} 
                onChange={(e) => handleLocalUpdate('deadline', e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        )}

        {node.type === 'brand' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Website</label>
              <input 
                type="url" 
                value={getCurrentValue('website') || ''} 
                onChange={(e) => handleLocalUpdate('website', e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Localização</label>
              <input 
                type="text" 
                value={getCurrentValue('location') || ''} 
                onChange={(e) => handleLocalUpdate('location', e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Notas</label>
          <textarea 
            value={getCurrentValue('notes') || ''} 
            onChange={(e) => handleLocalUpdate('notes', e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <Button 
          onClick={handleConfirm}
          className="w-full py-6 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 font-semibold text-base"
          disabled={Object.keys(localChanges).length === 0}
        >
          <Check size={20} />
          Confirmar Alterações
        </Button>

        <button 
          onClick={onDelete}
          className="w-full px-4 py-2.5 text-sm bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all flex items-center justify-center gap-2 font-medium">
          <Trash2 size={16} />
          Deletar Nó (Del)
        </button>
      </div>
    </div>
  );
};
