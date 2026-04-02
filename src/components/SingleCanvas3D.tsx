import React, { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas as R3FCanvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
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
interface SimNode {
  nodeRef: string;
  name: string;
  type: string;
  category: string | null;
  isCenter: boolean;
  depth: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
  index?: number;
}

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  connectionType: string;
  id: number;
}

interface SingleCanvas3DProps {
  nodes: any[];
  connections: any[];
  centerNodeRef: string | null;
  onSingleClick?: (node: any) => void;
  onOpenEditModal?: (node: any) => void;
  selectedNodes: string[];
  setSelectedNodes: (nodes: string[]) => void;
  highlightedPath: string[];
  showLabels?: boolean;
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
  suggested: new THREE.Color('hsl(45, 100%, 60%)'),
  'ai-suggested': new THREE.Color('hsl(45, 100%, 60%)'),
};
const DEFAULT_LINK_COLOR = new THREE.Color('hsl(220, 10%, 30%)');

// Depth brightness multipliers
const DEPTH_BRIGHTNESS = [1.0, 0.75, 0.55, 0.4, 0.3];

// ---------- BFS depth ----------
function computeBFS(nodes: any[], connections: any[], centerRef: string): Map<string, number> {
  const depths = new Map<string, number>();
  const queue: { ref: string; depth: number }[] = [{ ref: centerRef, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { ref, depth } = queue.shift()!;
    if (visited.has(ref)) continue;
    visited.add(ref);
    depths.set(ref, depth);
    connections
      .filter(c => c.from_ref === ref || c.to_ref === ref)
      .forEach(c => {
        const neighbor = c.from_ref === ref ? c.to_ref : c.from_ref;
        if (!visited.has(neighbor) && nodes.some(n => n.node_ref === neighbor)) {
          queue.push({ ref: neighbor, depth: depth + 1 });
        }
      });
  }
  return depths;
}

// ---------- Links3D ----------
const SingleLinks3D: React.FC<{
  nodes: SimNode[];
  links: SimLink[];
  selectedRef: string | null;
  connectedToSelected: Set<string>;
  centerRef: string | null;
}> = ({ nodes, links, selectedRef, connectedToSelected, centerRef }) => {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const clockRef = useRef(new THREE.Clock());

  useFrame(() => {
    if (!geomRef.current || links.length === 0) return;
    const positions = geomRef.current.getAttribute('position') as THREE.BufferAttribute;
    const colors = geomRef.current.getAttribute('color') as THREE.BufferAttribute;
    if (!positions || !colors) return;

    const time = clockRef.current.getElapsedTime();

    for (let i = 0; i < links.length; i++) {
      const s = links[i].source as SimNode;
      const t = links[i].target as SimNode;
      positions.setXYZ(i * 2, s.x ?? 0, s.y ?? 0, s.z ?? 0);
      positions.setXYZ(i * 2 + 1, t.x ?? 0, t.y ?? 0, t.z ?? 0);

      const baseC = CONNECTION_COLORS[links[i].connectionType] || DEFAULT_LINK_COLOR;
      const isFromCenter = (s.isCenter || t.isCenter);

      if (selectedRef) {
        const sRef = s.nodeRef;
        const tRef = t.nodeRef;
        const isActive = connectedToSelected.has(sRef) && connectedToSelected.has(tRef);
        if (isActive) {
          const pulse = 0.7 + 0.3 * Math.sin(time * 3 + i * 0.5);
          colors.setXYZ(i * 2, baseC.r * pulse, baseC.g * pulse, baseC.b * pulse);
          colors.setXYZ(i * 2 + 1, baseC.r * pulse, baseC.g * pulse, baseC.b * pulse);
        } else {
          colors.setXYZ(i * 2, baseC.r * 0.06, baseC.g * 0.06, baseC.b * 0.06);
          colors.setXYZ(i * 2 + 1, baseC.r * 0.06, baseC.g * 0.06, baseC.b * 0.06);
        }
      } else {
        // Connections from center are brighter
        const mult = isFromCenter ? 0.8 : 0.45;
        const pulse = isFromCenter ? (0.85 + 0.15 * Math.sin(time * 1.5 + i * 0.3)) : mult;
        colors.setXYZ(i * 2, baseC.r * pulse, baseC.g * pulse, baseC.b * pulse);
        colors.setXYZ(i * 2 + 1, baseC.r * pulse, baseC.g * pulse, baseC.b * pulse);
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geomRef.current.computeBoundingSphere();

    if (matRef.current) {
      matRef.current.opacity = selectedRef ? 0.9 : 0.4;
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
      <lineBasicMaterial ref={matRef} vertexColors transparent opacity={0.4} />
    </lineSegments>
  );
};

// ---------- Nodes3D ----------
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

const SingleNodes3D: React.FC<{
  nodes: SimNode[];
  allNodesRaw: any[];
  onNodeClick: (node: any) => void;
  onNodeDoubleClick: (node: any) => void;
  hoveredRef: string | null;
  setHoveredRef: (ref: string | null) => void;
  selectedRef: string | null;
  setSelectedRef: (ref: string | null) => void;
  connectedToSelected: Set<string>;
}> = ({
  nodes, allNodesRaw, onNodeClick, onNodeDoubleClick,
  hoveredRef, setHoveredRef,
  selectedRef, setSelectedRef, connectedToSelected,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const clickTimerRef = useRef<any>(null);
  const clockRef = useRef(new THREE.Clock());

  useFrame(() => {
    if (!meshRef.current) return;
    const time = clockRef.current.getElapsedTime();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      _dummy.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);

      const isHovered = n.nodeRef === hoveredRef;
      const isSelected = n.nodeRef === selectedRef;
      const isCenter = n.isCenter;
      const isConnectedSelect = connectedToSelected.has(n.nodeRef);
      const depthBright = DEPTH_BRIGHTNESS[Math.min(n.depth, DEPTH_BRIGHTNESS.length - 1)];

      // Scale: center biggest, then selected, hovered, connected, by depth
      let scale = 0.7 + depthBright * 0.3;
      if (isCenter) scale = 2.0;
      else if (isSelected) scale = 1.5;
      else if (isHovered) scale = 1.3;
      else if (isConnectedSelect) scale = 1.0;

      _dummy.scale.setScalar(scale);
      _dummy.rotation.set(time * 0.2 + i * 0.5, time * 0.1 + i * 0.3, 0);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, _dummy.matrix);

      const baseColor = TYPE_COLORS[n.type] || DEFAULT_COLOR;

      if (selectedRef) {
        if (isSelected || isCenter) {
          _color.copy(baseColor);
        } else if (isConnectedSelect) {
          _color.copy(baseColor).multiplyScalar(0.85);
        } else {
          _color.copy(baseColor).multiplyScalar(0.12);
        }
      } else if (isHovered) {
        _color.copy(baseColor);
      } else if (isCenter) {
        _color.copy(baseColor); // Always full brightness for center
      } else {
        _color.copy(baseColor).multiplyScalar(depthBright);
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
      <tetrahedronGeometry args={[0.35]} />
      <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.6} roughness={0.6} metalness={0.2} toneMapped={false} />
    </instancedMesh>
  );
};

// ---------- NodeLabels ----------
const SingleNodeLabels: React.FC<{ nodes: SimNode[]; hoveredRef: string | null; showLabels: boolean }> = ({
  nodes, hoveredRef, showLabels,
}) => {
  // Show hovered label always, all labels when showLabels is on, or center node
  const visibleNodes = nodes.filter(n =>
    n.nodeRef === hoveredRef || (showLabels && true) || n.isCenter
  );

  if (visibleNodes.length === 0) return null;

  return (
    <>
      {visibleNodes.map(node => (
        <group key={node.nodeRef} position={[node.x ?? 0, (node.y ?? 0) - (node.isCenter ? 2.0 : 1.2), node.z ?? 0]}>
          <Html
            center
            distanceFactor={70}
            style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
          >
            <div style={{ textAlign: 'center', userSelect: 'none' }}>
              <div style={{
                color: node.isCenter ? 'hsl(0 0% 100%)' : 'hsl(0 0% 90%)',
                fontSize: node.isCenter ? '13px' : '10px',
                fontWeight: node.isCenter ? 700 : 500,
                textShadow: '0 1px 6px rgba(0,0,0,0.9)',
              }}>
                {node.name.length > 20 ? node.name.substring(0, 18) + '…' : node.name}
              </div>
              {node.category && (
                <div style={{
                  color: 'hsl(220 10% 65%)',
                  fontSize: '8px',
                  marginTop: '1px',
                  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                }}>
                  {node.category}
                </div>
              )}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
};

// ---------- CameraAutoFit ----------
const CameraAutoFit: React.FC<{ nodes: SimNode[] }> = ({ nodes }) => {
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
      const z = Math.max(maxDist * 2.2, 6);
      camera.position.set(0, 0, z);
      camera.lookAt(0, 0, 0);
      fitted.current = true;
    }
  }, [nodes, camera]);

  return null;
};

// ---------- CameraFocus ----------
const SingleCameraFocus: React.FC<{
  nodes: SimNode[];
  selectedRef: string | null;
  controlsRef: React.RefObject<any>;
}> = ({ nodes, selectedRef, controlsRef }) => {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const isAnimating = useRef(false);
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedRef && selectedRef !== prevSelectedRef.current) {
      const node = nodes.find(n => n.nodeRef === selectedRef);
      if (node) {
        targetPos.current.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
        isAnimating.current = true;
      }
    }
    prevSelectedRef.current = selectedRef;
  }, [selectedRef, nodes]);

  useFrame(() => {
    if (!isAnimating.current || !controlsRef.current) return;
    const controls = controlsRef.current;
    const currentTarget = controls.target as THREE.Vector3;
    const offset = camera.position.clone().sub(currentTarget);
    currentTarget.lerp(targetPos.current, 0.08);
    camera.position.copy(currentTarget).add(offset);
    if (currentTarget.distanceTo(targetPos.current) < 0.05) {
      currentTarget.copy(targetPos.current);
      camera.position.copy(currentTarget).add(offset);
      isAnimating.current = false;
    }
    controls.update();
  });

  return null;
};

// ---------- Scene ----------
const SingleScene: React.FC<{
  nodes: any[];
  connections: any[];
  centerNodeRef: string | null;
  onSingleClick: (node: any) => void;
  onOpenEditModal: (node: any) => void;
  showLabels: boolean;
}> = ({ nodes: rawNodes, connections: rawConnections, centerNodeRef, onSingleClick, onOpenEditModal, showLabels }) => {
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const [hoveredRef, setHoveredRef] = useState<string | null>(null);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const simulationRef = useRef<any>(null);
  const tickRef = useRef(0);
  const controlsRef = useRef<any>(null);

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

  const connectedToSelected = useMemo(() => buildConnectedSet(selectedRef), [selectedRef, buildConnectedSet]);

  const handleCanvasPointerMissed = useCallback(() => {
    setSelectedRef(null);
  }, []);

  // Build simulation
  useEffect(() => {
    if (rawNodes.length === 0) return;

    const depthMap = centerNodeRef ? computeBFS(rawNodes, rawConnections, centerNodeRef) : new Map<string, number>();

    const masterNodes: SimNode[] = rawNodes.map((n) => {
      const isCenter = n.node_ref === centerNodeRef;
      const depth = depthMap.get(n.node_ref) ?? 99;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = isCenter ? 0 : (0.8 + depth * 0.6 + Math.random() * 0.4);
      return {
        nodeRef: n.node_ref,
        name: n.name,
        type: n.type,
        category: n.category || null,
        isCenter,
        depth,
        x: isCenter ? 0 : r * Math.sin(phi) * Math.cos(theta),
        y: isCenter ? 0 : r * Math.sin(phi) * Math.sin(theta),
        z: isCenter ? 0 : r * Math.cos(phi),
        fx: isCenter ? 0 : null,
        fy: isCenter ? 0 : null,
        fz: isCenter ? 0 : null,
      } as SimNode;
    });

    const nodeRefSet = new Set(masterNodes.map(n => n.nodeRef));
    const masterLinks: SimLink[] = rawConnections
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
        .id((d: any) => d.nodeRef).distance(1.5).strength(0.8))
      .force('charge', forceManyBody().strength(-2.0).distanceMax(10))
      .force('center', forceCenter(0, 0, 0).strength(0.5))
      .force('radial', forceRadial((d: any) => d.isCenter ? 0 : 2 + d.depth * 1.2, 0, 0, 0).strength(0.5))
      .force('collision', forceCollide().radius(0.4).strength(0.9))
      .alpha(0.7)
      .alphaDecay(0.04)
      .velocityDecay(0.65);

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
  }, [rawNodes.length, rawConnections.length, centerNodeRef]);

  return (
    <group onPointerMissed={handleCanvasPointerMissed}>
      <fogExp2 attach="fog" args={['#0a0b14', 0.02]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 0, 0]} intensity={2.5} distance={50} decay={2} color="#8888ff" />
      <Stars radius={220} depth={80} count={2200} factor={3} saturation={0.2} fade speed={0.35} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        enableZoom
        zoomSpeed={2.0}
        minDistance={1.0}
        maxDistance={80}
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
      <SingleCameraFocus nodes={simNodes} selectedRef={selectedRef} controlsRef={controlsRef} />
      <SingleLinks3D
        nodes={simNodes}
        links={simLinks}
        selectedRef={selectedRef}
        connectedToSelected={connectedToSelected}
        centerRef={centerNodeRef}
      />
      <SingleNodes3D
        nodes={simNodes}
        allNodesRaw={rawNodes}
        onNodeClick={onSingleClick}
        onNodeDoubleClick={onOpenEditModal}
        hoveredRef={hoveredRef}
        setHoveredRef={setHoveredRef}
        selectedRef={selectedRef}
        setSelectedRef={setSelectedRef}
        connectedToSelected={connectedToSelected}
      />
      <SingleNodeLabels nodes={simNodes} hoveredRef={hoveredRef} showLabels={showLabels} />
      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </group>
  );
};

// ---------- Main component ----------
export const SingleCanvas3D: React.FC<SingleCanvas3DProps> = ({
  nodes,
  connections,
  centerNodeRef,
  onSingleClick = () => {},
  onOpenEditModal = () => {},
  selectedNodes,
  setSelectedNodes,
  highlightedPath,
  showLabels = false,
}) => {
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: '#0a0b14', touchAction: 'none' }}
    >
      <R3FCanvas
        camera={{ position: [0, 0, 10], fov: 55, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0b14');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.5;
        }}
      >
        <SingleScene
          nodes={nodes}
          connections={connections}
          centerNodeRef={centerNodeRef}
          onSingleClick={onSingleClick}
          onOpenEditModal={onOpenEditModal}
          showLabels={showLabels}
        />
      </R3FCanvas>
    </div>
  );
};
