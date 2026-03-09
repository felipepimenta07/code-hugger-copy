

## Plano: Renderizar respostas da IA com formatação visual (Markdown)

### Problema
As respostas do chat da IA são renderizadas como texto puro (linha 490-491), sem nenhuma formatação. Textos longos ficam como bloco corrido.

### Solução
1. **Instalar `react-markdown`** para renderizar markdown nas respostas da IA
2. **Atualizar o sistema prompt** para instruir a IA a usar formatação rica (headers, bullets, emojis, tabelas, negrito)
3. **Aplicar estilos `prose`** nas mensagens do assistente para que headers, listas e tabelas apareçam corretamente
4. **Manter mensagens do usuário** como texto simples (sem markdown)

### Mudanças

**`src/components/AIInsightsPanel.tsx`** (linhas 117-119 e 488-494):
- No `systemMsg`, adicionar instrução: "Responda de forma visual e estruturada usando markdown: use headers (##), listas (- ou 1.), **negrito**, emojis para categorias, e tabelas quando aplicável. Nunca responda em texto corrido."
- Na renderização das mensagens do assistente, trocar `{msg.content}` por `<ReactMarkdown>{msg.content}</ReactMarkdown>` com classes `prose prose-sm prose-invert`

### Resultado
Respostas da IA aparecerão com títulos, listas, negrito, tabelas e emojis organizados visualmente em vez de texto corrido.

