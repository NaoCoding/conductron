<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { accentFor, conductingMeter, conductingPosition, directionFor, patternFor, poseAt } from '../conductor/conducting-patterns'
import { createConductor, gesturePoint } from '../conductor/conductor-model'
import type { MusicalPosition } from '../music/types'

const props = defineProps<{ position: MusicalPosition; playing: boolean }>()
const host = ref<HTMLDivElement>()
const showPath = ref(true)
const error = ref(false)
const projectionVersion = ref(0)
let renderer: THREE.WebGLRenderer | undefined
let scene: THREE.Scene | undefined
let camera: THREE.OrthographicCamera | undefined
let frame = 0
let resizeObserver: ResizeObserver | undefined
let disposed = false

const meter = computed(() => conductingMeter(props.position.timeSignature))
const beat = computed(() => conductingPosition(props.position))
const accent = computed(() => accentFor(meter.value.beats, beat.value.beatIndex))
const direction = computed(() => meter.value.supported ? directionFor(meter.value.beats, beat.value.beatIndex) : 'Pulse')
const accentLabel = computed(() => accent.value === 'strong' ? 'Strong' : accent.value === 'secondary' ? 'Medium' : 'Light')
const cueLabel = computed(() => beat.value.beatIndex === 0 ? 'Downbeat' : `${direction.value} beat`)
const patternLabel = computed(() => meter.value.supported ? `${meter.value.beats}-beat pattern${meter.value.compound ? ' · compound' : ''}` : 'Count pulses · ungrouped meter')
const pulse = computed(() => props.playing ? Math.max(0, 1 - beat.value.progress / 0.23) : 0)

