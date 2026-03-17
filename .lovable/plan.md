
Diagnóstico rápido (causa raiz confirmada):
- O bug do Single não é mais só “força exagerada”; agora o principal problema é colisão de IDs entre tabelas (`projects`, `people`, `brands`), porque o frontend trata identidade só por `id`.
- Evidências:
  - Console: warnings de keys duplicadas no `Canvas` e `NodeDetailPanel`.
  - Banco: existem nós no mesmo flow com mesmo `id` e tipos diferentes (ex.: flow 7, `brand:11` e `project:11`).
  - Código atual usa `find(n => n.id === ...)`, `key={node.id}`, seleção/drag/conexões por id numérico apenas.
- Efeito prático: nós sobrepostos, nó “travado”, conexão errática, conexão entre tipos diferentes com mesmo id virando “self-link” visual.

Plano de correção (foco total no Single bug):
1) Criar identidade composta no frontend
- Adicionar helper de identidade: `nodeRef = "${type}:${id}"`.
- Carregar nós/conexões com campos derivados:
  - nó: `node_ref`
  - conexão: `from_ref`, `to_ref` (usando `from_type/from_id` e `to_type/to_id`)
- Manter `id` numérico para persistência no banco (sem migração de dados).

2) Trocar interações do grafo para usar `node_ref`
- `selectedNodes`, `dragging`, hover, highlight e comparação de vizinhança passam a usar `node_ref`.
- Em `Canvas`, trocar:
  - `key={node.id}` → `key={node.node_ref}`
  - `nodes.find(n => n.id === ...)` → lookup por `node_ref`
  - criação de conexão para gravar refs/tipos corretos (não só ids numéricos).

3) Corrigir simulação de força para IDs únicos reais
- Em `useForceSimulation`, usar `node_ref` como ID da simulação/links.
- `forcePositions` indexado por `node_ref` (não por número).
- Drag start/drag/end operando por `node_ref`, eliminando sobreposição por chave igual.

4) Corrigir pontos colaterais que ainda usam id puro
- `NodeDetailPanel`: conexões diretas e keys da lista por `node_ref`/`connection.id`.
- `PathIndicator` e `PathFinderModal`: BFS com refs para não misturar nós homônimos de id.
- `NetworkMatrix`: filtro de conexões do Single e resolução de flow usando tipo+id/ref (evitar ambiguidades).

5) Validação de aceite
- Entrar no Single sem “explosão” nem jitter extremo.
- Todos os nós do flow ficam arrastáveis.
- Criar conexão entre quaisquer dois nós funciona e aparece estável.
- Zero warning de key duplicada no console.
- Sem regressão em Master View.

Arquivos a ajustar:
- `src/components/NetworkMatrix.tsx`
- `src/components/Canvas.tsx`
- `src/hooks/useForceSimulation.ts`
- `src/hooks/useNetworkState.ts`
- `src/hooks/useKeyboardShortcuts.ts`
- `src/components/NodeDetailPanel.tsx`
- `src/components/PathIndicator.tsx`
- `src/components/PathFinderModal.tsx`

Observação de escopo:
- Não precisa alterar estrutura do banco nem apagar dados; a correção é de identidade no frontend usando os campos de tipo que já existem nas conexões.
