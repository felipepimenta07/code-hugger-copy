

## Plano: Rede mais compacta + navegação livre (pan + zoom)

### Problemas
1. Flows muito espalhados — força de repulsão ainda forte demais para 336 nós
2. Zoom com scroll existe mas não é suficiente para percorrer distâncias grandes
3. Pan (deslocamento lateral) precisa funcionar com **click direito** ou **dois dedos**, não apenas rotação

### Mudanças em `src/components/MasterCanvas.tsx`

#### 1. Forças ainda mais compactas
- `forceManyBody().strength(-20)` → `strength(-8)` (repulsão mínima, rede bem densa)
- `forceLink.distance(8)` → `distance(4)` e `strength(0.6)` (links mais curtos e fortes)
- `forceCollide().radius(2)` → `radius(1.5)`
- Raio inicial esférico: `10 + random * 8` → `5 + random * 4`
- Adicionar `velocityDecay(0.5)` para estabilizar mais rápido

#### 2. OrbitControls — pan habilitado com tecla
- Adicionar `panSpeed={1.5}` para deslocamento mais rápido
- Usar `mouseButtons` para mapear: botão esquerdo = rotação, botão direito = pan, scroll = zoom
- Adicionar `touches` para mobile: um dedo = rotação, dois dedos = pan/zoom

#### 3. Câmera e auto-fit
- Câmera inicial: `z=60` → `z=40` (ainda mais perto)
- `CameraAutoFit`: multiplicador `1.8` → `1.4`, mínimo `40` → `25`

### Resultado
- Rede aparece como uma nuvem densa e compacta
- Scroll = zoom fluido
- Click-drag esquerdo = rotação
- Click-drag direito = pan (deslocar pelo mapa, ir de um lado pro outro)
- Dois dedos no mobile = pan + pinch zoom

