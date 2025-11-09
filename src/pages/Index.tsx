import { NetworkMatrix } from '@/components/NetworkMatrix';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair');
    }
  };

  return (
    <div className="relative h-screen w-screen">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <Button
          onClick={() => navigate('/whatsapp')}
          variant="outline"
          size="sm"
        >
          <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
          WhatsApp
        </Button>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
      <NetworkMatrix />
    </div>
  );
};

export default Index;
