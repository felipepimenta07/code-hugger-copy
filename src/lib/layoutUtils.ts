// Utility functions for radial layout
export const distributeInCircle = (nodes: any[], centerX: number, centerY: number, radius: number) => {
  if (nodes.length === 0) return [];
  const angleStep = (2 * Math.PI) / nodes.length;
  return nodes.map((node, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const finalRadius = radius + (Math.random() - 0.5) * 40;
    const finalAngle = angle + (Math.random() - 0.5) * 0.2;
    return {
      ...node,
      x: centerX + finalRadius * Math.cos(finalAngle),
      y: centerY + finalRadius * Math.sin(finalAngle),
    };
  });
};

export const applyRadialLayout = (nodes: any[], centerX: number, centerY: number) => {
  if (nodes.length === 0) return [];
  const centerNode = nodes[0];
  const others = nodes.slice(1);
  const inner = others.slice(0, Math.min(6, others.length));
  const middle = others.slice(6, Math.min(18, others.length));
  const outer = others.slice(18);
  return [
    { ...centerNode, x: centerX, y: centerY, level: "center" },
    ...distributeInCircle(inner, centerX, centerY, 200).map((n) => ({
      ...n,
      level: "inner",
    })),
    ...distributeInCircle(middle, centerX, centerY, 350).map((n) => ({
      ...n,
      level: "middle",
    })),
    ...distributeInCircle(outer, centerX, centerY, 520).map((n) => ({
      ...n,
      level: "outer",
    })),
  ];
};
