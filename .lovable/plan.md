

## Plano: Corrigir layout 3D dos nós (plano → esfera)

### Problema

Os nós aparecem "lado a lado" (achatados) porque **`d3-force` é 2D** — só simula `x` e `y`. O `z` é definido uma vez aleatoriamente e nunca muda durante a simulação, resultando num disco plano com leve ruído em z.

### Solução

Substituir `d3-force` por **`d3-force-3d`**, que estende a mesma API para 3 dimensões (x, y, z). Todas as forças (charge, link, center, collision) passam a atuar nos 3 eixos.

Além disso, adicionar **bloom post-processing** para o visual brilhante do arquivo de referência.

### Mudanças

#### 1. Instalar `d3-force-3d`
- `npm install d3-force-3d`
- Remover imports de `d3-force`, usar `d3-force-3d` no lugar (mesma API, com z)

#### 2. `src/components/MasterCanvas.tsx`

**Simulação**:
- Trocar imports de `d3-force` → `d3-force-3d` (`forceSimulation`, `forceManyBody`, `forceCenter`, `forceCollide`, `forceLink`)
- `forceCenter(0, 0, 0)` — agora com z
- Remover `forceX` e `forceY` separados, usar o centering 3D
- Inicializar z com distribuição esférica em vez de ruído linear

**Bloom**:
- Adicionar `@react-three/postprocessing` e usar `EffectComposer` + `Bloom` do R3F para o efeito de glow nos nós (similar ao `UnrealBloomPass` do arquivo de referência)
- `strength: 1.5`, `radius: 0.4`, `threshold: 0`

**Material dos nós**:
- Trocar `meshStandardMaterial` por `meshBasicMaterial` para que o bloom funcione melhor (sem iluminação, cor pura = brilho máximo)

### Resultado
Os nós se distribuem como uma **nuvem esférica 3D** (não mais um disco plano), com efeito de bloom/glow brilhante.

