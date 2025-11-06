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
      // Limpar layout salvo localmente
      try { localStorage.removeItem('networkDesign'); } catch {}

      // Passo 1: deletar conexões e tabelas de junção primeiro (evitar FKs)
      const [connRes, projWfRes, personWfRes, brandWfRes] = await Promise.all([
        supabase.from('connections').delete().eq('user_id', userId),
        supabase.from('project_workflows').delete(), // RLS garante que só apaga as suas
        supabase.from('person_workflows').delete(),  // RLS garante que só apaga as suas
        supabase.from('brand_workflows').delete(),   // RLS garante que só apaga as suas
      ]);
      if (connRes.error) throw connRes.error;
      if (projWfRes.error) throw projWfRes.error;
      if (personWfRes.error) throw personWfRes.error;
      if (brandWfRes.error) throw brandWfRes.error;

      // Passo 2: deletar workflows do usuário
      const { error: workflowsError } = await supabase
        .from('workflows')
        .delete()
        .eq('user_id', userId);
      if (workflowsError) throw workflowsError;

      // Passo 3: deletar nós (projetos, pessoas, marcas) em paralelo
      const [peopleRes, brandsRes, projectsRes] = await Promise.all([
        supabase.from('people').delete().eq('user_id', userId),
        supabase.from('brands').delete().eq('user_id', userId),
        supabase.from('projects').delete().eq('user_id', userId),
      ]);
      if (peopleRes.error) throw peopleRes.error;
      if (brandsRes.error) throw brandsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      // Passo 4: deletar flows por último
      const { error: flowsError } = await supabase
        .from('flows')
        .delete()
        .eq('user_id', userId);
      if (flowsError) throw flowsError;

      toast.success('Rede resetada com sucesso!');
      onResetComplete();
    } catch (error: any) {
      console.error('Erro ao resetar rede:', error);
      toast.error('Erro ao resetar rede', {
        description: error?.message || 'Tente novamente em instantes.'
      });
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
