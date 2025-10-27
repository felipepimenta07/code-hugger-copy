import NetworkMatrix from '@/components/NetworkMatrix';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair');
    }
  };

  return (
    <div className="relative h-screen w-screen">
      <Button
        onClick={handleLogout}
        variant="outline"
        size="sm"
        className="absolute top-4 right-4 z-50"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sair
      </Button>
      <NetworkMatrix />
    </div>
  );
};

export default Index;