function project(point: THREE.Vector3): { x: number; y: number } {
  const projected = camera ? point.clone().project(camera) : new THREE.Vector3()
  return { x: (projected.x + 1) * 230, y: (1 - projected.y) * 230 }
}
const guide = computed(() => {
  void projectionVersion.value
  if (!camera) return { points: [], path: '' }
  const points = patternFor(meter.value.beats).map((pose, index) => ({ ...project(gesturePoint(pose)), index }))
  const path: string[] = []
  for (let i = 0; i < meter.value.beats; i++) {
    for (let sample = 0; sample <= 32; sample++) {
      const p = project(gesturePoint(poseAt(meter.value.beats, i, sample / 32)))
      path.push(`${i === 0 && sample === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    }
  }
  return { points, path: path.join(' ') }
})
const trail = computed(() => {
  void projectionVersion.value
  if (!camera || !props.playing) return ''
  const current = beat.value.beatIndex + beat.value.progress
  const length = Math.min(0.42, current)
  return Array.from({ length: 25 }, (_, index) => {
    const time = current - length + index / 24 * length
    const p = project(gesturePoint(poseAt(meter.value.beats, Math.floor(time), time % 1)))
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
  }).join(' ')
})
const tipPoint = computed(() => {
  void projectionVersion.value
  return project(gesturePoint(poseAt(meter.value.beats, beat.value.beatIndex, beat.value.progress)))
})

function releaseScene(): void {
  if (scene) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry)
        const mats = Array.isArray(object.material) ? object.material : [object.material]
        mats.forEach(mat => materials.add(mat))
      }
    })
    geometries.forEach(geometry => geometry.dispose())
    materials.forEach(mat => mat.dispose())
  }
  renderer?.dispose()
  renderer?.domElement.remove()
}

onMounted(() => {
  const element = host.value
  if (!element) return
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    element.appendChild(renderer.domElement)
    scene = new THREE.Scene()
    camera = new THREE.OrthographicCamera(-2.1, 2.1, 2.1, -2.1, 0.1, 30)
    camera.position.set(0, 1.92, 8)
    camera.lookAt(0, 1.92, 0)
    scene.add(new THREE.HemisphereLight(0xfff4e9, 0x493a35, 2))
    const key = new THREE.DirectionalLight(0xfff1d9, 3.5)
    key.position.set(-3, 5, 6); key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -3; key.shadow.camera.right = 3
    key.shadow.camera.top = 5; key.shadow.camera.bottom = -2
    key.shadow.normalBias = 0.025
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xc64d36, 2.2); rim.position.set(3, 4, -3); scene.add(rim)
    const fill = new THREE.DirectionalLight(0xffdfc6, 1.2); fill.position.set(3, 2, 4); scene.add(fill)
    const conductor = createConductor(); scene.add(conductor.root)
    const podiumMaterial = new THREE.MeshStandardMaterial({ color: '#6a5145', metalness: 0.35, roughness: 0.6 })
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.09, 64), podiumMaterial)
    podium.position.y = 0.015; podium.receiveShadow = true; scene.add(podium)
    const edge = new THREE.Mesh(new THREE.TorusGeometry(0.90, 0.008, 8, 80), new THREE.MeshBasicMaterial({ color: '#e69b62', transparent: true, opacity: 0.55 }))
    edge.rotation.x = Math.PI / 2; edge.position.y = 0.06; scene.add(edge)
    const resize = () => {
      if (!renderer || !camera || !host.value) return
      const { width, height } = host.value.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height)
      // Square composition preserves arm reach on narrow screens.
      const halfHeight = 2.08, halfWidth = halfHeight * width / height
      camera.left = -halfWidth; camera.right = halfWidth
      camera.top = halfHeight; camera.bottom = -halfHeight
      camera.updateProjectionMatrix(); camera.updateMatrixWorld()
      projectionVersion.value++
    }
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element); resize()
    const animate = () => {
      if (disposed) return
      frame = requestAnimationFrame(animate)
      const pose = poseAt(meter.value.beats, beat.value.beatIndex, beat.value.progress)
      // Sample score time directly: frame-dependent easing would make the ictus late.
      conductor.update(pose, pulse.value, props.playing)
      if (renderer && scene && camera) renderer.render(scene, camera)
    }
    animate()
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); cancelAnimationFrame(frame); error.value = true
    })
  } catch {
    cancelAnimationFrame(frame)
    resizeObserver?.disconnect()
    releaseScene()
    error.value = true
  }
})

watch(() => props.position.timeSignature, () => { projectionVersion.value++ })
onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(frame); resizeObserver?.disconnect(); releaseScene()
})
</script>

<template>
  <div class="conductor-visual">
    <div class="stage-toolbar">
      <span>MUSICIAN’S VIEW</span>
      <button
        class="path-toggle"
        :aria-pressed="showPath"
        @click="showPath = !showPath"
      >
        <span aria-hidden="true">⌁</span> Baton path
      </button>
    </div>
    <div
      class="robot-stage"
      role="img"
      :aria-label="`Humanlike conductor, facing you. ${position.timeSignature.numerator}/${position.timeSignature.denominator}, ${patternLabel}. Beat ${beat.beatIndex + 1}: ${accentLabel}, ${direction.toLowerCase()}.`"
    >
      <div
        ref="host"
        class="robot-canvas"
        aria-hidden="true"
      />
      <svg
        v-if="showPath && meter.supported && !error"
        class="gesture-overlay"
        viewBox="0 0 460 460"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          :d="guide.path"
          class="gesture-guide"
        />
        <polyline
          :points="trail"
          class="gesture-trail"
          :class="{ 'is-downbeat': accent === 'strong' }"
        />
        <g
          v-for="point in guide.points"
          :key="point.index"
          :transform="`translate(${point.x}, ${point.y})`"
          class="gesture-target"
          :class="{ 'is-current': point.index === beat.beatIndex, 'is-strong': point.index === 0 }"
        >
          <circle :r="point.index === beat.beatIndex ? 9 + pulse * 5 : 8" />
          <text
            x="-17"
            y="4"
          >{{ point.index + 1 }}</text>
        </g>
        <circle
          v-if="playing"
          :cx="tipPoint.x"
          :cy="tipPoint.y"
          :r="3 + pulse * 2"
          class="gesture-tip"
        />
      </svg>
      <div
        v-if="error"
        class="robot-fallback"
        role="status"
      >
        3D view unavailable. Follow the beat cues below.
      </div>
      <span class="stage-view-note">Right hand · baton &nbsp; / &nbsp; Left hand · support</span>
    </div>
    <div class="conducting-info">
      <div class="pattern-meta">
        <span><b>{{ position.timeSignature.numerator }}/{{ position.timeSignature.denominator }}</b> {{ patternLabel }}</span>
        <span>BAR {{ position.measureNumber.padStart(2, '0') }}</span>
      </div>
      <div
        class="beat-cue"
        :class="[`accent-${accent}`, { 'is-playing': playing }]"
        :style="{ '--pulse': pulse }"
      >
        <div class="cue-count">
          {{ String(beat.beatIndex + 1).padStart(2, '0') }}<span>/ {{ String(meter.beats).padStart(2, '0') }}</span>
        </div>
        <div class="cue-copy">
          <strong>{{ cueLabel }}</strong>
          <span>{{ accentLabel }} · {{ direction.toLowerCase() }}<template v-if="meter.compound"> · 3 subdivisions</template></span>
        </div>
        <span
          class="cue-arrow"
          aria-hidden="true"
        >{{ direction === 'Down' || direction === 'Pulse' ? '↓' : direction === 'Up' ? '↑' : direction === 'In' ? '→' : '←' }}</span>
      </div>
      <div
        class="beat-sequence"
        :aria-label="`${meter.beats} conducting beats per bar; beat ${beat.beatIndex + 1} active`"
      >
        <div
          v-for="(_, index) in meter.beats"
          :key="index"
          class="beat-step"
          :class="[`weight-${accentFor(meter.beats, index)}`, { 'is-current': index === beat.beatIndex, 'is-past': index < beat.beatIndex }]"
          :aria-current="index === beat.beatIndex ? 'step' : undefined"
        >
          <span class="beat-step-label">{{ index + 1 }} <small>{{ meter.supported ? directionFor(meter.beats, index).toUpperCase() : 'PULSE' }}</small></span>
          <span class="beat-step-track"><i :style="{ transform: `scaleX(${index < beat.beatIndex ? 1 : index === beat.beatIndex ? beat.progress : 0})` }" /></span>
        </div>
      </div>
      <div
        v-if="meter.compound"
        class="subdivision-row"
      >
        {{ position.timeSignature.denominator === 16 ? 'SIXTEENTHS' : 'EIGHTHS' }} <span
          v-for="unit in position.timeSignature.numerator"
          :key="unit"
          :class="{ 'is-current': unit === position.beatIndex + 1 }"
        >{{ unit }}</span>
      </div>
      <p class="gesture-legend">
        <span><i class="legend-strong" />Strong</span><span v-if="meter.beats === 4"><i class="legend-secondary" />Medium</span><span><i />Light</span>
        <span class="gesture-legend-note">{{ meter.compound ? 'Grouped in threes' : 'Rebound on every beat' }}</span>
      </p>
    </div>
  </div>
</template>
