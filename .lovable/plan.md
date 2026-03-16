

## Resultado dos Testes + Melhoria Necessária

### O que funciona
- **Criação de Flow**: "Novo Flow" → modal unificado com seletor de tipo → funciona
- **Seletor de tipo**: Clicar "Projeto" muda o formulário (placeholder, categorias, campos condicionais)
- **Tipo correto no banco**: "Teste Projeto Flow" foi salvo na tabela `projects` (NÃO em `people` ou `brands`) — bug corrigido
- **Lógica de código**: `handleCreateNode` extrai `nodeData.nodeType` corretamente (linha 603)

### Problema encontrado: Criar nó dentro de um Flow
No Single View (dentro de um flow), a única forma de criar um nó é via **right-click** no canvas. Não há botão na toolbar ou no menu hamburger para isso. Isso é problemático porque:
1. Em mobile/touch não existe right-click
2. Não é óbvio para o usuário

### Correção proposta
Adicionar uma opção **"+ Criar Nó"** no menu hamburger quando estiver em **Single View** (dentro de um flow). Ao clicar, abre o `NodeCreationModal` com posição centralizada no canvas.

### Mudança
- **`src/components/NetworkToolbar.tsx`**: No menu dropdown, adicionar "Criar Nó" como primeira opção quando `viewMode === 'single'`, antes de "Novo Flow"

Mudança pequena, 1 arquivo, ~5 linhas.

