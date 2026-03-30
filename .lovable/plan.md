

## Plano: Master View 3D com Three.js

### O que muda

Substituir o MasterCanvas atual (D3 SVG 2D) por um canvas 3D completo usando **React Three Fiber** + **Three.js**. Os nós viram esferas luminosas flutuando no espaço 3D com câmera orbital, links viram linhas 3D, e o fundo ganha profundidade com estrelas/partículas decorativas.

### Dependências a instalar

- `three@>=0.133`
- `@react-three/fiber@^8.18`
- `@react-three/drei@^9.122.0`

### Arquivos

#### 1. Reescrever: `src/components/MasterCanvas.tsx`

Componente React Three Fiber que substitui o D3 SVG:

- **`<Canvas>`** do R3F com câmera perspectiva e fundo escuro `#0a0b14`
- **`<OrbitControls>`** do drei para rotação/zoom/pan (substitui d3-zoom)
- **Simulação de forças** usando `d3-force` em loop `useFrame` — mesmos parâmetros atuais (`forceManyBody(-150)`, `forceLink(80)`, `forceCollide(30)`) mas mapeados para coordenadas 3D (x, y, z)
- **Nós como esferas brilhantes**:
  - `<instancedMesh>` com `<sphereGeometry>` para performance (centenas de nós)
  - Cor por tipo: person=rosa, project=verde, brand=roxo (mesmas cores HSL atuais)
  - Efeito glow via `<meshStandardMaterial emissive={...} emissiveIntensity={1.5}>`
  - Labels flutuantes com `<Html>` do drei (nome + categoria)
- **Links como linhas 3D**:
  - `<Line>` do drei ou `<lineSegments>` com `BufferGeometry`
  - Cor por tipo de conexão (mesmas cores atuais)
  - Opacidade 0.3, semi-transparentes
- **Interações**:
  - Click no nó → `onNodeClick` (abre detail panel)
  - Double click → `onNodeDoubleClick` (entra no flow)
  - Hover → highlight com bloom/emissive increase
  - Drag de nós via `useDrag` do drei ou `onPointerDown/Move/Up`
- **Efeitos visuais**:
  - `<Stars>` do drei no fundo para profundidade
  - Bloom post-processing via `<EffectComposer>` + `<Bloom>` (opcional, se performance permitir)
  - Iluminação ambiente + point light no centro

#### 2. Sem mudanças em `NetworkMatrix.tsx`

A interface do `MasterCanvas` (props) permanece idêntica — `allNodes`, `allConnections`, `flows`, `onNodeClick`, `onNodeDoubleClick`. O NetworkMatrix não precisa mudar.

### Arquitetura interna do componente

```text
MasterCanvas
├── <Canvas> (R3F)
│   ├── <ambientLight>
│   ├── <pointLight>
│   ├── <Stars> (background)
│   ├── <OrbitControls>
│   ├── <Links3D> (linhas entre nós)
│   ├── <Nodes3D> (esferas instanciadas)
│   │   └── hover/click handlers por nó
│   └── <NodeLabels> (Html overlays)
└── Force simulation (d3-force em useFrame)
```

### Performance

- `InstancedMesh` para nós (1 draw call para todas as esferas)
- `BufferGeometry` para links (1 draw call para todas as linhas)
- Labels HTML renderizados apenas para nós visíveis (frustum culling)
- Simulação d3-force roda por ~100 ticks e para (não roda infinitamente)

### Resultado

Visualização 3D imersiva com esferas luminosas, câmera orbital livre, links semi-transparentes e fundo estrelado. Mesma funcionalidade (click, double-click, hover) mas em 3D.

