

## Plano: Aumentar fontes significativamente em todo o site

### Mapeamento de tamanhos

| Antes | Depois |
|-------|--------|
| `text-xs` (12px) | `text-sm` (14px) |
| `text-sm` (14px) | `text-base` (16px) |
| `text-lg` (18px) | `text-xl` (20px) |
| Icons `size={11-12}` | `size={14-16}` |
| Icons `size={14}` | `size={16}` |
| Icons `size={16}` | `size={18}` |
| SVG fontSize `13` | `15` |
| SVG fontSize `11` | `13` |

### Arquivos e mudanças

**1. `NetworkToolbar.tsx`**
- Botões Master/Single/Ajustar/Reset: `text-xs` → `text-sm`
- Ícones Layers/Target/Tag/Sparkles: `size={12}` → `size={14}`, `size={11}` → `size={14}`
- Search input: `text-sm` → `text-base`, `h-7` → `h-8`
- Contador "NÓS · CONEXÕES": `text-xs` → `text-sm`
- Menu icon: `size={16}` → `size={18}`
- Dropdown items: `size={14}` → `size={16}`
- Toolbar padding: `py-1.5` → `py-2`

**2. `NetworkSidebar.tsx`**
- Título "Network Matrix": `text-xs` → `text-sm`
- Subtítulo: `text-xs` → `text-sm`
- "Grupos (N)": `text-xs` → `text-sm`
- Nomes de categoria: `text-sm` → `text-base`
- Contadores: `text-xs` → `text-sm`
- Sidebar width: `200` → `220`
- Color dots: `w-2 h-2` → `w-2.5 h-2.5`

**3. `NodeDetailPanel.tsx`**
- Tipo/categoria label: `text-xs` → `text-sm`
- Nome do nó: `text-lg` → `text-xl`
- Info fields (email, phone etc): `text-sm` → `text-base`, icons `size={12}` → `size={14}`
- Company: `text-sm` → `text-base`
- Botão Editar: `text-xs` → `text-sm`, `h-7` → `h-8`
- "Conexões Diretas": `text-xs` → `text-sm`
- Connection names: `text-sm` → `text-base`
- Connection type/company: `text-xs` → `text-sm`
- Panel width: `w-[340px]` → `w-[380px]`

**4. `Canvas.tsx`**
- Node name label fontSize: `13` → `15` (hover `14` → `16`)
- Category subtitle fontSize: `11` → `13`
- Label offset y: `nodeSize + 18` → `nodeSize + 20`, subtitle `nodeSize + 34` → `nodeSize + 38`

6 arquivos, ~40 linhas de mudança.

