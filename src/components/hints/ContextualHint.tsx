import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HINTS = [
  '💡 Dica: Você pode arrastar os nós para reorganizá-los no canvas',
  '⚡ Dica: Use Ctrl+Z para desfazer e Ctrl+Y para refazer ações',
  '🎯 Dica: Alterne entre Single View e Master View para diferentes perspectivas',
  '🔗 Dica: Arraste de um nó para outro para criar conexões rapidamente',
  '📊 Dica: Use o painel de Analytics para ver estatísticas da sua rede',
  '🔍 Dica: O Path Finder ajuda a encontrar conexões entre pessoas',
  '🖱️ Dica: Use a roda do mouse ou os botões +/- para zoom',
  '🎨 Dica: Clique duas vezes em um nó para editá-lo rapidamente',
];

interface ContextualHintProps {
  show: boolean;
  onDismiss: () => void;
  onDisable: () => void;
}

export const ContextualHint = ({ show, onDismiss, onDisable }: ContextualHintProps) => {
  const [currentHintIndex, setCurrentHintIndex] = useState(0);

  useEffect(() => {
    if (show) {
      setCurrentHintIndex(Math.floor(Math.random() * HINTS.length));
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium">
              {HINTS[currentHintIndex]}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDisable}
            className="text-xs"
          >
            Não mostrar mais dicas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-xs"
          >
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
};
