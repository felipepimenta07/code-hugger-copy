import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { HelpCircle, BookOpen, Lightbulb, Keyboard, FileText } from 'lucide-react';
import { QuickTipsDialog } from './QuickTipsDialog';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';

interface HelpMenuProps {
  onShowTutorial: () => void;
}

export const HelpMenu = ({ onShowTutorial }: HelpMenuProps) => {
  const [showQuickTips, setShowQuickTips] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-background border-border z-50">
          <DropdownMenuItem onClick={onShowTutorial} className="cursor-pointer gap-2">
            <BookOpen className="h-4 w-4" />
            Ver Tutorial Novamente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowQuickTips(true)} className="cursor-pointer gap-2">
            <Lightbulb className="h-4 w-4" />
            Dicas Rápidas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowKeyboardShortcuts(true)} className="cursor-pointer gap-2">
            <Keyboard className="h-4 w-4" />
            Atalhos de Teclado
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer gap-2">
            <FileText className="h-4 w-4" />
            Guia Completo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <QuickTipsDialog open={showQuickTips} onOpenChange={setShowQuickTips} />
      <KeyboardShortcutsDialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts} />
    </>
  );
};
