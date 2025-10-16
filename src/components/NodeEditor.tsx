import React, { useState } from 'react';
import { X, Target, User, Building2, Plus, Trash2 } from 'lucide-react';

interface NodeEditorProps {
  node: any;
  getAllCategories: (type: string) => string[];
  addCustomCategory: (type: string, category: string) => boolean;
  onUpdate: (field: string, value: any) => void;
  onClose: () => void;
  onDelete: () => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({
  node,
  getAllCategories,
  addCustomCategory,
  onUpdate,
  onClose,
  onDelete
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const categories = getAllCategories(node.type);

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
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Nome</label>
          <input 
            type="text" 
            value={node.name} 
            onChange={(e) => onUpdate('name', e.target.value)}
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Categoria</label>
          {!showCustomCategory ? (
            <select 
              value={node.category || ''} 
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setShowCustomCategory(true);
                } else {
                  onUpdate('category', e.target.value);
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
                    onUpdate('category', newCategory);
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
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Email</label>
              <input 
                type="email" 
                value={node.email || ''} 
                onChange={(e) => onUpdate('email', e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Empresa</label>
              <input 
                type="text" 
                value={node.company || ''} 
                onChange={(e) => onUpdate('company', e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Cargo</label>
              <input 
                type="text" 
                value={node.role || ''} 
                onChange={(e) => onUpdate('role', e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        )}

        {node.type === 'project' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Status</label>
              <select 
                value={node.projectStatus || 'planejamento'} 
                onChange={(e) => onUpdate('projectStatus', e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="planejamento">Planejamento</option>
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Data de Início</label>
              <input 
                type="date" 
                value={node.startDate || ''} 
                onChange={(e) => onUpdate('startDate', e.target.value)}
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
                value={node.website || ''} 
                onChange={(e) => onUpdate('website', e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Localização</label>
              <input 
                type="text" 
                value={node.location || ''} 
                onChange={(e) => onUpdate('location', e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Notas</label>
          <textarea 
            value={node.notes || ''} 
            onChange={(e) => onUpdate('notes', e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <button 
          onClick={onDelete}
          className="w-full px-4 py-3 bg-destructive/20 text-destructive-foreground rounded-xl hover:bg-destructive/30 transition-all flex items-center justify-center gap-2 font-medium">
          <Trash2 size={18} />
          Deletar Nó
        </button>
      </div>
    </div>
  );
};
