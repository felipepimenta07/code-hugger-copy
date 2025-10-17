import { useState } from 'react';

interface NetworkState {
  selectedNode: number | null;
  editingNode: any | null;
  dragging: number | null;
  offset: { x: number; y: number };
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  panStart: { x: number; y: number };
  isDraggingConnection: boolean;
  connectionStart: { id: number; x: number; y: number } | null;
  connectionEnd: { x: number; y: number };
  newNodeName: string;
  newNodeType: string;
  showSidebar: boolean;
  showAnalytics: boolean;
  contextMenu: { x: number; y: number; canvasX: number; canvasY: number; type: string } | null;
}

export const useNetworkState = () => {
  const [state, setState] = useState<NetworkState>({
    selectedNode: null,
    editingNode: null,
    dragging: null,
    offset: { x: 0, y: 0 },
    zoom: 0.5,
    pan: { x: 150, y: 100 },
    isPanning: false,
    panStart: { x: 0, y: 0 },
    isDraggingConnection: false,
    connectionStart: null,
    connectionEnd: { x: 0, y: 0 },
    newNodeName: '',
    newNodeType: 'person',
    showSidebar: false,
    showAnalytics: false,
    contextMenu: null
  });

  const updateState = (updates: Partial<NetworkState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  return { state, updateState };
};
