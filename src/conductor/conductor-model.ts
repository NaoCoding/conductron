import * as THREE from 'three'
import type { GesturePose } from './conducting-patterns'

const UP = new THREE.Vector3(0, 1, 0)
const BATON_LENGTH = 0.64
export const gesturePoint = (pose: GesturePose): THREE.Vector3 => new THREE.Vector3(-0.62 + pose.x, 2.68 + pose.y, 0.95)

function material(color: string, metalness = 0.1, roughness = 0.5): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness })
}
function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, position: number[], scale?: number[]): THREE.Mesh {
  const object = new THREE.Mesh(geometry, mat)
  object.position.fromArray(position)
  if (scale) object.scale.fromArray(scale)
  object.castShadow = true
  object.receiveShadow = true
  parent.add(object)
  return object
}
function ellipsoid(parent: THREE.Object3D, mat: THREE.Material, position: number[], scale: number[]): THREE.Mesh {
  return mesh(new THREE.SphereGeometry(1, 32, 24), mat, parent, position, scale)
}
function link(object: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3): void {
  object.position.copy(from).add(to).multiplyScalar(0.5)
  object.quaternion.setFromUnitVectors(UP, to.clone().sub(from).normalize())
  object.scale.y = from.distanceTo(to)
}

interface Arm {
  shoulder: THREE.Vector3
  upper: THREE.Mesh
  lower: THREE.Mesh
  elbow: THREE.Mesh
  cuff: THREE.Mesh
  hand: THREE.Group
  side: number
}

/** Two-bone IK with an outward elbow pole keeps the limb lengths and wrist position stable. */
export function solveArm(shoulder: THREE.Vector3, wrist: THREE.Vector3, side: number): { elbow: THREE.Vector3; wrist: THREE.Vector3 } {
  const upperLength = 0.72, lowerLength = 0.72
  const direction = wrist.clone().sub(shoulder)
  const distance = THREE.MathUtils.clamp(direction.length(), 0.05, upperLength + lowerLength - 0.001)
  direction.normalize()
  const target = shoulder.clone().addScaledVector(direction, distance)
  const pole = new THREE.Vector3(side, -0.85, 0.3)
  pole.addScaledVector(direction, -pole.dot(direction)).normalize()
  const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance)
  const elbow = shoulder.clone().addScaledVector(direction, along).addScaledVector(pole, Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)))
  return { elbow, wrist: target }
}

