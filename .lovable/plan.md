

## Plano: Adicionar botão LinkedIn na toolbar

Tudo já está conectado — o modal, o parser CSV e a lógica de importação já existem. Só falta o botão na toolbar.

### Alterações

**`src/components/NetworkToolbar.tsx`**
- Adicionar prop `onOpenLinkedIn?: () => void`
- Adicionar botão "LinkedIn" (ícone `Upload`) ao lado do botão WhatsApp, com cor `#0A66C2`

**`src/components/NetworkMatrix.tsx`**
- Passar `onOpenLinkedIn={() => setShowLinkedInImport(true)}` para o `NetworkToolbar`

