import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useBrands = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(b => ({ ...b, type: 'brand' }));
    },
    enabled: !!user
  });

  const createBrand = useMutation({
    mutationFn: async (brand: any) => {
      const { data, error } = await supabase
        .from('brands')
        .insert({ ...brand, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Marca criada!');
    },
    onError: () => toast.error('Erro ao criar marca')
  });

  const updateBrand = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from('brands')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    }
  });

  const deleteBrand = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Marca deletada');
    }
  });

  return {
    brands,
    isLoading,
    createBrand,
    updateBrand,
    deleteBrand
  };
};
