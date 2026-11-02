<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ConductorRobot from './components/ConductorRobot.vue'
import SheetMusicViewer from './components/SheetMusicViewer.vue'
import { PlaybackEngine, type PlaybackState } from './conductor/playback-engine'
import { parseMusicXML } from './music/musicxml-parser'
import type { MusicalPosition, MusicalTimeline } from './music/types'

const xml = ref('')
const title = ref('Loading demo…')
const timeline = ref<MusicalTimeline>()
const playbackState = ref<PlaybackState>('stopped')
const message = ref('')
const position = ref<MusicalPosition>({ elapsedSeconds: 0, measureIndex: 0, measureNumber: '1', beatIndex: 0, beatProgress: 0, bpm: 100, timeSignature: { numerator: 4, denominator: 4 }, quarterPosition: 0 })
let engine: PlaybackEngine | undefined
let frame = 0

const playing = computed(() => playbackState.value === 'playing')
const meterLabel = computed(() => `${position.value.timeSignature.numerator}/${position.value.timeSignature.denominator}`)
const elapsedLabel = computed(() => formatTime(position.value.elapsedSeconds))
const durationLabel = computed(() => formatTime(timeline.value?.durationSeconds ?? 0))
function formatTime(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` }

function loadScore(source: string, fallbackName: string): void {
  try {
    const parsed = parseMusicXML(source)
    xml.value = source; timeline.value = parsed; title.value = parsed.title || fallbackName
    engine?.dispose(); engine = new PlaybackEngine(parsed)
    position.value = engine.position(); playbackState.value = engine.state
    const defaults = [parsed.initialTempo.isDefault ? 'tempo · 100 BPM' : '', parsed.defaultedMeter ? 'meter · 4/4' : ''].filter(Boolean)
    message.value = defaults.length ? `Using default ${defaults.join(' and ')}` : ''
  } catch (cause) {
    message.value = cause instanceof Error ? cause.message : 'Could not load this MusicXML file.'
  }
}

async function upload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try { loadScore(await file.text(), file.name) } catch { message.value = 'Could not read this file.' }
  input.value = ''
}

async function togglePlayback(): Promise<void> {
  if (!engine) return
  if (playing.value) engine.pause()
  else {
    try { await engine.play(); message.value = '' } catch { message.value = 'Audio playback is unavailable. Try a current desktop browser.' }
  }
  playbackState.value = engine.state; tick()
}
function reset(): void { engine?.reset(); playbackState.value = engine?.state ?? 'stopped'; if (engine) position.value = engine.position(); tick() }
function tick(): void {
  cancelAnimationFrame(frame)
  const update = () => {
    if (!engine) return
    position.value = engine.position(); playbackState.value = engine.state
    if (engine.state === 'playing') frame = requestAnimationFrame(update)
  }
  update()
}

onMounted(async () => {
  try { const response = await fetch('/examples/waltz.musicxml'); if (!response.ok) throw new Error(); loadScore(await response.text(), 'Little Robot Waltz') }
  catch { title.value = 'Choose a MusicXML score'; message.value = 'The bundled demo could not be loaded.' }
})
onBeforeUnmount(() => { cancelAnimationFrame(frame); engine?.dispose() })
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <a
        class="brand"
        href="#"
        aria-label="Conductron home"
      ><span class="brand-mark">C</span><span>conductron</span></a>
      <label class="upload-button"> <span>＋</span> Open MusicXML <input
        type="file"
        accept=".xml,.musicxml,application/xml,text/xml"
        @change="upload"
      > </label>
    </header>

    <section class="workspace">
      <div class="score-column">
        <div class="score-heading">
          <div>
            <div class="eyebrow">
              NOW CONDUCTING
            </div><h1>{{ title }}</h1>
          </div>
          <div class="score-meta">
            <span>{{ meterLabel }}</span><span class="meta-dot">·</span><span>{{ Math.round(position.bpm) }} BPM</span>
          </div>
        </div>
        <SheetMusicViewer
          v-if="timeline"
          :xml="xml"
          :position="position"
          :playing="playing"
        />
        <div
          v-else
          class="empty-score"
        >
          Open a MusicXML score to begin.
        </div>
        <div class="score-footer">
          <span>{{ timeline?.measures.length ?? 0 }} measures</span><span>{{ elapsedLabel }} <i>/</i> {{ durationLabel }}</span>
        </div>
      </div>

      <aside class="conductor-column">
        <div class="conductor-label">
          <span
            class="live-dot"
            :class="{ active: playing }"
          />{{ playing ? 'CONDUCTING' : 'READY' }}
        </div>
        <ConductorRobot
          :position="position"
          :playing="playing"
        />
        <div class="transport">
          <button
            class="transport-reset"
            aria-label="Reset to beginning"
            title="Reset"
            @click="reset"
          >
            ↺
          </button>
          <button
            class="transport-play"
            :aria-label="playing ? 'Pause' : 'Start conducting'"
            @click="togglePlayback"
          >
            <span
              v-if="playing"
              class="pause-icon"
            >Ⅱ</span><span
              v-else
              class="play-icon"
            >▶</span>
          </button>
          <span class="transport-hint">{{ playing ? 'PAUSE' : playbackState === 'paused' ? 'RESUME' : 'START' }}</span>
        </div>
        <p
          v-if="message"
          class="notice"
          role="status"
        >
          {{ message }}
        </p>
        <div class="source-note">
          Gestures follow the score tempo
        </div>
      </aside>
    </section>
    <footer class="page-footer">
      <span>CONDUCTRON <span class="footer-separator">/</span> PRACTICE MODE</span><span>Score-led timing · Microphone analysis planned</span>
    </footer>
  </main>
</template>
