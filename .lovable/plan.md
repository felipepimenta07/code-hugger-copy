
## Revisão Completa do Projeto — Network Matrix

### O que analisei
- `src/components/NetworkMatrix.tsx` (2408 linhas) — componente principal
- `supabase/functions/whatsapp-webhook/index.ts` — lógica de integração WhatsApp
- `src/hooks/useAuth.ts` — autenticação
- `src/components/ResetButton.tsx` — reset de dados
- `src/App.tsx`, `src/pages/Auth.tsx`, `src/pages/Index.tsx` — estrutura da app
- Schema do banco de dados e todas as políticas RLS
- Scan de segurança automático

---

## Problemas Encontrados

### 🔴 CRÍTICOS (quebram funcionalidade)

**1. RLS — Scan de segurança reportou falso positivo**
O scanner acusou que todas as policies são RESTRICTIVE (o que bloquearia tudo), mas ao consultar diretamente o banco, confirmei que todas são PERMISSIVE. **Não é um problema real**, mas o scanner gerou um alerta falso. Isso é ruim porque cria confusão.

**2. Webhook — `flow_id: 0` como valor temporário (linha 501 do webhook)**
No handler `create_node` (botão interativo), o código insere `flow_id: 0` antes de criar o flow. Se a inserção do flow falhar depois, a pessoa fica salva no banco com `flow_id = 0`, que nunca vai ser resolvido. O dado fica "zumbi" no banco.

```typescript
// PROBLEMA: flow_id: 0 como temporário — pode ficar assim se o flow falhar
flow_id: 0, // Temporary, will update after flow creation
```

**3. Webhook — `newPerson` sem null check no handler `awaiting_flow_name` (linha 613-614)**
```typescript
const { data: newPerson } = await supabase.from('people').insert(...).select().maybeSingle();
const { data: newFlow } = await supabase.from('flows').insert({
  center_id: newPerson.id  // 💥 CRASH se newPerson for null!
```
Se a inserção da pessoa falhar, `newPerson` vai ser null e o código vai crashar, resultando em HTTP 500 sem mensagem ao usuário.

**4. `deleteNode` não persiste no banco (linha 1543-1549)**
```typescript
const deleteNode = (nodeId) => {
  saveToHistory();
  setNodes(prev => prev.filter(n => n.id !== nodeId));
  setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
  // ❌ Nunca chama supabase.from(...).delete()!
```
Deletar um nó na UI remove do estado local, mas ao recarregar a página o nó volta porque não foi deletado do banco.

**5. `ResetButton` — `project_workflows`, `person_workflows`, `brand_workflows` são deletadas sem filtro por user_id (linhas 34-43)**
```typescript
supabase.from('project_workflows').delete().gt('project_id', 0),  // Deleta de TODOS os usuários!
```
As tabelas de junção não têm `user_id`, mas o `.gt('project_id', 0)` tenta deletar todos os registros (RLS previne, mas gera erros silenciosos).

**6. Conflito: `loadData` e `localStorage` carregam em sequência errada**
O `useEffect` de `loadData` roda e seta os projetos do banco. Depois, um segundo `useEffect` (linha 411) tenta sobrescrever posições com dados do localStorage. Mas como o `loadData` é assíncrono, pode haver race condition onde o localStorage sobrescreve dados mais novos do banco.

---

### 🟡 SÉRIOS (degradam experiência)

**7. Realtime chama `reloadData()` completo para qualquer mudança**
Cada evento realtime (INSERT, UPDATE, DELETE em qualquer tabela) chama `reloadData()` que busca TODOS os dados de TODAS as tabelas. Para um usuário com rede grande, isso causa:
- Múltiplas requisições simultâneas
- Re-renders completos
- Perda temporária da posição visual

**8. `autoOrganize` no loadData inicial pode sobrescrever posições salvas**
No `loadData` (linha 229-261), há uma lógica que detecta se `master_x/y === 0` e reorganiza. Mas se um nó legítimo estiver em `(0,0)`, vai ser reorganizado sem necessidade, sobrescrevendo a posição no banco.

