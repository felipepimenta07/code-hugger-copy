// Dados simplificados para demonstração - 3 projetos conectados via Ambev

export const SAMPLE_WORKFLOWS = [
  { id: 1, name: 'Projetos Ambev', color: '#EC4899', description: 'Projetos relacionados à Ambev' },
  { id: 999, name: 'Música BSB - Flow de Teste', color: '#8B5CF6', description: 'Flow fictício para testes de IA' }
];

export const SAMPLE_PROJECTS = [
  { id: 1, name: 'Lançamento Brahma', type: 'project' as const, workflows: [1], category: 'G' as const, status: 'Ativo' as const, deadline: '2025-12-15', x: 500, y: 400 },
  { id: 2, name: 'Festival Corona', type: 'project' as const, workflows: [1], category: 'G' as const, status: 'Ativo' as const, deadline: '2025-11-20', x: 1500, y: 400 },
  { id: 3, name: 'Parceria Skol', type: 'project' as const, workflows: [1], category: 'M' as const, status: 'Ativo' as const, deadline: '2025-10-30', x: 2500, y: 400 },
  { id: 9001, name: 'musica BSB', type: 'project' as const, workflows: [999], category: 'Evento Musical' as const, status: 'Ativo' as const, deadline: '2025-12-31', x: 1500, y: 300 }
];

export const SAMPLE_PEOPLE = [
  // Carlos da Ambev - conectado aos 3 projetos
  { id: 101, name: 'Carlos Silva (Ambev)', type: 'person', company: 'Ambev', workflows: [1], category: 'Cliente', email: 'carlos@ambev.com', x: 1500, y: 200 },
  
  // Pessoas específicas de cada projeto
  { id: 102, name: 'Ana Marketing', type: 'person', company: 'Agência X', workflows: [1], category: 'Profissional', email: 'ana@agenciax.com', x: 650, y: 400 },
  { id: 103, name: 'João Eventos', type: 'person', company: 'EventCo', workflows: [1], category: 'Profissional', email: 'joao@eventco.com', x: 1650, y: 400 },
  { id: 104, name: 'Maria Produção', type: 'person', company: 'ProdCo', workflows: [1], category: 'Profissional', email: 'maria@prodco.com', x: 2650, y: 400 },
  
  // Flow fictício 999 - Música BSB
  { id: 9002, name: 'Carlos Mendes', type: 'person', company: 'Ambev', workflows: [999], category: 'Entretenimento', email: 'carlos.mendes@ambev.com', x: 1000, y: 300 },
  { id: 9003, name: 'Ana Santos', type: 'person', company: 'Heineken', workflows: [999], category: 'Marketing', email: 'ana.santos@heineken.com', x: 1200, y: 450 },
  { id: 9004, name: 'Pedro Costa', type: 'person', company: 'Ambev', workflows: [999], category: 'Produção Musical', email: 'pedro.costa@ambev.com', x: 1500, y: 500 },
  { id: 9005, name: 'Mariana Silva', type: 'person', company: 'Brahma', workflows: [999], category: 'DJ', email: 'mariana.silva@brahma.com', x: 1800, y: 450 },
  { id: 9006, name: 'Lucas Oliveira', type: 'person', company: 'Heineken', workflows: [999], category: 'Eventos', email: 'lucas.oliveira@heineken.com', x: 2000, y: 300 }
];

export const SAMPLE_BRANDS = [
  { id: 201, name: 'Ambev', type: 'brand', category: 'Bebida', workflows: [1], website: 'ambev.com', x: 1500, y: 600 },
  { id: 202, name: 'Agência X', type: 'brand', category: 'Serviços', workflows: [1], website: 'agenciax.com', x: 500, y: 550 },
  { id: 203, name: 'EventCo', type: 'brand', category: 'Serviços', workflows: [1], website: 'eventco.com', x: 1500, y: 550 },
  { id: 204, name: 'ProdCo', type: 'brand', category: 'Serviços', workflows: [1], website: 'prodco.com', x: 2500, y: 550 },
  
  // Flow fictício 999 - Marcas de bebida
  { id: 9007, name: 'Ambev', type: 'brand', category: 'Bebidas', workflows: [999], website: 'ambev.com.br', x: 1000, y: 150 },
  { id: 9008, name: 'Heineken', type: 'brand', category: 'Cervejaria', workflows: [999], website: 'heineken.com.br', x: 1400, y: 100 },
  { id: 9009, name: 'Brahma', type: 'brand', category: 'Bebidas', workflows: [999], website: 'brahma.com.br', x: 1800, y: 100 },
  { id: 9010, name: 'Skol', type: 'brand', category: 'Cervejaria', workflows: [999], website: 'skol.com.br', x: 2200, y: 150 }
];

export const SAMPLE_CONNECTIONS = [
  // Carlos (Ambev) conecta os 3 projetos
  { from: 101, to: 1, type: 'strong' },
  { from: 101, to: 2, type: 'strong' },
  { from: 101, to: 3, type: 'strong' },
  { from: 101, to: 201, type: 'strong' }, // Carlos → Marca Ambev
  
  // Cada projeto tem 1 pessoa específica
  { from: 102, to: 1, type: 'strong' },
  { from: 103, to: 2, type: 'strong' },
  { from: 104, to: 3, type: 'strong' },
  
  // Pessoas → Marcas (suas empresas)
  { from: 102, to: 202, type: 'strong' },
  { from: 103, to: 203, type: 'strong' },
  { from: 104, to: 204, type: 'strong' },
  
  // Marca Ambev conectada aos 3 projetos
  { from: 201, to: 1, type: 'strong' },
  { from: 201, to: 2, type: 'strong' },
  { from: 201, to: 3, type: 'strong' },
  
  // Flow fictício 999 - Conexões internas
  { from: 9002, to: 9001, type: 'strong' }, // Carlos Mendes → musica BSB
  { from: 9003, to: 9001, type: 'strong' }, // Ana Santos → musica BSB
  { from: 9004, to: 9001, type: 'strong' }, // Pedro Costa → musica BSB (produção)
  { from: 9005, to: 9001, type: 'strong' }, // Mariana Silva → musica BSB
  { from: 9006, to: 9001, type: 'strong' }, // Lucas Oliveira → musica BSB (organização)
  
  // Pessoas → Marcas de bebida (flow 999)
  { from: 9002, to: 9007, type: 'strong' }, // Carlos Mendes → Ambev
  { from: 9003, to: 9008, type: 'strong' }, // Ana Santos → Heineken
  { from: 9004, to: 9007, type: 'strong' }, // Pedro Costa → Ambev
  { from: 9005, to: 9009, type: 'strong' }, // Mariana Silva → Brahma
  { from: 9006, to: 9008, type: 'strong' }, // Lucas Oliveira → Heineken
  
  // Marcas → Projeto musica BSB
  { from: 9007, to: 9001, type: 'strong' }, // Ambev → musica BSB
  { from: 9008, to: 9001, type: 'strong' }, // Heineken → musica BSB
  { from: 9009, to: 9001, type: 'strong' }, // Brahma → musica BSB
  { from: 9010, to: 9001, type: 'strong' }  // Skol → musica BSB
];
