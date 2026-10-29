import * as THREE from 'three'
import { SPAWN } from './data'

// Shared mutable flight state. Never stored in React state: it changes every frame.
export function createFlight() {
  return {
    pos: new THREE.Vector3(...SPAWN.pos),
    heading: SPAWN.heading,
    speed: 0,
    keys: {},
    joy: { x: 0, y: 0, active: false },
    boost: false,
    orbitYaw: 0,
    lastHitAt: -10,
    invulnUntil: 0,
    regenAcc: 0,
    moonPos: new THREE.Vector3(),
  }
}
