

## Plano: Forçar todos os nós para dentro de uma esfera compacta

### Por que ainda estão longe

O `forceCenter` com `strength(0.15)` é fraco demais — ele só empurra o **centro de massa** para (0,0,0), mas não impede que nós individuais se afastem. Já existe `forceRadial` no import mas **não está sendo usado** na simulação atual. Sem uma força radial forte, os nós de flows diferentes (que não têm links entre si) se repelem e ficam em "ilhas" distantes.

### Correções em `src/components/MasterCanvas.tsx`

#### 1. Adicionar `forceRadial` forte para confinar tudo numa esfera
- `.force('radial', forceRadial(4, 0, 0, 0).strength(0.3))` — puxa todos os nós para ficarem a ~4 unidades do centro, como uma casca de esfera
- Isso garante que flows desconectados não fujam para longe

#### 2. Aumentar `forceCenter` 
- `forceCenter(0, 0, 0).strength(0.15)` → `.strength(0.4)` — puxa o centro de massa mais forte

#### 3. Reduzir repulsão ainda mais
- `forceManyBody().strength(-3)` → `strength(-1.5)` — menos repulsão = nós ficam mais grudados

#### 4. Links mais curtos
- `forceLink.distance(2)` → `distance(1.2)` — nós conectados ficam ainda mais perto

#### 5. Câmera mais perto
- Câmera inicial: `z=18` → `z=14`
- Auto-fit: `maxDist * 2.4` → `maxDist * 2.0`, mínimo `10` → `8`

### Resultado
Todos os flows ficam confinados numa esfera de raio ~4-6 unidades — como um globo terrestre com tudo dentro. Flows sem conexão entre si ficam em partes diferentes da esfera, mas **dentro dela**, não em ilhas distantes.