**9. LinkedIn Import não salva no banco (linhas 484-573)**
`handleLinkedInImport` cria nós com IDs temporários (`Date.now() + index + 20000`) e apenas atualiza o estado local. Nenhuma chamada ao Supabase. Os dados somem ao recarregar.

**10. `exportData` exporta apenas `workflows` (linha 1552-1566)**
```typescript
const dataStr = JSON.stringify(workflows, null, 2);  // ❌ Só exporta workflows, não toda a rede
```
O usuário espera exportar a rede inteira mas recebe apenas os workflows.

**11. `handleFileImport` importa apenas `workflows` (linha 1568-1584)**
Mesmo problema: importação só afeta workflows, não projetos/pessoas/marcas/conexões.

**12. Webhook — texto livre `CONECTAR` com código é processado antes de checar conexão ativa**
No fluxo de texto (linha 213-291), se o usuário já estiver conectado e enviar uma mensagem de texto normal, o código processa `CONECTAR` primeiro, depois cai no handler de conexão. OK. Mas se enviar `CONECTAR` sem código e **já** estar conectado, recebe mensagem de instrução, quando deveria ser tratado como texto normal do fluxo de sessão.

---

### 🟢 MENORES (polimento)

**13. `useNetworkState` e `history` duplicados**
O hook `useNetworkHistory` existe mas o componente implementa sua própria history inline (linhas 732-802). O hook é importado mas não parece ser usado de forma efetiva.

**14. `autoOrganizeOld` ainda existe no código (linha 1148)**
Função morta marcada como "não usada mais" mas ainda no bundle.

**15. `whatsapp_notifications` — usuários não podem inserir, apenas a webhook pode (via service role)**
A RLS da tabela proíbe INSERT de clientes autenticados. A webhook usa `service_role_key` então funciona. Mas se alguém tentar criar uma notificação do front, vai falhar silenciosamente.

**16. Senha sem proteção contra senhas vazadas**
O scan de segurança identificou que "Leaked Password Protection" está desativado. Usuários podem registrar com senhas conhecidamente comprometidas.

**17. Sign Up não verifica email antes de liberar acesso (linha 53-56 do Auth.tsx)**
```typescript
} else {
  if (!isLogin) toast.success('Conta criada com sucesso!');
  navigate('/');  // ← Vai direto pra app, sem esperar confirmação de email
```
O usuário é redirecionado imediatamente após o cadastro sem verificar o e-mail.

---

## Resumo por Prioridade

```text
CRÍTICO — Corrigir imediatamente
├── deleteNode não deleta do banco (dados voltam ao recarregar)
├── flow_id: 0 zumbi no webhook  
└── null crash em awaiting_flow_name

SÉRIO — Corrigir logo
├── ResetButton deleta tabelas de junção sem filtro por user_id
├── LinkedIn Import não salva no banco
├── exportData/importData só afetam workflows
└── Realtime recarrega tudo a cada evento

MENOR — Próximos sprints
├── Senha vazada desativada
├── Código morto (autoOrganizeOld, useNetworkHistory não usado)
└── Race condition localStorage vs loadData
```

## Plano de Correção

Abordar em **3 etapas**:

**Etapa 1 — Correções críticas (cirúrgicas):**
- `deleteNode`: adicionar chamada Supabase para deletar nó e suas conexões
- Webhook `awaiting_flow_name`: adicionar null check e rollback se pessoa falhar
- Webhook `create_node`: inserir person somente DEPOIS de criar o flow para evitar `flow_id: 0` zumbi

**Etapa 2 — Correções sérias:**
- `ResetButton`: filtrar tabelas de junção pelos IDs do usuário antes de deletar
- `handleLinkedInImport`: persistir no banco
- `exportData`: incluir toda a rede, não só workflows

**Etapa 3 — Segurança:**
- Ativar Leaked Password Protection nas configurações de auth

### Arquivos a modificar
- `src/components/NetworkMatrix.tsx` — `deleteNode`, `handleLinkedInImport`, `exportData`
- `src/components/ResetButton.tsx` — filtros nas tabelas de junção
- `supabase/functions/whatsapp-webhook/index.ts` — null checks e ordem de operações
