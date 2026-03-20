

## Plano: Edge Function `import-contacts`

### Arquivo: `supabase/functions/import-contacts/index.ts`

Nova edge function que:
1. Valida CORS (OPTIONS handler)
2. Autentica via Bearer token usando `createClient` + `auth.getUser()`
3. Mapeia os campos do payload para as colunas da tabela `linkedin_contacts` (`name`, `headline` → `headline`, `profileUrl` → `profile_url`, `photoUrl` → `photo_url`, `connectedDate` → `connected_date`)
4. Faz upsert com `ignoreDuplicates` usando `user_id` + `profile_url` como critério de unicidade (ou insert simples com `onConflict`)
5. Retorna `{ imported: count }`

### Arquivo: `supabase/config.toml`
- Adicionar `[functions.import-contacts]` com `verify_jwt = false` (validação no código)

### Nota sobre duplicatas
A tabela `linkedin_contacts` não tem constraint unique em `(user_id, profile_url)`. Será necessária uma migration para adicionar `UNIQUE(user_id, profile_url)` para que o upsert com `onConflict` funcione. Alternativamente, usar insert simples com `ON CONFLICT DO NOTHING` via SQL direto.

**Abordagem escolhida**: Criar migration com unique constraint em `(user_id, profile_url)`, depois usar `.upsert()` com `onConflict: 'user_id,profile_url'` e `ignoreDuplicates: true`.

### Arquivos
1. Migration SQL: `ALTER TABLE linkedin_contacts ADD CONSTRAINT ... UNIQUE(user_id, profile_url)`
2. `supabase/functions/import-contacts/index.ts` — a edge function
3. `supabase/config.toml` — registrar a function

