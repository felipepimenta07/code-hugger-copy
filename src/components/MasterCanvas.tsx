import React, { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceLink,
} from 'd3-force-3d';

// ---------- types ----------
interface MasterNode {
  nodeRef: string;
  name: string;
  type: string;
  category: string | null;
  flowId: number | null;
  profilePictureUrl: string | null;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  index?: number;
}

interface MasterLink {
  source: string | MasterNode;
  target: string | MasterNode;
  connectionType: string;
  id: number;
}

interface MasterCanvasProps {
  allNodes: any[];
  allConnections: any[];
  flows: any[];
  onNodeClick: (node: any) => void;
  onNodeDoubleClick: (node: any) => void;
}

// ---------- color maps ----------
const TYPE_COLORS: Record<string, THREE.Color> = {
  person: new THREE.Color('hsl(328, 86%, 61%)'),
  project: new THREE.Color('hsl(158, 64%, 52%)'),
  brand: new THREE.Color('hsl(258, 90%, 66%)'),
};
const DEFAULT_COLOR = new THREE.Color('#94a3b8');

const CONNECTION_COLORS: Record<string, THREE.Color> = {
  strong: new THREE.Color('hsl(210, 100%, 56%)'),
  weak: new THREE.Color('hsl(215, 16%, 47%)'),
  'works-at': new THREE.Color('hsl(158, 64%, 52%)'),
  related: new THREE.Color('hsl(220, 10%, 40%)'),
};
const DEFAULT_LINK_COLOR = new THREE.Color('hsl(220, 10%, 30%)');

// ---------- Links3D ----------
const Links3D: React.FC<{ nodes: MasterNode[]; links: MasterLink[] }> = ({ nodes, links }) => {
  const geomRef = useRef<THREE.BufferGeometry>(null);

  useFrame(() => {
    if (!geomRef.current || links.length === 0) return;
    const positions = geomRef.current.getAttribute('position') as THREE.BufferAttribute;
    if (!positions) return;

    for (let i = 0; i < links.length; i++) {
      const s = links[i].source as MasterNode;
      const t = links[i].target as MasterNode;
      positions.setXYZ(i * 2, s.x ?? 0, s.y ?? 0, s.z ?? 0);
      positions.setXYZ(i * 2 + 1, t.x ?? 0, t.y ?? 0, t.z ?? 0);
    }
    positions.needsUpdate = true;
    geomRef.current.computeBoundingSphere();
  });

  const { posArray, colorArray } = useMemo(() => {
    const pos = new Float32Array(links.length * 6);
    const col = new Float32Array(links.length * 6);
    for (let i = 0; i < links.length; i++) {
      const c = CONNECTION_COLORS[links[i].connectionType] || DEFAULT_LINK_COLOR;
      col[i * 6] = c.r; col[i * 6 + 1] = c.g; col[i * 6 + 2] = c.b;
      col[i * 6 + 3] = c.r; col[i * 6 + 4] = c.g; col[i * 6 + 5] = c.b;
    }
    return { posArray: pos, colorArray: col };
  }, [links.length]);

  if (links.length === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[posArray, 3]} count={links.length * 2} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[colorArray, 3]} count={links.length * 2} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.35} />
    </lineSegments>
  );
};

// ---------- Nodes3D (instanced) ----------
interface Nodes3DProps {
  nodes: MasterNode[];
  allNodesRaw: any[];
  onNodeClick: (node: any) => void;
  onNodeDoubleClick: (node: any) => void;
  hoveredRef: string | null;
  setHoveredRef: (ref: string | null) => void;
  connectedToHovered: Set<string>;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

const Nodes3D: React.FC<Nodes3DProps> = ({
  nodes, allNodesRaw, onNodeClick, onNodeDoubleClick,
  hoveredRef, setHoveredRef, connectedToHovered,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const clickTimerRef = useRef<any>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      _dummy.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);

      const isHovered = n.nodeRef === hoveredRef;
      const isConnected = connectedToHovered.has(n.nodeRef);
      const dimmed = hoveredRef && !isHovered && !isConnected;
      const scale = isHovered ? 1.4 : 1.0;
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, _dummy.matrix);

