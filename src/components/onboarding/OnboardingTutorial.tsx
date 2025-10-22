import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  highlight?: string;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: '👋 Bem-vindo ao Network Matrix!',
    description: 'Esta ferramenta vai te ajudar a visualizar e gerenciar sua rede de projetos, pessoas e empresas. Vamos fazer um tour rápido!',
    position: 'center'
  },
  {
    title: '🎯 Criar seu Primeiro Flow',
    description: 'Clique em "Começar Flow" para criar um novo fluxo de relacionamentos. Você pode organizar seus projetos, pessoas e empresas em diferentes flows.',
    position: 'center'
  },
  {
    title: '📦 Tipos de Nós',
    description: 'Existem 3 tipos de nós: Projetos (azul), Pessoas (verde) e Empresas (roxo). Cada um representa diferentes elementos da sua rede profissional.',
    position: 'center'
  },
  {
    title: '🔗 Criar Conexões',
    description: 'Para conectar dois nós, arraste da borda de um nó até outro. As conexões mostram os relacionamentos entre projetos, pessoas e empresas.',
    position: 'center'
  },
  {
    title: '🛠️ Ferramentas',
    description: 'Use a toolbar superior para zoom (+/-), desfazer/refazer (Ctrl+Z/Ctrl+Y), e centralizar a visualização (tecla C). Você também pode arrastar o canvas segurando o botão direito do mouse.',
    position: 'center'
  },
  {
    title: '👁️ Modos de Visualização',
    description: 'Alterne entre "Single View" (um flow por vez) e "Master View" (todos os flows juntos) para diferentes perspectivas da sua rede.',
    position: 'center'
  },
  {
    title: '📊 Analytics',
    description: 'Use o painel de Analytics para ver estatísticas da sua rede, identificar nós mais conectados e encontrar insights valiosos.',
    position: 'center'
  },
  {
    title: '✅ Pronto para Começar!',
    description: 'Agora você está pronto para construir sua rede! Lembre-se: você pode sempre acessar o menu de ajuda (?) no canto superior direito.',
    position: 'center'
  }
];

interface OnboardingTutorialProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTutorial = ({ open, onComplete, onSkip }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = ONBOARDING_STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl bg-background border-border">
        <div className="relative p-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Passo {currentStep + 1} de {totalSteps}
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-4 min-h-[200px]">
              <h2 className="text-3xl font-bold text-foreground">
                {currentStepData.title}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {currentStepData.description}
              </p>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="flex gap-2">
                {!isLastStep && (
                  <Button variant="outline" onClick={handleSkip}>
                    Pular Tutorial
                  </Button>
                )}
                <Button onClick={handleNext} className="gap-2">
                  {isLastStep ? 'Começar!' : 'Próximo'}
                  {!isLastStep && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
