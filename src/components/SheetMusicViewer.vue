<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import type { MusicalPosition } from '../music/types'

const props = defineProps<{ xml: string; position: MusicalPosition; playing: boolean }>()
const host = ref<HTMLDivElement>()
const error = ref('')
let osmd: OpenSheetMusicDisplay | undefined
let scoreKey = ''
let lastBeat = ''

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
    lastBeat = ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Could not render this score.'
  }
}

onMounted(() => { void render() })
watch(() => props.xml, async () => { await render() })
watch(() => [props.position.measureIndex, props.position.beatIndex, props.position.beatProgress, props.playing], ([measure, beat, progress, playing]) => {
  if (!osmd || scoreKey !== props.xml) return
  if (!playing && Number(measure) === 0 && Number(beat) === 0 && Number(progress) === 0) {
    osmd.cursor.reset()
    lastBeat = ''
    return
  }
  const key = `${measure}:${beat}`
  if (!playing) return
  if (key !== lastBeat) {
    const target = Number(measure) * props.position.timeSignature.numerator + Number(beat)
    if (target === 0) osmd.cursor.reset()
    else {
      // OSMD's cursor advances by graphical voice entries; progress updates are intentionally throttled here.
      const entries = osmd.cursor.iterator
      const guard = 10000
      let count = 0
      while (!entries.EndReached && count++ < guard) {
        const timestamp = entries.currentTimeStamp?.RealValue ?? 0
        if (timestamp >= props.position.quarterPosition - Number(progress) * 0.001) break
        osmd.cursor.next()
      }
    }
    lastBeat = key
  }
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
