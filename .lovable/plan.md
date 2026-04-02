

## Plano: Trocar esferas 2D por tetraedros 3D com fog + glow leve

### Problema
As esferas (`sphereGeometry`) com `meshBasicMaterial` parecem bolas 2D — sem profundidade. Não dá pra distinguir frente de trás.

### Inspiração do arquivo enviado
O `brain_hq.html` usa:
- `TetrahedronGeometry(0.25)` — forma 3D com faces angulares que dão senso de profundidade
- `FogExp2(0x000000, 0.01)` — nós distantes ficam mais escuros/invisíveis, criando profundidade natural
- Bloom com `strength: 1.8`, `radius: 0.4`, `threshold: 0` — glow forte mas controlado

### Mudanças em `src/components/MasterCanvas.tsx`

#### 1. Trocar geometria: esfera → tetraedro
- `sphereGeometry args={[0.6, 12, 12]}` → `tetrahedronGeometry args={[0.35]}`
- Forma angular = leitura clara de rotação e profundidade

#### 2. Adicionar Fog exponencial na cena
- Adicionar `<fog attach="fog" args={['#0a0b14', 8, 60]}` (fog linear) ou `<fogExp2 attach="fog" args={['#0a0b14', 0.025]}>`
- Nós distantes desaparecem gradualmente → senso de profundidade real

#### 3. Trocar material para `meshStandardMaterial` ou `meshPhongMaterial`
- `meshBasicMaterial` não reage a luz — tudo parece flat
- Usar `meshStandardMaterial` com `emissive` para manter o glow mas ter sombreamento 3D
- Adicionar `pointLight` no centro da cena para criar sombras nas faces dos tetraedros

#### 4. Ajustar Bloom para glow leve
- Manter `intensity={0.4}` mas baixar `luminanceThreshold` para `0.3` (mais partículas brilham levemente)
- `luminanceSmoothing={0.6}` para suavizar

#### 5. Adicionar rotação sutil nos tetraedros
- No `useFrame`, aplicar uma rotação leve baseada no índice: `_dummy.rotation.set(time * 0.2 + i, time * 0.1, 0)`
- Dá vida e mostra que são objetos 3D reais

### Resultado
- Partículas com **faces angulares** que mudam de brilho conforme o ângulo → profundidade real
- **Fog** faz nós distantes sumirem → frente vs trás claramente distinguíveis
- **Glow leve** mantém a estética galáxia sem saturar
- Visual similar ao brain_hq mas adaptado ao network graph

