

## Master View: Visualização densa estilo "mapa de gêneros BBC"

O problema: o layout atual espalha flows em rings/grid com spacing de 780px+, resultando em nós minúsculos e espaço vazio enorme. A imagem de referência mostra algo completamente diferente — **todos os nós individuais empacotados densamente** em uma nuvem orgânica, coloridos por flow/categoria, sem rings nem separação por clusters.

### Abordagem

Substituir o layout de rings/grid no master view por um **layout de força denso** que posiciona TODOS os nós juntos, com agrupamento suave por flow (nós do mesmo flow ficam próximos, mas sem separação rígida).

### Mudanças em `Canvas.tsx`

**1. Substituir `masterLayoutMap` por layout de força denso**

O `masterLayoutMap` atual calcula posições em rings por flow. Substituir por um `useMemo` que:
- Cria um `forceSimulation` com TODOS os nós (não por flow)
- `forceCollide` com raio pequeno (~18px) para empacotamento denso
- `forceManyBody().strength(-15)` — repulsão fraca para manter denso
- `forceCenter(0, 0)` para centralizar
- Força customizada de agrupamento: nós do mesmo flow são atraídos ao centroide do grupo (`forceX`/`forceY` com target = centroide do flow, strength ~0.3)
- 200 ticks síncronos

**2. Remover zoom semântico / bubble mode**

- Remover o bloco `bubbleLayoutMap` e toda renderização condicional de bolhas (zoom < 0.15)
- Remover a distinção zoom < 0.15 vs >= 0.15 — sempre mostrar nós individuais
- Remover cluster rings, flow labels no topo dos rings

**3. Simplificar renderização de nós no master**

- Nós no master ficam menores: raio fixo de ~8-12px (como dots na imagem de referência)
- Cor = cor do flow (usando `FLOW_COLORS`)
- Sem labels de nome por padrão (aparecem no hover)
- Sem connection dot (já está desabilitado no master)

**4. Conexões no master**

- Mostrar conexões intra-flow como linhas finas e semi-transparentes
- Cross-flow connections com cor diferente e tracejado

### Mudanças em `NetworkMatrix.tsx`

**1. `calculateBounds` para layout denso**

Quando master view com > 12 flows: estimar spread como `Math.sqrt(totalNodes) * 15` (muito mais compacto que antes).

**2. Zoom inicial mais alto**

O `calculateOptimalZoom` vai naturalmente calcular zoom maior porque os bounds são muito menores. Floor pode subir para 0.15.

### Arquivos alterados
- `src/components/Canvas.tsx` — layout de força denso, remoção de bubble mode, nós pequenos coloridos
- `src/components/NetworkMatrix.tsx` — bounds e zoom ajustados

