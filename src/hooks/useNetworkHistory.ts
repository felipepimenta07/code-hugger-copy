import { useState } from 'react';

export const useNetworkHistory = (workflows: any[], setWorkflows: (workflows: any[]) => void) => {
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = () => {
    const snapshot = { workflows: [...workflows] };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const snapshot = history[historyIndex - 1];
      setWorkflows(snapshot.workflows);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const snapshot = history[historyIndex + 1];
      setWorkflows(snapshot.workflows);
      setHistoryIndex(historyIndex + 1);
    }
  };

  return { history, historyIndex, saveToHistory, undo, redo };
};
