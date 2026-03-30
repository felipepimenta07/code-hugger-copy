

## Plano: Nós mais próximos + zoom do mouse funcional

### Mudanças em `src/components/MasterCanvas.tsx`

#### 1. Rede mais compacta
- Raio inicial esférico: `30 + random * 20` → `10 + random * 8`
- `forceManyBody().strength(-40)` → `strength(-20)` (menos repulsão)
- `forceLink.distance(15)` → `distance(8)`
- `forceCollide().radius(3)` → `radius(2)`

#### 2. Câmera mais perto
- Posição inicial: `z=120` → `z=60`
- `CameraAutoFit` multiplicador: `maxDist * 2.5` → `maxDist * 1.8`, mínimo `80` → `40`

#### 3. Zoom do mouse mais responsivo
- `OrbitControls` `zoomSpeed={1.2}` → `zoomSpeed={2.0}`
- `minDistance={5}` → `minDistance={2}` (permite chegar bem perto)
- `maxDistance={800}` → `maxDistance={500}`

### Resultado
Rede aparece bem mais próxima e compacta ao carregar, e o scroll do mouse faz zoom mais rápido e com mais alcance.

