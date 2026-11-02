export interface TimeSignature {
  numerator: number
  denominator: number
}

export interface TempoMark {
  bpm: number
  beatUnit: number
  quarterBpm: number
  isDefault: boolean
}

export interface NoteEvent {
  onset: number
  duration: number
  measureIndex: number
}

export interface MeasureTimeline {
  index: number
  startQuarter: number
  durationQuarter: number
  timeSignature: TimeSignature
  tempo: TempoMark
}

export interface MusicalPosition {
  elapsedSeconds: number
  measureIndex: number
  measureNumber: string
  beatIndex: number
  beatProgress: number
  bpm: number
  timeSignature: TimeSignature
  quarterPosition: number
}

export interface MusicalTimeline {
  title: string
  measures: MeasureTimeline[]
  notes: NoteEvent[]
  durationSeconds: number
  initialTempo: TempoMark
  initialTimeSignature: TimeSignature
  defaultedMeter: boolean
}
