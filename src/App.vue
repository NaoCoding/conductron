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
  try { const response = await fetch(`${import.meta.env.BASE_URL}examples/waltz.musicxml`); if (!response.ok) throw new Error(); loadScore(await response.text(), 'Little Robot Waltz') }
  catch { title.value = 'Choose a MusicXML score'; message.value = 'The bundled demo could not be loaded.' }
})
onBeforeUnmount(() => { cancelAnimationFrame(frame); engine?.dispose() })
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <a
        class="brand"
        :href="import.meta.env.BASE_URL"
        aria-label="Conductron home"
      >
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M7 5v10.5a2.5 2.5 0 1 1-2-2.45V7l12-2v9.5a2.5 2.5 0 1 1-2-2.45V3L7 5Z" /></svg>
        </span>
        <span class="brand-name">conductron</span>
      </a>
      <div class="topbar-tools">
        <span class="workspace-mode"><span class="mode-dot" />Music practice</span>
        <label class="upload-button">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5V19h14v-4.5" /></svg>
          <span>Open score</span>
          <input
        type="file"
        accept=".xml,.musicxml,application/xml,text/xml"
        @change="upload"
          >
        </label>
      </div>
    </header>

    <section class="studio-intro" aria-label="Practice studio introduction">
      <div class="intro-copy">
        <div class="eyebrow"><span class="eyebrow-index">01</span> VIRTUAL CONDUCTOR PRACTICE</div>
        <h1>Conduct along with<br><em>your score.</em></h1>
        <p>A beat-by-beat guide for every measure.</p>
      </div>
      <div class="intro-mark" aria-hidden="true">
        <svg viewBox="0 0 120 64" fill="none"><path d="M2 34h16l8-22 14 43 12-34 10 20h12l7-13 8 10h29" /></svg>
        <span>SCORE · TEMPO · GESTURE</span>
      </div>
    </section>

    <section class="workspace" aria-label="Conducting workspace">
      <div class="score-column">
        <div class="score-heading">
          <div class="score-title-group">
            <div class="eyebrow"><span class="eyebrow-line" /> NOW REHEARSING</div>
            <h2>{{ title }}</h2>
          </div>
          <div class="score-meta" aria-label="Score tempo and meter">
            <span class="meta-chip"><span class="meta-symbol">♩</span>{{ Math.round(position.bpm) }} BPM</span>
            <span class="meta-chip">{{ meterLabel }} <span class="meta-label">METER</span></span>
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
          <div class="empty-score-content">
            <span class="empty-score-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none"><path d="M8 5h11l6 6v16H8V5Z" /><path d="M19 5v7h6M12 17h9M12 21h9" /></svg>
            </span>
            <strong>Your score will appear here</strong>
            <span>Open a MusicXML file to start a rehearsal.</span>
            <label class="empty-upload">Choose a score
              <input type="file" accept=".xml,.musicxml,application/xml,text/xml" @change="upload">
            </label>
          </div>
        </div>
        <div class="score-footer">
          <span class="measure-count"><span class="tiny-bars" aria-hidden="true"><i /><i /><i /><i /></span>{{ timeline?.measures.length ?? 0 }} measures</span>
          <span class="score-time"><span>{{ elapsedLabel }}</span><span class="time-divider">/</span><span>{{ durationLabel }}</span></span>
        </div>
      </div>

      <aside class="conductor-column">
        <div class="conductor-label">
          <span
            class="live-dot"
            :class="{ active: playing }"
          />{{ playing ? 'IN SESSION' : 'READY WHEN YOU ARE' }}
        </div>
        <div class="conductor-heading">
          <div><span class="panel-kicker">YOUR CONDUCTOR</span><h2>Keep the beat</h2></div>
          <span class="session-meter">{{ meterLabel }}</span>
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
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4.5 11a7.5 7.5 0 1 1 .8 4.5M4.5 11V5.5M4.5 11H10" /></svg>
          </button>
          <button
            class="transport-play"
            :aria-label="playing ? 'Pause' : 'Start conducting'"
            @click="togglePlayback"
          >
            <span
              v-if="playing"
              class="pause-icon"
            ><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M9 6v12M15 6v12" /></svg></span><span
            v-else
            class="play-icon"
          ><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m9 5 10 7-10 7V5Z" /></svg></span>
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
      <span class="footer-brand">CONDUCTRON <span class="footer-separator">/</span> PRACTICE MODE</span><span>Score-led timing <i /> A little more in time, every day.</span>
    </footer>
  </main>
</template>
