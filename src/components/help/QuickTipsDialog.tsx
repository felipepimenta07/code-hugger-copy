import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb } from 'lucide-react';

interface QuickTipsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_TIPS = [
  {
    icon: '🎯',
    title: 'Organize por Projetos',
    description: 'Crie flows separados para diferentes projetos e mantenha tudo estruturado e fácil de encontrar.'
  },
  {
    icon: '🔗',
    title: 'Conexões Rápidas',
    description: 'Arraste de um nó para outro para criar conexões instantaneamente. É a forma mais rápida de mapear relacionamentos.'
  },
  {
    icon: '⚡',
    title: 'Desfazer e Refazer',
    description: 'Use Ctrl+Z para desfazer e Ctrl+Y (ou Ctrl+Shift+Z) para refazer qualquer ação. Você nunca vai perder trabalho.'
  },
  {
    icon: '👁️',
    title: 'Alterne as Views',
    description: 'Use Single View para focar em um flow específico ou Master View para ver toda a rede de uma vez.'
  },
  {
    icon: '📊',
    title: 'Use o Analytics',
    description: 'O painel de Analytics mostra estatísticas valiosas como nós mais conectados e densidade da rede.'
  },
  {
    icon: '🔍',
    title: 'Path Finder',
    description: 'Use o Path Finder para descobrir conexões indiretas entre pessoas e empresas na sua rede.'
  },
  {
    icon: '💾',
    title: 'Salvamento Automático',
    description: 'Tudo é salvo automaticamente no banco de dados. Você pode sair e voltar a qualquer momento sem perder dados.'
  },
  {
    icon: '🎨',
    title: 'Edição Rápida',
    description: 'Clique duas vezes em qualquer nó para editá-lo rapidamente. Você também pode usar o menu de contexto (clique direito).'
  },
  {
    icon: '🖱️',
    title: 'Navegação Intuitiva',
    description: 'Use a roda do mouse para zoom, segure o botão direito para arrastar o canvas, ou pressione C para centralizar.'
  },
  {
    icon: '🗑️',
    title: 'Delete com Cuidado',
    description: 'Selecione um nó ou conexão e pressione Delete ou Backspace para removê-lo. Conexões são deletadas automaticamente quando você deleta um nó.'
  }
];

export const QuickTipsDialog = ({ open, onOpenChange }: QuickTipsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Lightbulb className="h-6 w-6 text-primary" />
            Dicas Rápidas
          </DialogTitle>
          <DialogDescription>
            Aproveite ao máximo o Network Matrix com essas dicas úteis
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-full max-h-[60vh] pr-4">
          <div className="space-y-4">
            {QUICK_TIPS.map((tip, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex gap-3">
                  <div className="text-3xl flex-shrink-0">{tip.icon}</div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground">{tip.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