export function createConductor(): { root: THREE.Group; head: THREE.Group; update: (pose: GesturePose, pulse: number, active: boolean) => THREE.Vector3 } {
  const root = new THREE.Group()
  const suit = material('#253b38', 0.22, 0.64)
  const skin = material('#e4dfd2', 0.18, 0.37)
  const white = material('#f9f5e9', 0.04, 0.5)
  const joint = material('#61746e', 0.65, 0.32)
  const dark = material('#132320', 0.15, 0.45)
  const green = material('#c9f36b', 0.3, 0.3)
  const eyes = material('#142b28', 0.35, 0.2)

  // Tapered jacket, separate lapels, shirt front, bow tie and articulated waist.
  const torso = mesh(new THREE.CylinderGeometry(0.51, 0.33, 0.94, 48), suit, root, [0, 2.2, 0], [1, 1, 0.61])
  torso.rotation.z = 0.015
  ellipsoid(root, suit, [0, 1.67, -0.02], [0.36, 0.22, 0.24])
  mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.09, 40), joint, root, [0, 1.76, 0], [1, 1, 0.73])
  const shirt = new THREE.Shape()
  shirt.moveTo(-0.23, 2.65); shirt.lineTo(0.23, 2.65); shirt.lineTo(0.11, 2.07); shirt.lineTo(-0.11, 2.07); shirt.closePath()
  mesh(new THREE.ShapeGeometry(shirt), white, root, [0, 0, 0.32])
  for (const side of [-1, 1]) {
    const lapel = new THREE.Shape()
    lapel.moveTo(side * 0.22, 2.67); lapel.lineTo(side * 0.38, 2.46); lapel.lineTo(side * 0.23, 2.35); lapel.lineTo(side * 0.29, 2.29); lapel.lineTo(side * 0.07, 1.94); lapel.closePath()
    mesh(new THREE.ShapeGeometry(lapel), new THREE.MeshStandardMaterial({ color: '#4a6259', side: THREE.DoubleSide, roughness: 0.4 }), root, [0, 0, 0.335])
    const tie = mesh(new THREE.ConeGeometry(0.095, 0.15, 3), dark, root, [side * 0.075, 2.58, 0.36], [1, 1, 0.45])
    tie.rotation.z = side * Math.PI / 2
    const pocket = mesh(new THREE.BoxGeometry(0.12, 0.025, 0.025), green, root, [side === 1 ? 0.31 : -0.31, 2.37, 0.30])
    pocket.visible = side === 1
    const thigh = mesh(new THREE.CylinderGeometry(0.16, 0.125, 0.67, 24), suit, root, [side * 0.21, 1.27, 0], [1, 1, 1.05])
    thigh.rotation.z = side * 0.055
    ellipsoid(root, joint, [side * 0.23, 0.94, 0.02], [0.125, 0.11, 0.12])
    mesh(new THREE.CylinderGeometry(0.124, 0.10, 0.68, 24), suit, root, [side * 0.24, 0.57, 0.015])
    ellipsoid(root, dark, [side * 0.24, 0.18, 0.12], [0.16, 0.12, 0.29])
    mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.07, 24), joint, root, [side * 0.24, 0.26, 0.015])
  }
  for (const y of [2.26, 2.13]) ellipsoid(root, dark, [0, y, 0.335], [0.018, 0.018, 0.012])
  ellipsoid(root, dark, [0, 2.58, 0.37], [0.036, 0.042, 0.03])
  mesh(new THREE.CylinderGeometry(0.105, 0.13, 0.22, 32), joint, root, [0, 2.81, 0])
  mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.10, 32), white, root, [0, 2.73, 0], [1, 1, 0.85])

  // An oval cranium and jaw, cheeks, ears and a projecting nose replace the box visor.
  const head = new THREE.Group(); head.position.set(0, 3.22, 0.015); root.add(head)
  ellipsoid(head, skin, [0, 0.07, 0], [0.315, 0.42, 0.28])
  ellipsoid(head, skin, [0, -0.18, 0.055], [0.24, 0.22, 0.235])
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, [side * 0.315, 0, 0], [0.065, 0.11, 0.07])
    ellipsoid(head, joint, [side * 0.354, 0, 0.01], [0.012, 0.05, 0.036])
    ellipsoid(head, white, [side * 0.13, 0.07, 0.247], [0.081, 0.044, 0.026])
    ellipsoid(head, eyes, [side * 0.13, 0.066, 0.27], [0.033, 0.033, 0.012])
    ellipsoid(head, white, [side * 0.13 - 0.009, 0.077, 0.281], [0.009, 0.009, 0.005])
    const brow = ellipsoid(head, dark, [side * 0.13, 0.15, 0.25], [0.08, 0.014, 0.016]); brow.rotation.z = side * 0.08
    ellipsoid(head, skin, [side * 0.16, -0.09, 0.20], [0.09, 0.07, 0.06])
  }
  ellipsoid(head, skin, [0, -0.03, 0.286], [0.045, 0.095, 0.058])
  const mouth = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.085, -0.177, 0.256), new THREE.Vector3(0, -0.188, 0.271), new THREE.Vector3(0.085, -0.177, 0.256)])
  mesh(new THREE.TubeGeometry(mouth, 16, 0.009, 6, false), joint, head, [0, 0, 0])
  // Sculpted swept hair cap rather than a featureless sphere.
  mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.46), dark, head, [0, 0.12, -0.025], [0.326, 0.39, 0.285])
  const sweep = ellipsoid(head, dark, [-0.045, 0.33, 0.16], [0.29, 0.12, 0.16]); sweep.rotation.z = -0.22

  const arms: Arm[] = []
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Vector3(side * 0.47, 2.57, 0)
    ellipsoid(root, suit, shoulder.toArray(), [0.19, 0.22, 0.20])
    const upper = mesh(new THREE.CylinderGeometry(0.14, 0.11, 1, 24), suit, root, [0, 0, 0])
    const lower = mesh(new THREE.CylinderGeometry(0.105, 0.08, 1, 24), suit, root, [0, 0, 0])
    const elbow = ellipsoid(root, joint, [0, 0, 0], [0.115, 0.115, 0.115])
    const cuff = mesh(new THREE.CylinderGeometry(0.087, 0.087, 0.095, 24), white, root, [0, 0, 0])
    const hand = new THREE.Group(); root.add(hand)
    ellipsoid(hand, skin, [0, 0.035, 0], [0.083, 0.11, 0.046])
    if (side < 0) {
      // Baton grip with curled fingers and an opposing thumb.
      for (let i = 0; i < 4; i++) {
        const finger = ellipsoid(hand, skin, [-0.058 + i * 0.034, 0.105, 0.015], [0.021, 0.055, 0.035])
        finger.rotation.x = -0.6
      }
      ellipsoid(hand, skin, [0.074, 0.06, 0.03], [0.033, 0.065, 0.03]).rotation.z = 0.6
    } else {
      // A readable open palm, four separated fingers and thumb for the supporting cue.
      for (let i = 0; i < 4; i++) {
        const finger = mesh(new THREE.CapsuleGeometry(0.019, 0.10 + (i === 1 || i === 2 ? 0.025 : 0), 5, 10), skin, hand, [-0.066 + i * 0.043, 0.17, 0])
        finger.rotation.z = (1.5 - i) * 0.12
      }
      ellipsoid(hand, skin, [-0.10, 0.045, 0.015], [0.026, 0.075, 0.026]).rotation.z = -0.65
    }
    arms.push({ shoulder, upper, lower, elbow, cuff, hand, side })
  }
  const baton = new THREE.Group(); root.add(baton)
  mesh(new THREE.CylinderGeometry(0.009, 0.018, BATON_LENGTH, 16), white, baton, [0, BATON_LENGTH / 2, 0])
  mesh(new THREE.CapsuleGeometry(0.027, 0.10, 6, 16), dark, baton, [0, 0.045, 0])
  const tipMaterial = new THREE.MeshStandardMaterial({ color: '#e6ffb2', emissive: '#c9f36b', emissiveIntensity: 1.1, roughness: 0.2 })
  mesh(new THREE.SphereGeometry(0.027, 16, 12), tipMaterial, baton, [0, BATON_LENGTH, 0])

  function moveArm(arm: Arm, wrist: THREE.Vector3, handDirection: THREE.Vector3): THREE.Vector3 {
    const solved = solveArm(arm.shoulder, wrist, arm.side)
    link(arm.upper, arm.shoulder, solved.elbow)
    link(arm.lower, solved.elbow, solved.wrist)
    arm.elbow.position.copy(solved.elbow)
    const forearm = solved.wrist.clone().sub(solved.elbow).normalize()
    arm.cuff.position.copy(solved.wrist).addScaledVector(forearm, -0.06)
    arm.cuff.quaternion.setFromUnitVectors(UP, forearm)
    arm.hand.position.copy(solved.wrist)
    arm.hand.quaternion.setFromUnitVectors(UP, handDirection)
    return solved.wrist
  }

  return { root, head, update(pose, pulse, active) {
    const tip = gesturePoint(pose)
    const direction = new THREE.Vector3(-0.20 + pose.x * 0.15, 1, 0.12).normalize()
    const wrist = moveArm(arms[0]!, tip.clone().addScaledVector(direction, -BATON_LENGTH), direction)
    baton.position.copy(wrist)
    baton.quaternion.setFromUnitVectors(UP, direction)
    const lift = active ? pulse * 0.10 : 0
    moveArm(arms[1]!, new THREE.Vector3(0.92, 2.45 + lift + pose.y * 0.12, 0.72), new THREE.Vector3(0.18, 0.96, 0.2).normalize())
    head.rotation.z = active ? pose.x * -0.035 : 0
    head.rotation.x = active ? pulse * 0.025 : 0
    return wrist.clone().addScaledVector(direction, BATON_LENGTH)
  } }
}
