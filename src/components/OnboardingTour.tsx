import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface Step {
  target?: string;
  title: string;
  content: string;
}

const TOUR_STEPS: Step[] = [
  {
    title: '👋 Bem-vindo ao Network Matrix!',
    content: 'Vamos fazer um tour rápido. Este é um espaço visual para organizar seus contatos, projetos e marcas.'
  },
  {
    target: '[data-tour="create-buttons"]',
    title: '➕ Criar Nós',
    content: 'Use estes botões para adicionar Pessoas, Projetos ou Marcas no seu canvas.'
  },
  {
    target: '[data-tour="canvas"]',
    title: '🎨 Canvas Interativo',
    content: 'Arraste os nós para organizar. Clique no ponto azul e arraste até outro nó para criar conexões.'
  },
  {
    target: '[data-tour="workflows"]',
    title: '🎯 Fluxos de Trabalho',
    content: 'Crie fluxos coloridos para categorizar visualmente seus nós e projetos.'
  },
  {
    target: '[data-tour="tools"]',
    title: '✨ Ferramentas',
    content: 'Explore Analytics, AI Insights e Path Finder para obter insights sobre sua rede!'
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTour = ({ onComplete, onSkip }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep === TOUR_STEPS.length - 1) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onSkip} />
      
      <div className="fixed bottom-6 right-6 z-50 max-w-sm">
        <Card className="p-4 shadow-2xl border-2">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-lg">{step.title}</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 -mt-1 -mr-1"
              onClick={onSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            {step.content}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Passo {currentStep + 1} de {TOUR_STEPS.length}
            </span>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={handleNext}
              >
                {currentStep === TOUR_STEPS.length - 1 ? 'Concluir' : 'Próximo'}
                {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};
