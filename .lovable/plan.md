
Diagnóstico direto: você está certo. O que você pediu não apareceu completo por 2 motivos no código atual:

1. No Master View, a cor por grupo foi aplicada parcialmente.
2. No Single View, isso nem foi conectado: `SingleCanvas3D` não recebe `highlightedCategory`, então clicar em "linkedin" na sidebar não muda as cores lá.
3. O “centro do nó com cor diferente pra cada” também não foi implementado de verdade. Hoje cada nó é um tetraedro sólido único, então não existe uma camada interna/miolo separada para colorir.

Plano de correção

1. Corrigir o filtro de cor por grupo no Single View
- Passar `highlightedCategory` de `NetworkMatrix.tsx` para `SingleCanvas3D.tsx`
- Aplicar a mesma lógica já usada no `MasterCanvas`:
  - se clicar em “linkedin”, todos os nós com categoria `linkedin` ficam com a cor do linkedin
  - todos os outros ficam apagados
- Fazer o mesmo para links, para manter consistência visual entre Master e Single

2. Garantir que a cor do grupo domine o visual quando o grupo estiver ativo
- Revisar a lógica do `MasterCanvas.tsx` para garantir que, com grupo ativo, a cor do grupo tenha prioridade total
- Evitar mistura excessiva com branco no estado filtrado, para não “lavar” a cor que você pediu
- Manter dim forte nos nós fora do grupo

3. Implementar o “centro do nó” com cor própria
Hoje o nó é desenhado com uma geometria só. Para fazer o que você pediu, vou mudar o visual do nó para ter 2 camadas:
```text
camada externa = cor do grupo/categoria
camada interna (miolo) = cor secundária única
```

- Camada externa:
  - continua representando a categoria/grupo
  - ex: LinkedIn = azul, WhatsApp = verde, etc.

- Miolo do nó:
  - terá uma cor diferente e consistente por categoria ou por tipo visual definido
  - isso cria o contraste visível que você pediu

4. Aplicar o mesmo padrão nos dois canvases
- `MasterCanvas.tsx`
- `SingleCanvas3D.tsx`

Assim o comportamento fica igual nos dois modos:
- grupo clicado na sidebar pinta os nós daquele grupo
- o miolo de cada nó tem cor diferente
- o nó central do Single View continua destacado, mas sem perder esse novo padrão visual

Arquivos a ajustar
- `src/components/NetworkMatrix.tsx`
- `src/components/MasterCanvas.tsx`
- `src/components/SingleCanvas3D.tsx`
- possivelmente `src/utils/categoryColors.ts` se eu precisar separar:
  - cor externa do grupo
  - cor interna do miolo

Detalhe técnico importante
Hoje os nós usam `instancedMesh`, o que é ótimo para performance, mas limita um pouco visuais mais compostos. Para implementar o “miolo” corretamente, vou seguir um destes caminhos:
- opção preferida: dois `instancedMesh` sobrepostos por nó
  - malha externa
  - malha interna menor
- isso preserva performance e entrega o efeito visual certo

Resultado esperado depois da correção
- clicar em “linkedin” na sidebar:
  - todos os nós linkedin ficam com a cor do linkedin
  - os demais ficam escurecidos
- clicar em outro grupo:
  - troca imediatamente para a cor daquele grupo
- cada nó passa a ter um centro/miolo visual com cor própria e visível
- Master View e Single View ficam consistentes

Resumo do que faltou antes
- faltou propagar `highlightedCategory` para o Single View
- faltou implementar o miolo colorido dos nós
- parte do destaque atual clareia demais os nós com branco, o que esconde a cor forte que você pediu
