import React, { useState } from 'react';
import { Plus, Building2, User, FolderKanban, LogOut, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { usePeople } from '@/hooks/usePeople';
import { useBrands } from '@/hooks/useBrands';
import { useConnections } from '@/hooks/useConnections';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OnboardingTour } from './OnboardingTour';
import { toast } from 'sonner';

export const NetworkMatrix = () => {
  const { signOut } = useAuth();
  
  // Hooks Supabase
  const { projects = [], isLoading: loadingProjects, createProject } = useProjects();
  const { people = [], isLoading: loadingPeople, createPerson } = usePeople();
  const { brands = [], isLoading: loadingBrands, createBrand } = useBrands();
  const { connections = [], isLoading: loadingConnections, createConnection } = useConnections();
  const { workflows = [], isLoading: loadingWorkflows } = useWorkflows();
  const { showTour, completeTour, reopenTour } = useOnboarding();

  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  const isLoading = loadingProjects || loadingPeople || loadingBrands || loadingConnections || loadingWorkflows;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando seu workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Network Matrix</h1>
          
          <div className="flex items-center gap-2" data-tour="create-buttons">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                createPerson.mutate({ 
                  name: 'Nova Pessoa',
                  x: 300, 
                  y: 300,
                  category: 'Pessoal'
                });
              }}
            >
              <User className="w-4 h-4 mr-2" />
              Pessoa
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                createProject.mutate({ 
                  name: 'Novo Projeto',
                  x: 500, 
                  y: 400,
                  status: 'ativo',
                  category: 'M'
                });
              }}
            >
              <FolderKanban className="w-4 h-4 mr-2" />
              Projeto
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                createBrand.mutate({ 
                  name: 'Nova Marca',
                  x: 700, 
                  y: 300,
                  category: 'Tecnologia'
                });
              }}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Marca
            </Button>

            <div className="w-px h-6 bg-border" />

            <Button
              variant="outline"
              size="sm"
              onClick={reopenTour}
            >
              <Info className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="absolute inset-0 pt-16 flex items-center justify-center" data-tour="canvas">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🎨</div>
          <h2 className="text-2xl font-bold">Seu Canvas Está Vazio</h2>
          <p className="text-muted-foreground max-w-md">
            Comece criando pessoas, projetos ou marcas usando os botões no topo da tela.
          </p>
          
          {projects.length > 0 && (
            <div className="mt-8 p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2">Seus Projetos:</h3>
              <div className="space-y-2">
                {projects.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-background rounded">
                    <span>{p.name}</span>
                    <Badge>{p.category}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {people.length > 0 && (
            <div className="mt-4 p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2">Suas Pessoas:</h3>
              <div className="space-y-2">
                {people.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-background rounded">
                    <span>{p.name}</span>
                    <Badge variant="secondary">{p.category}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {brands.length > 0 && (
            <div className="mt-4 p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2">Suas Marcas:</h3>
              <div className="space-y-2">
                {brands.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between p-2 bg-background rounded">
                    <span>{b.name}</span>
                    <Badge variant="outline">{b.category}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Tour */}
      {showTour && (
        <OnboardingTour
          onComplete={completeTour}
          onSkip={completeTour}
        />
      )}
    </div>
  );
};
