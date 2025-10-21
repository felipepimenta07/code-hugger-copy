import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const usePeople = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['people', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(p => ({ ...p, type: 'person' }));
    },
    enabled: !!user
  });

  const createPerson = useMutation({
    mutationFn: async (person: any) => {
      if (!user) throw new Error('No user');
      const { data, error } = await supabase
        .from('people')
        .insert({ ...person, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Pessoa criada!');
    },
    onError: () => toast.error('Erro ao criar pessoa')
  });

  const updatePerson = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('people')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    }
  });

  const deletePerson = useMutation({
    mutationFn: async (id: number) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Pessoa deletada');
    }
  });

  return { people, isLoading, createPerson, updatePerson, deletePerson };
};
