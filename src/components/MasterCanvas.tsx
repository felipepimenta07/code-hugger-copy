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
  highlightedCategory?: string | null;
}

// ---------- color maps ----------
import { getCategoryColor, getCategoryCoreColor } from '@/utils/categoryColors';

function getNodeCategoryColor(category: string | null): THREE.Color {
  return new THREE.Color(getCategoryColor(category));
}
function getNodeCoreColor(category: string | null): THREE.Color {
  return new THREE.Color(getCategoryCoreColor(category));
}
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

// ---------- Links3D ----------
interface Links3DProps {
  nodes: MasterNode[];
  links: MasterLink[];
  selectedRef: string | null;
  connectedToSelected: Set<string>;
  highlightedCategory: string | null;
}

const Links3D: React.FC<Links3DProps> = ({ nodes, links, selectedRef, connectedToSelected, highlightedCategory }) => {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const clockRef = useRef(new THREE.Clock());

  useFrame(() => {
    if (!geomRef.current || links.length === 0) return;
    const positions = geomRef.current.getAttribute('position') as THREE.BufferAttribute;
    const colors = geomRef.current.getAttribute('color') as THREE.BufferAttribute;
    if (!positions || !colors) return;

    const time = clockRef.current.getElapsedTime();

    // Build category lookup if needed
    const nodeMap = new Map<string, MasterNode>();
    if (highlightedCategory) {
      nodes.forEach(n => nodeMap.set(n.nodeRef, n));
    }

    for (let i = 0; i < links.length; i++) {
      const s = links[i].source as MasterNode;
      const t = links[i].target as MasterNode;
      positions.setXYZ(i * 2, s.x ?? 0, s.y ?? 0, s.z ?? 0);
      positions.setXYZ(i * 2 + 1, t.x ?? 0, t.y ?? 0, t.z ?? 0);

      const baseC = CONNECTION_COLORS[links[i].connectionType] || DEFAULT_LINK_COLOR;
      
      if (selectedRef) {
        const sRef = s.nodeRef;
        const tRef = t.nodeRef;
        const isActive = connectedToSelected.has(sRef) && connectedToSelected.has(tRef);
        if (isActive) {
          // Pulse animation for active connections
          const pulse = 0.7 + 0.3 * Math.sin(time * 3 + i * 0.5);
          colors.setXYZ(i * 2, baseC.r * pulse, baseC.g * pulse, baseC.b * pulse);
          colors.setXYZ(i * 2 + 1, baseC.r * pulse, baseC.g * pulse, baseC.b * pulse);
        } else {
          colors.setXYZ(i * 2, baseC.r * 0.04, baseC.g * 0.04, baseC.b * 0.04);
          colors.setXYZ(i * 2 + 1, baseC.r * 0.04, baseC.g * 0.04, baseC.b * 0.04);
        }
      } else if (highlightedCategory) {
        const sNode = nodeMap.get(s.nodeRef);
        const tNode = nodeMap.get(t.nodeRef);
        const bothInCat = sNode?.category === highlightedCategory && tNode?.category === highlightedCategory;
        if (bothInCat) {
          const catColor = getNodeCategoryColor(highlightedCategory);
          colors.setXYZ(i * 2, catColor.r * 0.8, catColor.g * 0.8, catColor.b * 0.8);
          colors.setXYZ(i * 2 + 1, catColor.r * 0.8, catColor.g * 0.8, catColor.b * 0.8);
        } else {
          colors.setXYZ(i * 2, baseC.r * 0.04, baseC.g * 0.04, baseC.b * 0.04);
          colors.setXYZ(i * 2 + 1, baseC.r * 0.04, baseC.g * 0.04, baseC.b * 0.04);
        }
      } else {
        colors.setXYZ(i * 2, baseC.r * 0.5, baseC.g * 0.5, baseC.b * 0.5);
        colors.setXYZ(i * 2 + 1, baseC.r * 0.5, baseC.g * 0.5, baseC.b * 0.5);
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geomRef.current.computeBoundingSphere();

    if (matRef.current) {
      matRef.current.opacity = selectedRef ? 0.9 : 0.3;
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
  highlightedCategory: string | null;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

const Nodes3D: React.FC<Nodes3DProps> = ({
  nodes, allNodesRaw, onNodeClick, onNodeDoubleClick,
  hoveredRef, setHoveredRef, connectedToHovered,
  selectedRef, setSelectedRef, connectedToSelected,
  highlightedCategory,
}) => {
  const outerRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const clickTimerRef = useRef<any>(null);
  const clockRef = useRef(new THREE.Clock());

  useFrame(() => {
    if (!outerRef.current || !coreRef.current) return;
    const time = clockRef.current.getElapsedTime();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const isHovered = n.nodeRef === hoveredRef;
      const isSelected = n.nodeRef === selectedRef;
      const isConnectedHover = connectedToHovered.has(n.nodeRef);
      const isConnectedSelect = connectedToSelected.has(n.nodeRef);
      const isCategoryMatch = highlightedCategory ? n.category === highlightedCategory : false;

      let scale = 0.92;
      if (isSelected) scale = 1.6;
      else if (isHovered) scale = 1.35;
      else if (highlightedCategory && isCategoryMatch) scale = 1.3;
      else if (isConnectedSelect) scale = 1.0;
      else if (highlightedCategory && !isCategoryMatch) scale = 0.5;

      // Outer shell
      _dummy.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
      _dummy.scale.setScalar(scale);
      _dummy.rotation.set(time * 0.2 + i * 0.5, time * 0.1 + i * 0.3, 0);
      _dummy.updateMatrix();
      outerRef.current.setMatrixAt(i, _dummy.matrix);

      // Inner core — same position, smaller, different rotation
      _dummy.scale.setScalar(scale * 0.45);
      _dummy.rotation.set(time * -0.3 + i * 0.7, time * 0.25 + i * 0.4, time * 0.15);
      _dummy.updateMatrix();
      coreRef.current.setMatrixAt(i, _dummy.matrix);

      const baseColor = getNodeCategoryColor(n.category);
      const coreColor = getNodeCoreColor(n.category);

      // Outer color — use category color directly, no white lerp
      if (highlightedCategory) {
        if (isCategoryMatch) {
          _color.copy(baseColor).multiplyScalar(1.3);
        } else {
          _color.copy(baseColor).multiplyScalar(0.05);
        }
      } else if (selectedRef) {
        if (isSelected) {
          _color.copy(baseColor).multiplyScalar(1.3);
        } else if (isConnectedSelect) {
          _color.copy(baseColor).multiplyScalar(0.7);
        } else {
          _color.copy(baseColor).multiplyScalar(0.06);
        }
      } else if (hoveredRef) {
        if (isHovered) {
          _color.copy(baseColor).multiplyScalar(1.3);
        } else if (isConnectedHover) {
          _color.copy(baseColor).multiplyScalar(0.75);
        } else {
          _color.copy(baseColor).multiplyScalar(0.1);
        }
      } else {
        _color.copy(baseColor).multiplyScalar(0.7);
      }
      outerRef.current.setColorAt(i, _color);

      // Core color — use core accent directly, no white lerp
      if (highlightedCategory) {
        if (isCategoryMatch) {
          _color.copy(coreColor).multiplyScalar(1.4);
        } else {
          _color.copy(coreColor).multiplyScalar(0.05);
        }
      } else if (selectedRef) {
        if (isSelected) {
          _color.copy(coreColor).multiplyScalar(1.4);
        } else if (isConnectedSelect) {
          _color.copy(coreColor).multiplyScalar(0.7);
        } else {
          _color.copy(coreColor).multiplyScalar(0.06);
        }
      } else if (hoveredRef) {
        if (isHovered) {
          _color.copy(coreColor).multiplyScalar(1.4);
        } else if (isConnectedHover) {
          _color.copy(coreColor).multiplyScalar(0.75);
        } else {
          _color.copy(coreColor).multiplyScalar(0.1);
        }
      } else {
        _color.copy(coreColor).multiplyScalar(0.7);
      }
      coreRef.current.setColorAt(i, _color);
    }
    outerRef.current.instanceMatrix.needsUpdate = true;
    if (outerRef.current.instanceColor) outerRef.current.instanceColor.needsUpdate = true;
    coreRef.current.instanceMatrix.needsUpdate = true;
    if (coreRef.current.instanceColor) coreRef.current.instanceColor.needsUpdate = true;
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
    <>
      {/* Outer shell */}
      <instancedMesh
        ref={outerRef}
        args={[undefined, undefined, nodes.length]}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <tetrahedronGeometry args={[0.35]} />
        <meshStandardMaterial emissive="#000000" emissiveIntensity={0.3} roughness={0.4} metalness={0.2} toneMapped={false} transparent opacity={0.9} />
      </instancedMesh>
      {/* Inner core */}
      <instancedMesh ref={coreRef} args={[undefined, undefined, nodes.length]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
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

// ---------- CameraFocus (rotate camera spherically to face selected node) ----------
const CameraFocus: React.FC<{ 
  nodes: MasterNode[]; 
  selectedRef: string | null;
  controlsRef: React.RefObject<any>;
}> = ({ nodes, selectedRef, controlsRef }) => {
  const { camera } = useThree();
  const targetSpherical = useRef(new THREE.Spherical());
  const isAnimating = useRef(false);
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedRef && selectedRef !== prevSelectedRef.current) {
      const node = nodes.find(n => n.nodeRef === selectedRef);
      if (node) {
        // Calculate where the camera needs to be so the node is "in front"
        // Node position relative to origin
        const nodePos = new THREE.Vector3(node.x ?? 0, node.y ?? 0, node.z ?? 0);
        if (nodePos.length() > 0.01) {
          // Camera should be on the same direction as the node, but at current distance
          const camDist = camera.position.length();
          const targetCamPos = nodePos.clone().normalize().multiplyScalar(camDist);
          targetSpherical.current.setFromVector3(targetCamPos);
          isAnimating.current = true;
        }
      }
    }
    prevSelectedRef.current = selectedRef;
  }, [selectedRef, nodes, camera]);

  useFrame(() => {
    if (!isAnimating.current || !controlsRef.current) return;
    
    const controls = controlsRef.current;
    // Keep target at origin — rotation center never moves
    controls.target.set(0, 0, 0);
    
    // Current camera spherical coords
    const currentSpherical = new THREE.Spherical().setFromVector3(camera.position);
    
    // Lerp spherical angles towards target
    currentSpherical.phi += (targetSpherical.current.phi - currentSpherical.phi) * 0.06;
    currentSpherical.theta += (targetSpherical.current.theta - currentSpherical.theta) * 0.06;
    // Keep current distance (don't zoom)
    
    // Apply new camera position
    camera.position.setFromSpherical(currentSpherical);
    camera.lookAt(0, 0, 0);
    
    // Check if close enough to stop
    const phiDiff = Math.abs(currentSpherical.phi - targetSpherical.current.phi);
    const thetaDiff = Math.abs(currentSpherical.theta - targetSpherical.current.theta);
    if (phiDiff < 0.005 && thetaDiff < 0.005) {
      isAnimating.current = false;
    }
    
    controls.update();
  });

  return null;
};

// ---------- Scene ----------
interface SceneProps {
  allNodes: any[];
  allConnections: any[];
  flows: any[];
  onNodeClick: (node: any) => void;
  onNodeDoubleClick: (node: any) => void;
  highlightedCategory: string | null;
}

const Scene: React.FC<SceneProps> = ({ allNodes, allConnections, onNodeClick, onNodeDoubleClick, highlightedCategory }) => {
  const [simNodes, setSimNodes] = useState<MasterNode[]>([]);
  const [simLinks, setSimLinks] = useState<MasterLink[]>([]);
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
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = 1.2 + Math.random() * 0.8;
        return {
          nodeRef: n.node_ref,
          name: n.name,
          type: n.type,
          category: n.category || 'Sem categoria',
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
      .alpha(0.6)
      .alphaDecay(0.04)
      .velocityDecay(0.7);

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
    <group onPointerMissed={handleCanvasPointerMissed}>
      <fogExp2 attach="fog" args={['#0a0b14', 0.025]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 0, 0]} intensity={2.0} distance={50} decay={2} color="#8888ff" />
      <Stars radius={220} depth={80} count={2200} factor={3} saturation={0.2} fade speed={0.35} />
      <OrbitControls
        ref={controlsRef}
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
      <CameraFocus nodes={simNodes} selectedRef={selectedRef} controlsRef={controlsRef} />
      <Links3D
        nodes={simNodes}
        links={simLinks}
        selectedRef={selectedRef}
        connectedToSelected={connectedToSelected}
        highlightedCategory={highlightedCategory}
      />
      <Nodes3D
        nodes={simNodes}
        allNodesRaw={allNodes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        hoveredRef={hoveredRef}
        setHoveredRef={setHoveredRef}
        connectedToHovered={connectedToHovered}
        selectedRef={selectedRef}
        setSelectedRef={setSelectedRef}
        connectedToSelected={connectedToSelected}
        highlightedCategory={highlightedCategory}
      />
      <NodeLabels nodes={simNodes} hoveredRef={hoveredRef} />
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </group>
  );
};

// ---------- Main component ----------
export const MasterCanvas: React.FC<MasterCanvasProps> = ({
  allNodes,
  allConnections,
  flows,
  onNodeClick,
  onNodeDoubleClick,
  highlightedCategory = null,
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
          gl.toneMappingExposure = 1.5;
        }}
      >
        <Scene
          allNodes={allNodes}
          allConnections={allConnections}
          flows={flows}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          highlightedCategory={highlightedCategory}
        />
      </Canvas>
    </div>
  );
};
