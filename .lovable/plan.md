

## Plano: Corrigir Escuridão e Espaçamento do Master View

### Problemas Identificados
1. **Escuro demais**: Links com opacidade 0.2, nós com fill quase preto, fallback circles com 15% de opacidade
2. **Afastado demais**: Repulsão de -400, colisão raio 50, link distance 120 → auto-fit calcula scale(0.05) = nós invisíveis

### Correções em `src/components/MasterCanvas.tsx`

#### 1. Reduzir forças de dispersão
- `forceManyBody`: -400 → **-150**
- `forceCollide`: radius 50 → **30**
- `forceLink distance`: 120 → **80**
- `forceX/forceY strength`: 0.03 → **0.08** (puxa mais ao centro)

#### 2. Aumentar brilho visual
- Links `stroke-opacity`: 0.2 → **0.4**
- Links `stroke-width`: 1 → **1.5**
- Outer circle fill: `hsl(220, 20%, 6%)` → **`hsl(220, 20%, 12%)`**
- Fallback circle opacity: 0.15 → **0.3**
- Glow drop-shadow: `4px` com `40` hex → **`6px`** com **`80`** hex
- Labels name fill: 90% → **95%**, font-size 9px → **10px**

#### 3. Melhorar auto-fit
- Padding bounds: 200 → **100** (menos margem desperdiçada)
- Scale multiplier: 0.85 → **0.9**
- Scale max: 1.5 → **2.0** (permite zoom mais próximo se rede for pequena)
- Timeout: 2500ms → **1500ms** (simulação estabiliza mais rápido com forças menores)

### Resultado
Nós maiores, mais próximos, mais brilhantes. Auto-fit zoom adequado em vez de 0.05.

