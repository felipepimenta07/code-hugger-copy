

## Master View: Visualização orgânica estilo "mapa de galáxias"

O problema atual: as bolhas usam grid rígido com spacing de 280px. Visualmente fica mecânico e pequeno. As imagens de referência mostram bolhas de tamanhos variados, espalhadas organicamente com labels grandes e conexões entre clusters.

### Mudanças

#### 1. `Canvas.tsx` — Layout orgânico para bolhas

Substituir o `bubbleLayoutMap` atual (grid rígido) por um **layout de força simplificado** calculado com d3-force no `useMemo`:

- Usar `forceSimulation` com poucos ticks (~100) para posicionar as bolhas organicamente
- Cada bolha tem raio proporcional ao nº de nós: `Math.max(50, Math.sqrt(count) * 25)`
- `forceCollide` com raio = bubbleRadius + 40 para evitar sobreposição
- `forceCenter(0, 0)` para manter tudo centrado
- `forceManyBody().strength(-300)` para espalhamento natural
- Resultado: posições orgânicas como nas imagens de referência, não uma grade

Aumentar visuais das bolhas:
- Adicionar círculo de fundo com blur/glow grande (como as "galáxias" nas imagens)
- Nome em fonte maior (20-24px), bold, maiúsculo
- Contagem abaixo do nome
- Opacity do fill principal: 0.5 com stroke mais grosso (4px)

#### 2. `Canvas.tsx` — Conexões cross-flow no modo bolha

Quando zoom < 0.15, desenhar linhas entre bolhas que compartilham pessoas com mesma empresa/email (reusar lógica existente de cross-flow, mas apontar para centros das bolhas em vez de nós individuais).

#### 3. `NetworkMatrix.tsx` — Bounds para layout orgânico

Em `calculateBounds`, quando `count > 12`, calcular bounds baseados nas posições reais do `bubbleLayoutMap` (iterar os valores do Map) em vez de assumir grid fixo. Isso garante zoom correto.

### Arquivos alterados
- `src/components/Canvas.tsx` — bubbleLayoutMap com d3-force, visuais melhorados, cross-flow entre bolhas
- `src/components/NetworkMatrix.tsx` — bounds dinâmicos baseados no bubbleLayoutMap

