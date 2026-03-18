import { useState } from 'react';
import { NetworkMatrix } from '@/components/NetworkMatrix';
import { WhatsAppDialog } from '@/components/WhatsAppDialog';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { signOut } = useAuth();
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair');
    }
  };

  return (
    <div className="relative h-screen w-screen">
      <NetworkMatrix />
      <WhatsAppDialog 
        open={showWhatsAppDialog} 
        onOpenChange={setShowWhatsAppDialog}
      />
    </div>
  );
};

export default Index;
