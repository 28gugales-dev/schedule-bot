import { Canvas } from '@react-three/fiber'
import { Float, Environment, Lightformer, RoundedBox } from '@react-three/drei'

// The 3D moment for the "Meet Schedule AI" beat. Floating glass schedule blocks
// (a calendar exploded into weightless tiles) refract a Lightformer environment —
// no external HDRI file, so it works offline. Transparent canvas: the gaps
// between blocks show the DOM aurora behind, layering 3D over 2D depth.

// Blocks ring the title — none cross the center text band (x∈[-2,2], y∈[-1.2,1.2])
// so "Schedule AI" always reads cleanly. Pushed slightly back (−z) to sit behind
// the copy plane like a backdrop.
const BLOCKS = [
  { pos: [-3.4, 1.6, -0.6], rot: [0.3, 0.5, 0.1], scale: 1.0 },
  { pos: [3.2, 1.8, -0.4], rot: [-0.2, -0.4, 0.2], scale: 0.85 },
  { pos: [-3.9, -0.5, -0.3], rot: [-0.18, -0.3, 0.18], scale: 0.95 },
  { pos: [3.8, -0.3, -0.5], rot: [0.2, 0.4, -0.12], scale: 0.9 },
  { pos: [-2.5, -2.1, -0.2], rot: [-0.25, 0.4, 0.15], scale: 0.78 },
  { pos: [2.7, -2.2, -0.3], rot: [0.16, -0.5, -0.2], scale: 0.72 },
]

function GlassBlock({ pos, rot, scale }) {
  return (
    <Float speed={1.0} rotationIntensity={0.4} floatIntensity={0.85}>
      <RoundedBox args={[1.7, 1.05, 0.14]} radius={0.1} smoothness={6} position={pos} rotation={rot} scale={scale}>
        <meshPhysicalMaterial
          transmission={0.62}
          thickness={0.7}
          roughness={0.12}
          ior={1.4}
          clearcoat={1}
          clearcoatRoughness={0.08}
          color="#8fbdf6"
          attenuationColor="#0071e3"
          attenuationDistance={1.6}
          metalness={0}
          transparent
          opacity={0.95}
        />
      </RoundedBox>
    </Float>
  )
}

export default function ScheduleBlocks3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.2], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 6, 5]} intensity={1.1} />
      <directionalLight position={[-6, -2, 2]} intensity={0.4} color="#7eb4f0" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[-3, 3, 3]} scale={[7, 4, 1]} color="#cfe2ff" />
        <Lightformer form="rect" intensity={2} position={[3, -2, 2]} scale={[6, 4, 1]} color="#ffffff" />
        <Lightformer form="circle" intensity={2.5} position={[0, 4, -3]} scale={5} color="#5aa2ff" />
      </Environment>
      {BLOCKS.map((b, i) => (
        <GlassBlock key={i} {...b} />
      ))}
    </Canvas>
  )
}
