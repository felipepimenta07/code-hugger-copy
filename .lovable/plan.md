

## Problema: Análise IA do LinkedIn não funciona

### Diagnóstico

Os logs da edge function `analyze-linkedin` mostram apenas boots e shutdowns — nenhum log de processamento de request. Isso indica que as requisições estão sendo bloqueadas antes de chegar ao código.

**Causa raiz**: O `supabase/config.toml` não tem a configuração da função `analyze-linkedin`. Sem configuração explícita, a verificação JWT pode estar causando rejeição silenciosa. Além disso, com 1186 contatos, o payload pode ser muito grande para o AI gateway processar.

### Solução

**1. Configurar a edge function no `config.toml`**

Adicionar a configuração da função com `verify_jwt = false` (a autenticação será validada manualmente no código se necessário):

```toml
[functions.analyze-linkedin]
verify_jwt = false
```

**2. Otimizar o payload para a IA**

Com 1186 contatos, enviar todos os objetos completos é desnecessário. Já fazemos resumo por empresa no edge function, mas o body da request do cliente envia todos os 1186 contatos com todos os campos. Limitar os dados enviados ao necessário (nome, empresa, posição) para reduzir o tamanho do payload.

**3. Adicionar logging na edge function**

Adicionar `console.log` no início do handler para confirmar que requests estão chegando, e logs antes/depois da chamada ao AI gateway.

**4. Testar a função após deploy**

Invocar a edge function com um payload pequeno de teste para confirmar que funciona.

### Arquivos alterados
- `supabase/config.toml` — adicionar configuração da função
- `supabase/functions/analyze-linkedin/index.ts` — adicionar logs de debug
- `src/components/LinkedInImportModal.tsx` — otimizar payload enviado (só campos necessários)

