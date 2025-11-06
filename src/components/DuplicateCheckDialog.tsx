import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, User, Building2, Briefcase } from 'lucide-react';

interface DuplicateCheckDialogProps {
  open: boolean;
  existingNode: any;
  nodeType: 'person' | 'project' | 'brand';
  onConfirmSame: () => void;
  onConfirmDifferent: () => void;
  onCancel: () => void;
}

export const DuplicateCheckDialog: React.FC<DuplicateCheckDialogProps> = ({
  open,
  existingNode,
  nodeType,
  onConfirmSame,
  onConfirmDifferent,
  onCancel
}) => {
  const getIcon = () => {
    switch (nodeType) {
      case 'person': return <User className="h-5 w-5" />;
      case 'brand': return <Building2 className="h-5 w-5" />;
      case 'project': return <Briefcase className="h-5 w-5" />;
    }
  };

  const getTypeLabel = () => {
    switch (nodeType) {
      case 'person': return 'contato';
      case 'brand': return 'marca';
      case 'project': return 'projeto';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTypeLabel().charAt(0).toUpperCase() + getTypeLabel().slice(1)} Duplicado Encontrado
          </DialogTitle>
          <DialogDescription>
            Já existe um {getTypeLabel()} com o nome "{existingNode?.name}" em outro flow.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
            <p className="font-semibold text-sm">Informações do {getTypeLabel()} existente:</p>
            <div className="text-sm text-muted-foreground space-y-1">
              {nodeType === 'person' && (
                <>
                  {existingNode?.email && <p>📧 Email: {existingNode.email}</p>}
                  {existingNode?.company && <p>🏢 Empresa: {existingNode.company}</p>}
                  {existingNode?.phone && <p>📱 Telefone: {existingNode.phone}</p>}
                </>
              )}
              {nodeType === 'brand' && existingNode?.website && (
                <p>🌐 Website: {existingNode.website}</p>
              )}
              {existingNode?.category && <p>📂 Categoria: {existingNode.category}</p>}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium mb-2">É o mesmo {getTypeLabel()}?</p>
            <p className="text-xs text-muted-foreground">
              Se for o mesmo {getTypeLabel()}, criaremos uma cópia vinculada neste flow. 
              Isso permite que você trabalhe com o mesmo {getTypeLabel()} em diferentes contextos.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            variant="secondary" 
            onClick={onConfirmDifferent}
            className="flex-1"
          >
            Não, é diferente
          </Button>
          <Button 
            onClick={onConfirmSame}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Sim, criar cópia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
