import { describe, it, expect, beforeEach } from 'vitest';
import { deleteConnection } from '@/utils/deleteConnection';

describe('Integration: deleteConnection baseline', () => {
  let testState: any;

  beforeEach(() => {
    testState = {
      nodes: [
        { id: 1, type: 'project', name: 'Centro', x: 300, y: 200 },
        { id: 2, type: 'person', name: 'Nó A', x: 150, y: 100 },
        { id: 3, type: 'person', name: 'Nó B', x: 450, y: 100 },
      ],
      connections: [
        { id: 1, from: 1, to: 2, strength: 'strong' },
        { id: 2, from: 1, to: 3, strength: 'medium' },
      ],
      viewMode: 'single',
      activeProjectId: 1,
      viewCenter: { x: 300, y: 200 },
      zoom: 1,
      pan: { x: 0, y: 0 },
    };
  });

  it('deve deletar conexão sem afetar nós', () => {
    const nodesBefore = testState.nodes.length;
    testState.connections = deleteConnection(1, testState.connections);

    expect(testState.connections.length).toBe(1);
    expect(testState.nodes.length).toBe(nodesBefore);
    expect(testState.nodes[0].id).toBe(1);
    expect(testState.nodes[1].id).toBe(2);
    expect(testState.nodes[2].id).toBe(3);
  });

  it('deve manter o viewMode e activeProjectId', () => {
    const viewModeBefore = testState.viewMode;
    const activeProjectIdBefore = testState.activeProjectId;

    testState.connections = deleteConnection(1, testState.connections);

    expect(testState.viewMode).toBe(viewModeBefore);
    expect(testState.activeProjectId).toBe(activeProjectIdBefore);
  });

  it('deve manter o centro da view', () => {
    const centerBefore = { ...testState.viewCenter };
    testState.connections = deleteConnection(1, testState.connections);

    expect(testState.viewCenter).toEqual(centerBefore);
  });

  it('deve manter zoom e pan', () => {
    const zoomBefore = testState.zoom;
    const panBefore = { ...testState.pan };

    testState.connections = deleteConnection(2, testState.connections);

    expect(testState.zoom).toBe(zoomBefore);
    expect(testState.pan).toEqual(panBefore);
  });

  it('deve permitir deletar última conexão do centro sem resetar flow', () => {
    testState.connections = deleteConnection(1, testState.connections);
    testState.connections = deleteConnection(2, testState.connections);

    expect(testState.connections.length).toBe(0);
    expect(testState.activeProjectId).toBe(1);
    expect(testState.viewMode).toBe('single');
    expect(testState.nodes.length).toBe(3);
  });

  it('deve manter nós secundários visíveis após deletar conexão', () => {
    const connectionId = 1; // conexão entre Centro (id:1) e Nó A (id:2)
    testState.connections = deleteConnection(connectionId, testState.connections);

    // Nó A deve continuar na lista de nós, mesmo sem conexão
    expect(testState.nodes.length).toBe(3);
    expect(testState.nodes.find((n: any) => n.id === 2)).toBeDefined();
    
    // Apenas a conexão foi removida
    expect(testState.connections.length).toBe(1);
  });
});
