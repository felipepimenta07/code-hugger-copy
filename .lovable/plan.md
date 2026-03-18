

## Plano: Comportamento tipo Globo Interativo na Nuvem de Contatos (Master View)

### Conceito

Inspirado no componente `interactive-globe`, transformar a nuvem estática de nós do Master View em uma experiência orgânica com:
- **Auto-rotação suave** — os nós se movem lentamente em órbita quando ninguém interage
- **Drag para rotacionar** — arrastar o canvas rotaciona toda a nuvem (não move nós individuais)
- **Pulse nos markers** — nós importantes pulsam sutilmente como os markers do globo
- **Arcos animados com traveling dots** — as conexões visíveis ganham um ponto viajante animado (como os arcos do globo)
- **Glow ambiente** — gradiente radial sutil no fundo do canvas

### Implementação

**Arquivo:** `src/components/Canvas.tsx`

#### 1. Auto-rotação da nuvem
- Adicionar `useRef` para ângulo de rotação (`rotationAngle`) e `useEffect` com `requestAnimationFrame`
- A cada frame, incrementar o ângulo (~0.001 rad/frame)
- No `getDisplayPos` para master view, aplicar rotação 2D ao redor do centro (0,0):
  ```text
  newX = x * cos(angle) - y * sin(angle)
  newY = x * sin(angle) + y * cos(angle)
  ```
- Parar auto-rotação quando `isPanning` ou hover ativo

#### 2. Drag para rotacionar (não pan)
- No master view, interceptar o drag do canvas (não de nós individuais) para controlar `rotationAngle` diretamente em vez de `pan`
- `onMouseDown` no canvas: capturar posição inicial e ângulo
- `onMouseMove`: calcular delta horizontal e aplicar como rotação
- Manter o zoom com scroll funcionando normalmente

#### 3. Pulse nos nós importantes
- Nós com `importance >= 0.5` recebem um círculo extra com animação de pulse via CSS
- O raio do pulse varia com `sin(time * 2 + offset)` — cada nó tem offset baseado no seu index para não pulsar sincronizado
- Implementar com `className="animate-pulse"` ou custom keyframe com opacity variável

#### 4. Traveling dots nas conexões
- Para conexões visíveis no master view (importance >= 0.25), adicionar um `<circle>` animado que viaja ao longo do `path`
- Usar `requestAnimationFrame` com `timeRef` para calcular posição `t` ao longo da curva quadrática
- Fórmula bezier: `P(t) = (1-t)²·P0 + 2(1-t)t·Pc + t²·P1`
- `t` oscila com `(sin(time + offset) + 1) / 2`
- Cor: mesma da conexão, raio ~2px, opacity 0.6

#### 5. Glow ambiente no fundo
- Adicionar um `<defs><radialGradient>` no SVG com gradiente azul sutil (opacity ~0.03 no centro, 0 nas bordas)
- Renderizar `<rect>` com esse fill antes dos nós

### Arquivos alterados
- `src/components/Canvas.tsx` — auto-rotação, drag-to-rotate, pulse, traveling dots, glow ambiente

