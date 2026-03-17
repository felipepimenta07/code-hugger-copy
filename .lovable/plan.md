

## Plano: Teste End-to-End com Dados Reais de Agências Brasileiras

### Cenário de Teste

Vou interagir com o app via browser para simular um uso real completo:

### Passo 1: Resetar tudo
- Clicar no botão "Resetar Tudo" (canto inferior direito) e confirmar

### Passo 2: Criar Flows (agências como centros)
Criar 3 flows representando grandes agências brasileiras:
- **Flow 1**: "Africa Creative" (WPP)
- **Flow 2**: "AlmapBBDO" 
- **Flow 3**: "Wunderman Thompson BR"

### Passo 3: Popular cada flow com dados realistas

**Flow "Africa Creative":**
- **Projetos**: "Campanha Itaú 2026", "Lançamento Brahma Duplo Malte", "Vivo Fibra Rebranding"
- **Pessoas** (fictícias): Ricardo Mendes (Dir. Criação), Camila Torres (Atendimento Itaú), Fernando Lima (Mídia), Juliana Rocha (Planejamento)
- **Marcas**: Itaú, Ambev, Vivo

**Flow "AlmapBBDO":**
- **Projetos**: "Havaianas Verão 2026", "Volkswagen ID.Buzz Launch", "O Boticário Natal"
- **Pessoas**: Marcelo Souza (VP Criação), Ana Beatriz Costa (Atendimento VW), Paulo Henrique (Digital), Renata Alves (Produção)
- **Marcas**: Havaianas, Volkswagen, O Boticário

**Flow "Wunderman Thompson BR":**
- **Projetos**: "HSBC Digital Banking", "Nestlé KitKat Creators", "TIM 5G Experience"
- **Pessoas**: Diego Oliveira (Dir. Estratégia), Larissa Campos (CRM), Bruno Nascimento (Tech Lead), Patrícia Duarte (New Business)
- **Marcas**: HSBC, Nestlé, TIM

### Passo 4: Criar conexões entre flows
- Ambev aparece em Africa e Wunderman (cross-flow)
- Algumas pessoas conectadas a múltiplos projetos

### Passo 5: Testar funcionalidades
- **Master View**: verificar se todos os flows aparecem interconectados
- **Single View**: filtrar por flow e verificar isolamento
- **Busca por IA**: pesquisar "quem trabalha com bebidas?" e "oportunidades no setor bancário"
- **WhatsApp simulation**: verificar como contatos apareceriam

### Execução
Tudo via browser automation — criar nós pelo botão "+ Criar Nó" e "+ Novo Flow", conectar via interface.

**Estimativa**: ~30-40 interações no browser para popular e testar.

