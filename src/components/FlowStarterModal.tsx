import React from 'react';
import { Target, User, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FlowStarterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'project' | 'person' | 'brand') => void;
}

export const FlowStarterModal: React.FC<FlowStarterModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelectType 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-2 border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            Começar meu flow com:
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-4 p-6">
          {/* Projeto */}
          <button
            onClick={() => onSelectType('project')}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-border bg-secondary/50 hover:bg-secondary hover:border-blue-500 transition-all group"
          >
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
              <Target className="w-10 h-10 text-blue-500" />
            </div>
            <span className="text-foreground font-semibold">Projeto</span>
          </button>
          
          {/* Pessoa */}
          <button
            onClick={() => onSelectType('person')}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-border bg-secondary/50 hover:bg-secondary hover:border-purple-500 transition-all group"
          >
            <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-all">
              <User className="w-10 h-10 text-purple-500" />
            </div>
            <span className="text-foreground font-semibold">Pessoa</span>
          </button>
          
          {/* Empresa/Marca */}
          <button
            onClick={() => onSelectType('brand')}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-border bg-secondary/50 hover:bg-secondary hover:border-pink-500 transition-all group"
          >
            <div className="w-20 h-20 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/30 transition-all">
              <Building2 className="w-10 h-10 text-pink-500" />
            </div>
            <span className="text-foreground font-semibold">Empresa</span>
          </button>
        </div>
        
        <p className="text-center text-muted-foreground text-sm pb-4">
          Escolha o tipo de nó central para o seu novo flow de projetos
        </p>
      </DialogContent>
    </Dialog>
  );
};
