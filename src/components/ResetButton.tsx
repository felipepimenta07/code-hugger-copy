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

      const sb = supabase as any;

      // Passo 1: Buscar IDs do usuário para filtrar as tabelas de junção
      const [projectsRes, peopleRes, brandsRes, workflowsRes] = await Promise.all([
        sb.from('projects').select('id').eq('user_id', userId),
        sb.from('people').select('id').eq('user_id', userId),
        sb.from('brands').select('id').eq('user_id', userId),
        sb.from('workflows').select('id').eq('user_id', userId),
      ]);

      const projectIds = (projectsRes.data || []).map((r: any) => r.id);
      const personIds = (peopleRes.data || []).map((r: any) => r.id);
      const brandIds = (brandsRes.data || []).map((r: any) => r.id);
      const workflowIds = (workflowsRes.data || []).map((r: any) => r.id);

      // Passo 2: Deletar conexões do usuário
      const { error: connError } = await sb.from('connections').delete().eq('user_id', userId);
      if (connError) throw connError;

      // Passo 3: Deletar tabelas de junção filtrando pelos IDs do usuário (seguro)
      const junctionDeletes = [];
      if (projectIds.length > 0) {
        junctionDeletes.push(
          sb.from('project_workflows').delete().in('project_id', projectIds)
        );
      }
      if (personIds.length > 0) {
        junctionDeletes.push(
          sb.from('person_workflows').delete().in('person_id', personIds)
        );
      }
      if (brandIds.length > 0) {
        junctionDeletes.push(
          sb.from('brand_workflows').delete().in('brand_id', brandIds)
        );
      }
      if (junctionDeletes.length > 0) {
        const junctionResults = await Promise.all(junctionDeletes);
        for (const res of junctionResults) {
          if (res.error) throw res.error;
        }
      }

      // Passo 4: Deletar workflows do usuário
      if (workflowIds.length > 0) {
        const { error: workflowsError } = await sb.from('workflows').delete().eq('user_id', userId);
        if (workflowsError) throw workflowsError;
      }

      // Passo 5: Deletar nós (projetos, pessoas, marcas) em paralelo
      const [pRes, bRes, prRes] = await Promise.all([
        sb.from('people').delete().eq('user_id', userId),
        sb.from('brands').delete().eq('user_id', userId),
        sb.from('projects').delete().eq('user_id', userId),
      ]);
      if (pRes.error) throw pRes.error;
      if (bRes.error) throw bRes.error;
      if (prRes.error) throw prRes.error;

      // Passo 6: Deletar flows por último
      const { error: flowsError } = await sb.from('flows').delete().eq('user_id', userId);
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
