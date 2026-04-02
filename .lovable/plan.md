
Objetivo: fazer os poliedros receberem um destaque visual forte quando um grupo/categoria estiver ativo, em vez de parecer que só as ligações mudam.

Diagnóstico
- Não é impossível. O destaque dos nós já existe no código, mas hoje ele fica fraco demais.
- Em `MasterCanvas.tsx` e `SingleCanvas3D.tsx`, quando a categoria bate, o poliedro praticamente mantém a cor “normal”; quem muda muito são as linhas.
- O material atual dos nós (`meshStandardMaterial` com emissive branco + bloom global) achata a percepção da cor. Resultado: link parece destacado, nó não.
- Falta dar ao nó 3 sinais visuais claros ao mesmo tempo: cor mais viva, escala maior e brilho/opacity diferentes.

Plano de correção

1. Reforçar o destaque dos poliedros nos dois canvases
- Em `MasterCanvas.tsx` e `SingleCanvas3D.tsx`, mudar a lógica de `Nodes3D` / `SingleNodes3D` para que, com `highlightedCategory` ativo:
  - nós da categoria ativa:
    - usem a cor do grupo em intensidade máxima
    - aumentem levemente de escala
    - recebam um ganho de brilho visível
  - nós fora da categoria:
    - reduzam mais a intensidade
    - percam emissive/glow
    - fiquem realmente secundários

2. Separar melhor casca e núcleo
- Hoje existe casca + miolo, mas o contraste visual ainda é pequeno.
- Vou aumentar a diferença entre:
  - casca externa = cor principal do grupo
  - núcleo = cor secundária/accent mais forte
- Isso faz o poliedro “acender” de verdade quando o grupo for clicado.

3. Ajustar materiais para não lavar as cores
- Reduzir a interferência do branco nos materiais dos nós destacados.
- Fazer o bloom responder mais ao nó ativo, não só às ligações.
- Se necessário, aumentar `emissiveIntensity` somente nos nós ativos e reduzir nos demais.

4. Dar destaque geométrico além da cor
- Aplicar um pequeno bump de escala para os nós da categoria ativa.
- Opcionalmente aumentar um pouco o tamanho do núcleo interno quando a categoria estiver ativa.
- Assim o destaque fica visível mesmo quando as cores forem parecidas.

5. Manter consistência entre Master e Single View
- Aplicar exatamente a mesma regra em:
  - `src/components/MasterCanvas.tsx`
  - `src/components/SingleCanvas3D.tsx`
- O comportamento esperado será:
  - clicou “LinkedIn”:
    - poliedros LinkedIn ficam claramente em evidência
    - os outros apagam
    - links continuam ajudando, mas deixam de ser o único destaque perceptível

Arquivos a ajustar
- `src/components/MasterCanvas.tsx`
- `src/components/SingleCanvas3D.tsx`
- possivelmente `src/utils/categoryColors.ts` se eu precisar aumentar contraste entre cor externa e cor do núcleo

Detalhes técnicos
```text
Estado com highlightedCategory ativo:
- match:
  outerColor = categoryColor * 1.0
  coreColor = coreColor * 1.15
  scale += pequeno boost
  emissiveIntensity = alta
- non-match:
  outerColor = categoryColor * 0.03~0.06
  coreColor = coreColor * 0.03~0.06
  emissiveIntensity = baixa
```

Resultado esperado
- O destaque passa a aparecer claramente nos poliedros, não só nas ligações.
- Fica visualmente óbvio qual grupo está ativo.
- Master View e Single View ficam consistentes.
