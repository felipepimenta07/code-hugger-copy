import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface Step {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="create-buttons"]',
    title: '👋 Bem-vindo!',
    content: 'Use estes botões para criar Pessoas, Projetos ou Marcas no seu canvas.',
    position: 'bottom'
  },
  {
    target: '[data-tour="canvas"]',
    title: '🎨 Seu Canvas',
    content: 'Arraste os nós para organizar. Clique e arraste do ponto azul de um nó para outro para criar conexões.',
    position: 'top'
  },
  {
    target: '[data-tour="workflows"]',
    title: '🎯 Fluxos de Trabalho',
    content: 'Crie fluxos coloridos para categorizar seus nós visualmente.',
    position: 'bottom'
  },
  {
    target: '[data-tour="views"]',
    title: '👁️ Visões',
    content: 'Alterne entre visão geral (Master) e visão de projeto (Single).',
    position: 'bottom'
  },
  {
    target: '[data-tour="project-manager"]',
    title: '📋 Gerenciar Projetos',
    content: 'Veja todos seus projetos em lista e acesse rapidamente.',
    position: 'left'
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTour = ({ onComplete, onSkip }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      const step = TOUR_STEPS[currentStep];
      const element = document.querySelector(step.target);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        let top = 0;
        let left = 0;

        switch (step.position) {
          case 'bottom':
            top = rect.bottom + 10;
            left = rect.left + rect.width / 2 - 200;
            break;
          case 'top':
            top = rect.top - 180;
            left = rect.left + rect.width / 2 - 200;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - 100;
            left = rect.left - 420;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - 100;
            left = rect.right + 10;
            break;
        }

        setTooltipPosition({ top, left });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStep]);

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
      <div className="fixed inset-0 bg-black/30 z-40" />
      
      <Card
        className="fixed z-50 w-96 shadow-xl"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-lg">{step.title}</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
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
              {currentStep + 1} de {TOUR_STEPS.length}
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
        </CardContent>
      </Card>
    </>
  );
};
