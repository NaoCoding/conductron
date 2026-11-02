<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { poseAt } from '../conductor/conducting-patterns'
import type { MusicalPosition } from '../music/types'

const props = defineProps<{ position: MusicalPosition; playing: boolean }>()
const host = ref<HTMLDivElement>()
let renderer: THREE.WebGLRenderer | undefined
let scene: THREE.Scene | undefined
let camera: THREE.PerspectiveCamera | undefined
let frame = 0
let resizeObserver: ResizeObserver | undefined
let leftArm: THREE.Group | undefined
let rightArm: THREE.Group | undefined
let baton: THREE.Group | undefined
let position = props.position
let playing = props.playing

watch(() => props.position, value => { position = value })
watch(() => props.playing, value => { playing = value })

function material(color: string, metalness = 0.25): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.38 })
}
function part(geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x: number, y: number, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); parent.add(mesh); return mesh
}

onMounted(() => {
  const element = host.value
  if (!element) return
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    element.appendChild(renderer.domElement)
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 1.15, 7.4)
    scene.add(new THREE.HemisphereLight(0xdffcf0, 0x26332d, 2.2))
    const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-3, 5, 6); scene.add(light)
    const robot = new THREE.Group(); robot.position.y = -0.6; scene.add(robot)
    const dark = material('#23332e', 0.55), shell = material('#c9f36b', 0.35), joint = material('#edf2e9', 0.15), accent = material('#ee8d5b', 0.25)
    part(new THREE.CapsuleGeometry(0.53, 0.8, 6, 12), dark, robot, 0, 0.45)
    const chest = part(new THREE.BoxGeometry(0.64, 0.45, 0.56), shell, robot, 0, 0.47); chest.rotation.z = -0.04
    part(new THREE.SphereGeometry(0.08, 16, 16), accent, robot, 0, 0.49, 0.3)
    const head = new THREE.Group(); head.position.set(0, 1.43, 0); robot.add(head)
    part(new THREE.BoxGeometry(1.0, 0.72, 0.72), shell, head, 0, 0)
    part(new THREE.BoxGeometry(0.68, 0.28, 0.08), dark, head, 0, -0.04, 0.38)
    part(new THREE.SphereGeometry(0.065, 16, 16), accent, head, -0.2, -0.03, 0.44)
    part(new THREE.SphereGeometry(0.065, 16, 16), accent, head, 0.2, -0.03, 0.44)
    part(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 12), accent, head, 0, 0.5)
    part(new THREE.SphereGeometry(0.065, 12, 12), accent, head, 0, 0.66)
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * 0.55, 0.78, 0); robot.add(arm)
      part(new THREE.SphereGeometry(0.15, 16, 16), joint, arm, 0, 0)
      const upper = part(new THREE.CylinderGeometry(0.095, 0.12, 0.48, 12), shell, arm, side * 0.12, -0.23); upper.rotation.z = -side * 0.5
      const elbow = new THREE.Group(); elbow.position.set(side * 0.24, -0.44, 0); arm.add(elbow)
      part(new THREE.SphereGeometry(0.11, 14, 14), accent, elbow, 0, 0)
      const lower = part(new THREE.CylinderGeometry(0.075, 0.09, 0.42, 12), shell, elbow, side * 0.05, -0.2); lower.rotation.z = side * 0.22
      if (side < 0) leftArm = arm
      else {
        rightArm = arm
        baton = new THREE.Group(); baton.position.set(0, -0.42, 0); elbow.add(baton)
        const stick = part(new THREE.CylinderGeometry(0.018, 0.025, 0.78, 8), joint, baton, 0.08, -0.25); stick.rotation.z = -0.27
        part(new THREE.SphereGeometry(0.055, 12, 12), accent, baton, 0.18, -0.65)
      }
    }
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.65, 48), new THREE.MeshBasicMaterial({ color: '#9bb4a3', transparent: true, opacity: 0.12 }))
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.62; scene.add(ground)
    const resize = () => { if (!renderer || !camera || !host.value) return; const { width, height } = host.value.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix() }
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element); resize()
    const animate = () => {
      frame = requestAnimationFrame(animate)
      if (leftArm && rightArm && baton) {
        const pose = poseAt(position.timeSignature.numerator, position.beatIndex, position.beatProgress)
        const amount = playing ? 1 : 0.16
        leftArm.rotation.z += (pose.left * amount - leftArm.rotation.z) * 0.2
        rightArm.rotation.z += (pose.right * amount - rightArm.rotation.z) * 0.2
        rightArm.position.x += ((0.55 + pose.x * 0.2) - rightArm.position.x) * 0.16
        baton.rotation.z += ((pose.y * 0.5) - baton.rotation.z) * 0.18
      }
      if (renderer && scene && camera) renderer.render(scene, camera)
    }
    animate()
  } catch {
    element.innerHTML = '<div class="robot-fallback">3D conductor unavailable in this browser</div>'
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame); resizeObserver?.disconnect()
  if (scene) scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach(mat => mat.dispose()) } })
  renderer?.dispose(); renderer?.domElement.remove()
})
</script>

<template>
  <div
    ref="host"
    class="robot-stage"
    aria-label="Animated robot conductor"
  />
</template>
