

## Problema

O parser CSV retorna **0 contatos** porque o formato real do LinkedIn não bate com o esperado. O CSV exportado do LinkedIn frequentemente:

1. **Começa com linhas de metadados** (ex: "Notes:", linhas em branco) antes do header real
2. **Usa headers ligeiramente diferentes** dependendo do idioma/versão (ex: "First Name" vs "Nome")
3. **Tem BOM (Byte Order Mark)** no início do arquivo que quebra a detecção do header

O parser atual assume que a **linha 0** é sempre o header, mas no LinkedIn real pode não ser.

## Plano de correção

**Arquivo: `src/utils/linkedinParser.ts`**

1. **Remover BOM** do início do conteúdo CSV
2. **Auto-detectar a linha do header** — procurar a primeira linha que contenha pelo menos 2 dos headers conhecidos (`first name`, `last name`, `company`, `email`, `position`, `connected on`) em vez de assumir linha 0
3. **Suportar headers em português** (`Nome`, `Sobrenome`, `Empresa`, `Cargo`, `E-mail`)
4. **Adicionar console.log** temporário com os headers detectados e quantidade de contatos parsed para debug
5. **Tratar caso onde nenhum header é encontrado** — lançar erro descritivo com os headers que foram encontrados no arquivo

**Arquivo: `src/components/LinkedInImportModal.tsx`**

6. **Mostrar os headers detectados** no preview após upload, para o usuário ver se o CSV foi lido corretamente
7. **Mostrar mensagem de erro clara** se 0 contatos forem encontrados após parse

