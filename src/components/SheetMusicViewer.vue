<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import type { MusicalPosition } from '../music/types'

const props = defineProps<{ xml: string; position: MusicalPosition; playing: boolean }>()
const host = ref<HTMLDivElement>()
const error = ref('')
let osmd: OpenSheetMusicDisplay | undefined
let scoreKey = ''
let lastTargetTimestamp = 0
let nextCursorTimestamp: number | undefined

function resetScoreCursor(): void {
  osmd?.cursor.reset()
  lastTargetTimestamp = 0
  nextCursorTimestamp = undefined
}

function syncScoreCursor(quarterPosition: number): void {
  if (!osmd) return
  // The app's timeline is in quarter notes; OSMD timestamps are whole-note fractions.
  const targetTimestamp = Math.max(0, quarterPosition) / 4
  const epsilon = 1e-7

  // Playback can restart from the end of a score. Rewind the iterator before seeking.
  if (targetTimestamp + epsilon < lastTargetTimestamp) resetScoreCursor()

  // Avoid moving the DOM cursor every animation frame between note onsets.
  if (nextCursorTimestamp !== undefined && targetTimestamp + epsilon < nextCursorTimestamp) {
    lastTargetTimestamp = targetTimestamp
    return
  }

  const iterator = osmd.cursor.iterator
  let nextTimestamp: number | undefined
  let steps = 0
  while (!iterator.EndReached && steps++ < 10000) {
    const timestamp = iterator.currentTimeStamp?.RealValue ?? 0
    if (timestamp > targetTimestamp + epsilon) {
      nextTimestamp = timestamp
      osmd.cursor.previous()
      break
    }
    osmd.cursor.next()
  }

  if (iterator.EndReached) {
    osmd.cursor.previous()
    nextCursorTimestamp = Number.POSITIVE_INFINITY
  } else {
    nextCursorTimestamp = nextTimestamp
  }
  lastTargetTimestamp = targetTimestamp
}

async function render(): Promise<void> {
  if (!host.value || !props.xml) return
  error.value = ''
  osmd?.clear()
  osmd = undefined
  host.value.replaceChildren()
  try {
    osmd = new OpenSheetMusicDisplay(host.value, { autoResize: true, drawTitle: true, drawPartNames: false, followCursor: false, backend: 'svg' })
    await osmd.load(props.xml)
    osmd.render()
    osmd.cursor.show()
    resetScoreCursor()
    scoreKey = props.xml
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not render this score.'
  }
}

onMounted(() => { void render() })
watch(() => props.xml, async () => { await render() })
watch(() => [props.position.quarterPosition, props.playing], ([quarterPosition, playing]) => {
  if (!osmd || scoreKey !== props.xml) return
  if (!playing && Number(quarterPosition) === 0) {
    resetScoreCursor()
    return
  }
  if (!playing) return
  syncScoreCursor(Number(quarterPosition))
}, { flush: 'post' })

onBeforeUnmount(() => { osmd?.clear(); osmd = undefined })
</script>

<template>
  <div class="score-wrap">
    <div
      v-if="error"
      class="score-error"
    >
      {{ error }}
    </div>
    <div
      v-else
      ref="host"
      class="score-canvas"
      aria-label="Rendered sheet music"
    />
  </div>
</template>