      const baseColor = TYPE_COLORS[n.type] || DEFAULT_COLOR;
      if (dimmed) {
        _color.copy(baseColor).multiplyScalar(0.15);
      } else {
        _color.copy(baseColor);
      }
      meshRef.current.setColorAt(i, _color);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const idx = e.instanceId;
    if (idx === undefined || idx >= nodes.length) return;
    const node = nodes[idx];
    const original = allNodesRaw.find((n: any) => n.node_ref === node.nodeRef);
    if (!original) return;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      onNodeDoubleClick(original);
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onNodeClick(original);
    }, 280);
  }, [nodes, allNodesRaw, onNodeClick, onNodeDoubleClick]);

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const idx = e.instanceId;
    if (idx === undefined || idx >= nodes.length) return;
    setHoveredRef(nodes[idx].nodeRef);
  }, [nodes, setHoveredRef]);

  const handlePointerOut = useCallback(() => {
    setHoveredRef(null);
  }, [setHoveredRef]);

  if (nodes.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, nodes.length]}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[2.5, 16, 16]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};

// ---------- NodeLabels ----------
const NodeLabels: React.FC<{ nodes: MasterNode[]; hoveredRef: string | null; connectedToHovered: Set<string> }> = ({
  nodes, hoveredRef, connectedToHovered,
}) => {
  return (
    <>
      {nodes.map(n => {
        const dimmed = hoveredRef && n.nodeRef !== hoveredRef && !connectedToHovered.has(n.nodeRef);
        return (
          <group key={n.nodeRef} position={[n.x ?? 0, (n.y ?? 0) - 4, n.z ?? 0]}>
            <Html
              center
              distanceFactor={80}
              style={{
                pointerEvents: 'none',
                opacity: dimmed ? 0.1 : 1,
                transition: 'opacity 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ textAlign: 'center', userSelect: 'none' }}>
                <div style={{
                  color: 'hsl(0, 0%, 95%)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                }}>
                  {n.name.length > 16 ? n.name.substring(0, 14) + '…' : n.name}
                </div>
                {n.category && (
                  <div style={{
                    color: 'hsl(220, 10%, 55%)',
                    fontSize: '9px',
                    marginTop: '1px',
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                  }}>
                    {n.category}
                  </div>
                )}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
};

// ---------- CameraAutoFit ----------
const CameraAutoFit: React.FC<{ nodes: MasterNode[] }> = ({ nodes }) => {
  const { camera } = useThree();
  const fitted = useRef(false);

  useEffect(() => {
    if (nodes.length === 0 || fitted.current) return;
    let maxDist = 0;
    for (const n of nodes) {
      const d = Math.sqrt((n.x ?? 0) ** 2 + (n.y ?? 0) ** 2 + (n.z ?? 0) ** 2);
      if (d > maxDist) maxDist = d;
    }
    if (maxDist > 0) {
      const z = Math.max(maxDist * 2.5, 80);
      camera.position.set(0, 0, z);
      camera.lookAt(0, 0, 0);
      fitted.current = true;
    }
  }, [nodes, camera]);

  return null;
};

// ---------- Scene ----------
interface SceneProps {
  allNodes: any[];
  allConnections: any[];
  flows: any[];
  onNodeClick: (node: any) => void;
  onNodeDoubleClick: (node: any) => void;
}

const Scene: React.FC<SceneProps> = ({ allNodes, allConnections, onNodeClick, onNodeDoubleClick }) => {
  const [simNodes, setSimNodes] = useState<MasterNode[]>([]);
  const [simLinks, setSimLinks] = useState<MasterLink[]>([]);
  const [hoveredRef, setHoveredRef] = useState<string | null>(null);
  const simulationRef = useRef<any>(null);
  const tickRef = useRef(0);

  const connectedToHovered = useMemo(() => {
    const s = new Set<string>();
    if (!hoveredRef) return s;
    s.add(hoveredRef);
    simLinks.forEach(l => {
      const sRef = typeof l.source === 'string' ? l.source : l.source.nodeRef;
      const tRef = typeof l.target === 'string' ? l.target : l.target.nodeRef;
      if (sRef === hoveredRef) s.add(tRef);
      if (tRef === hoveredRef) s.add(sRef);
    });
    return s;
  }, [hoveredRef, simLinks]);

  // Build and run 3D simulation
  useEffect(() => {
    if (allNodes.length === 0) return;

    const masterNodes: MasterNode[] = allNodes
      .filter(n => n.flow_id != null)
      .map((n, idx) => {
        // Spherical initial distribution
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = 10 + Math.random() * 8;
        return {
          nodeRef: n.node_ref,
          name: n.name,
          type: n.type,
          category: n.category || null,
          flowId: n.flow_id,
          profilePictureUrl: n.profile_picture_url || null,
          x: n.master_x ?? (r * Math.sin(phi) * Math.cos(theta)),
          y: n.master_y ?? (r * Math.sin(phi) * Math.sin(theta)),
          z: r * Math.cos(phi),
        } as MasterNode;
      });

    const nodeRefSet = new Set(masterNodes.map(n => n.nodeRef));
    const masterLinks: MasterLink[] = allConnections
      .filter(c => nodeRefSet.has(c.from_ref) && nodeRefSet.has(c.to_ref))
      .map(c => ({
        source: c.from_ref,
        target: c.to_ref,
        connectionType: c.connection_type || c.type || 'related',
        id: c.id,
      }));

    if (simulationRef.current) simulationRef.current.stop();

    const sim = forceSimulation(masterNodes, 3)
      .force('link', forceLink(masterLinks)
        .id((d: any) => d.nodeRef).distance(8).strength(0.4))
      .force('charge', forceManyBody().strength(-20))
      .force('center', forceCenter(0, 0, 0))
      .force('collision', forceCollide().radius(2))
      .alpha(0.8)
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    tickRef.current = 0;

    sim.on('tick', () => {
      tickRef.current++;
      if (tickRef.current % 3 === 0 || tickRef.current < 15) {
        setSimNodes([...masterNodes]);
        setSimLinks([...masterLinks]);
      }
    });

    sim.on('end', () => {
      setSimNodes([...masterNodes]);
      setSimLinks([...masterLinks]);
    });

    simulationRef.current = sim;

    return () => { sim.stop(); };
  }, [allNodes.length, allConnections.length]);

  return (
    <>
      <ambientLight intensity={0.15} />
      <Stars radius={300} depth={100} count={3000} factor={4} saturation={0.2} fade speed={0.5} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        enableZoom
        zoomSpeed={1.2}
        minDistance={5}
        maxDistance={800}
        enablePan
        enableRotate
        makeDefault
      />
      <CameraAutoFit nodes={simNodes} />
      <Links3D nodes={simNodes} links={simLinks} />
      <Nodes3D
        nodes={simNodes}
        allNodesRaw={allNodes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        hoveredRef={hoveredRef}
        setHoveredRef={setHoveredRef}
        connectedToHovered={connectedToHovered}
      />
      <NodeLabels nodes={simNodes} hoveredRef={hoveredRef} connectedToHovered={connectedToHovered} />
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
};

// ---------- Main component ----------
export const MasterCanvas: React.FC<MasterCanvasProps> = ({
  allNodes,
  allConnections,
  flows,
  onNodeClick,
  onNodeDoubleClick,
}) => {
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: '#0a0b14', touchAction: 'none' }}
    >
      <Canvas
        camera={{ position: [0, 0, 120], fov: 60, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0b14');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <Scene
          allNodes={allNodes}
          allConnections={allConnections}
          flows={flows}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
        />
      </Canvas>
    </div>
  );
};
