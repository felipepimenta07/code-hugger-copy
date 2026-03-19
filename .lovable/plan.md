

## Plano: Melhorar Visual do Master View

### Problemas atuais
1. **Cross-flow connections (laranja dashed)** dominam a tela — opacity 0.5 e strokeWidth 2-2.5 são muito altos
2. **Arcos curvados** (`controlY2 = midY - 60`) criam formas de "leque" poluindo a vista
3. **Ambient glow** muito pequeno (rx/ry=120) — não cobre a nuvem
4. **Traveling dots** seguem arcos curvados altos, amplificando a poluição

### Correções — `src/components/Canvas.tsx`

#### 1. Cross-flow connections: quase invisíveis
- Linhas 670-678: Reduzir opacity de 0.5→0.06, strokeWidth de 2-2.5→0.5, remover `strokeDasharray` (linhas sólidas finas)

#### 2. Conexões normais no master view: mais sutis
- Linhas 778-781: strokeWidth 2→0.4, opacity 0.3→0.08 (base)
- Linhas 786-793: manter hover destacando (opacity 0.35), mas base ainda mais sutil

#### 3. Arcos achatados no master view
- Linhas 803-804: No master view, usar `controlY2 = midY - 3` em vez de `midY - 60` (quase reto)
- Linhas 870: Mesmo achatamento para traveling dots

#### 4. Ambient glow maior
- Linha 543: `rx="120" ry="120"` → `rx="280" ry="280"`

#### 5. Traveling dots: seguir linhas achatadas
- Linha 870: `controlY2` deve usar o mesmo offset reduzido do master view

### Resultado esperado
- Nós coloridos como estrelas no espaço — protagonistas
- Conexões quase invisíveis, emergindo sutilmente no hover
- Glow ambiente envolvendo toda a nuvem
- Visual limpo sem artefatos de linhas grossas

