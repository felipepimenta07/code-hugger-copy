
## Diagnóstico: Tela em branco

A tela em branco acontece porque a aplicação exige autenticação. O componente `ProtectedRoute` no `App.tsx` verifica se o usuário está logado:

1. **Enquanto carrega** (`loading = true`): mostra um spinner de loading em fundo escuro — quase invisível.
2. **Sem login** (`user = null`): redireciona para `/auth`.

O problema provável é que o estado de loading está ficando preso ou o redirecionamento para `/auth` não está funcionando corretamente com o token da URL do Lovable.

## Plano de Correção

### 1. Melhorar visibilidade do loading state (App.tsx)
Tornar o spinner de carregamento mais visível adicionando texto maior e melhor contraste.

### 2. Garantir que a rota /auth funcione com query params
Verificar se o `Navigate to="/auth"` preserva ou limpa os query params que podem interferir.

### 3. Adicionar timeout no loading state (useAuth.ts)  
Adicionar um timeout de segurança no hook `useAuth` para que, se a verificação de sessão demorar mais de 5 segundos, o loading seja finalizado — evitando tela presa no spinner.

## Arquivos a modificar
1. **`src/hooks/useAuth.ts`** — adicionar timeout de segurança no loading
2. **`src/App.tsx`** — melhorar visual do loading e garantir redirect correto
