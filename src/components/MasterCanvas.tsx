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
  forceRadial,
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
interface Links3DProps {
  nodes: MasterNode[];
  links: MasterLink[];
  selectedRef: string | null;
  connectedToSelected: Set<string>;
}

const Links3D: React.FC<Links3DProps> = ({ nodes, links, selectedRef, connectedToSelected }) => {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame(() => {
    if (!geomRef.current || links.length === 0) return;
    const positions = geomRef.current.getAttribute('position') as THREE.BufferAttribute;
    const colors = geomRef.current.getAttribute('color') as THREE.BufferAttribute;
    if (!positions || !colors) return;

    for (let i = 0; i < links.length; i++) {
      const s = links[i].source as MasterNode;
      const t = links[i].target as MasterNode;
      positions.setXYZ(i * 2, s.x ?? 0, s.y ?? 0, s.z ?? 0);
      positions.setXYZ(i * 2 + 1, t.x ?? 0, t.y ?? 0, t.z ?? 0);

      const baseC = CONNECTION_COLORS[links[i].connectionType] || DEFAULT_LINK_COLOR;
      if (selectedRef) {
        const sRef = s.nodeRef;
        const tRef = t.nodeRef;
        const isSelected = connectedToSelected.has(sRef) && connectedToSelected.has(tRef);
        const mult = isSelected ? 1.0 : 0.06;
        colors.setXYZ(i * 2, baseC.r * mult, baseC.g * mult, baseC.b * mult);
        colors.setXYZ(i * 2 + 1, baseC.r * mult, baseC.g * mult, baseC.b * mult);
      } else {
        colors.setXYZ(i * 2, baseC.r * 0.5, baseC.g * 0.5, baseC.b * 0.5);
        colors.setXYZ(i * 2 + 1, baseC.r * 0.5, baseC.g * 0.5, baseC.b * 0.5);
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geomRef.current.computeBoundingSphere();

    if (matRef.current) {
      matRef.current.opacity = selectedRef ? 0.7 : 0.3;
    }
  });

  const { posArray, colorArray } = useMemo(() => {
    const pos = new Float32Array(links.length * 6);
    const col = new Float32Array(links.length * 6);
    for (let i = 0; i < links.length; i++) {
      const c = CONNECTION_COLORS[links[i].connectionType] || DEFAULT_LINK_COLOR;
      col[i * 6] = c.r * 0.5; col[i * 6 + 1] = c.g * 0.5; col[i * 6 + 2] = c.b * 0.5;
      col[i * 6 + 3] = c.r * 0.5; col[i * 6 + 4] = c.g * 0.5; col[i * 6 + 5] = c.b * 0.5;
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
      <lineBasicMaterial ref={matRef} vertexColors transparent opacity={0.3} />
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
  selectedRef: string | null;
  setSelectedRef: (ref: string | null) => void;
  connectedToSelected: Set<string>;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

const Nodes3D: React.FC<Nodes3DProps> = ({
  nodes, allNodesRaw, onNodeClick, onNodeDoubleClick,
  hoveredRef, setHoveredRef, connectedToHovered,
  selectedRef, setSelectedRef, connectedToSelected,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const clickTimerRef = useRef<any>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      _dummy.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);

      const isHovered = n.nodeRef === hoveredRef;
      const isSelected = n.nodeRef === selectedRef;
      const isConnectedHover = connectedToHovered.has(n.nodeRef);
      const isConnectedSelect = connectedToSelected.has(n.nodeRef);

      const scale = isHovered || isSelected ? 1.35 : 0.92;
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, _dummy.matrix);

      const baseColor = TYPE_COLORS[n.type] || DEFAULT_COLOR;

      if (selectedRef) {
        if (isSelected || isConnectedSelect) {
          _color.copy(baseColor);
        } else {
          _color.copy(baseColor).multiplyScalar(0.12);
        }
      } else if (hoveredRef) {
        if (isHovered) {
          _color.copy(baseColor);
        } else if (isConnectedHover) {
          _color.copy(baseColor).multiplyScalar(0.8);
        } else {
          _color.copy(baseColor).multiplyScalar(0.15);
        }
      } else {
        _color.copy(baseColor).multiplyScalar(0.5);
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
      setSelectedRef(node.nodeRef);
      onNodeClick(original);
    }, 280);
  }, [nodes, allNodesRaw, onNodeClick, onNodeDoubleClick, setSelectedRef]);

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
      <sphereGeometry args={[0.6, 12, 12]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};

// ---------- NodeLabels ----------
const NodeLabels: React.FC<{ nodes: MasterNode[]; hoveredRef: string | null }> = ({
  nodes, hoveredRef,
}) => {
  const hoveredNode = hoveredRef ? nodes.find((node) => node.nodeRef === hoveredRef) : null;

  if (!hoveredNode) return null;

  return (
    <group position={[hoveredNode.x ?? 0, (hoveredNode.y ?? 0) - 1.5, hoveredNode.z ?? 0]}>
      <Html
        center
        distanceFactor={70}
        style={{
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ textAlign: 'center', userSelect: 'none' }}>
          <div style={{
            color: 'hsl(0 0% 95%)',
            fontSize: '11px',
            fontWeight: 600,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {hoveredNode.name.length > 18 ? hoveredNode.name.substring(0, 16) + '…' : hoveredNode.name}
          </div>
          {hoveredNode.category && (
            <div style={{
              color: 'hsl(220 10% 70%)',
              fontSize: '9px',
              marginTop: '1px',
              textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            }}>
              {hoveredNode.category}
            </div>
          )}
        </div>
      </Html>
    </group>
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
      const z = Math.max(maxDist * 2.0, 8);
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
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const simulationRef = useRef<any>(null);
  const tickRef = useRef(0);

  const buildConnectedSet = useCallback((ref: string | null) => {
    const s = new Set<string>();
    if (!ref) return s;
    s.add(ref);
    simLinks.forEach(l => {
      const sRef = typeof l.source === 'string' ? l.source : l.source.nodeRef;
      const tRef = typeof l.target === 'string' ? l.target : l.target.nodeRef;
      if (sRef === ref) s.add(tRef);
      if (tRef === ref) s.add(sRef);
    });
    return s;
  }, [simLinks]);

  const connectedToHovered = useMemo(() => buildConnectedSet(hoveredRef), [hoveredRef, buildConnectedSet]);
  const connectedToSelected = useMemo(() => buildConnectedSet(selectedRef), [selectedRef, buildConnectedSet]);

  const handleCanvasPointerMissed = useCallback(() => {
    setSelectedRef(null);
  }, []);

  // Build and run 3D simulation
  useEffect(() => {
    if (allNodes.length === 0) return;

    const masterNodes: MasterNode[] = allNodes
      .filter(n => n.flow_id != null)
      .map((n, idx) => {
        // Spherical initial distribution — ignore master_x/master_y (2D coords don't belong in 3D)
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = 1.2 + Math.random() * 0.8;
        return {
          nodeRef: n.node_ref,
          name: n.name,
          type: n.type,
          category: n.category || null,
          flowId: n.flow_id,
          profilePictureUrl: n.profile_picture_url || null,
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
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
        .id((d: any) => d.nodeRef).distance(1.2).strength(1))
      .force('charge', forceManyBody().strength(-1.5).distanceMax(8))
      .force('center', forceCenter(0, 0, 0).strength(0.4))
      .force('radial', forceRadial(4, 0, 0, 0).strength(0.3))
      .force('collision', forceCollide().radius(0.35).strength(0.9))
      .alpha(0.8)
      .alphaDecay(0.02)
      .velocityDecay(0.5);

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
      <ambientLight intensity={0.22} />
      <Stars radius={220} depth={80} count={2200} factor={3} saturation={0.2} fade speed={0.35} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        enableZoom
        zoomSpeed={2.0}
        minDistance={1.2}
        maxDistance={120}
        enablePan
        panSpeed={1.5}
        enableRotate
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
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
      <NodeLabels nodes={simNodes} hoveredRef={hoveredRef} />
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
        camera={{ position: [0, 0, 14], fov: 55, near: 0.1, far: 2000 }}
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
