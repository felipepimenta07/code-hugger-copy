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
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      return (data || []).map(conn => ({
        ...conn,
        from: conn.from_id,
        to: conn.to_id,
        type: conn.connection_type
      }));
    },
    enabled: !!user
  });

  const createConnection = useMutation({
    mutationFn: async (connection: any) => {
      if (!user) throw new Error('No user');
      const { data, error } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          from_id: connection.from,
          to_id: connection.to,
          from_type: connection.fromType,
          to_type: connection.toType,
          connection_type: connection.type || 'strong'
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Conexão criada!');
    }
  });

  const deleteConnection = useMutation({
    mutationFn: async (id: number) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Conexão deletada');
    }
  });

  return { connections, isLoading, createConnection, deleteConnection };
};
