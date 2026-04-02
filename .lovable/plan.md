

## Plano: Corrigir bugs restantes

### Diagnóstico
Após analisar o código atual:

1. **Câmera no SingleCanvas3D** — ainda usa o método antigo (offset + lerp target) que "arrasta" em vez de girar. O MasterCanvas já usa rotação esférica, mas o SingleCanvas3D não foi atualizado.

2. **Cores por categoria JÁ estão implementadas** — `getCategoryColor()` é usado em ambos os canvas. Porém, o hash pode mapear categorias diferentes para a mesma cor (21 cores no pool vs 30+ categorias). Preciso aumentar a diferenciação.

3. **Sidebar JÁ passa `activeCategory`** ao NetworkMatrix — o toggle deveria funcionar. O bug pode ser que `onFilterCategory` não é passado (a sidebar chama ambos `onFilterCategory` e `onHighlightCategory` no `onClick`).

### Correções

#### 1. Câmera esférica no SingleCanvas3D
Copiar o padrão do MasterCanvas `CameraFocus` para o `SingleCameraFocus`:
- Usar `THREE.Spherical` para girar a câmera ao redor da origem
- Target fixo em (0,0,0), câmera rota nos ângulos phi/theta

#### 2. Mais cores distintas
Expandir `SEED_COLORS` em `categoryColors.ts` de 21 para ~35 cores, com hues mais espaçados para evitar colisões visuais entre categorias com hashes próximos.

#### 3. Garantir que sidebar funcione completo
Em `NetworkMatrix.tsx`, passar `onFilterCategory` ao `NetworkSidebar` (atualmente só passa `onHighlightCategory`). Sem isso, o clique no grupo não faz toggle visual correto na sidebar.

### Arquivos
1. **`src/components/SingleCanvas3D.tsx`** — substituir `SingleCameraFocus` por rotação esférica
2. **`src/utils/categoryColors.ts`** — expandir paleta de cores
3. **`src/components/NetworkMatrix.tsx`** — passar `onFilterCategory` ao sidebar

