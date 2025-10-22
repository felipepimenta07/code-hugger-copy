import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KEYBOARD_SHORTCUTS = [
  {
    category: 'Edição',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Desfazer última ação' },
      { keys: ['Ctrl', 'Y'], description: 'Refazer ação desfeita' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Refazer (alternativo)' },
      { keys: ['Delete'], description: 'Deletar nó ou conexão selecionada' },
      { keys: ['Backspace'], description: 'Deletar nó ou conexão selecionada' },
    ]
  },
  {
    category: 'Navegação',
    shortcuts: [
      { keys: ['C'], description: 'Centralizar visualização' },
      { keys: ['Espaço', '+', 'Arrastar'], description: 'Mover canvas (pan)' },
      { keys: ['Botão Direito', '+', 'Arrastar'], description: 'Mover canvas (pan)' },
      { keys: ['Roda do Mouse'], description: 'Zoom in/out' },
      { keys: ['Esc'], description: 'Cancelar seleção / Fechar modais' },
    ]
  },
  {
    category: 'Seleção',
    shortcuts: [
      { keys: ['Clique'], description: 'Selecionar nó ou conexão' },
      { keys: ['Duplo Clique'], description: 'Editar nó' },
      { keys: ['Clique Direito'], description: 'Abrir menu de contexto' },
      { keys: ['Esc'], description: 'Limpar seleção' },
    ]
  }
];

export const KeyboardShortcutsDialog = ({ open, onOpenChange }: KeyboardShortcutsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Keyboard className="h-6 w-6 text-primary" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Aprenda os atalhos para trabalhar mais rápido
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-full max-h-[60vh] pr-4">
          <div className="space-y-6">
            {KEYBOARD_SHORTCUTS.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-3">
                <h3 className="font-semibold text-lg text-foreground border-b border-border pb-2">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
