

## Plano: Nós compactos de verdade no Master View 3D

### Causa raiz

O código usa `n.master_x` e `n.master_y` do banco de dados como posição inicial dos nós (linha 317-318). Esses valores são coordenadas do canvas 2D — na faixa de **200-600 pixels**. Resultado: nós começam a centenas de unidades de distância, e as forças fracas do d3-force-3d não conseguem puxar tudo para perto.

### Correções em `src/components/MasterCanvas.tsx`

#### 1. Ignorar `master_x`/`master_y` na inicialização 3D
- Sempre usar distribuição esférica com raio pequeno (`2 + random * 2`)
- Essas coordenadas 2D não fazem sentido no espaço 3D

#### 2. Forças mais agressivas para compactar
- `forceManyBody().strength(-8)` → `strength(-3)` (repulsão mínima)
- `forceLink.distance(4)` → `distance(2)` e `strength(0.8)`
- `forceCollide().radius(1.5)` → `radius(0.8)`
- `forceCenter` com `strength(0.15)` para puxar tudo ao centro

#### 3. Nós menores visualmente
- `sphereGeometry args={[2.5, 16, 16]}` → `args={[0.6, 12, 12]}` (esferas menores = mais espaço visual entre eles)

#### 4. Câmera e auto-fit
- Câmera inicial: `z=40` → `z=30`
- Auto-fit multiplicador: `1.4` → `2.0` (garante que tudo caiba)
- Mínimo: `25` → `15`

### Resultado
- Todos os nós ficam numa nuvem esférica compacta de raio ~5-10 unidades
- Conexões/links claramente visíveis entre nós próximos
- Visual similar ao arquivo PLY de referência (pontos densos numa esfera)

