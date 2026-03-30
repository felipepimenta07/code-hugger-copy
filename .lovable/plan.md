

## Plano: Corrigir Zoom e Visibilidade do Master View 3D

### Problemas
1. **336 nós** se espalham muito no espaço 3D — câmera em z=80 não alcança a rede toda
2. `onWheel stopPropagation` no div container **bloqueia** o evento de scroll antes de chegar ao Canvas/OrbitControls
3. Sem auto-fit: a câmera não se ajusta ao tamanho da rede

### Correções em `src/components/MasterCanvas.tsx`

#### 1. Remover `onWheel stopPropagation` do container
O `e.stopPropagation()` impede o scroll de chegar ao R3F Canvas. Remover essa linha resolve o zoom com scroll.

#### 2. Adicionar auto-fit da câmera após simulação estabilizar
Criar um componente `CameraAutoFit` que:
- Após a simulação terminar (ou após N ticks), calcula o bounding box dos nós
- Usa `camera.position.set(0, 0, maxExtent * 1.5)` para enquadrar toda a rede
- Permite que o OrbitControls continue funcionando normalmente depois

#### 3. Ajustar forças para rede mais compacta
- `charge`: `-80` → `-40` (menos repulsão, rede mais densa)
- `link.distance`: `25` → `15`
- `forceCollide.radius`: `5` → `3`
- Camera inicial: `z=80` → `z=120` (mais distante para capturar rede maior)

#### 4. Implementar auto-fit com `useThree`
Dentro do Scene, após simulação estabilizar:
```
const { camera } = useThree();
// calcular bounds dos nós e ajustar camera.position.z
```

### Resultado
- Scroll do mouse faz zoom
- Click-drag rotaciona
- Câmera se ajusta automaticamente ao tamanho da rede
- Nós mais próximos e visíveis

