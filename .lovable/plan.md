

## Plano: Trazer de volta o glow forte inspirado no brain_hq.html

### Problema atual
O Bloom está com `intensity={0.4}` e `luminanceThreshold={0.3}` — muito fraco, quase invisível. O material tem `emissive="#ffffff"` com `emissiveIntensity={0.3}` — também fraco. Resultado: tudo parece opaco e sem vida.

### Referência do brain_hq.html
O arquivo original usava Bloom com `strength: 1.8`, `radius: 0.4`, `threshold: 0` — glow forte e envolvente.

### Mudanças em `src/components/MasterCanvas.tsx`

#### 1. Aumentar Bloom significativamente
- `intensity={0.4}` → `intensity={1.2}`
- `luminanceThreshold={0.3}` → `luminanceThreshold={0.1}`
- `luminanceSmoothing={0.6}` → `luminanceSmoothing={0.9}`
- Resultado: glow visível e bonito em todos os nós

#### 2. Aumentar emissive do material
- `emissive="#ffffff" emissiveIntensity={0.3}` → `emissiveIntensity={0.6}`
- Os nós emitem mais luz, alimentando o Bloom

#### 3. Aumentar intensidade da pointLight
- `intensity={1.2}` → `intensity={2.0}`
- Mais luz nas faces dos tetraedros = mais brilho nas arestas

#### 4. Aumentar cores base no estado normal
- `multiplyScalar(0.5)` (normal) → `multiplyScalar(0.7)`
- Nós ficam mais coloridos mesmo sem hover, mas ainda distintos do hover (que fica 1.0)

#### 5. Ajustar tone mapping exposure
- `toneMappingExposure = 1.2` → `1.5` para deixar a cena mais luminosa no geral

### Resultado
Visual rico com glow envolvente nos nós, faces dos tetraedros brilhando com luz, similar ao brain_hq.html mas adaptado ao network graph. Hover e seleção continuam funcionando normalmente por cima.

