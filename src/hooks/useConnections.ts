import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useConnections = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(c => ({ ...c, from: c.from_id, to: c.to_id, type: c.connection_type }));
    },
    enabled: !!user
  });

  const createConnection = useMutation({
    mutationFn: async (connection: any) => {
      const { data, error } = await supabase
        .from('connections')
        .insert({ 
          from_id: connection.from,
          to_id: connection.to,
          from_type: connection.fromType || 'person',
          to_type: connection.toType || 'person',
          connection_type: connection.type || 'strong',
          user_id: user!.id 
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: () => toast.error('Erro ao criar conexão')
  });

  const deleteConnection = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    }
  });

  return {
    connections,
    isLoading,
    createConnection,
    deleteConnection
  };
};
