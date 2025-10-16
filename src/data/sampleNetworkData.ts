// Dados simplificados para demonstração - 3 projetos conectados via Ambev

export const SAMPLE_WORKFLOWS = [
  { id: 1, name: 'Projetos Ambev', color: '#EC4899', description: 'Projetos relacionados à Ambev' }
];

export const SAMPLE_PROJECTS = [
  { id: 1, name: 'Lançamento Brahma', type: 'project' as const, workflows: [1], category: 'G' as const, status: 'Ativo' as const, deadline: '2025-12-15', x: 500, y: 400 },
  { id: 2, name: 'Festival Corona', type: 'project' as const, workflows: [1], category: 'G' as const, status: 'Ativo' as const, deadline: '2025-11-20', x: 1500, y: 400 },
  { id: 3, name: 'Parceria Skol', type: 'project' as const, workflows: [1], category: 'M' as const, status: 'Ativo' as const, deadline: '2025-10-30', x: 2500, y: 400 }
];

export const SAMPLE_PEOPLE = [
  // Carlos da Ambev - conectado aos 3 projetos
  { id: 101, name: 'Carlos Silva (Ambev)', type: 'person', company: 'Ambev', workflows: [1], category: 'Cliente', email: 'carlos@ambev.com', x: 1500, y: 200 },
  
  // Pessoas específicas de cada projeto
  { id: 102, name: 'Ana Marketing', type: 'person', company: 'Agência X', workflows: [1], category: 'Profissional', email: 'ana@agenciax.com', x: 650, y: 400 },
  { id: 103, name: 'João Eventos', type: 'person', company: 'EventCo', workflows: [1], category: 'Profissional', email: 'joao@eventco.com', x: 1650, y: 400 },
  { id: 104, name: 'Maria Produção', type: 'person', company: 'ProdCo', workflows: [1], category: 'Profissional', email: 'maria@prodco.com', x: 2650, y: 400 }
];

export const SAMPLE_BRANDS = [
  { id: 201, name: 'Ambev', type: 'brand', category: 'Bebida', workflows: [1], website: 'ambev.com', x: 1500, y: 600 },
  { id: 202, name: 'Agência X', type: 'brand', category: 'Serviços', workflows: [1], website: 'agenciax.com', x: 500, y: 550 },
  { id: 203, name: 'EventCo', type: 'brand', category: 'Serviços', workflows: [1], website: 'eventco.com', x: 1500, y: 550 },
  { id: 204, name: 'ProdCo', type: 'brand', category: 'Serviços', workflows: [1], website: 'prodco.com', x: 2500, y: 550 }
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
  { from: 201, to: 3, type: 'strong' }
];
