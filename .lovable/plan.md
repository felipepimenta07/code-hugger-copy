

## Plano: Importação LinkedIn Inteligente

Este é um upgrade grande. Vou dividir em fases para manter qualidade.

### Fase 1 (este ciclo): Multi-CSV, Empresa Central, Categoria "linkedin"

#### 1. Tipos (`src/types/linkedin.ts`)
- Adicionar `LinkedInFileEntry` para suportar múltiplos arquivos
- Adicionar campos `sector`, `country` ao `LinkedInContact`

#### 2. Parser (`src/utils/linkedinParser.ts`)
- Adicionar função `mergeLinkedInData` que recebe array de `ParsedLinkedInData`, deduplicando por nome+empresa

#### 3. Modal redesenhado (`src/components/LinkedInImportModal.tsx`)
- Upload aceita **múltiplos CSVs** — mostra lista de arquivos carregados com contagem cada
- Preview unificado com totais merged
- Remover seletor de categoria (será sempre `"linkedin"`)

#### 4. Importação por empresa (`src/components/NetworkMatrix.tsx` - `handleLinkedInImport`)
- Categoria de todas as pessoas importadas: `"linkedin"` (não mais `options.defaultCategory`)
- Categoria das brands importadas: `"linkedin"`
- **Um flow por empresa**: agrupa contatos por company, cria um flow com a brand como `center_type: 'brand'`, pessoas ao redor
- Contatos sem empresa vão para um flow "LinkedIn - Sem Empresa"
- Posicionamento radial: brand no centro (0,0), pessoas distribuídas em círculo ao redor

#### 5. Edge Function IA (`supabase/functions/analyze-linkedin/index.ts`)
- Recebe lista de contatos parseados
- Usa Lovable AI (gemini-2.5-flash) para:
  - Classificar setor de cada empresa
  - Inferir país/região do campo position/company
  - Detectar conexões fracas (pessoas em setores similares sem empresa em comum)
- Retorna contatos enriquecidos com `sector` e `country`

#### 6. Filtros na toolbar (`src/components/NetworkToolbar.tsx` + `NetworkMatrix.tsx`)
- Dropdown "Filtros" com toggles por:
  - País (lista dinâmica)
  - Setor (lista dinâmica)
  - Empresa (lista dinâmica)
- State `linkedinFilters` no NetworkMatrix filtra nós visíveis no canvas
- Filtros só aparecem se existem nós com `category === 'linkedin'`

### Fluxo do Usuário

```text
[Clica LinkedIn] → [Arrasta 1+ CSVs] → [Merge + dedup]
    → [IA enriquece: setores, países, conexões fracas]
    → [Preview: empresas agrupadas, stats]
    → [Importar] → [1 flow por empresa, brand central]
    → [Filtros na toolbar para país/setor/empresa]
```

### Nota sobre categoria
Todos os nós importados pelo LinkedIn terão `category: "linkedin"`, permitindo distinguir facilmente de conexões pessoais criadas manualmente.

