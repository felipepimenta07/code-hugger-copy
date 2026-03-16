

## Diagnóstico: Reset não apaga os nós

### Causa raiz

Dois problemas no `ResetButton` + `NetworkMatrix`:

1. **`onResetComplete` chama `reloadData()` sem `forceReset: true`** — depois de deletar tudo do banco, o `reloadData` recarrega dados vazios mas **não reseta** `activeProjectId`, `viewMode`, `selectedNodes`. A UI fica "presa" no estado anterior.

2. **Race condition com Realtime** — o canal Realtime escuta DELETE events e chama `reloadData()` repetidamente durante o reset (cada tabela deletada dispara um evento). Isso pode causar recarregamentos parciais enquanto o reset ainda está em progresso.

### Correções

**1. `ResetButton.tsx`** — Chamar `onResetComplete()` com flag de force reset, e adicionar logs para debug:
- Após deletar tudo, chamar o callback que limpa o estado

**2. `NetworkMatrix.tsx`** — Duas mudanças:
- Passar `() => reloadData({ forceReset: true })` ao `ResetButton` em vez de apenas `reloadData`
- Adicionar guard no realtime: ignorar eventos durante reset (usar um ref `isResettingRef`)

### Mudança concreta

```
NetworkMatrix.tsx linha 884:
  ANTES: <ResetButton onResetComplete={reloadData} userId={user.id} />
  DEPOIS: <ResetButton onResetComplete={() => reloadData({ forceReset: true })} userId={user.id} />
```

E adicionar um `isResettingRef` para silenciar o realtime durante o reset.

2 arquivos, ~10 linhas de mudança.

