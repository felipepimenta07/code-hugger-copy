

## Analise: iuripiragibe.net/master vs. nosso app

O site de referencia e um grafo de rede investigativo com estas qualidades-chave de UX:

1. **Toolbar superior compacta e funcional**: Camadas (2o, 3o grau), Visao, Ajustar, Reset, Rotulos, Isolados, busca, contador de nos/conexoes -- tudo em uma barra horizontal limpa
2. **Sidebar esquerda com GRUPOS coloridos**: Lista de categorias (Centro, Familia, Igreja, Politico...) com bolinhas coloridas e contadores -- clicaveis para filtrar
3. **Nos com fotos circulares + rotulos descritivos**: Cada no tem foto de perfil, nome embaixo, e uma descricao curta em cor (ex: "R$316mi titulos") 
4. **Conexoes com rotulos nas linhas**: Cada aresta tem texto explicando a relacao ("pai", "irmao", "financiador historico")
5. **Fundo escuro limpo sem grid de pontos**: Background solido escuro, sem ruido visual
6. **Contador global**: "58 NOS · 92 CONEXOES" no canto inferior direito
7. **Transicoes suaves**: Pan/zoom fluido, hover com destaque sutil
8. **Layout force-directed organico**: Nos posicionados organicamente, nao em circulos rigidos

## Plano de Implementacao

Vou dividir em fases para manter cada mudanca gerenciavel:

### Fase 1: Visual e Background
- **index.css**: Remover grid de pontos do background. Usar fundo escuro solido/gradiente sutil (similar ao `#0d1117` do site ref)
- **Canvas.tsx**: Remover aneis decorativos roxos/rosa e sun rays -- eles adicionam ruido visual. Manter circulos pontilhados mais sutis apenas para Single View

### Fase 2: Toolbar Superior Compacta
- **NetworkMatrix.tsx**: Substituir a barra atual (busca IA + botao IA) por uma toolbar horizontal completa com:
  - Seletor de camadas (1o, 2o, 3o grau)
  - Botoes: Visao, Ajustar, Reset, Rotulos, Isolados
  - Campo de busca
  - Contador de nos/conexoes (ex: "58 NOS · 92 CONEXOES")

### Fase 3: Sidebar de Grupos/Categorias
- **NetworkSidebar.tsx**: Redesenhar para mostrar categorias como lista vertical com:
  - Bolinha colorida + nome da categoria + contador
  - Clique para filtrar/destacar nos daquela categoria
  - Titulo "GRUPOS" em monospace/caps como no site ref

### Fase 4: Rotulos nas Conexoes
- **Canvas.tsx**: Adicionar texto no meio das linhas de conexao mostrando o tipo de relacao (ex: "parceiro", "cliente", "trabalha em")
- Toggle de visibilidade via botao "Rotulos" na toolbar

### Fase 5: Nos mais informativos
- **Canvas.tsx**: Melhorar renderizacao dos nos:
  - Borda colorida por categoria (nao preenchimento solido)
  - Mostrar descricao curta/notas abaixo do nome em cor da categoria
  - Tamanho do no proporcional ao numero de conexoes (mais organico)

### Fase 6: Contador Global
- Adicionar badge "XX NOS · YY CONEXOES" no canto inferior direito, estilo monospace

### Fase 7: Transicoes Suaves
- Adicionar `transition` CSS nas mudancas de posicao/opacidade
- Smooth zoom com `ease-out`

## Arquivos a modificar
1. **src/index.css** -- background limpo
2. **src/components/Canvas.tsx** -- nos, conexoes com rotulos, remover decoracoes
3. **src/components/NetworkMatrix.tsx** -- toolbar superior, contador global
4. **src/components/NetworkSidebar.tsx** -- redesign para grupos/categorias

## Nota tecnica
Sao muitas mudancas. Recomendo implementar em 2-3 rodadas para evitar regressoes. Posso comecar pela **Fase 1 + 2 + 6** (visual, toolbar, contador) que sao as mudancas de maior impacto visual com menor risco.

