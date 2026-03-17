

## Plano: Correção de Bugs + Reestruturação de UI

### Bugs a corrigir

**1. Master View — nós sobrepostos**
O `masterLayoutMap` usa `MASTER_RING_RADIUS = 240` fixo. Com muitos nós num flow, eles se empilham. Solução: tornar o raio dinâmico baseado na quantidade de nós (`Math.max(240, N * 30)`), e aumentar o `getFlowOffset` para flows não se sobreporem.

**2. Master View — labels de flow não acompanham o nó central**
Os labels usam `pos` do `masterLayoutMap` corretamente, mas o problema é que `masterLayoutMap` pode não encontrar o `centerNode` quando o `center_type` do flow não bate. Vou adicionar fallback mais robusto e garantir que o label siga a posição correta.

**3. Single View — animação exagerada**
O `useForceSimulation` usa `alpha(0.8)` e `alphaDecay(0.02)` — isso cria ~150 ticks de animação que dura vários segundos. Solução:
- Aumentar `alphaDecay` para `0.05` (converge 3x mais rápido)
- Aumentar `velocityDecay` para `0.45` (menos inércia)
- Reduzir `alpha` inicial para `0.5`

**4. Single View — criar conexão causa simulação enlouquecer**
Quando `setConnections` é chamado, o `connections.length` muda no dependency array do `useEffect` do force simulation, recriando a simulação do zero com `alpha(0.8)`. Solução:
- Ao invés de recriar, fazer um `reheat` suave (alpha 0.2) quando apenas conexões mudam
- Separar o dep array: usar ref para connections e só recriar sim quando `nodes` mudam

**5. Single View — nós soltos não mexem/ligam**
Nós sem conexões são fixados (`shouldFix = true` quando `!hasConnections`). Isso impede drag. Solução: remover o pin de nós sem conexão — apenas o centro deve ser fixo. Nós sem conexão devem poder ser arrastados normalmente.

### Mudanças de UI

**6. Remover botão "Reset" da toolbar**
Remover o botão `onAutoOrganize` ("Reset") da `NetworkToolbar`.

**7. Remover botão "Resetar Tudo"**
Remover `<ResetButton>` do `NetworkMatrix.tsx`.

**8. Botões "Criar Nó" e "Novo Flow" — floating action buttons**
Mover para botões flutuantes no centro-inferior da tela (FABs), fora da toolbar.

**9. "Flows" ao lado de "Master" com ícones diferentes**
Toolbar: `Master` (ícone Grid/Layers) | `Flows` (ícone Briefcase — abre o FlowManagerPanel) | `Single` (ícone Target). Flows fica entre Master e Single.

**10. FlowManagerPanel — redesign simplificado + preview ao clicar**
- Mudar de `Sheet` (lateral) para dropdown/popover que abre abaixo do botão "Flows"
- Design simplificado: lista compacta com nome + tipo + contagem
- Ao clicar num flow, muda para Single View imediatamente sem fechar o painel
- Clicar fora fecha o painel

**11. Sidebar de Grupos — menu flutuante arrastável**
Transformar o `NetworkSidebar` fixo num painel flutuante que o usuário pode posicionar. Adicionar cores mais vibrantes nos dots (já tem cores no CATEGORY_COLORS).

**12. Zoom controls maiores**
Aumentar os botões de zoom de `w-6 h-6` / `size={12}` para `w-8 h-8` / `size={16}`.

### Arquivos afetados

1. `src/hooks/useForceSimulation.ts` — bugs 3, 4, 5
2. `src/components/Canvas.tsx` — bug 1, 2
3. `src/components/NetworkToolbar.tsx` — mudanças 6, 8, 9
4. `src/components/NetworkMatrix.tsx` — mudanças 7, 8, 10, 11, 12
5. `src/components/FlowManagerPanel.tsx` — mudança 10 (redesign)
6. `src/components/NetworkSidebar.tsx` — mudança 11 (flutuante)

