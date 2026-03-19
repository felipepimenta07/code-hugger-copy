

## Plano: Refazer Visual do Master View — Galáxia 3D Limpa

### Problema Atual
Os nós estão com glow excessivo (`r = displayRadius * 2.5` + `filter blur stdDeviation=8`) criando bolhas sobrepostas enormes. Combinado com tamanhos de 6-24px, o resultado é uma massa colorida ilegível.

### Mudanças — `src/components/Canvas.tsx`

#### 1. Reduzir drasticamente o glow filter
- `stdDeviation` do filtro `glow-node`: de `8` → `3`
- Adicionar novo filtro `glow-soft` com `stdDeviation=6` para o halo ambiente (mais leve)

#### 2. Nós menores e mais nítidos
- Tamanho master view: de `6 + importance * 18` (6-24px) → `3 + importance * 10` (3-13px)
- Nós ficam como pontos de estrela, não bolhas

#### 3. Glow halo muito mais sutil
- Raio do halo: de `displayRadius * 2.5` → `displayRadius * 1.8`
- Opacity do halo: de `0.15 + importance * 0.2` → `0.08 + importance * 0.12` (máx ~0.20)
- Threshold: manter `importance >= 0.3`

#### 4. Parallax 3D baseado na importância
- Criar 3 camadas de profundidade baseadas em `importance`:
  - **Fundo** (importance < 0.3): escala 0.85, opacity reduzida, cor mais escura — se movem **menos** com a rotação
  - **Meio** (0.3–0.6): escala 1.0, opacity normal — velocidade padrão
  - **Frente** (> 0.6): escala 1.15, mais brilhantes — se movem **mais** com a rotação
- Implementar no `getDisplayPos` do master view: aplicar offset de parallax multiplicando o ângulo de rotação por um fator de profundidade (`0.7`, `1.0`, `1.4`)

#### 5. Pulse ring mais discreto
- Raio do pulse: de `displayRadius + 4 + pulse * 6` → `displayRadius + 2 + pulse * 3`
- StrokeWidth: de `0.6` → `0.4`
- Opacity: de `0.2 + pulse * 0.15` → `0.1 + pulse * 0.1`

#### 6. Hover glow contido
- Hover extra glow: de `displayRadius + 10` → `displayRadius + 5`
- Opacity: de `0.3` → `0.15`
- Hover scale: manter `1.8`

### Resultado Esperado
- Nós como estrelas com profundidade 3D real via parallax
- Hubs importantes "flutuam na frente", nós menores ficam "atrás"
- Glow sutil e elegante, sem sobreposição de bolhas
- Rotação do globo cria efeito de profundidade com camadas movendo em velocidades diferentes

### Detalhes Técnicos
- Arquivo único: `src/components/Canvas.tsx`
- Seções: filtro SVG defs (~510-517), cálculo nodeSize (~966-968), renderização de nós master (~1014-1060), `getDisplayPos` para parallax offset

