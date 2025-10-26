import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ResetButtonProps {
  onResetComplete: () => void;
  userId: string;
}

export const ResetButton: React.FC<ResetButtonProps> = ({ onResetComplete, userId }) => {
  const [isResetting, setIsResetting] = useState(false);

  const resetNetwork = async () => {
    setIsResetting(true);
    
    try {
      // Deletar em ordem correta (respeitar foreign keys)
      // 1. Deletar conexões primeiro
      const { error: connectionsError } = await supabase
        .from('connections')
        .delete()
        .eq('user_id', userId)
        .neq('id', 0);
      
      if (connectionsError) throw connectionsError;

      // 2. Deletar flows
      const { error: flowsError } = await supabase
        .from('flows')
        .delete()
        .eq('user_id', userId)
        .neq('id', 0);
      
      if (flowsError) throw flowsError;

      // 3. Deletar projetos
      const { error: projectsError } = await supabase
        .from('projects')
        .delete()
        .eq('user_id', userId)
        .neq('id', 0);
      
      if (projectsError) throw projectsError;

      // 4. Deletar pessoas
      const { error: peopleError } = await supabase
        .from('people')
        .delete()
        .eq('user_id', userId)
        .neq('id', 0);
      
      if (peopleError) throw peopleError;

      // 5. Deletar marcas
      const { error: brandsError } = await supabase
        .from('brands')
        .delete()
        .eq('user_id', userId)
        .neq('id', 0);
      
      if (brandsError) throw brandsError;

      // 6. Deletar workflows
      const { error: workflowsError } = await supabase
        .from('workflows')
        .delete()
        .eq('user_id', userId)
        .neq('id', 0);
      
      if (workflowsError) throw workflowsError;

      toast.success('Rede resetada com sucesso!');
      onResetComplete();
    } catch (error) {
      console.error('Erro ao resetar rede:', error);
      toast.error('Erro ao resetar rede');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-24 z-40 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/50"
          disabled={isResetting}
        >
          {isResetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetando...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Resetar Tudo
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resetar Rede Completa?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá deletar permanentemente:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Todos os projetos e flows</li>
              <li>Todas as pessoas e marcas</li>
              <li>Todas as conexões</li>
              <li>Todos os workflows</li>
            </ul>
            <p className="mt-4 font-semibold text-destructive">
              Esta ação não pode ser desfeita!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={resetNetwork}
            className="bg-destructive hover:bg-destructive/90"
          >
            Sim, resetar tudo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
