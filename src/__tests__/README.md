# 🧪 QA Baseline - deleteConnection Tests & Flow Architecture

Este diretório contém os testes de baseline para a funcionalidade de deleção de conexões e a nova arquitetura de **flows**.

## 🏗️ Nova Arquitetura de Flows

### Estrutura de Dados

```typescript
// Tabela flows
{
  id: bigint,
  center_id: bigint,        // ID do nó central (project, person, ou brand)
  center_type: string,      // 'project', 'person', ou 'brand'
  name: string,
  user_id: uuid
}

// Tabela projects (com flow_id)
{
  id: bigint,
  name: string,
  flow_id: bigint,          // Referência ao flow
  x: numeric,
  y: numeric,
  user_id: uuid
}

// Tabela connections (com flow_id)
{
  id: bigint,
  from_id: bigint,
  to_id: bigint,
  from_type: string,
  to_type: string,
  flow_id: bigint,          // Referência ao flow
  connection_type: string,
  user_id: uuid
}
```

### Comportamento das Views

**Master View**:
- Mostra todos os flows (cada `center_id` como nó principal)
- Cada flow com mais de 1 conexão tem borda indicativa
- Clicar em um flow → `setActiveProjectId(flow.center_id)` → muda para Single View

**Single View**:
- Renderiza `connections.filter(c => c.flow_id === activeFlowId)`
- Renderiza todos os nós cujos IDs apareçam em `from_id` ou `to_id` dessas conexões
- Deletar conexão → permanece no flow (não reseta para Master)
- Deletar o nó central → volta para Master View

## 📁 Estrutura

```
__tests__/
├── unit/                           # Testes unitários
│   └── deleteConnection.test.tsx
├── integration/                    # Testes de integração
│   └── deleteConnection.integration.test.tsx
├── visual/                         # Testes visuais (Playwright)
│   ├── deleteConnection.visual.spec.ts
│   └── snapshots/                  # Screenshots baseline
└── setup.ts                        # Configuração do Vitest
```

## 🎯 Objetivo do Baseline

Garantir que a funcionalidade `deleteConnection` mantenha o comportamento esperado:

✅ **Remove apenas a conexão selecionada**
✅ **Não afeta nós (nodes)**
✅ **Não reseta o flow/view**
✅ **Mantém o centro da visualização**
✅ **Mantém zoom e pan**
✅ **Permite deletar última conexão do centro sem resetar**

## 🚀 Como Executar os Testes

### Testes Unitários e de Integração (Vitest)

```bash
# Rodar todos os testes
npm test

# Rodar testes no modo watch
npm run dev
vitest

# Rodar testes com UI
npm run test:ui

# Rodar testes com coverage
npm run test:coverage
```

### Testes Visuais (Playwright)

```bash
# Rodar testes visuais
npm run test:visual

# Rodar testes visuais com UI interativa
npm run test:visual:ui

# Atualizar snapshots baseline
npx playwright test --update-snapshots
```

## 🔄 Reset da Rede

O sistema inclui um **botão "Resetar Tudo"** (canto inferior direito, ao lado do QA Button) que permite limpar completamente o banco de dados:

```typescript
// O reset é feito em ordem correta para respeitar foreign keys:
1. Conexões (connections)
2. Flows (flows)
3. Projetos (projects)
4. Pessoas (people)
5. Marcas (brands)
6. Workflows (workflows)
```

**⚠️ ATENÇÃO**: Esta ação é irreversível e deleta TODOS os dados do usuário atual. Uma confirmação é solicitada antes de executar.

### Uso do Reset Button
1. Clique no botão vermelho "Resetar Tudo" (canto inferior direito)
2. Confirme a ação no diálogo
3. Aguarde a conclusão
4. O sistema volta automaticamente para Master View com dados zerados

## 🎨 Botão de QA no Painel

Um botão de QA foi adicionado ao canto inferior esquerdo da aplicação:

- **🔵 "Rodar QA Baseline"**: Inicia os testes simulados
- **⏳ "Rodando testes..."**: Exibe progresso
- **✅ "Todos passaram"**: Testes OK (verde)
- **❌ "Testes falharam"**: Algum teste falhou (vermelho)

Clique no botão para ver detalhes dos testes executados.

> **Nota**: O botão executa uma simulação para demonstração. Para rodar testes reais, use os comandos acima no terminal.

## 📊 Cobertura dos Testes

### Unit Tests
- ✅ Remoção de conexão específica
- ✅ Não afetar outras conexões
- ✅ Retornar array vazio ao deletar todas
- ✅ Não modificar array original
- ✅ Deletar múltiplas conexões

### Integration Tests
- ✅ Deletar sem afetar nós
- ✅ Manter viewMode e activeProjectId
- ✅ Manter centro da view
- ✅ Manter zoom e pan
- ✅ Última conexão não reseta flow

### Visual Tests
- ✅ Canvas antes/depois da deleção
- ✅ Nós permanecem visíveis
- ✅ ViewMode não muda

## 🔧 Configuração

### Vitest (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
  },
});
```

### Playwright (`playwright.config.ts`)
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/visual',
  snapshotDir: './src/__tests__/visual/snapshots',
  use: {
    baseURL: 'http://localhost:5173',
  },
});
```

## 🛠️ Solução de Problemas

### Testes falhando após mudanças no código
1. Verifique se a lógica de `deleteConnection` foi alterada
2. Revise os testes para garantir que ainda são válidos
3. Se o comportamento mudou intencionalmente, atualize os testes

### Snapshots visuais diferentes
1. Execute `npx playwright test --update-snapshots` para atualizar os baselines
2. Verifique se as mudanças visuais são intencionais

### Testes não encontrando elementos
1. Verifique se os seletores CSS/atributos data ainda existem
2. Ajuste os seletores nos testes visuais conforme necessário

## 📝 Adicionar Novos Testes

### Teste Unitário
```typescript
it('deve fazer algo específico', () => {
  const result = deleteConnection(id, connections);
  expect(result).toBeDefined();
});
```

### Teste de Integração
```typescript
it('deve manter o estado correto', () => {
  // Setup
  const initialState = { ... };
  
  // Action
  const newState = performAction(initialState);
  
  // Assert
  expect(newState).toEqual(expectedState);
});
```

### Teste Visual
```typescript
test('deve renderizar corretamente', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('test-name.png');
});
```

## 🎓 Boas Práticas

1. ✅ **Mantenha os testes independentes** - Cada teste deve poder rodar sozinho
2. ✅ **Use beforeEach para setup** - Garante estado limpo para cada teste
3. ✅ **Nomes descritivos** - "deve deletar conexão sem afetar nós"
4. ✅ **Teste comportamento, não implementação** - Foque no resultado final
5. ✅ **Atualize testes quando mudar funcionalidade** - Testes devem refletir o código atual

## 📚 Referências

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)

---

**Última atualização**: 26/10/2025
**Arquitetura**: Flow-based com sincronização Master/Single View
