import type { MusicalPosition, MeasureTimeline, MusicalTimeline, NoteEvent, TempoMark, TimeSignature } from './types'

const DEFAULT_METER: TimeSignature = { numerator: 4, denominator: 4 }
const DEFAULT_TEMPO: TempoMark = { bpm: 100, beatUnit: 4, quarterBpm: 100, isDefault: true }

function childText(parent: Element, selector: string): string | undefined {
  const value = parent.querySelector(selector)?.textContent?.trim()
  return value || undefined
}

function validPositive(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function parseMusicXML(xml: string): MusicalTimeline {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('This file is not valid MusicXML.')
  const root = doc.documentElement
  if (!['score-partwise', 'score-timewise'].includes(root.localName)) {
    throw new Error('Expected a MusicXML score-partwise or score-timewise document.')
  }

  const measures = [...root.querySelectorAll('part:first-of-type > measure')]
  if (!measures.length) throw new Error('No measures were found in this score.')

  let meter = { ...DEFAULT_METER }
  const initialMeterSeen = Boolean(measures[0]?.querySelector('attributes time'))
  let tempo = { ...DEFAULT_TEMPO }
  let divisions = 1
  let quarterPosition = 0
  const timelineMeasures: MeasureTimeline[] = []
  const notes: NoteEvent[] = []

  measures.forEach((measure, index) => {
    const attributes = measure.querySelector('attributes')
    const time = attributes?.querySelector('time')
    if (time) {
      meter = {
        numerator: validPositive(childText(time, 'beats'), meter.numerator),
        denominator: validPositive(childText(time, 'beat-type'), meter.denominator),
      }
    }
    divisions = validPositive(childText(attributes ?? measure, 'divisions'), divisions)
    const metronome = measure.querySelector('direction metronome')
    if (metronome) {
      const beatUnit = ({ whole: 1, half: 2, quarter: 4, eighth: 8, '16th': 16, '32nd': 32 } as Record<string, number>)[childText(metronome, 'beat-unit') ?? 'quarter'] ?? 4
      const bpm = validPositive(childText(metronome, 'per-minute'), tempo.bpm)
      tempo = { bpm, beatUnit, quarterBpm: bpm * 4 / beatUnit, isDefault: false }
    } else {
      const soundTempo = measure.querySelector('direction sound')?.getAttribute('tempo')
      if (soundTempo) {
        const bpm = validPositive(soundTempo, tempo.bpm)
        tempo = { bpm, beatUnit: 4, quarterBpm: bpm, isDefault: false }
      }
    }
    const durationQuarter = meter.numerator * 4 / meter.denominator
    timelineMeasures.push({ index, startQuarter: quarterPosition, durationQuarter, timeSignature: { ...meter }, tempo: { ...tempo } })

    let localPosition = 0
    for (const note of [...measure.querySelectorAll('note')]) {
      if (note.querySelector('grace')) continue
      if (note.querySelector('chord')) {
        const duration = validPositive(childText(note, 'duration'), 0) / divisions
        notes.push({ onset: quarterPosition + localPosition - duration, duration, measureIndex: index })
        continue
      }
      if (note.querySelector('rest')) {
        localPosition += validPositive(childText(note, 'duration'), 0) / divisions
        continue
      }
      const duration = validPositive(childText(note, 'duration'), 0) / divisions
      notes.push({ onset: quarterPosition + localPosition, duration, measureIndex: index })
      localPosition += duration
    }
    quarterPosition += durationQuarter
  })

  const title = childText(root, 'work-title') ?? childText(root, 'movement-title') ?? 'Untitled score'
  const durationSeconds = timelineMeasures.reduce((sum, item) => sum + item.durationQuarter * 60 / item.tempo.quarterBpm, 0)
  return {
    title,
    measures: timelineMeasures,
    notes,
    durationSeconds,
    initialTempo: timelineMeasures[0]?.tempo ?? DEFAULT_TEMPO,
    initialTimeSignature: timelineMeasures[0]?.timeSignature ?? DEFAULT_METER,
    defaultedMeter: !initialMeterSeen,
  }
}

export function positionAt(timeline: MusicalTimeline, elapsedSeconds: number): MusicalPosition {
  let remaining = Math.max(0, Math.min(elapsedSeconds, timeline.durationSeconds))
  for (const measure of timeline.measures) {
    const seconds = measure.durationQuarter * 60 / measure.tempo.quarterBpm
    if (remaining < seconds || measure === timeline.measures.at(-1)) {
      const quarterInMeasure = Math.min(measure.durationQuarter, remaining * measure.tempo.quarterBpm / 60)
      const beatUnitQuarter = 4 / measure.timeSignature.denominator
      const beat = quarterInMeasure / beatUnitQuarter
      return {
        elapsedSeconds, measureIndex: measure.index, measureNumber: String(measure.index + 1),
        beatIndex: Math.min(measure.timeSignature.numerator - 1, Math.floor(beat)),
        beatProgress: beat % 1, bpm: measure.tempo.bpm, timeSignature: measure.timeSignature,
        quarterPosition: measure.startQuarter + quarterInMeasure,
      }
    }
    remaining -= seconds
  }
  const last = timeline.measures.at(-1)!
  return { elapsedSeconds, measureIndex: last.index, measureNumber: String(last.index + 1), beatIndex: 0, beatProgress: 0, bpm: last.tempo.bpm, timeSignature: last.timeSignature, quarterPosition: last.startQuarter + last.durationQuarter }
}
