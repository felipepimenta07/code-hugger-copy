import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const WhatsAppNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('whatsapp_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new;
          
          toast.success(notification.title, {
            description: notification.message,
            duration: 5000,
            action: {
              label: 'Ver',
              onClick: () => {
                console.log('Viewing notification:', notification.data);
              }
            }
          });

          supabase
            .from('whatsapp_notifications')
            .update({ is_read: true })
            .eq('id', notification.id)
            .then();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
};
