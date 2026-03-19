

## Plano: Refazer Master View do Zero — Navegação 3D via Zoom

### Problema Central
O layout atual comprime todos os nós num raio de ~30px (`spread = 30 * (1 - imp * 0.6)`), criando uma bolha ilegível. O zoom apenas escala essa bolha — não revela camadas nem dá sensação de "entrar" na rede.

### Conceito: Semantic Zoom (Zoom Semântico)
Inspirado em mapas (Google Maps): ao dar zoom, você **entra** na rede e descobre mais detalhes progressivamente.

```text
Zoom 0.3 (afastado)    Zoom 1.0 (médio)       Zoom 2.5+ (perto)
┌─────────────┐      ┌─────────────┐       ┌─────────────┐
│    ●  ●     │      │   ●──●      │       │  [Ana]──[João]│
│  ●    ●     │      │  ●──●──●    │       │   │    │     │
│    ●        │      │     ●──●    │       │  [Maria]     │
│             │      │             │       │   labels +   │
│ só hubs     │      │ + conexões  │       │   categorias │
└─────────────┘      └─────────────┘       └─────────────┘
```

### Mudanças — `src/components/Canvas.tsx`

#### 1. Layout expandido (não mais bolha comprimida)
- Mudar `spread` de `30` → `400` no `masterLayoutMap`
- Força de repulsão: `-25` → `-120` (nós se afastam mais)
- Força central: `0.8` → `0.15` (menos compressão)
- Resultado: nós distribuídos num espaço de ~800x800px em vez de ~60x60px

#### 2. Zoom semântico — 3 camadas de visibilidade
No `isNodeVisibleAtZoom`:
- **Zoom < 0.5**: Só nós com importance >= 0.6 (hubs principais)
- **Zoom 0.5–1.5**: Nós com importance >= 0.2 (conectados relevantes)
- **Zoom > 1.5**: Todos os nós visíveis
- Nós aparecem com fade-in suave (opacity 0→1 na transição)

#### 3. Conexões aparecem progressivamente
- **Zoom < 0.8**: Sem conexões visíveis
- **Zoom 0.8–1.5**: Só conexões entre hubs (ambos importance >= 0.4)
- **Zoom > 1.5**: Todas as conexões
- StrokeWidth e opacity escalam com zoom

#### 4. Tamanho dos nós escala com zoom
- Em vez de tamanho fixo, usar: `nodeSize = (3 + importance * 10) / Math.sqrt(zoom)`
- Nós mantêm tamanho visual consistente independente do zoom
- No zoom alto, nós "próximos" mostram label + categoria

#### 5. Labels aparecem no zoom alto
- **Zoom < 2.0**: Sem labels (só dots)
- **Zoom 2.0–3.0**: Nome aparece no hover
- **Zoom > 3.0**: Nome sempre visível nos nós importantes

#### 6. Remover parallax/rotação
- Remover auto-rotação e drag-to-rotate do master view
- Manter pan + zoom como navegação principal
- A sensação de 3D vem do semantic zoom, não de rotação

#### 7. Zoom inicial ajustado
- No `useNetworkState.ts`: zoom inicial de `2.3` → `0.4` (começa afastado, vendo a nuvem inteira)
- Pan inicial centrado na nuvem

### Mudanças — `src/hooks/useNetworkState.ts`
- `zoom: 2.3` → `zoom: 0.4`
- `pan: { x: 400, y: 300 }` → centrado no viewport

### Resultado Esperado
- Zoom out: vê a galáxia inteira como constelação de pontos
- Zoom in gradual: conexões aparecem, nós crescem, labels surgem
- Zoom profundo: como estar "dentro" da rede, vendo detalhes de cada nó
- Sensação de navegação 3D via camadas de informação progressiva

### Arquivos
1. `src/components/Canvas.tsx` — layout, visibilidade, renderização
2. `src/hooks/useNetworkState.ts` — zoom inicial

