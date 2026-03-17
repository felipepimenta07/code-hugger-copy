

## Problema

O erro `"brands_flow_id_fkey"` acontece porque o código tenta inserir a brand com `flow_id: 1` (placeholder hardcoded) antes de criar o flow. Como `brands.flow_id` tem constraint NOT NULL + foreign key para `flows(id)`, e o flow com id=1 pode não existir, a inserção falha.

Dependencia circular: flow precisa do `center_id` (brand.id), mas brand precisa do `flow_id` (flow.id).

## Solução

**1. Migration: tornar `brands.flow_id` nullable**

```sql
ALTER TABLE public.brands ALTER COLUMN flow_id DROP NOT NULL;
```

Isso permite inserir a brand sem flow_id inicialmente.

**2. Corrigir ordem em `handleLinkedInImport` (NetworkMatrix.tsx)**

Para cada empresa:
1. Inserir brand com `flow_id: null` (sem placeholder)
2. Criar flow com `center_id: brand.id`
3. Atualizar brand com `flow_id: flow.id`

Mesma correção para o bloco "Sem Empresa" (linha 847-848).

Duas linhas mudam: linha 782 e linha 848 — trocar `flow_id: 1` por `flow_id: null`.

