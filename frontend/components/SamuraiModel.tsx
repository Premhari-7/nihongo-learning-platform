import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SamuraiModelProps {
  isAwake: boolean;
}

export default function SamuraiModel({ isAwake }: SamuraiModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const swordGroupRef = useRef<THREE.Group>(null);

  // Materials
  const armorMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a00000", roughness: 0.4, metalness: 0.6 }), []);
  const skinMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f1c27d", roughness: 0.8 }), []);
  const bladeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#cccccc", metalness: 1, roughness: 0.1 }), []);
  const goldMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffd700", metalness: 0.8, roughness: 0.3 }), []);

  useFrame((state, delta) => {
    if (!groupRef.current || !bodyRef.current || !swordGroupRef.current) return;

    // Smooth transition speed
    const lerpSpeed = 5;

    // Sleeping State
    if (!isAwake) {
        // Breathing animation
        const breath = Math.sin(state.clock.elapsedTime * 2) * 0.05;
        bodyRef.current.scale.y = 0.8 + breath; // Sit down / compress body
        
        // Slouched sitting posture
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.5, delta * lerpSpeed);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, -0.6, delta * lerpSpeed);

        // Sword resting
        swordGroupRef.current.rotation.z = THREE.MathUtils.lerp(swordGroupRef.current.rotation.z, -Math.PI / 2, delta * lerpSpeed);
        swordGroupRef.current.rotation.x = THREE.MathUtils.lerp(swordGroupRef.current.rotation.x, 0.2, delta * lerpSpeed);
    } 
    // Awake / Alert State
    else {
        bodyRef.current.scale.y = THREE.MathUtils.lerp(bodyRef.current.scale.y, 1.1, delta * lerpSpeed); // Stand tall

        // Floating/standing action
        const float = Math.sin(state.clock.elapsedTime * 4) * 0.05;
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, float - 0.2, delta * lerpSpeed);
        
        // Alert posture
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * lerpSpeed);
        
        // Spinning slightly to face user or look dynamic
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.2;

        // Sword raised and ready
        swordGroupRef.current.rotation.z = THREE.MathUtils.lerp(swordGroupRef.current.rotation.z, Math.PI / 4, delta * lerpSpeed);
        swordGroupRef.current.rotation.x = THREE.MathUtils.lerp(swordGroupRef.current.rotation.x, -Math.PI / 4, delta * lerpSpeed);
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      <ambientLight intensity={isAwake ? 1.5 : 0.8} />
      <directionalLight position={[5, 10, 5]} intensity={isAwake ? 2 : 1} color="#ffffff" />
      <pointLight position={[0, 0, 2]} intensity={isAwake ? 2 : 0} color="#e63946" distance={5} />

      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.4, 0]} material={armorMaterial}>
        <boxGeometry args={[0.6, 0.8, 0.4]} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.05, 0]} material={skinMaterial}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
      </mesh>

      {/* Kabuto (Helmet) */}
      <mesh position={[0, 1.35, 0]} material={armorMaterial}>
        <coneGeometry args={[0.45, 0.4, 4]} />
      </mesh>
      {/* Helmet Crest */}
      <mesh position={[0, 1.4, 0.2]} material={goldMaterial}>
        <boxGeometry args={[0.1, 0.3, 0.1]} />
      </mesh>

      {/* Sword Arm / Group */}
      <group ref={swordGroupRef} position={[0.4, 0.6, 0]}>
        {/* Hilt */}
        <mesh position={[0, 0, 0]} material={goldMaterial}>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
        </mesh>
        {/* Blade */}
        <mesh position={[0, 0.5, 0]} material={bladeMaterial}>
            <boxGeometry args={[0.05, 0.8, 0.1]} />
        </mesh>
      </group>
    </group>
  );
}
