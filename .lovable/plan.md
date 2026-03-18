

## Apagar 724 nós do LinkedIn (manter ~300)

### Situação atual
- **690 people** com `category = 'linkedin'` em 334 flows
- **334 brands** com `category = 'linkedin'` (1 por flow)
- **690 connections** ligando people às brands
- Total: 1024 nós → precisa reduzir para ~300

### Estratégia
Manter os flows com mais contatos (os maiores/mais relevantes) e apagar os flows menores até ficar com ~300 nós totais. Cada flow contém 1 brand + N people, então mantemos os top ~X flows cujo total acumulado ≈ 300.

Pelos dados, os top 20 flows somam ~260 people + 20 brands = ~280 nós. Mantendo ~25–30 flows maiores chegamos perto de 300.

### Execução via SQL migration

Uma única migration que:

1. **Identifica os flows a manter** — top flows por contagem de people até acumular ~300 nós (people + brands)
2. **Deleta connections** dos flows LinkedIn que NÃO estão na lista de mantidos
3. **Deleta people** desses flows
4. **Deleta brands** desses flows  
5. **Deleta os flows** vazios

```sql
-- Flows to keep: top flows by people count, accumulated up to ~300 total nodes
WITH ranked_flows AS (
  SELECT flow_id, count(*) as cnt,
    SUM(count(*) + 1) OVER (ORDER BY count(*) DESC) as running_total
  FROM people WHERE category = 'linkedin'
  GROUP BY flow_id
),
flows_to_keep AS (
  SELECT flow_id FROM ranked_flows WHERE running_total <= 300
),
flows_to_delete AS (
  SELECT DISTINCT flow_id FROM people 
  WHERE category = 'linkedin' AND flow_id NOT IN (SELECT flow_id FROM flows_to_keep)
)
-- Then cascade delete connections, people, brands, flows
```

### Nenhuma mudança em código
Só dados — os componentes já renderizam o que existe no banco.

