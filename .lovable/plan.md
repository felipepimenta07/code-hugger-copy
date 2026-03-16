

## Reestruturação Completa: Replicar a Arquitetura do Site de Referência

O site de referência (iuripiragibe.net/master) tem uma arquitetura muito mais simples e direta que a nossa. Nosso app está sobrecarregado com componentes, modais, e painéis que fragmentam a experiência. A ideia é: primeiro simplificar a estrutura para ficar como o site de referência, depois re-aplicar nossas funcionalidades únicas (flows, IA, WhatsApp) sobre essa base limpa.

### O que o site de referência faz bem (estruturalmente)

1. **Uma única tela, sem modais desnecessários** — tudo é acessível direto na tela principal
2. **SVG puro com D3-like force layout** — sem `foreignObject` excessivos, rendering limpo
3. **Toolbar mínima no topo** — CAMADAS | VISÃO | AJUSTAR | RESET | RÓTULOS | ISOLADOS | busca | PIX counter
4. **Sidebar esquerda GRUPOS** — apenas uma lista de categorias com cores e contadores
5. **Contador no canto inferior direito** — "58 NÓS · 92 CONEXÕES"
6. **Nós com fotos circulares** — clip-path em SVG, sem foreignObject para ícones
7. **Rótulos nas arestas** — texto no meio da linha de conexão
8. **Zero painéis flutuantes** — sem drawers, sem modais de edição inline

### Plano em 3 Fases

---

### Fase 1: Simplificar a Estrutura (esta rodada)

**NetworkMatrix.tsx** — Reduzir drasticamente:
- Remover renderização condicional de ~10 painéis/modais do JSX principal
- Mover modais para um componente `<NetworkModals />` que recebe props e renderiza condicionalmente — limpa o JSX principal
- Substituir o toolbar atual por uma toolbar idêntica ao site de referência: `CAMADAS [2° ●] [3°] | VISÃO | AJUSTAR | RESET | ● RÓTULOS | ● ISOLADOS | [buscar nó...]`
- Remover botões de zoom flutuantes — zoom apenas por scroll (como o site ref)
- Manter o contador `XX NÓS · YY CONEXÕES` no canto inferior direito

**NetworkSidebar.tsx** — Simplificar para ser igual ao site ref:
- Remover seção "Novo Flow", ações, botões de WhatsApp e logout do sidebar
- Sidebar fica APENAS com: título "COMPLIANCE ZERO" (ou o nome do projeto), subtítulo "MAPA DE CONEXÕES", e a seção GRUPOS com categorias coloridas
- Logout e ações vão para um menu discreto no header/toolbar
- Largura fixa de 200px (mais compacta)

**Canvas.tsx** — Rendering mais limpo:
- Nós: usar `<clipPath>` + `<image>` nativos do SVG para fotos (sem foreignObject para ícones)
- Nós sem foto: renderizar apenas um círculo com borda colorida + inicial do nome
- Conexões: adicionar texto de rótulo (`connection_type`) no ponto médio de cada aresta
- Remover badges de contagem de conexões dos nós (visual noise)
- Remover indicadores de nó copiado, nó órfão, workflows múltiplos (simplificar)

**Index.tsx** — Mover WhatsApp/logout para dentro do NetworkMatrix toolbar

---

### Fase 2: Interações Fluidas

- **Zoom suave**: CSS `transition` no `transform` do `<g>` principal
- **Hover com glow**: usar filtro SVG `feGaussianBlur` como o site ref (já temos `glow-node` similar)
- **Pan inercial**: ao soltar o pan, continuar o movimento por ~200ms com desaceleração
- **Nós arrastáveis com snap suave**: micro-transição ao soltar

---

### Fase 3: Re-aplicar Funcionalidades

Depois da base limpa, reintegrar as funcionalidades que são nossas e não existem no site ref:
- **IA Insights**: como botão na toolbar → abre painel lateral direito
- **Flows/Master-Single View**: manter, mas integrar na toolbar como "CAMADAS" do site ref
- **WhatsApp**: manter como ação no menu do toolbar
- **Node Creation/Edit**: via context menu (click direito) em vez de modais — mais direto

---

### Arquivos a criar/modificar

1. **`src/components/NetworkModals.tsx`** (NOVO) — agrupa todos os modais condicionais
2. **`src/components/NetworkToolbar.tsx`** (NOVO) — toolbar compacta estilo site ref
3. **`src/components/NetworkMatrix.tsx`** — simplificar JSX, extrair modais e toolbar
4. **`src/components/NetworkSidebar.tsx`** — redesign radical para apenas GRUPOS
5. **`src/components/Canvas.tsx`** — nós SVG puros, rótulos nas arestas, remover visual noise
6. **`src/index.css`** — adicionar estilos de transição suave para zoom/pan

### Nota importante

A lógica de posicionamento (masterLayoutMap, getFlowOffset, BFS de profundidade) permanece **intacta** — apenas o rendering visual e a organização dos componentes muda. Os dados e o fluxo Master/Single continuam funcionando exatamente igual.

