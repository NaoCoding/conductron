<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import type { MusicalPosition } from '../music/types'

const props = defineProps<{ xml: string; position: MusicalPosition; playing: boolean }>()
const host = ref<HTMLDivElement>()
const error = ref('')
let osmd: OpenSheetMusicDisplay | undefined
let scoreKey = ''

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
    osmd.cursor.reset()
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
    osmd.cursor.reset()
    return
  }
  if (!playing) return

  // The score timeline is measured in quarter notes; OSMD's Fraction timestamps
  // are measured in whole notes. Keep the cursor on the latest entry that has
  // started, rather than the next entry (which would move ahead during long notes).
  const targetTimestamp = Number(quarterPosition) / 4
  const entries = osmd.cursor.iterator
  const guard = 10000
  let count = 0
  let reachedEnd = false
  while (!entries.EndReached && count++ < guard) {
    const timestamp = entries.currentTimeStamp?.RealValue ?? 0
    if (timestamp > targetTimestamp) {
      osmd.cursor.previous()
      break
    }
    osmd.cursor.next()
    reachedEnd = entries.EndReached
  }
  if (reachedEnd) osmd.cursor.previous()
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
