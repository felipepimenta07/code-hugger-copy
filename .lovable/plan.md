

## Plano: Corrigir 3 problemas — câmera, cores, e grupos

### Problema 1: Câmera "arrasta" em vez de "girar"
O `CameraFocus` atual move tanto o target quanto a câmera juntos — isso translada a visão inteira. O usuário quer que a **esfera gire** para trazer o nó ao centro da visão, com a câmera parada.

**Correção em `MasterCanvas.tsx` (`CameraFocus`):**
- Em vez de mover target+câmera, calcular o ângulo entre a posição atual do nó e o eixo da câmera
- Usar `spherical coordinates` para rotacionar o OrbitControls ao redor da origem (0,0,0), trazendo o nó selecionado para a frente
- O target fica em (0,0,0), a câmera gira ao redor até que o nó fique alinhado com o eixo câmera→origem
- Implementação: calcular azimuth/polar alvo baseado na posição do nó, e lerpar os ângulos esféricos do OrbitControls

```text
// Pseudocódigo:
1. Pegar posição do nó selecionado
2. Calcular ângulo esférico (azimuth, polar) do nó relativo à origem  
3. No useFrame, lerpar camera spherical coords para alinhar com o nó
4. Target permanece em (0,0,0) — centro de rotação não muda
```

### Problema 2: Cores dos nós selecionados não diferenciadas
O código já tem a lógica de escala e cor (selected=1.6/full, connected=1.0/0.85, rest=0.12). Preciso verificar se está funcionando — possivelmente o `selectedRef` não está sendo setado corretamente ou o visual é sutil demais.

**Correção em `Nodes3D`:**
- Adicionar um glow ring ou emissive boost extra para o nó selecionado (cor white blend para destacar mais)
- Aumentar diferença: selected = `multiplyScalar(1.2)` com lerpTowards white, connected = `0.7`, rest = `0.08`

### Problema 3: Grupos da sidebar não funcionam
Dois bugs:
1. `activeCategory` nunca é passado ao `NetworkSidebar` — o toggle `isActive` sempre é `false`, então nunca desliga
2. O match falha porque sidebar usa `'Sem categoria'` para nós sem category, mas MasterCanvas guarda `null`

**Correções:**
- Em `NetworkMatrix.tsx`: passar `activeCategory={highlightedCategory}` para `NetworkSidebar`
- Em `MasterCanvas.tsx`: mudar `category: n.category || null` para `category: n.category || 'Sem categoria'` para que o match funcione

### Arquivos modificados
1. `src/components/MasterCanvas.tsx` — CameraFocus (rotação esférica), cores mais contrastantes, category fallback
2. `src/components/NetworkMatrix.tsx` — passar `activeCategory={highlightedCategory}` ao sidebar

