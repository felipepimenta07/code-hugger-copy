import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useOnboarding = () => {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data && !data.onboarding_completed) {
          setShowTour(true);
        }
      } catch (error) {
        console.error('Erro ao verificar onboarding:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [user]);

  const completeTour = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) throw error;
      setShowTour(false);
    } catch (error) {
      console.error('Erro ao completar onboarding:', error);
    }
  };

  const reopenTour = () => {
    setShowTour(true);
  };

  return { showTour, loading, completeTour, reopenTour };
};
